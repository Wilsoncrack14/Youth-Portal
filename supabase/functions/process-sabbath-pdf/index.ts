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
        const { pdfUrl, quarterId, quarterTitle } = await req.json();

        console.log('Processing PDF:', pdfUrl);

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

        // Process with AI to structure content
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
            
Tu tarea es extraer y estructurar el contenido en formato JSON con esta estructura:
{
  "weeks": [
    {
      "number": 1,
      "title": "Título de la semana",
      "memoryVerse": "Versículo para memorizar",
      "startDate": "2026-01-04",
      "endDate": "2026-01-10",
      "days": [
        {
          "day": "sunday",
          "title": "Título de la lección del domingo",
          "content": "Contenido completo de la lección",
          "verses": ["Juan 3:16", "Romanos 8:28"],
          "questions": ["¿Pregunta de reflexión 1?", "¿Pregunta 2?"]
        },
        // ... monday, tuesday, wednesday, thursday, friday, saturday
      ]
    }
    // ... más semanas
  ]
}

IMPORTANTE:
- Extrae TODO el contenido de cada día
- Identifica los versículos bíblicos mencionados
- Extrae las preguntas de reflexión o discusión
- Asegúrate de que cada semana tenga 7 días (sunday a saturday)
- Las fechas deben ser consecutivas
- El contenido debe ser completo y fiel al PDF`
                    },
                    {
                        role: "user",
                        content: `Analiza esta lección de Escuela Sabática del trimestre "${quarterTitle}" y estructura el contenido:\n\n${pdfText.substring(0, 15000)}`
                    }
                ],
                temperature: 0.2,
                max_tokens: 8000,
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

        // Save to database
        let weeksCreated = 0;
        let lessonsCreated = 0;

        for (const week of structuredContent.weeks) {
            // Insert week
            const { data: weekData, error: weekError } = await supabase
                .from('weeks')
                .insert({
                    quarter_id: quarterId,
                    week_number: week.number,
                    title: week.title,
                    memory_verse: week.memoryVerse,
                    start_date: week.startDate,
                    end_date: week.endDate
                })
                .select()
                .single();

            if (weekError) {
                console.error('Error inserting week:', weekError);
                continue;
            }

            weeksCreated++;

            // Insert daily lessons
            for (const day of week.days) {
                const { error: lessonError } = await supabase
                    .from('daily_lessons')
                    .insert({
                        week_id: weekData.id,
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
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'PDF procesado exitosamente',
                weeksCreated,
                lessonsCreated
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error processing PDF:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});

// Simple PDF text extraction (basic implementation)
// For production, consider using a proper PDF parsing library
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
    // This is a placeholder - you'll need to implement actual PDF parsing
    // Options:
    // 1. Use pdf-parse library (needs to be compatible with Deno)
    // 2. Use external API service
    // 3. Extract text using pdf.js

    // For now, return a placeholder that indicates the PDF was received
    const decoder = new TextDecoder();
    const text = decoder.decode(pdfBuffer);

    // Try to extract readable text (very basic approach)
    const readableText = text.replace(/[^\x20-\x7E\n]/g, ' ').trim();

    return readableText || 'PDF content extraction pending - implement proper PDF parser';
}
