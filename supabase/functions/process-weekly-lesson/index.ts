import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { weekId, pdfUrl, weekTitle } = await req.json();

        console.log('Processing weekly lesson:', { weekId, weekTitle });

        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Download PDF
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
            throw new Error('Failed to download PDF');
        }

        const pdfBuffer = await pdfResponse.arrayBuffer();
        const pdfText = await extractTextFromPDF(pdfBuffer);

        console.log('Extracted text length:', pdfText.length);

        // Process with AI to structure content for ONE WEEK (7 days)
        const groqApiKey = Deno.env.get('GROQ_API_KEY');
        if (!groqApiKey) {
            throw new Error('GROQ_API_KEY not configured');
        }

        const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
                        content: `Eres un experto en analizar lecciones de Escuela Sabática Adventista.

Tu tarea es extraer y estructurar el contenido de UNA SEMANA (7 días) en formato JSON:

{
  "days": [
    {
      "day": "sunday",
      "title": "Título de la lección del domingo",
      "content": "Contenido completo de la lección del domingo",
      "verses": ["Juan 3:16", "Romanos 8:28"],
      "questions": ["¿Pregunta de reflexión 1?", "¿Pregunta 2?"]
    },
    {
      "day": "monday",
      "title": "Título del lunes",
      "content": "Contenido del lunes...",
      "verses": ["..."],
      "questions": ["..."]
    }
    // ... tuesday, wednesday, thursday, friday, saturday
  ]
}

IMPORTANTE:
- Extrae TODO el contenido de cada día (Domingo a Sábado = 7 días)
- Identifica los versículos bíblicos mencionados
- Extrae las preguntas de reflexión o discusión
- El contenido debe ser completo y fiel al PDF
- Asegúrate de que haya exactamente 7 días`
                    },
                    {
                        role: "user",
                        content: `Analiza esta lección semanal "${weekTitle}" y estructura el contenido de los 7 días:\n\n${pdfText.substring(0, 12000)}`
                    }
                ],
                temperature: 0.2,
                max_tokens: 6000,
                response_format: { type: "json_object" }
            }),
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            throw new Error(`Groq API error: ${errorText}`);
        }

        const aiData = await aiResponse.json();
        const structuredContent = JSON.parse(aiData.choices[0].message.content);

        console.log('Structured content:', JSON.stringify(structuredContent, null, 2));

        // Save daily lessons to database
        let lessonsCreated = 0;

        for (const day of structuredContent.days) {
            const { error: lessonError } = await supabase
                .from('daily_lessons')
                .insert({
                    week_id: weekId,
                    day: day.day,
                    title: day.title,
                    content: day.content,
                    bible_verses: day.verses || [],
                    reflection_questions: day.questions || []
                });

            if (lessonError) {
                console.error('Error inserting lesson:', lessonError);
            } else {
                lessonsCreated++;
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Lección semanal procesada exitosamente',
                lessonsCreated,
                days: structuredContent.days.map((d: any) => d.day)
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error processing weekly lesson:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});

// Simple PDF text extraction
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
    const decoder = new TextDecoder();
    const text = decoder.decode(pdfBuffer);
    const readableText = text.replace(/[^\x20-\x7E\n]/g, ' ').trim();
    return readableText || 'PDF content extraction pending';
}
