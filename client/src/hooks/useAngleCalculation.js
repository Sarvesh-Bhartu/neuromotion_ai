import { useRef, useMemo } from 'react'
import { useSessionStore } from '../store/useSessionStore'

export const calculateAngle = (A, B, C) => {
  if (!A || !B || !C) return 0;
  const radians = Math.atan2(C.y - B.y, C.x - B.x) - Math.atan2(A.y - B.y, A.x - B.x);
  let angle = Math.abs(radians * (180.0 / Math.PI));
  if (angle > 180.0) angle = 360 - angle;
  return isNaN(angle) ? 0 : angle;
}

// Global variables outside the hook prevent React re-renders from destroying state
let internalPhase = 'REST'
let holdTimerStart = 0

export function useAngleCalculation(joint = 'knee', side = 'right') {
  const lastAngleRef = useRef(90)
  const lastUpdateRef = useRef(0)

  // 🧬 Universal Joint Mapping Logic
  const mapping = useMemo(() => {
    const isLeft = side === 'left';
    const j = joint.toLowerCase();

    if (j === 'knee') return { a: isLeft ? 23 : 24, b: isLeft ? 25 : 26, c: isLeft ? 27 : 28, labels: ['Hip', 'Knee', 'Ankle'], isFlexion: false };
    if (j === 'elbow') return { a: isLeft ? 11 : 12, b: isLeft ? 13 : 14, c: isLeft ? 15 : 16, labels: ['Shoulder', 'Elbow', 'Wrist'], isFlexion: true };
    if (j === 'shoulder') return { a: isLeft ? 23 : 24, b: isLeft ? 11 : 12, c: isLeft ? 13 : 14, labels: ['Hip', 'Shoulder', 'Elbow'], isFlexion: false };
    if (j === 'wrist') return { a: isLeft ? 13 : 14, b: isLeft ? 15 : 16, c: isLeft ? 19 : 20, labels: ['Elbow', 'Wrist', 'Hand'], isFlexion: true };
    if (j === 'hip') return { a: isLeft ? 11 : 12, b: isLeft ? 23 : 24, c: isLeft ? 25 : 26, labels: ['Shoulder', 'Hip', 'Knee'], isFlexion: false };
    if (j === 'ankle') return { a: isLeft ? 25 : 26, b: isLeft ? 27 : 28, c: isLeft ? 31 : 32, labels: ['Knee', 'Ankle', 'Foot'], isFlexion: true };
    if (j === 'back') return { a: isLeft ? 11 : 12, b: isLeft ? 23 : 24, c: isLeft ? 25 : 26, labels: ['Shoulder', 'Hip', 'Knee'], isFlexion: false };
    if (j === 'neck') return { a: isLeft ? 7 : 8, b: isLeft ? 11 : 12, c: isLeft ? 23 : 24, labels: ['Ear', 'Shoulder', 'Hip'], isFlexion: true };

    // Default Fallback (Knee)
    return { a: 24, b: 26, c: 28, labels: ['Hip', 'Knee', 'Ankle'], isFlexion: false };
  }, [joint, side]);

  const processLandmarks = (landmarks) => {
     if (!landmarks || landmarks.length < 33) return;

     const A = landmarks[mapping.a]
     const B = landmarks[mapping.b]
     const C = landmarks[mapping.c]
     
     if (A.visibility < 0.5 || B.visibility < 0.5 || C.visibility < 0.5) return; 

     const rawAngle = calculateAngle(A, B, C)
     const smoothedAngle = (lastAngleRef.current * 0.7) + (rawAngle * 0.3)
     lastAngleRef.current = smoothedAngle
     
     const now = performance.now()
     if (now - lastUpdateRef.current > 100) {
        useSessionStore.getState().setCurrentAngle(smoothedAngle)
        useSessionStore.getState().setPeakAngle(smoothedAngle)
        lastUpdateRef.current = now
     }

     const state = useSessionStore.getState()
     const targetAngle = state.targetAngle || (mapping.isFlexion ? 45 : 155)
     
     // 🚨 Dynamic Baseline Calibration
     // We assume starting pose is "Rest". 
     // Flexion: Start high (160), move low (45).
     // Extension: Start low (90), move high (155).
     const baselineAngle = state.initialBaseline || (mapping.isFlexion ? 160 : 90)
     
     const tolerance = 12
     const isProgressing = mapping.isFlexion ? (smoothedAngle < baselineAngle - 15) : (smoothedAngle > baselineAngle + 15)
     const hasReachedTarget = mapping.isFlexion ? (smoothedAngle <= targetAngle + tolerance) : (smoothedAngle >= targetAngle - tolerance)
     const hasDroppedTarget = mapping.isFlexion ? (smoothedAngle > targetAngle + tolerance) : (smoothedAngle < targetAngle - tolerance)
     const hasReturnedToRest = mapping.isFlexion ? (smoothedAngle >= baselineAngle - 10) : (smoothedAngle <= baselineAngle + 10)

     // Universal State Machine
     if (internalPhase === 'REST' && isProgressing) {
        internalPhase = 'RISING'
        state.setSessionPhase('RISING')
     } 
     else if (internalPhase === 'RISING' && hasReachedTarget) {
        internalPhase = 'HOLD'
        state.setSessionPhase('HOLD')
        holdTimerStart = performance.now()
     }
     else if (internalPhase === 'HOLD') {
        const holdDuration = performance.now() - holdTimerStart
        if (hasDroppedTarget) {
           internalPhase = 'REST'
           state.setSessionPhase('REST')
        } 
        else if (holdDuration >= 5000) { // Isometric Hold for 5 full seconds
           internalPhase = 'LOWERING'
           state.setSessionPhase('LOWERING')
        }
     }
     else if (internalPhase === 'LOWERING' && hasReturnedToRest) {
        internalPhase = 'REST'
        state.setSessionPhase('REST')
        state.incrementRep() 
     }
  }
  
  return { processLandmarks, labels: mapping.labels }
}
