import { supabase } from './supabase'
import { clinicalData } from './clinicalDataset'

/**
 * Calculates adaptive roadmap duration based on mobility and pain.
 */
function calculateDuration(mobility, pain) {
  let extraDays = 0;
  if (mobility === 1) extraDays += 10;
  if (mobility === 2) extraDays += 5;
  extraDays += Math.floor(pain * 0.8);
  const total = 12 + extraDays;
  return Math.min(30, Math.max(12, total));
}

/**
 * Deterministic Roadmap Generator
 * Synchronizes Clinical CSV logic with Patient Demographics and AI Calibration.
 */
export async function generateInitialPlan(userId, profile) {
  const { affected_joint, condition_type, pain_level_baseline, mobility_grade, age, gender, baseline_rom } = profile;
  const totalDays = calculateDuration(mobility_grade, pain_level_baseline);
  
  // 1. Demographic Scaling Factors
  let intensityLevel = 1.0;
  let volumeFactor = 1.0;
  let holdFactor = 1.0;

  if (age > 60) {
    intensityLevel = 0.7;
    volumeFactor = 0.6;
    holdFactor = 1.5; // Longer, safer holds
  } else if (age < 25) {
    volumeFactor = 1.3;
    intensityLevel = 1.1;
  }

  if (gender === 'Female') {
    intensityLevel *= 0.95; // Clinical ROM adjustment
  }
  
  // 2. Filter exercises for the specific joint AND injury type
  let filteredExercises = clinicalData.filter(d => 
    d.joint?.toLowerCase() === affected_joint?.toLowerCase() &&
    d.injury_type?.toLowerCase() === condition_type?.toLowerCase()
  );

  // Fallback to just joint if clinical descriptor is too specific
  if (filteredExercises.length === 0) {
    filteredExercises = clinicalData.filter(d => 
      d.joint?.toLowerCase() === affected_joint?.toLowerCase()
    );
  }

  // Final fallback to prevent empty roadmap
  if (filteredExercises.length === 0) {
    filteredExercises = clinicalData.slice(0, 10);
  }

    // 3. Prepare Difficulty Pools
    const easyEx = filteredExercises.filter(e => e.difficulty === 'Easy');
    const mediumEx = filteredExercises.filter(e => e.difficulty === 'Medium');
    const hardEx = filteredExercises.filter(e => e.difficulty === 'Hard');

    // 4. Generate roadmap: multiple exercises per day based on progress
    const roadmap = [];
    // Ensure we have at least 2 exercises even if pain is high, but respect volumeFactor
    const baseExercisesPerDay = pain_level_baseline > 7 ? 2 : 4;
    const exercisesPerDay = Math.max(2, Math.round(baseExercisesPerDay * volumeFactor));

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
        const progress = dayNum / totalDays;
        const isRestDay = (dayNum % 7 === 0);

        if (isRestDay) {
            roadmap.push({
                patient_id: userId,
                day_number: dayNum,
                exercise_order: 1,
                injury_type: condition_type || 'Rest',
                joint: affected_joint || 'Full Body',
                exercise_name: 'Active Rest Day',
                body_part: 'Full Body',
                min_angle: 0,
                max_angle: 0,
                difficulty: 'None',
                stage: 'Recovery',
                pain_min: 0,
                pain_max: 0,
                reps: 0,
                sets: 0,
                goal: 'Allow neural and physical recovery',
                exercise_steps: 'Rest and hydrate. Light walking is permitted.',
                hold_seconds: 0,
                intensity_level: 'None',
                target_angle: 0,
                target_reps: 0,
                target_sets: 0,
                is_completed: false
            });
            continue;
        }

        // Determine Allowed Pool for this phase
        let allowedPool = [...easyEx];
        if (dayNum > 5) allowedPool = [...easyEx, ...mediumEx];
        if (dayNum > 12) allowedPool = [...easyEx, ...mediumEx, ...hardEx];

        // Ensure we have enough exercises to pick from
        if (allowedPool.length === 0) allowedPool = filteredExercises;

        // Shuffle the pool for this day to ensure variety
        const dailyPool = [...allowedPool].sort(() => 0.5 - Math.random());
        
        // Pick 'exercisesPerDay' unique tasks from the daily pool
        const selectedForDay = dailyPool.slice(0, exercisesPerDay);

        for (let order = 1; order <= selectedForDay.length; order++) {
            const baseEx = selectedForDay[order - 1];
            
            // --- 🧬 Directional Trajectory Logic ---
            const name = baseEx.exercise_name.toLowerCase();
            const isFlexion = name.includes('flexion') || name.includes('bend') || name.includes('cat') || name.includes('tilt') || name.includes('rotation') || name.includes('extension');
            
            const minA = parseInt(baseEx.min_angle) || 30;
            const maxA = parseInt(baseEx.max_angle) || 160;

            const startAngle = baseline_rom || (isFlexion ? maxA : minA);
            const finalGoal = isFlexion ? minA : maxA;
            
            const totalGap = finalGoal - startAngle;
            const progressFactor = dayNum / totalDays;
            
            // Clinical "Safe Start"
            const stepSize = totalGap / totalDays;
            const safeStep = Math.abs(stepSize) < 2 ? (totalGap > 0 ? 2 : -2) : stepSize;
            
            let targetAngle;
            if (dayNum === 1) {
                targetAngle = Math.round(startAngle + safeStep);
            } else {
                targetAngle = Math.round(startAngle + (totalGap * progressFactor));
            }

            // --- 📈 Parameter Scaling ---
            const baseReps = parseInt(baseEx.reps) || 8;
            const targetReps = Math.round(baseReps * volumeFactor + (progressFactor * 5));
            const targetSets = parseInt(baseEx.sets) || (2 + Math.floor(progressFactor * 2));
            const holdSecs = Math.round((parseInt(baseEx.hold_seconds) || 5) * holdFactor);

            let intensity = baseEx.intensity_level || 'Low';
            if (!baseEx.intensity_level || baseEx.intensity_level === 'Low') {
                if (progressFactor > 0.3) intensity = 'Moderate';
                if (progressFactor > 0.7) intensity = 'High';
            }

            roadmap.push({
                patient_id: userId,
                day_number: dayNum,
                exercise_order: order,
                injury_type: baseEx.injury_type || condition_type,
                joint: baseEx.joint || affected_joint,
                exercise_name: baseEx.exercise_name,
                body_part: baseEx.body_part || affected_joint,
                min_angle: minA,
                max_angle: maxA,
                difficulty: baseEx.difficulty || 'Easy',
                stage: baseEx.stage || (dayNum <= 7 ? 'Initial' : 'Progressive'),
                pain_min: parseInt(baseEx.pain_min) || Math.max(0, pain_level_baseline - 2),
                pain_max: parseInt(baseEx.pain_max) || pain_level_baseline,
                reps: targetReps,
                sets: targetSets,
                goal: baseEx.goal || `Target: ${targetAngle} degrees`,
                exercise_steps: baseEx.exercise_steps || 'Perform slowly with control',
                hold_seconds: holdSecs,
                intensity_level: intensity,
                target_angle: targetAngle,
                target_reps: targetReps,
                target_sets: targetSets,
                is_completed: false
            });
        }
    }

  try {
    const { error: insertError } = await supabase.from('daily_plans').insert(roadmap);
    if (insertError) {
       console.error("Roadmap Sync Failed:", insertError);
       throw insertError;
    }
    return { roadmap, totalDays };
  } catch (err) {
    console.error("Roadmap Generation Failed:", err);
    throw err;
  }
}
