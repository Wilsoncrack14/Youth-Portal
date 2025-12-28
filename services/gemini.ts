
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function getDailyVerse() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Genera un versículo bíblico inspirador para hoy, con su referencia y una brevísima reflexión de 10 palabras.",
      config: {
        responseMimeType: "application/json",
      },
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error fetching verse:", error);
    return {
      verse: "Lámpara es a mis pies tu palabra, y lumbrera a mi camino.",
      reference: "Salmos 119:105",
      reflection: "Tu palabra guía mi caminar cada día con sabiduría."
    };
  }
}

export async function analyzeReflection(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analiza esta reflexión espiritual del usuario y devuélveme un feedback alentador y constructivo: "${text}"`,
    });
    return response.text;
  } catch (error) {
    return "¡Excelente reflexión! Sigue profundizando en tu fe.";
  }
}
