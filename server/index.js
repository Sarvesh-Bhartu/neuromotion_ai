const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const neo4j = require('neo4j-driver');
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.all('/', (req, res) => {
  res.send('NeuroMotion AI Backend is Active!');
});

const PORT = process.env.PORT || 5000;

// --- Neo4j Driver Setup ---
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASS)
);

// --- Gemini AI Setup ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// --- Endpoints ---

// 1. Gemini Analysis
app.post('/api/analyze', async (req, res) => {
  try {
    const { context, transcript } = req.body;
    
    const prompt = `You are NeuroMotion AI, an empathetic physiotherapy assistant. 
Do not use markdown formatting. Speak purely in conversational English. 
Keep your response short, maximum 2 sentences. 
Do not be overly dramatic; be supportive, clinical, and reassuring.

Context of user's current physical status:
- Current Instruction Phase: ${context.sessionPhase}
- Repetitions Completed: ${context.repCount} / 10
- Their Real-time Knee Angle: ${context.currentAngle.toFixed(0)} degrees

The user just verbally stated: "${transcript}"

Generate your response to them now:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({ text: response.text().trim() });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Failed to process AI response" });
  }
});

// 2. Neo4j Sync Session
app.post('/api/graph/sync-session', async (req, res) => {
  const { patientId, sessionData } = req.body;
  const session = driver.session();
  const sessionId = `sess_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  try {
    const cypher = `
      MERGE (p:Patient {id: $patientId})
      MERGE (e:Exercise {name: $exerciseName})
      CREATE (s:Session {
        id: $sessionId,
        timestamp: datetime(),
        reps: $reps,
        peakAngle: $peakAngle,
        targetAngle: $targetAngle,
        currentSet: $currentSet,
        avgReactionMs: $avgReactionMs
      })
      CREATE (p)-[:PERFORMED]->(s)
      CREATE (s)-[:OF_EXERCISE]->(e)
      RETURN s.id as id
    `;

    await session.run(cypher, {
      patientId,
      sessionId,
      exerciseName: sessionData.exerciseName,
      reps: sessionData.reps,
      peakAngle: sessionData.peakAngle,
      targetAngle: sessionData.targetAngle,
      currentSet: sessionData.currentSet,
      avgReactionMs: sessionData.avgReactionMs || 0
    });
    
    res.json({ success: true, sessionId });
  } catch (error) {
    console.error("Neo4j Sync Error:", error);
    res.status(500).json({ error: "Failed to sync to graph" });
  } finally {
    await session.close();
  }
});

// 3. Neo4j Log Fatigue
app.post('/api/graph/log-fatigue', async (req, res) => {
  const { patientId, exerciseName, fatigueType } = req.body;
  const session = driver.session();
  const fatigueId = `fatigue_${Date.now()}`;
  try {
    const cypher = `
      MERGE (p:Patient {id: $patientId})
      MERGE (e:Exercise {name: $exerciseName})
      CREATE (f:FatigueEvent {
        id: $fatigueId,
        timestamp: datetime(),
        type: $fatigueType
      })
      CREATE (p)-[:EXPERIENCED]->(f)
      CREATE (f)-[:DURING_EXERCISE]->(e)
    `;
    await session.run(cypher, { patientId, fatigueId, exerciseName, fatigueType });
    res.json({ success: true });
  } catch (error) {
    console.error("Neo4j Fatigue Error:", error);
    res.status(500).json({ error: "Failed to log fatigue" });
  } finally {
    await session.close();
  }
});

// 4. Neo4j Init Patient
app.post('/api/graph/init-patient', async (req, res) => {
  const { patientId, exerciseName, profile } = req.body;
  const session = driver.session();
  try {
    const cypher = `
      MERGE (p:Patient {id: $patientId})
      SET p.age = $age,
          p.gender = $gender,
          p.baseline_rom = $baseline_rom,
          p.affected_joint = $affected_joint,
          p.affected_side = $affected_side,
          p.lastUpdated = datetime()

      MERGE (e:Exercise {name: $exerciseName})
      MERGE (p)-[r:ASSIGNED_TO]->(e)
      ON CREATE SET r.assignedAt = datetime()
    `;

    await session.run(cypher, { 
      patientId, 
      exerciseName,
      age: profile?.age || 0,
      gender: profile?.gender || 'Unknown',
      baseline_rom: profile?.baseline_rom || 0,
      affected_joint: profile?.affected_joint || 'Unknown',
      affected_side: profile?.affected_side || 'Unknown'
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Neo4j Init Error:", error);
    res.status(500).json({ error: "Failed to init patient" });
  } finally {
    await session.close();
  }
});

// 5. Neo4j Sync Roadmap
app.post('/api/graph/sync-roadmap', async (req, res) => {
  const { patientId, roadmap } = req.body;
  const session = driver.session();
  const planId = `plan_${Date.now()}`;
  try {
    const baseCypher = `
      MERGE (p:Patient {id: $patientId})
      CREATE (rp:RecoveryPlan {
        id: $planId,
        timestamp: datetime(),
        totalDays: $totalDays
      })
      CREATE (p)-[:HAS_PLAN]->(rp)
    `;
    await session.run(baseCypher, { patientId, planId, totalDays: roadmap.length });

    let prevTaskId = null;
    const visualizationLimit = Math.min(roadmap.length, 10);

    for (let i = 0; i < visualizationLimit; i++) {
        const day = roadmap[i];
        const taskId = `task_${planId}_day${day.day || day.day_number}`;
        const taskName = `Day ${day.day || day.day_number}: ${day.exercise_name || 'Recovery'}`;
        
        const taskCypher = `
          MATCH (rp:RecoveryPlan {id: $planId})
          CREATE (t:DailyTask {
            id: $taskId,
            day: $day,
            name: $name,
            targetAngle: $targetAngle
          })
          CREATE (rp)-[:CONTAINS]->(t)
        `;
        
        await session.run(taskCypher, { 
            planId, 
            taskId,
            day: day.day || day.day_number, 
            name: taskName,
            targetAngle: day.target_angle || 0
        });

        if (prevTaskId) {
            await session.run(`
              MATCH (t1:DailyTask {id: $prevId})
              MATCH (t2:DailyTask {id: $currId})
              CREATE (t1)-[:NEXT_TASK]->(t2)
            `, { prevId: prevTaskId, currId: taskId });
        }
        prevTaskId = taskId;
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Neo4j Roadmap Error:", error);
    res.status(500).json({ error: "Failed to sync roadmap" });
  } finally {
    await session.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
