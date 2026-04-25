/**
 * Master Dataset for NeuroMotion AI Recovery Plans
 * This defines the base exercises and their parameters for different injury types.
 */

export const RECOVERY_DATASET = [
  // KNEE RECOVERY
  {
    id: 'knee-ext-basic',
    name: 'Seated Knee Extension',
    joint: 'knee',
    injury_type: ['ACL Recovery', 'Tear', 'Surgery', 'Stiffness'],
    base_reps: 10,
    base_sets: 3,
    min_angle: 0,
    max_angle: 160,
    difficulty: 'Easy',
    exercise_steps: [
      'Sit upright on a firm chair.',
      'Slowly straighten your affected leg.',
      'Hold the contraction at the top.',
      'Slower lower back to the start.'
    ]
  },
  {
    id: 'knee-curl-standing',
    name: 'Standing Hamstring Curl',
    joint: 'knee',
    injury_type: ['ACL Recovery', 'Stiffness'],
    base_reps: 8,
    base_sets: 3,
    min_angle: 0,
    max_angle: 90,
    difficulty: 'Moderate',
    exercise_steps: [
      'Stand holding a chair for balance.',
      'Bend your knee, bringing your heel toward your glute.',
      'Hold for 2 seconds.',
      'Slowly lower.'
    ]
  },
  // ELBOW / BICEP RECOVERY
  {
    id: 'elbow-curl-basic',
    name: 'Bicep Rehabilitation Curl',
    joint: 'elbow',
    injury_type: ['Surgery Recovery', 'Muscle Tear', 'Stiffness'],
    base_reps: 12,
    base_sets: 3,
    min_angle: 0,
    max_angle: 145,
    difficulty: 'Easy',
    exercise_steps: [
      'Keep your elbow tucked at your side.',
      'Slowly curl your palm toward your shoulder.',
      'Squeeze at the top.',
      'Lower with control.'
    ]
  },
  {
    id: 'elbow-extension-overhead',
    name: 'Overhead Tricep Extension',
    joint: 'elbow',
    injury_type: ['Stiffness', 'Post-Op'],
    base_reps: 10,
    base_sets: 2,
    min_angle: 140,
    max_angle: 50,
    difficulty: 'High',
    exercise_steps: [
      'Raise your arm overhead, supporting the elbow.',
      'Slowly bend your elbow behind your head.',
      'Extend back to the ceiling.'
    ]
  }
];
