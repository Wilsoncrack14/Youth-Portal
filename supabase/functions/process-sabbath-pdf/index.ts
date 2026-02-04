import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as pdfjs from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm';

// Configurar worker
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { pdfUrl } = await req.json();

        console.log('Processing PDF:', pdfUrl);

        // Download PDF
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) throw new Error('Failed to download PDF');
        const pdfBuffer = await pdfResponse.arrayBuffer();

        // Extract Text
        console.log('Starting extraction...');
        const pdfText = await extractTextFromPDF(pdfBuffer);
        console.log('Extracted length:', pdfText.length);

        // STRICT VALIDATION: Fail if no text (prevents hallucination)
        if (!pdfText || pdfText.length < 200) {
            throw new Error("⚠️ NO SE DETECTÓ TEXTO: El PDF parece ser una imagen o está protegido. Por favor usa un PDF con texto seleccionable.");
        }

        // Initialize Supabase
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Process with AI
        const groqApiKey = Deno.env.get('GROQ_API_KEY');
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
                        content: `Eres un editor experto de Escuela Sabática.
OBJETIVO: Estructurar el estudio para los 7 días.

ESTRUCTURA JSON:
{
  "weeks": [{
    "number": 1,
    "title": "Título",
    "memoryVerse": "Texto...",
    "days": [
      {
        "day": "saturday", "title": "Sábado Tarde", "content": "..."
      },
      {
        "day": "sunday", "title": "Domingo", "content": "...", "verses": ["Juan 1:1"], "questions": ["¿...?"]
      },
      // ... monday, tuesday, wednesday, thursday
      {
        "day": "friday", "title": "Viernes", "content": "..."
      }
    ]
  }]
}

REGLAS:
1. USA SOLO EL TEXTO PROVISTO. No inventes.
2. EXTRAE EL CONTENIDO COMPLETO (No resumas excesivamente).
3. SI FALTA TEXTO PARA UN DÍA, déjalo vacío (""), no inventes.`
                    },
                    {
                        role: "user",
                        content: `PDF TEXT:\n\n${pdfText.substring(0, 35000)}`
                    }
                ],
                temperature: 0.1,
                max_tokens: 8000,
                response_format: { type: "json_object" }
            }),
        });

        if (!aiResponse.ok) throw new Error(await aiResponse.text());
        const aiData = await aiResponse.json();

        return new Response(
            JSON.stringify({ success: true, data: JSON.parse(aiData.choices[0].message.content) }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});

async function extractTextFromPDF(data: ArrayBuffer): Promise<string> {
    try {
        const loadingTask = pdfjs.getDocument({
            data,
            useSystemFonts: true, // Reduce dependency on font files
            disableFontFace: true
        });
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n\n';
        }
        return fullText.trim();
    } catch (e) {
        console.error("Extraction error:", e);
        return "";
    }
}
