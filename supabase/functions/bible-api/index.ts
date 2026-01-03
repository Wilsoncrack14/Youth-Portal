import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { book, chapter } = await req.json();

        if (!book || !chapter) {
            throw new Error('Book and chapter are required');
        }

        console.log(`Fetching Bible text for: ${book} ${chapter}`);

        // Normalize book to handle spaces (e.g. "1 Cronicas" -> "1cronicas")
        const normalizedBook = book.toLowerCase().replace(/\s+/g, '');
        const apiUrl = `https://biblia-api.vercel.app/api/v1/${normalizedBook}/${chapter}`;
        console.log(`URL: ${apiUrl}`);

        const response = await fetch(apiUrl);

        if (!response.ok) {
            // Return 200 with error details so client receives it instead of throwing
            const errorText = await response.text().catch(() => 'No details');
            return new Response(JSON.stringify({
                error: `API Error ${response.status} for ${book}`,
                details: errorText
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200, // Make this 200 too, to debug what the crash is
        });
    }
});
