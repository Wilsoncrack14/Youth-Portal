// Setup type definitions for built-in Supabase runtime
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import text from "pdf-parse";

// CORS headers for all responses
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { weekId, pdfUrl, weekTitle } = await req.json();

        // 1. Download PDF
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) throw new Error('Failed to download PDF');
        const pdfBuffer = await pdfResponse.arrayBuffer();

        // 2. Extract Text
        const data = await text(new Uint8Array(pdfBuffer));
        const pdfText = data.text;

        if (!pdfText || pdfText.length < 500) {
            throw new Error("No se detectó suficiente texto en el PDF. Puede ser una imagen escaneada.");
        }

        // Define days
        const daysToExtract = [
            { day: 'saturday', label: 'Sábado', context: 'Enfócate en la introducción y versículo para memorizar.' },
            { day: 'sunday', label: 'Domingo', context: 'Extrae la lección del Domingo.' },
            { day: 'monday', label: 'Lunes', context: 'Extrae la lección del Lunes.' },
            { day: 'tuesday', label: 'Martes', context: 'Extrae la lección del Martes.' },
            { day: 'wednesday', label: 'Miércoles', context: 'Extrae la lección del Miércoles.' },
            { day: 'thursday', label: 'Jueves', context: 'Extrae la lección del Jueves.' },
            { day: 'friday', label: 'Viernes', context: 'Extrae la conclusión y preguntas del Viernes.' },
        ];

        console.log('Starting sequential extraction for 7 days...');
        const groqApiKey = Deno.env.get('GROQ_API_KEY');
        if (!groqApiKey) throw new Error('GROQ_API_KEY not configured');

        // Helper for batch processing to avoid Rate Limits
        const processInBatches = async (items: any[], batchSize: number, processItem: (item: any) => Promise<any>) => {
            const results = [];
            for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                const batchResults = await Promise.all(batch.map(processItem));
                results.push(...batchResults);

                // Add 5s delay between batches to respect rate limits
                if (i + batchSize < items.length) {
                    console.log('Waiting 5 seconds before next batch...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
            return results;
        };

        const errors: string[] = [];

        // Helper to delay
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Process in batches of 3 days with delay and optimized context
        const results = await processInBatches(daysToExtract, 3, async ({ day, label, context }) => {
            let attempts = 0;
            const maxAttempts = 2;

            while (attempts < maxAttempts) {
                attempts++;
                try {
                    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${groqApiKey}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            model: "llama-3.3-70b-versatile",
                            messages: [
                                {
                                    role: "system",
                                    content: `Eres un asistente teológico experto en la Escuela Sabática. Extrae SOLAMENTE el contenido del día: ${label}.
                                    ${context}
                                    
                                    IMPORTANTE: En el campo "verses", incluye TODAS las referencias bíblicas mencionadas en el texto del ${label}, no solo algunas. 
                                    Busca citas como "Juan 3:16", "Fil. 1:7", "Hech. 16:24", "1 Cor. 15:1-4", etc.
                                    
                                    Responde SOLAMENTE con este JSON válido (sin markdown, sin explicaciones):
                                    {
                                      "day": "${day}",
                                      "title": "Título específico del ${label}",
                                      "content": "Contenido teológico COMPLETO del ${label} (mínimo 3-4 párrafos)",
                                      "verses": ["Todas las referencias bíblicas mencionadas en el texto"],
                                      "questions": ["Pregunta 1", "Pregunta 2"]
                                    }`
                                },
                                {
                                    role: "user",
                                    content: `Del siguiente texto de la lección "${weekTitle}", extrae EXCLUSIVAMENTE la sección del ${label}. NO incluyas contenido de otros días.\n\nTEXTO COMPLETO:\n${pdfText.substring(0, 15000)}`
                                }
                            ],
                            temperature: 0.1,
                            max_tokens: 2500,
                            response_format: { type: "json_object" }
                        }),
                    });

                    if (response.status === 429) {
                        const retryAfter = 5000 * attempts; // 5s then 10s backoff
                        console.warn(`Rate Limit for ${day}. Waiting ${retryAfter}ms...`);
                        await delay(retryAfter);
                        continue;
                    }

                    if (!response.ok) {
                        const errText = await response.text();
                        console.error(`Error extracting ${day}:`, errText);
                        errors.push(`${label} API Error: ${errText.substring(0, 100)}`);
                        return null;
                    }

                    const data = await response.json();
                    try {
                        return JSON.parse(data.choices[0].message.content);
                    } catch (e) {
                        console.error(`Error parsing JSON for ${day}:`, e);
                        errors.push(`${label} JSON Error: ${e.message}`);
                        return null;
                    }
                } catch (err: any) {
                    console.error(`General Error ${day}:`, err);
                    errors.push(`${label} Error: ${err.message}`);
                    return null;
                }
            }
            return null;
        });

        const validDays = results.filter(d => d !== null);

        if (validDays.length === 0) {
            throw new Error(`Falló la extracción. Detalles: ${errors.join(' | ').substring(0, 300)}...`);
        }

        // Sort days to ensure order (Sabbath -> Friday)
        const order = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        validDays.sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));

        const structuredContent = { days: validDays };

        console.log(`Extraction complete. Got ${validDays.length}/7 days.`);
        if (errors.length > 0) {
            console.warn('Some days failed:', errors);
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Contenido extraído: ${validDays.length}/7 días${errors.length > 0 ? ` (${errors.length} fallaron)` : ''}`,
                data: {
                    weeks: [
                        { ...structuredContent }
                    ]
                },
                errors: errors.length > 0 ? errors : undefined
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error processing weekly lesson:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    }
});
