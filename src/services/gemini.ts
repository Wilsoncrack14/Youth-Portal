import { supabase } from './supabase';

export async function getDailyVerse() {
  try {
    const { data, error } = await supabase.functions.invoke('gemini-api', {
      body: { action: 'daily_verse' }
    });

    if (error) throw error;
    return data;
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
    const { data, error } = await supabase.functions.invoke('gemini-api', {
      body: { action: 'analyze_reflection', payload: { text } }
    });

    if (error) throw error;
    return data.feedback;
  } catch (error) {
    return "¡Excelente reflexión! Sigue profundizando en tu fe.";
  }
}

export async function generateQuizQuestion(lessonContent: string) {
  try {
    const { data, error } = await supabase.functions.invoke('gemini-api', {
      body: { action: 'generate_quiz', payload: lessonContent }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error generating quiz:", error);
    return [
      {
        question: "¿Qué nos enseña la lección de hoy principalmente?",
        options: ["Confianza en Dios", "Historia antigua", "Geografía bíblica"],
        correctAnswer: 0
      },
      {
        question: "¿Cuál es el tema central del capítulo?",
        options: ["Guerra", "Amor y Redención", "Leyes"],
        correctAnswer: 1
      },
      {
        question: "¿Qué personaje destaca en la lectura?",
        options: ["Moises", "El salmista", "Pablo"],
        correctAnswer: 1
      }
    ];
  }
}

export async function getChapterContext(book: string, chapter: number) {
  try {
    const { data, error } = await supabase.functions.invoke('gemini-api', {
      body: {
        action: 'chapter_context',
        payload: { book, chapter }
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching context:", error);
    return {
      previous_summary: "El pueblo de Dios continúa su viaje...",
      current_preview: "Descubre grandes lecciones en este capítulo."
    };
  }
}
