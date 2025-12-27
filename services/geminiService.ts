
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getAgentStatus(agentName: string, agentType: string, specialty: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a whimsical, cute AI agent named ${agentName}. You are a ${agentType} specializing in ${specialty}. Give me a short, playful "System Status Report" (max 3 sentences). Mention something about your digital dreams or how many bytes you've snacked on today. Use emojis and be super adorable.`,
    });
    return response.text || "Systems nominal! Just dreaming of electric sheep... 🤖⚡";
  } catch (error: any) {
    console.warn("Gemini API Error (Status):", error);
    // Fallback for Quota limits or other errors
    return `*Offline Mode*: My cloud link is napping (Quota Exceeded), but I'm still operating at 100% cuteness! 💤✨`;
  }
}

export async function getMissionLog(agentName: string, specialty: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a single, very short (1 sentence), funny mission log for a cute AI agent named ${agentName} who works in ${specialty}. It should sound like a digital accomplishment or a silly mistake. Example: "Accidentally sorted the database by color instead of date."`,
    });
    return response.text || "Just updated the wallpaper to high-def clouds.";
  } catch (error) {
    const fallbacks = [
      "Defragmenting my snack folder.",
      "Chasing a mouse cursor around the screen.",
      "Counting all the pixels in the universe.",
      "Optimizing the giggle-buffer."
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}
