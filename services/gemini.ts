
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function getDailyVerse() {
  try {
    const apiKey = process.env.API_KEY || '';
    if (!apiKey || apiKey === 'undefined') {
      // Mock response if no key is present to prevent crash/error
      await new Promise(resolve => setTimeout(resolve, 1000)); // Fake delay
      return "¡Gracias por tu reflexión! Sigue buscando la sabiduría de Dios. (Modo Offline: Agrega una API Key para análisis real)";
    }

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
      model: 'gemini-1.5-flash', // Updated to stable model name if needed, assuming alias works or use specific
      contents: `Analiza esta reflexión espiritual del usuario y devuélveme un feedback alentador y constructivo: "${text}"`,
    });
    return response.text;
  } catch (error) {
    return "¡Excelente reflexión! Sigue profundizando en tu fe.";
  }
}

export async function generateQuizQuestion(lessonContent: string) {
  try {
    const prompt = `Basado en el siguiente texto de la Escuela Sabática, genera UNA pregunta de comprensión con 3 opciones de respuesta (1 correcta, 2 incorrectas).
        
        Texto: "${lessonContent.substring(0, 1000)}..."
        
        Responde SOLAMENTE con un JSON válido con este formato:
        {
            "question": "¿Cuál es la pregunta?",
            "options": ["Opción A", "Opción B", "Opción C"],
            "correctAnswer": 0 // Índice de la respuesta correcta (0, 1, o 2)
        }
        `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text);

  } catch (error) {
    console.error("Error generating quiz:", error);
    // Fallback question
    return {
      question: "¿Qué nos enseña la lección de hoy principalmente?",
      options: ["Confianza en Dios", "Historia antigua", "Geografía bíblica"],
      correctAnswer: 0
    };
  }
}
