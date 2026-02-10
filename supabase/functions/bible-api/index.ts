import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Lista de orígenes permitidos
const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',').map(o => o.trim()) || [
    'https://youth-portal.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3800',
    'http://localhost:3000'
];

// Mapeo de libros en español a IDs de la API
const BIBLE_BOOK_IDS: { [key: string]: number } = {
    "Genesis": 1, "Exodo": 2, "Levitico": 3, "Numeros": 4, "Deuteronomio": 5,
    "Josue": 6, "Jueces": 7, "Rut": 8, "1 Samuel": 9, "2 Samuel": 10,
    "1 Reyes": 11, "2 Reyes": 12, "1 Cronicas": 13, "2 Cronicas": 14, "Esdras": 15,
    "Nehemias": 16, "Ester": 17, "Job": 18, "Salmos": 19, "Proverbios": 20,
    "Eclesiastes": 21, "Cantares": 22, "Isaias": 23, "Jeremias": 24, "Lamentaciones": 25,
    "Ezequiel": 26, "Daniel": 27, "Oseas": 28, "Joel": 29, "Amos": 30,
    "Abdias": 31, "Jonas": 32, "Miqueas": 33, "Nahum": 34, "Habacuc": 35,
    "Sofonias": 36, "Hageo": 37, "Zacarias": 38, "Malaquias": 39,
    "Mateo": 40, "Marcos": 41, "Lucas": 42, "Juan": 43, "Hechos": 44,
    "Romanos": 45, "1 Corintios": 46, "2 Corintios": 47, "Galatas": 48, "Efesios": 49,
    "Filipenses": 50, "Colosenses": 51, "1 Tesalonicenses": 52, "2 Tesalonicenses": 53,
    "1 Timoteo": 54, "2 Timoteo": 55, "Tito": 56, "Filemon": 57, "Hebreos": 58,
    "Santiago": 59, "1 Pedro": 60, "2 Pedro": 61, "1 Juan": 62, "2 Juan": 63,
    "3 Juan": 64, "Judas": 65, "Apocalipsis": 66
};

// Función para obtener headers CORS seguros
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

serve(async (req) => {
    const origin = req.headers.get('origin');
    const headers = getCorsHeaders(origin);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers });
    }

    try {
        // ✅ VERIFICACIÓN JWT MANUAL
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('No autorizado: Falta token');

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('No autorizado: Token inválido');

        const { book, chapter } = await req.json();

        if (!book || !chapter) {
            throw new Error('Book and chapter are required');
        }

        // Normalizar nombre del libro (quitar tildes y espacios extra si es necesario, aunque el mapa usa nombres exactos)
        // Intentar encontrar el ID
        let bookId = BIBLE_BOOK_IDS[book];

        // Fallback: intentar búsqueda insensible a mayúsculas/tildes si no encuentra exacto
        if (!bookId) {
            const normalizedInput = book.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const foundKey = Object.keys(BIBLE_BOOK_IDS).find(key =>
                key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalizedInput
            );
            if (foundKey) bookId = BIBLE_BOOK_IDS[foundKey];
        }

        if (!bookId) {
            throw new Error(`Libro no encontrado: ${book}`);
        }

        const apiUrl = `https://bible-api-willo-2026.fly.dev/books/${bookId}/chapters/${chapter}`;
        console.log(`Fetching from: ${apiUrl}`);

        const response = await fetch(apiUrl);

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'No details');
            return new Response(JSON.stringify({
                error: `API Error ${response.status}`,
                details: errorText
            }), {
                headers: { ...headers, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        const verses = await response.json(); // Array de versículos

        // Transformar respuesta al formato esperado por el frontend
        // verses: Array<{ id, book_id, chapter, verse, text, ... }>
        const formattedVerses = Array.isArray(verses) ? verses.map((v: any) => ({
            number: v.verse,
            text: v.text
        })) : [];

        const fullText = formattedVerses.map(v => `${v.number} ${v.text}`).join(' ');

        const result = {
            book: book, // Devolver el nombre original en español
            chapter: parseInt(chapter),
            verses: formattedVerses,
            text: fullText
        };

        return new Response(JSON.stringify(result), {
            headers: { ...headers, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
            headers: { ...headers, 'Content-Type': 'application/json' },
            status: 200,
        });
    }
});
