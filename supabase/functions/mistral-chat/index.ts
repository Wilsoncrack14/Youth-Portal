import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Lista de orígenes permitidos (configurables vía variable de entorno)
const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',').map(o => o.trim()) || [
    'https://youth-portal.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3800',
    'http://localhost:3000'
];

const getCorsHeaders = (origin: string | null) => {
    // Permissive CORS: Allow the requesting origin, or '*' if not present
    const allowedOrigin = origin || '*';

    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
};

// Start with a reliable model. Llama 3 is fast and good.
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

serve(async (req) => {
    const origin = req.headers.get('origin');
    const headers = getCorsHeaders(origin);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers });
    }

    try {
        // ✅ VERIFICACIÓN JWT: Autenticar usuario
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No autorizado: falta token de autenticación' }),
                {
                    status: 401,
                    headers: { ...headers, 'Content-Type': 'application/json' }
                }
            );
        }

        // Crear cliente de Supabase con el token del usuario
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader }
                }
            }
        );

        // Verificar que el token es válido
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'No autorizado: token inválido o expirado' }),
                {
                    status: 401,
                    headers: { ...headers, 'Content-Type': 'application/json' }
                }
            );
        }

        console.log(`[Auth] Usuario verificado: ${user.id}`);

        // ✅ Usuario autenticado, continuar con la lógica normal
        const { action, payload, messages } = await req.json();
        const apiKey = Deno.env.get('GROQ_API_KEY');

        if (!apiKey) {
            throw new Error('Missing GROQ_API_KEY environment variable');
        }

        // BACKWARD COMPATIBILITY: If no action is provided but messages are, behave like old chat
        if (!action && messages) {
            const response = await fetch(GROQ_API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "system",
                            content: `Eres un asistente espiritual cristiano amable y sabio. 
                            
                            IMPORTANTE: Formatea tus respuestas de manera clara y estructurada:
                            - Usa **Título** para encabezados importantes (con doble asterisco)
                            - Separa ideas en párrafos distintos (usa saltos de línea)
                            - Usa listas con + o - para enumerar puntos
                            - Mantén las respuestas concisas pero completas
                            - Usa un tono cálido y alentador
                            
                            Ejemplo de formato:
                            **El Diluvio Universal**
                            
                            Según Génesis 6-9, el diluvio fue un evento de juicio y salvación.
                            
                            Animales que se salvaron:
                            + Mamíferos (leones, osos, etc.)
                            + Aves (palomas, águilas, etc.)
                            + Reptiles (serpientes, tortugas, etc.)`
                        },
                        ...messages
                    ],
                    temperature: 0.7,
                    max_tokens: 500,
                }),
            });
            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content || "";
            return new Response(JSON.stringify({ reply }), {
                headers: { ...headers, 'Content-Type': 'application/json' },
                status: 200,
            });
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
                systemContent = "Eres un experto en educación bíblica. Tu tarea es generar preguntas de opción múltiple en formato JSON estricto basadas en el contenido completo del texto proporcionado.";
                userContent = `Basado en el siguiente texto bíblico: "${payload.substring(0, 8000)}...", genera 3 preguntas de comprensión de opción múltiple que evalúen la comprensión del contenido COMPLETO del capítulo.
                 
                 Las preguntas deben:
                 - Cubrir diferentes partes del capítulo (inicio, medio, final)
                 - Evaluar comprensión de eventos, personajes y enseñanzas clave
                 - Tener opciones plausibles pero con una respuesta claramente correcta
                 
                 Responde SOLAMENTE con este formato JSON (objeto con array dentro):
                 {
                    "questions": [
                        {
                            "question": "¿Pregunta sobre el contenido?",
                            "options": ["Opción A", "Opción B", "Opción C"],
                            "correctAnswer": 0
                        }
                    ]
                 }
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
            console.log("[Groq] Parsed result:", result);
        } catch (e) {
            console.error("JSON Parse Error:", e, "Input was:", rawText);
            result = { error: "Error parsing AI response" };
        }

        // All responses follow consistent object pattern
        return new Response(JSON.stringify(result), {
            headers: { ...headers, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...headers, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
