import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { fileKey } = await req.json();

        if (!fileKey) {
            throw new Error("File key is required");
        }

        // Initialize Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Download File from Storage
        const { data: fileData, error: downloadError } = await supabaseClient
            .storage
            .from('lessons')
            .download(fileKey);

        if (downloadError) throw downloadError;

        // 2. Extract Text from PDF
        // Note: Deno Edge Functions have limited PDF support. 
        // We will attempt to send the raw bytes to Gemini if it supports it, OR reuse a simple text extractor.
        // Actually, Gemini 1.5 Flash supports PDF input via the File API, but that requires uploading to Google first.
        // For simplicity in this demo, we can assume text content or use a simple parsing logic if possible.
        // HOWEVER, standard pdf-parse might fail in Deno Deploy due to Node dependencies.
        // STRATEGY: For this "MVP", we will use a robust text extractor or assume the user uploads text for now?
        // User asked for "PDF Upload".
        // Let's try to use "pdf-parse" via esm.sh if compatible, or just tell Gemini to read it as base64?
        // Gemini Pro Vision (1.5) accepts PDF parts.

        // We will convert the blob to base64
        const arrayBuffer = await fileData.arrayBuffer();
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        // 3. Call Gemini API
        const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
      Extract the Sabbath School lesson content from this PDF.
      Return ONLY a valid JSON object with this structure:
      {
        "title": "Lesson Title",
        "date": "YYYY-MM-DD", (Assume mostly current or next quarter, look for dates in text)
        "week_id": "2026-Q1-L04", (Generate a logical ID)
        "memory_text": "Full memory verse text...",
        "readings": "List of verses to read (e.g. Gen 1:1, Mat 2:2)",
        "content": "The main study text content...",
        "day_index": 1 (1 for Sunday, 7 for Sabbath/Saturday. Look for day name)
      }
      If multiple days are found, return an array of objects.
      For this specific file, extract the FIRST day found or the whole week if possible.
    `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "application/pdf",
                },
            },
        ]);

        const responseText = result.response.text();
        // Clean JSON markdown
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const lessonData = JSON.parse(cleanedText);

        const lessons = Array.isArray(lessonData) ? lessonData : [lessonData];
        const results = [];

        // 4. Insert into Database
        for (const lesson of lessons) {
            const { data, error } = await supabaseClient
                .from('ss_days')
                .upsert({
                    date: lesson.date,
                    title: lesson.title,
                    content: lesson.content,
                    memory_text: lesson.memory_text,
                    readings: lesson.readings,
                    week_id: lesson.week_id,
                    // day_index: lesson.day_index // Optional if schema has it
                })
                .select();

            if (error) console.error("Error inserting:", error);
            else results.push(data);
        }

        return new Response(
            JSON.stringify({ success: true, processed: results.length, data: results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
