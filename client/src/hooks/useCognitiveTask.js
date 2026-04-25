import { useState, useEffect, useRef } from 'react'
import { useSessionStore } from '../store/useSessionStore'

/**
 * Hook for managing the Go/No-Go color fusion task.
 * Replaces the old math-based cognitive tasks with real-time motion control.
 */
export function useCognitiveTask(enabled = true) {
  const sessionPhase = useSessionStore(state => state.sessionPhase)
  const currentAngle = useSessionStore(state => state.currentAngle)
  
  const [stimulus, setStimulus] = useState(null) // null, 'green', 'red'
  const [compliance, setCompliance] = useState(true)
  const [lastCheckAngle, setLastCheckAngle] = useState(0)
  
  const checkTimer = useRef(null)

  useEffect(() => {
    if (!enabled) return;

    // 1. Generate stimulus during RISING or LOWERING phases
    if ((sessionPhase === 'RISING' || sessionPhase === 'LOWERING') && !stimulus) {
      const shouldTrigger = Math.random() > 0.7; // 30% chance each frame logic check
      
      if (shouldTrigger) {
        const isRed = Math.random() > 0.5; // 50/50 Red vs Green
        const newStim = isRed ? 'red' : 'green';
        setStimulus(newStim);
        setLastCheckAngle(currentAngle);
        setCompliance(true);

        // Clear stimulus after 3 seconds
        checkTimer.current = setTimeout(() => {
          setStimulus(null);
        }, 3000);
      }
    }

    // 2. Compliance Logic: If RED, user must NOT change angle significantly (> 5 degrees)
    if (stimulus === 'red') {
      const delta = Math.abs(currentAngle - lastCheckAngle);
      if (delta > 8) {
        setCompliance(false);
      }
    }

    // 3. Clear on REST
    if (sessionPhase === 'REST') {
       setStimulus(null);
       setCompliance(true);
       if (checkTimer.current) clearTimeout(checkTimer.current);
    }

    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    }
  }, [sessionPhase, stimulus, currentAngle, enabled])

  return { stimulus, compliance }
}
