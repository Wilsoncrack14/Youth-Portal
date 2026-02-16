// Setup type definitions for built-in Supabase runtime
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import text from "npm:pdf-parse@1.1.1";

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
        // 1. Authenticate User
        const authHeader = req.headers.get('Authorization');
        console.log("Auth Header present:", !!authHeader); // log boolean to avoid leaking token

        if (!authHeader) {
            console.error("Missing Authorization header");
            throw new Error('Missing Authorization header');
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            console.error("User Auth Failed:", userError);
            return new Response(JSON.stringify({ error: 'Unauthorized', details: userError }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log("User authenticated:", user.id);

        // 2. Authorization Check (Admin Only)
        // We use the Service Role client to check the sensitive 'is_admin' function or profile/claim
        // Alternatively, if we trust the `is_admin` function we created in DB, we can call it.
        // Let's call the RPC function we created.
        const { data: isAdmin, error: adminError } = await supabaseClient.rpc('is_admin');

        if (adminError) {
            console.error("is_admin RPC Error:", adminError);
        }

        if (adminError || !isAdmin) {
            console.error("Admin Check Failed. IsAdmin:", isAdmin);
            return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }


        // 3. Validate Input (Anti-SSRF: Expect storagePath, not arbitrary URL)
        const { weekId, storagePath, weekTitle } = await req.json();

        if (!storagePath || typeof storagePath !== 'string') {
            throw new Error('Invalid storagePath');
        }

        // Optional: Validate path traversal or bucket validity
        if (!storagePath.startsWith('lesson-pdfs/') && !storagePath.match(/^[a-zA-Z0-9_\-\.\/]+$/)) {
            // For now, allow loosely, but ensure it doesn't leave the bucket logic below
        }

        console.log(`Processing file: ${storagePath} for week: ${weekTitle} (${weekId}) by Admin: ${user.id}`);

        // 4. Download PDF Internally (Using Service Role to access private bucket)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Remove bucket prefix if user included it, or ensure we know where it is
        // storagePath typically: "2026_Q1_file.pdf" inside 'lesson-pdfs' bucket? 
        // Or "lesson-pdfs/2026_Q1_file.pdf"? 
        // Frontend likely sends "filename.pdf".
        // Let's assume input is relative to bucket root. 

        const { data: fileData, error: downloadError } = await supabaseAdmin
            .storage
            .from('lesson-pdfs')
            .download(storagePath);

        if (downloadError) {
            console.error('Download error:', downloadError);
            throw new Error(`Failed to download file from storage: ${downloadError.message}`);
        }

        const pdfBuffer = await fileData.arrayBuffer();

        // 5. Extract Text
        // @ts-ignore: pdf-parse types matching
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

        // Helper for batch processing
        const processInBatches = async (items: any[], batchSize: number, processItem: (item: any) => Promise<any>) => {
            const results = [];
            for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                const batchResults = await Promise.all(batch.map(processItem));
                results.push(...batchResults);
                if (i + batchSize < items.length) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
            return results;
        };

        const errors: string[] = [];
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Process extraction
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
                                    IMPORTANTE: En el campo "verses", incluye TODAS las referencias bíblicas mencionadas en el texto del ${label}.
                                    Responde SOLAMENTE con este JSON válido:
                                    {
                                      "day": "${day}",
                                      "title": "Título específico del ${label}",
                                      "content": "Contenido teológico COMPLETO del ${label} (mínimo 3-4 párrafos)",
                                      "summary": "Breve lección aprendida o resumen del día (máx 140 caracteres)",
                                      "verses": ["Todas las referencias bíblicas"],
                                      "questions": ["Pregunta 1", "Pregunta 2"]
                                    }`
                                },
                                {
                                    role: "user",
                                    content: `Del siguiente texto de la lección "${weekTitle}", extrae EXCLUSIVAMENTE la sección del ${label}.\n\nTEXTO:\n${pdfText.substring(0, 15000)}`
                                }
                            ],
                            temperature: 0.1,
                            max_tokens: 2500,
                            response_format: { type: "json_object" }
                        }),
                    });

                    if (response.status === 429) {
                        const retryAfter = 5000 * attempts;
                        await delay(retryAfter);
                        continue;
                    }

                    if (!response.ok) {
                        const errText = await response.text();
                        errors.push(`${label} API Error: ${errText.substring(0, 100)}`);
                        return null;
                    }

                    const data = await response.json();
                    return JSON.parse(data.choices[0].message.content);
                } catch (err: any) {
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

        const order = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        validDays.sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));

        return new Response(
            JSON.stringify({
                success: true,
                message: `Contenido extraído: ${validDays.length}/7 días`,
                data: { weeks: [{ days: validDays }] },
                errors: errors.length > 0 ? errors : undefined
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error processing weekly lesson:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 } // Return 400 for bad request/logic errors, 500 for server
        );
    }
});
