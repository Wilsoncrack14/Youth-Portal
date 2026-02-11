// Daily verses collection (fallback)
export interface DailyVerse {
    text: string;
    reference: string;
    book: string;
    chapter: number;
}

const fallbackVerses: DailyVerse[] = [
    { text: "Lámpara es a mis pies tu palabra, y lumbrera a mi camino.", reference: "Salmos 119:105", book: "Salmos", chapter: 119 },
    { text: "Confía en el Señor de todo corazón, y no en tu propia inteligencia.", reference: "Proverbios 3:5", book: "Proverbios", chapter: 3 },
    { text: "Todo lo puedo en Cristo que me fortalece.", reference: "Filipenses 4:13", book: "Filipenses", chapter: 4 },
    { text: "Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito.", reference: "Juan 3:16", book: "Juan", chapter: 3 },
    { text: "El Señor es mi pastor; nada me faltará.", reference: "Salmos 23:1", book: "Salmos", chapter: 23 },
];

// Get fallback verse based on date
const getFallbackVerse = (): DailyVerse => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const index = dayOfYear % fallbackVerses.length;
    return fallbackVerses[index];
};

// Extract highlighted verse from chapter using AI (kept for backward compatibility)
export const extractHighlightedVerse = async (chapterText: string, reference: string): Promise<string> => {
    try {
        const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

        if (!GROQ_API_KEY) {
            console.warn("Missing GROQ_API_KEY, skipping AI verse extraction.");
            return "";
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un asistente que identifica el versículo más impactante y significativo de un capítulo bíblico. Responde SOLO con el texto del versículo, sin números de versículo ni explicaciones adicionales.'
                    },
                    {
                        role: 'user',
                        content: `Del siguiente capítulo bíblico (${reference}), extrae el versículo más destacado, inspirador y significativo. Responde SOLO con el texto del versículo:\n\n${chapterText.substring(0, 3000)}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 200,
            }),
        });

        if (!response.ok) {
            console.error(`Groq API error: ${response.status} ${response.statusText}`);
            return "";
        }

        const data = await response.json();
        return data?.choices?.[0]?.message?.content?.trim() || '';
    } catch (error) {
        console.error('Error extracting verse:', error);
        return '';
    }
};

// Get daily verse from pre-generated table or fallback
export const getDailyVerse = async (userId?: string): Promise<DailyVerse> => {
    if (!userId) {
        return getFallbackVerse();
    }

    try {
        // Import supabase here to avoid circular dependencies
        const { supabase } = await import('./supabase');

        // Get today's reading to know which chapter was read
        const today = new Date().toISOString().split('T')[0];
        const { data: reading } = await supabase
            .from('daily_readings')
            .select('reference')
            .eq('user_id', userId)
            .gte('created_at', today)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (reading?.reference) {
            // Look up the pre-generated verse for this chapter
            const { data: chapterVerse } = await supabase
                .from('chapter_verses')
                .select('highlighted_verse, reference, book, chapter')
                .eq('reference', reading.reference)
                .single();

            if (chapterVerse) {
                return {
                    text: chapterVerse.highlighted_verse,
                    reference: chapterVerse.reference,
                    book: chapterVerse.book,
                    chapter: chapterVerse.chapter,
                };
            }

            // If no pre-generated verse exists, return a placeholder
            const refMatch = reading.reference.match(/^(.+?)\s+(\d+)/);
            const book = refMatch ? refMatch[1] : 'Génesis';
            const chapter = refMatch ? parseInt(refMatch[2]) : 1;

            return {
                text: 'Versículo destacado aún no disponible para este capítulo',
                reference: reading.reference,
                book,
                chapter,
            };
        }

        return getFallbackVerse();
    } catch (error) {
        console.error('Error getting daily verse:', error);
        return getFallbackVerse();
    }
};
