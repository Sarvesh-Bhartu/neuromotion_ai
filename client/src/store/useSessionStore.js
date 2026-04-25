import { create } from 'zustand'

export const useSessionStore = create((set) => ({
  currentAngle: 0,
  peakAngle: 0,
  targetAngle: 90, // Default, will be overridden by plan
  initialBaseline: null, // Captures the 'REST' angle of the day
  repCount: 0,
  holdTimer: 0,
  sessionPhase: 'REST', // REST, RISING, TARGET_ZONE, HOLD, LOWERING
  isCalibrated: false,

  setCurrentAngle: (angle) => set({ currentAngle: Math.round(angle) }),
  setPeakAngle: (angle) => set((state) => ({ 
    peakAngle: Math.max(state.peakAngle, Math.round(angle)) 
  })),
  setTargetAngle: (angle) => set({ targetAngle: angle }),
  setRepCount: (count) => set({ repCount: count }),
  setSessionPhase: (phase) => {
     // If transitioning to RISING for the first time, mark as calibrated start
     set((state) => {
        if (state.sessionPhase === 'REST' && phase === 'RISING' && !state.initialBaseline) {
           return { sessionPhase: phase, initialBaseline: state.currentAngle };
        }
        return { sessionPhase: phase };
     });
  },
  
  setCalibrated: (val) => set({ isCalibrated: val }),

  // Handlers
  incrementRep: () => set((state) => ({ repCount: state.repCount + 1 })),
  resetSession: () => set({ 
    currentAngle: 0, 
    peakAngle: 0, 
    repCount: 0, 
    sessionPhase: 'REST', 
    initialBaseline: null,
    isCalibrated: false 
  })
}))
