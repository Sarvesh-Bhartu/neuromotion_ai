const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function invokeGemini(context, transcript) {
  try {
    const res = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, transcript })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    
    return data.text;
  } catch (error) {
    console.error("Backend AI call failed:", error);
    return "I am having trouble processing that right now, but please take a deep breath and keep pushing through.";
  }
}
