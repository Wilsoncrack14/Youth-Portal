import { supabase } from './supabase';

interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: number;
}

export async function generateQuizQuestion(lessonContent: string): Promise<QuizQuestion[]> {
    try {
        const { data, error } = await supabase.functions.invoke('mistral-chat', {
            body: {
                action: 'generate_quiz',
                payload: lessonContent
            }
        });

        if (error) throw error;

        // Gemini API now returns the JSON object directly
        if (data && Array.isArray(data)) {
            return data as QuizQuestion[];
        } else if (data && data.error) {
            throw new Error(data.error);
        } else {
            throw new Error('Invalid quiz structure received from AI');
        }

    } catch (error) {
        console.error('Error generating quiz:', error);
        // Fallback questions
        return [
            {
                question: "¿Qué nos enseña principalmente este capítulo?",
                options: ["La fidelidad de Dios", "Historia antigua", "Geografía"],
                correctAnswer: 0
            },
            {
                question: "¿Cuál es el mensaje central del texto?",
                options: ["Juicio", "Amor y redención", "Leyes ceremoniales"],
                correctAnswer: 1
            },
            {
                question: "¿Qué debemos aplicar a nuestra vida?",
                options: ["Rituales", "Confianza en Dios", "Tradiciones"],
                correctAnswer: 1
            }
        ];
    }
}


export async function getChapterContext(book: string, chapter: number) {
    try {
        const { data, error } = await supabase.functions.invoke('mistral-chat', {
            body: {
                action: 'chapter_context',
                payload: { book, chapter }
            }
        });

        if (error) throw error;

        // Gemini API now returns the JSON object directly
        if (data && data.previous_summary && data.current_preview) {
            return data;
        } else if (data && data.error) {
            throw new Error(data.error);
        } else {
            throw new Error('Invalid context structure received from AI');
        }

    } catch (error) {
        console.error('Error fetching context:', error);
        return {
            previous_summary: "El pueblo de Dios continúa su viaje de fe...",
            current_preview: "Descubre grandes lecciones en este capítulo."
        };
    }
}
