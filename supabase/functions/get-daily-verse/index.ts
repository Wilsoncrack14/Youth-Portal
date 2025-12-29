
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { book, chapter } = await req.json()

        // 1. Validation
        if (!book || !chapter) {
            console.error("Missing book or chapter")
            return new Response(
                JSON.stringify({ error: "Missing 'book' or 'chapter' in request body" }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Normalize and Format
        // API expects "genesis", "juan", etc. (lowercase, no accents)
        // We'll trust the client slightly more but still normalize just in case
        const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        let apiBook = normalize(book);

        // Remove trailing dot if present (e.g. "fil.")
        if (apiBook.endsWith('.')) apiBook = apiBook.slice(0, -1);

        // Ensure chapter is a number/valid string
        const apiChapter = String(chapter).replace(/\D/g, '');

        const url = `https://biblia-api.vercel.app/api/v1/${apiBook}/${apiChapter}`;
        console.log(`[API Call] Fetching: ${url}`);

        // 3. External API Call
        const res = await fetch(url);

        if (!res.ok) {
            console.error(`[API Error] ${res.status}: ${res.statusText}`);
            // Forward the status code if 404, otherwise 500
            const status = res.status === 404 ? 404 : 500;
            return new Response(
                JSON.stringify({ error: `External API error: ${res.statusText} (${res.status})` }),
                { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const data = await res.json();

        // 4. Response Parsing (Handle New Array Format)
        // "text": ["Verse 1...", "Verse 2..."]

        let content = "";

        if (Array.isArray(data.text)) {
            // Map array of strings to "[1] Text" format
            content = data.text.map((t: string, i: number) => `[${i + 1}] ${t}`).join('\n');
        } else if (Array.isArray(data.verses)) {
            // Fallback to old format if API reverts or varies
            content = data.verses.map((v: any) => `[${v.number}] ${v.text}`).join('\n');
        } else if (typeof data.text === 'string') {
            content = data.text;
        } else {
            content = "Formato de respuesta desconocido.";
        }

        if (!content) {
            return new Response(
                JSON.stringify({ error: `No verses found for ${book} ${chapter}` }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({
                text: content,
                reference: `${book} ${chapter}`,
                source: "biblia-api.vercel.app"
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error("Internal Error:", error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
