import { supabase } from './supabase';

interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: number;
}

export async function generateQuizQuestion(lessonContent: string): Promise<QuizQuestion[]> {
    try {
        console.log('🤖 Generating quiz for content length:', lessonContent.length);

        const { data, error } = await supabase.functions.invoke('mistral-chat', {
            body: {
                action: 'generate_quiz',
                payload: lessonContent
            }
        });

        console.log('📥 Quiz generation response:', { data, error });

        if (error) {
            console.error('❌ Supabase function error:', error);
            throw error;
        }

        // Backend now returns: { questions: [...] }
        if (data && data.questions && Array.isArray(data.questions)) {
            console.log('✅ Valid quiz received:', data.questions);
            return data.questions as QuizQuestion[];
        } else if (data && data.error) {
            console.error('❌ AI returned error:', data.error);
            throw new Error(data.error);
        } else {
            console.error('❌ Invalid quiz structure:', data);
            throw new Error('Invalid quiz structure received from AI');
        }

    } catch (error) {
        console.error('❌ Error generating quiz:', error);
        console.log('⚠️ Using fallback questions');
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
        // Create cache key based on book and chapter
        const cacheKey = `chapter_context_${book}_${chapter}`;

        // Check if we have cached data in localStorage
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                return parsed;
            } catch (e) {
                localStorage.removeItem(cacheKey);
            }
        }

        // If no cache, fetch from API
        const { data, error } = await supabase.functions.invoke('mistral-chat', {
            body: {
                action: 'chapter_context',
                payload: { book, chapter }
            }
        });

        if (error) throw error;

        // Gemini API now returns the JSON object directly
        if (data && data.previous_summary && data.current_preview) {
            // Save to localStorage for future use
            localStorage.setItem(cacheKey, JSON.stringify(data));
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
