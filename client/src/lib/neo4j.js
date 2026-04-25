import neo4j from 'neo4j-driver';

const uri = import.meta.env.VITE_NEO4J_URI;
const user = import.meta.env.VITE_NEO4J_USER;
const password = import.meta.env.VITE_NEO4J_PASS;

let driver;

try {
  driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
} catch (error) {
  console.error('Failed to create Neo4j driver', error);
}

export const executeCypher = async (query, params = {}) => {
  if (!driver) return null;
  const session = driver.session();
  try {
    const result = await session.run(query, params);
    return result;
  } catch (error) {
    console.error('Neo4j Cypher Execution Error:', error);
    throw error;
  } finally {
    await session.close();
  }
};

/**
 * Session 10: Doctor Linking Logic
 * Generates the (Doctor)-[:TREATS]->(Patient) relationship in the graph.
 */
export const linkDoctorToPatient = async (patientId, patientName, doctorName) => {
  const query = `
    MERGE (p:Patient {id: $patientId})
    SET p.name = $patientName
    MERGE (d:Doctor {name: $doctorName})
    MERGE (d)-[r:TREATS]->(p)
    SET r.linkedAt = datetime()
    RETURN d, r, p
  `;
  return await executeCypher(query, { patientId, patientName, doctorName });
};
