import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Start with a reliable model. Llama 3 is fast and good.
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { action, payload } = await req.json();
        const apiKey = Deno.env.get('GROQ_API_KEY');

        if (!apiKey) {
            throw new Error('Missing GROQ_API_KEY environment variable');
        }

        let systemContent = "";
        let userContent = "";

        // Construct Prompts based on Action
        switch (action) {
            case 'daily_verse':
                systemContent = "Eres un asistente espiritual cristiano. Generas contenido bíblico inspirador. Responde SIEMPRE en JSON válido.";
                userContent = `Genera un versículo bíblico inspirador para hoy, con su referencia y una brevísima reflexión de 10 palabras.
                 Responde EXCLUSIVAMENTE con este formato JSON:
                 { "verse": "texto del versículo", "reference": "Libro X:Y", "reflection": "reflexión" }`;
                break;

            case 'analyze_reflection':
                systemContent = "Eres un mentor espiritual amable y sabio. Responde SIEMPRE en JSON válido.";
                userContent = `Analiza esta reflexión espiritual del usuario y devuélveme un feedback alentador y constructivo: "${payload.text}".
                Devuelve SOLAMENTE un JSON: { "feedback": "tu respuesta aquí" }`;
                break;

            case 'generate_quiz':
                systemContent = "Eres un experto en educación bíblica. Tu tarea es generar preguntas de opción múltiple en formato JSON estricto.";
                userContent = `Basado en el siguiente texto: "${payload.substring(0, 3000)}...", genera 3 preguntas de comprensión de opción múltiple.
                 Responde SOLAMENTE con un JSON válido que sea un ARRAY de objetos:
                 [
                    {
                        "question": "¿Pregunta?",
                        "options": ["Opción A", "Opción B", "Opción C"],
                        "correctAnswer": 0
                    }
                 ]
                 Asegúrate de que el JSON sea válido y no tenga texto adicional ni markdown (como \`\`\`json).`;
                break;

            case 'chapter_context':
                const { book, chapter } = payload;
                systemContent = "Eres un guía bíblico experto. Responde SIEMPRE en JSON válido.";
                userContent = `Estamos estudiando ${book} ${chapter}.
                Genera un JSON con:
                1. "previous_summary": Resumen muy corto del capítulo anterior.
                2. "current_preview": Frase enganchadora sobre este capítulo.
                
                Responde SOLO JSON con estos campos exactos:
                {
                    "previous_summary": "...",
                    "current_preview": "..."
                }`;
                break;

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        console.log(`[Groq] Calling model for action: ${action}`);

        // Call Groq API
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", // Using the latest versatile model
                messages: [
                    { role: "system", content: systemContent },
                    { role: "user", content: userContent }
                ],
                temperature: 0.5,
                max_tokens: 1024,
                response_format: { type: "json_object" } // Force JSON mode if supported or helps prompts
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Groq Error:", errText);
            throw new Error(`Groq API Error: ${response.status} ${response.statusText}`);
        }

        const groqResult = await response.json();
        const rawText = groqResult.choices[0]?.message?.content || "";
        console.log("[Groq] Raw Response:", rawText);

        let result;
        try {
            // Clean up potential markdown
            let cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            result = JSON.parse(cleanText);
        } catch (e) {
            console.error("JSON Parse Error:", e, "Input was:", rawText);
            result = { error: "Error parsing AI response" };
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
