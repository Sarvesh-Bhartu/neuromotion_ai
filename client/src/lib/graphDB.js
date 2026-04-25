const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Syncs a completed session to the Knowledge Graph via Backend
 */
export async function syncSessionToGraph(patientId, sessionData) {
  try {
    const res = await fetch(`${API_URL}/api/graph/sync-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, sessionData })
    });
    const data = await res.json();
    return data.sessionId;
  } catch (error) {
    console.error("Neo4j Sync Error:", error);
  }
}

/**
 * Logs a Fatigue Event triggered by the Voice Coach via Backend
 */
export async function logFatigueToGraph(patientId, exerciseName, fatigueType) {
  try {
    await fetch(`${API_URL}/api/graph/log-fatigue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, exerciseName, fatigueType })
    });
  } catch (error) {
    console.error("Neo4j Fatigue Log Error:", error);
  }
}

/**
 * Initialized the connection and ensures the Patient/Exercise nodes exist via Backend
 */
export async function initPatientExercise(patientId, exerciseName, profile) {
  try {
    await fetch(`${API_URL}/api/graph/init-patient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, exerciseName, profile })
    });
  } catch (error) {
    console.error("Neo4j Init Error:", error);
  }
}

/**
 * Synchronizes the entire recovery roadmap via Backend
 */
export async function syncRoadmapToGraph(patientId, roadmap) {
  try {
    await fetch(`${API_URL}/api/graph/sync-roadmap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, roadmap })
    });
  } catch (error) {
    console.error("Neo4j Roadmap Sync Error:", error);
  }
}

export async function syncProfileToGraph(patientId, profile) {
  return initPatientExercise(patientId, "OnboardingCalibration", profile);
}

// Dummy export to prevent breaking other files that import 'driver'
export default {};
