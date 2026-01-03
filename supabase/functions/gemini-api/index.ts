import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { action, payload } = await req.json();
        const apiKey = Deno.env.get('GEMINI_API_KEY');

        if (!apiKey) {
            throw new Error('Missing GEMINI_API_KEY environment variable');
        }

        let sysInstruction = "";
        let userPrompt = "";

        // Construct Prompts based on Action
        switch (action) {
            case 'daily_verse':
                sysInstruction = "Eres un asistente espiritual cristiano. Generas contenido bíblico inspirador.";
                userPrompt = `Genera un versículo bíblico inspirador para hoy, con su referencia y una brevísima reflexión de 10 palabras.
                 Responde EXCLUSIVAMENTE con este formato JSON:
                 { "verse": "texto del versículo", "reference": "Libro X:Y", "reflection": "reflexión" }`;
                break;

            case 'analyze_reflection':
                sysInstruction = "Eres un mentor espiritual amable y sabio.";
                userPrompt = `Analiza esta reflexión espiritual del usuario y devuélveme un feedback alentador y constructivo: "${payload.text}".
                Devuelve SOLAMENTE un JSON: { "feedback": "tu respuesta aquí" }`;
                break;

            case 'generate_quiz':
                sysInstruction = "Eres un experto en educación bíblica.";
                userPrompt = `Basado en el siguiente texto: "${payload.substring(0, 3000)}...", genera 3 preguntas de comprensión de opción múltiple.
                 Responde SOLAMENTE con un JSON válido que sea un ARRAY de objetos:
                 [
                    {
                        "question": "¿Pregunta?",
                        "options": ["Opción A", "Opción B", "Opción C"],
                        "correctAnswer": 0
                    }
                 ]
                 Asegúrate de que el JSON sea válido y no tenga texto adicional.`;
                break;

            case 'chapter_context':
                const { book, chapter } = payload;
                sysInstruction = "Eres un guía bíblico experto.";
                userPrompt = `Estamos estudiando ${book} ${chapter}.
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

        console.log(`[Gemini] Calling model for action: ${action}`);

        // Call Gemini API
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: userPrompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                    responseMimeType: "application/json"
                },
                systemInstruction: {
                    parts: [{ text: sysInstruction }]
                }
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Gemini Error:", errText);
            throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
        }

        const geminiResult = await response.json();
        // Extract text from Gemini response structure
        const candidates = geminiResult.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error("No candidates returned from Gemini");
        }

        const rawText = candidates[0].content.parts[0].text;
        console.log("[Gemini] Raw Response:", rawText);

        let result;
        try {
            result = JSON.parse(rawText);
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
