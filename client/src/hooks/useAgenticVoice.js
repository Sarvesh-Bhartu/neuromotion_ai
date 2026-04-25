import { useState, useEffect, useRef } from 'react';
import { useSessionStore } from '../store/useSessionStore';
import { invokeGemini } from '../lib/gemini';

export function useAgenticVoice(onFatigueTrigger) {
  const { sessionPhase, repCount, currentAngle } = useSessionStore()
  
  const [isListening, setIsListening] = useState(false)
  const [isCoachAwaiting, setIsCoachAwaiting] = useState(false)
  const isCoachAwaitingRef = useRef(false) // Use Ref for stale-free access in event handler
  const [aiDialogue, setAiDialogue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  
  const recognitionRef = useRef(null)
  const awaitingTimerRef = useRef(null)
  const contextRef = useRef({ sessionPhase, repCount, currentAngle })

  useEffect(() => {
    contextRef.current = { sessionPhase, repCount, currentAngle }
  }, [sessionPhase, repCount, currentAngle])

  const restartTimeoutRef = useRef(null)
  const errorCountRef = useRef(0)

  const onFatigueTriggerRef = useRef(onFatigueTrigger)
  useEffect(() => {
    onFatigueTriggerRef.current = onFatigueTrigger
  }, [onFatigueTrigger])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser.");
      return;
    }

    const initRecognition = () => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop() } catch (e) {}
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
           console.log("Neural Voice: Listening Active");
           setIsListening(true);
           errorCountRef.current = 0; 
        };

        recognition.onerror = (event) => {
           console.error("Neural Voice Error:", event.error);
           
           if (event.error === 'network') {
              errorCountRef.current += 1;
              recognitionRef.current = null;
           }
           
           if (event.error === 'not-allowed') {
              setIsListening(false);
              recognitionRef.current = null; 
           }
        };

        recognition.onend = () => {
           console.log("Neural Voice: Connection Terminated");
           setIsListening(false);
           
           if (recognitionRef.current || errorCountRef.current > 0) {
              const backoff = Math.min(10000, 1000 * Math.pow(2, errorCountRef.current));
              console.log(`Neural Voice: Re-engaging Sensors in ${backoff}ms...`);
              
              if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
              restartTimeoutRef.current = setTimeout(() => {
                  if (!recognitionRef.current) {
                      initRecognition();
                  } else {
                      try { recognitionRef.current.start(); } catch (e) {}
                  }
              }, backoff);
           }
        };

        recognition.onresult = async (event) => {
           errorCountRef.current = 0; 
           let fullTranscript = '';
           for (let i = event.resultIndex; i < event.results.length; i++) {
               fullTranscript += event.results[i][0].transcript;
           }
           const transcript = fullTranscript.trim().toLowerCase();
           if (!transcript) return;

           console.log("Neural Voice Digest:", transcript);

           // 1. Wake Word Detection
           if (transcript.includes('coach') && !isCoachAwaitingRef.current) {
              console.log("Wake Word 'Coach' Detected");
              isCoachAwaitingRef.current = true;
              setIsCoachAwaiting(true);
              setAiDialogue("Listening...");
              
              window.speechSynthesis.cancel();
              window.speechSynthesis.speak(new SpeechSynthesisUtterance("Yes?"));
              
              if (awaitingTimerRef.current) clearTimeout(awaitingTimerRef.current);
              awaitingTimerRef.current = setTimeout(() => {
                 isCoachAwaitingRef.current = false;
                 setIsCoachAwaiting(false);
                 setAiDialogue("");
              }, 5000); 
           }

           // 2. Command Processing
           if (isCoachAwaitingRef.current) {
              const fatigueWords = [
                "can't perform", "cant perform", "too hard", "stop", "fatigue", 
                "tired", "pain", "hurt", "difficult", "cannot", "having pain", 
                "cannot do", "not able", "limit", "break", "rest"
              ];
              const isFatigued = fatigueWords.some(w => transcript.includes(w));

              if (isFatigued) {
                 console.log("Fatigue Command Triggered");
                 isCoachAwaitingRef.current = false;
                 setIsCoachAwaiting(false);
                 if (awaitingTimerRef.current) clearTimeout(awaitingTimerRef.current);
                 onFatigueTriggerRef.current?.();
                 return;
              }
           }

           // 3. Fallback to Gemini
           const isFinal = event.results[event.results.length - 1].isFinal;
           if (isCoachAwaitingRef.current && isFinal && transcript.length > 5 && !isThinking) {
              setIsThinking(true);
              isCoachAwaitingRef.current = false;
              setIsCoachAwaiting(false);
              if (awaitingTimerRef.current) clearTimeout(awaitingTimerRef.current);
              
              const responseText = await invokeGemini(contextRef.current, transcript);
              setAiDialogue(responseText);
              const utterance = new SpeechSynthesisUtterance(responseText);
              window.speechSynthesis.speak(utterance);
              utterance.onend = () => setIsThinking(false);
           }
        };

        recognitionRef.current = recognition;
        try { recognition.start(); } catch (e) {
           console.warn("Recognition start failed:", e);
        }
    }

    initRecognition();

    return () => {
       const rec = recognitionRef.current;
       recognitionRef.current = null;
       if (rec) {
          rec.onend = null;
          try { rec.stop(); } catch (e) {}
       }
       if (awaitingTimerRef.current) clearTimeout(awaitingTimerRef.current);
       if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    }
  }, []);

  const startListening = () => {
    console.log("Manual Coach Engagement Triggered");
    
    // Safety: If recognition isn't running or had a fatal error, try to re-init immediately
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    
    if (!isListening) {
       if (!recognitionRef.current) {
          // Re-trigger the effect logic basically or force start if object exists
          window.location.reload(); // Hard reset as a fallback if everything is broken
          return;
       }
       try { recognitionRef.current.start(); } catch (e) { console.warn(e) }
    }
    setAiDialogue("Listening...");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance("Yes? I'm listening."));
    
    if (awaitingTimerRef.current) clearTimeout(awaitingTimerRef.current);
    awaitingTimerRef.current = setTimeout(() => {
       isCoachAwaitingRef.current = false;
       setIsCoachAwaiting(false);
       setAiDialogue("");
    }, 6000);
  };

  return { isListening, isThinking, aiDialogue, isCoachAwaiting, startListening, hasError: errorCountRef.current > 0 }
}
