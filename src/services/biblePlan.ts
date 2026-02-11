import { supabase } from './supabase.ts';
import { READING_PLAN } from './readingPlan';

interface BibleChapter {
    book: string;
    chapter: number;
    text: string;
    reference: string;
}

// Map book names to API.Bible abbreviations (OSIS format)
export const BOOK_MAPPINGS: { [key: string]: string } = {
    "Genesis": "GEN", "Exodo": "EXO", "Levitico": "LEV", "Numeros": "NUM", "Deuteronomio": "DEU",
    "Josue": "JOS", "Jueces": "JDG", "Rut": "RUT", "1 Samuel": "1SA", "2 Samuel": "2SA",
    "1 Reyes": "1KI", "2 Reyes": "2KI", "1 Cronicas": "1CH", "2 Cronicas": "2CH", "Esdras": "EZR",
    "Nehemias": "NEH", "Ester": "EST", "Job": "JOB", "Salmos": "PSA", "Proverbios": "PRO",
    "Eclesiastes": "ECC", "Cantares": "SNG", "Isaias": "ISA", "Jeremias": "JER", "Lamentaciones": "LAM",
    "Ezequiel": "EZK", "Daniel": "DAN", "Oseas": "HOS", "Joel": "JOL", "Amos": "AMO",
    "Abdias": "OBA", "Jonas": "JON", "Miqueas": "MIC", "Nahum": "NAM", "Habacuc": "HAB",
    "Sofonias": "ZEP", "Hageo": "HAG", "Zacarias": "ZEC", "Malaquias": "MAL",
    "Mateo": "MAT", "Marcos": "MRK", "Lucas": "LUK", "Juan": "JHN", "Hechos": "ACT",
    "Romanos": "ROM", "1 Corintios": "1CO", "2 Corintios": "2CO", "Galatas": "GAL", "Efesios": "EPH",
    "Filipenses": "PHP", "Colosenses": "COL", "1 Tesalonicenses": "1TH", "2 Tesalonicenses": "2TH",
    "1 Timoteo": "1TI", "2 Timoteo": "2TI", "Tito": "TIT", "Filemon": "PHM", "Hebreos": "HEB",
    "Santiago": "JAS", "1 Pedro": "1PE", "2 Pedro": "2PE", "1 Juan": "1JN", "2 Juan": "2JN",
    "3 Juan": "3JN", "Judas": "JUD", "Apocalipsis": "REV"
};

export const BIBLE_BOOKS_List = Object.keys(BOOK_MAPPINGS);

// Number of chapters per book
export const BIBLE_CHAPTER_COUNTS: { [key: string]: number } = {
    "Genesis": 50, "Exodo": 40, "Levitico": 27, "Numeros": 36, "Deuteronomio": 34,
    "Josue": 24, "Jueces": 21, "Rut": 4, "1 Samuel": 31, "2 Samuel": 24,
    "1 Reyes": 22, "2 Reyes": 25, "1 Cronicas": 29, "2 Cronicas": 36, "Esdras": 10,
    "Nehemias": 13, "Ester": 10, "Job": 42, "Salmos": 150, "Proverbios": 31,
    "Eclesiastes": 12, "Cantares": 8, "Isaias": 66, "Jeremias": 52, "Lamentaciones": 5,
    "Ezequiel": 48, "Daniel": 12, "Oseas": 14, "Joel": 3, "Amos": 9,
    "Abdias": 1, "Jonas": 4, "Miqueas": 7, "Nahum": 3, "Habacuc": 3,
    "Sofonias": 3, "Hageo": 2, "Zacarias": 14, "Malaquias": 4,
    "Mateo": 28, "Marcos": 16, "Lucas": 24, "Juan": 21, "Hechos": 28,
    "Romanos": 16, "1 Corintios": 16, "2 Corintios": 13, "Galatas": 6, "Efesios": 6,
    "Filipenses": 4, "Colosenses": 4, "1 Tesalonicenses": 5, "2 Tesalonicenses": 3,
    "1 Timoteo": 6, "2 Timoteo": 4, "Tito": 3, "Filemon": 1, "Hebreos": 13,
    "Santiago": 5, "1 Pedro": 5, "2 Pedro": 3, "1 Juan": 5, "2 Juan": 1,
    "3 Juan": 1, "Judas": 1, "Apocalipsis": 22
};

export const START_DATE = new Date('2026-01-01T00:00:00');

export const getNextReadingTime = (): Date => {
    const now = new Date();
    const switchTime = new Date();
    // Next midnight
    switchTime.setDate(now.getDate() + 1);
    switchTime.setHours(0, 0, 0, 0);
    return switchTime;
};

export const getTodayChapterReference = (date: Date = new Date()) => {
    const now = new Date(date);

    // Calculate days elapsed since START_DATE
    // Use UTC to avoid timezone shifts messing up the "day count"
    const start = Date.UTC(START_DATE.getFullYear(), START_DATE.getMonth(), START_DATE.getDate());
    const current = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

    // Days difference (Floored)
    let daysDiff = Math.floor((current - start) / (1000 * 60 * 60 * 24));

    // If we are before start date, default to Genesis 1 or handle as preview
    if (daysDiff < 0) {
        // Option: Show based on a pre-launch plan or just Genesis 1
        console.log("Before start date, showing Genesis 1 preview.");
        return { book: "Genesis", chapter: 1 };
    }

    // Logic to find current book and chapter
    // We iterate through books subtracting their chapter counts until we find the current spot

    let dayCounter = daysDiff;
    let selectedBook = "Genesis";
    let selectedChapter = 1;

    // Ordered list of books matching BIBLE_CHAPTER_COUNTS keys
    const bookList = Object.keys(BIBLE_CHAPTER_COUNTS);

    for (const book of bookList) {
        const chaptersInBook = BIBLE_CHAPTER_COUNTS[book];

        if (dayCounter < chaptersInBook) {
            // Found the book!
            selectedBook = book;
            selectedChapter = dayCounter + 1; // 0-indexed day becomes 1-indexed chapter
            break;
        }

        // Subtract this book's chapters and continue to next book
        dayCounter -= chaptersInBook;
    }

    // If we run out of books (Bible finished), we loop back to Genesis?
    // Or we could implement reading plan cycles. 
    // For now, if dayCounter remains high, it means we finished the bible.
    // The loop above breaks. If loop finishes without break, it means we passed Rev 22.
    // Let's simple restart cycle:
    if (dayCounter >= 0 && !bookList.includes(selectedBook)) { // Valid check if needed, but the loop logic handles 'break'. 
        // Logic fix: if we exhaust the loop, dayCounter is still positive.
        // We should wrap the whole dayDiff by total bible chapters first if we want infinite loop.
        // Total chapters approx 1189.
        // Let's implement module arithmetic for infinite layout if wished, otherwise it just stays at end.
        // User asked "y asi cada dia", implying continuous. 
        // Let's recalculate with Modulo total chapters.

        const TOTAL_CHAPTERS = 1189;
        daysDiff = daysDiff % TOTAL_CHAPTERS;

        // Re-run finding logic with new daysDiff
        dayCounter = daysDiff;
        for (const book of bookList) {
            const chaptersInBook = BIBLE_CHAPTER_COUNTS[book];
            if (dayCounter < chaptersInBook) {
                selectedBook = book;
                selectedChapter = dayCounter + 1;
                break;
            }
            dayCounter -= chaptersInBook;
        }
    }

    return { book: selectedBook, chapter: selectedChapter };
};


// In-memory cache for fetched chapters to reduce API calls
const chapterCache = new Map<string, BibleChapter>();

export const fetchDailyChapter = async (
    targetBook?: string,
    targetChapter?: number
): Promise<BibleChapter> => {
    // If arguments are provided, use them. Otherwise, calculate based on date.
    let book: string;
    let chapter: number;

    if (targetBook && targetChapter) {
        book = targetBook;
        chapter = targetChapter;
    } else {
        const daily = getTodayChapterReference();
        book = daily.book;
        chapter = daily.chapter;
    }

    // Cache Key: "Genesis-1", "Filipenses-1"
    // Use resolved names if possible, but simpler to use input if we trust resolveBookName matches.
    // Ideally, we cache based on the API book name to ensure uniqueness.

    // Resolve book name using our robust resolver
    const resolvedBook = resolveBookName(book);
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const apiBook = normalize(resolvedBook);

    const cacheKey = `${apiBook}-${chapter}`;

    if (chapterCache.has(cacheKey)) {
        return chapterCache.get(cacheKey)!;
    }

    try {

        // Use Supabase Edge Function to avoid CORS
        const { data, error } = await supabase.functions.invoke('bible-api', {
            body: { book: apiBook, chapter }
        });

        if (error) throw error;

        // Handle "error" key in successful JSON response if API logic passed it for some reason
        if (data.error) throw new Error(data.error);

        // Parse "text": ["Verse 1", "Verse 2"...] or "verses": [...]
        let content = "";

        if (Array.isArray(data.text)) {
            // New format: text is array of strings
            content = data.text.map((t: string, i: number) => `[${i + 1}] ${t}`).join('\n');
        } else if (Array.isArray(data.verses)) {
            // Format with objects
            content = data.verses.map((v: any) => `[${v.number}] ${v.text}`).join('\n');
        } else if (typeof data.text === 'string') {
            content = data.text;
        } else {
            content = "Formato de respuesta desconocido.";
        }

        const result: BibleChapter = {
            book: data.book || book,
            chapter: data.chapter || chapter,
            text: content,
            reference: `${data.book || book} ${data.chapter || chapter}`
        };

        // Save to cache
        chapterCache.set(cacheKey, result);

        return result;

    } catch (error: any) {
        console.error("Error fetching (Supabase):", error);

        return {
            book: book!,
            chapter: chapter!,
            text: `Error cargando lectura.\n\nDetalle: ${error.message}`,
            reference: "Sin conexión"
        };
    }
};
// Helper to extract verses from the full chapter text
// Text format is typically: "[1] Verse 1 text\n[2] Verse 2 text..."
// Common Spanish Abbreviations map
export const ABBREVIATIONS: { [key: string]: string } = {
    "Gén.": "Genesis", "Gen.": "Genesis", "Gn.": "Genesis", "Gen": "Genesis", "Gn": "Genesis",
    "Exo.": "Exodo", "Ex.": "Exodo", "Ex": "Exodo",
    "Lev.": "Levitico", "Lv.": "Levitico", "Lev": "Levitico", "Lv": "Levitico",
    "Num.": "Numeros", "Nm.": "Numeros", "Num": "Numeros", "Nm": "Numeros",
    "Deut.": "Deuteronomio", "Dt.": "Deuteronomio", "Deut": "Deuteronomio", "Dt": "Deuteronomio",
    "Jos.": "Josue", "Jos": "Josue",
    "Jue.": "Jueces", "Jue": "Jueces",
    "1 Sam.": "1 Samuel", "1 sm.": "1 Samuel", "1 Sa.": "1 Samuel",
    "2 Sam.": "2 Samuel", "2 sm.": "2 Samuel", "2 Sa.": "2 Samuel",
    "1 Rey.": "1 Reyes", "1 re.": "1 Reyes",
    "2 Rey.": "2 Reyes", "2 re.": "2 Reyes",
    "1 Cron.": "1 Cronicas", "1 cr.": "1 Cronicas",
    "2 Cron.": "2 Cronicas", "2 cr.": "2 Cronicas",
    "Neh.": "Nehemias", "Ne": "Nehemias",
    "Est.": "Ester", "Est": "Ester",
    "Sal.": "Salmos", "Sal": "Salmos",
    "Prov.": "Proverbios", "Pr.": "Proverbios", "Prov": "Proverbios",
    "Ecl.": "Eclesiastes", "Ec.": "Eclesiastes",
    "Cant.": "Cantares", "Cnt.": "Cantares",
    "Isa.": "Isaias", "Is.": "Isaias", "Is": "Isaias",
    "Jer.": "Jeremias", "Jr.": "Jeremias",
    "Lam.": "Lamentaciones", "Lm.": "Lamentaciones",
    "Eze.": "Ezequiel", "Ez.": "Ezequiel", "Ez": "Ezequiel",
    "Dan.": "Daniel", "Dn.": "Daniel", "Dan": "Daniel",
    "Os.": "Oseas", "Os": "Oseas",
    "Hab.": "Habacuc", "Hab": "Habacuc",
    "Sof.": "Sofonias", "Sof": "Sofonias",
    "Hag.": "Hageo", "Hg.": "Hageo",
    "Zac.": "Zacarias", "Zac": "Zacarias",
    "Mal.": "Malaquias", "Mal": "Malaquias",
    "Mat.": "Mateo", "Mt.": "Mateo", "Mt": "Mateo",
    "Mar.": "Marcos", "Mr.": "Marcos", "Marc": "Marcos",
    "Luc.": "Lucas", "Lc.": "Lucas", "Lc": "Lucas",
    "Jn.": "Juan", "Jno.": "Juan", "Juan": "Juan",
    "Hech.": "Hechos", "Hch.": "Hechos", "Hch": "Hechos", "Ac.": "Hechos", "Hech": "Hechos", "Ac": "Hechos",
    "Rom.": "Romanos", "Rm.": "Romanos", "Rom": "Romanos", "Rm": "Romanos",
    "1 Cor.": "1 Corintios", "1 co.": "1 Corintios", "1 Cor": "1 Corintios", "1 Co": "1 Corintios",
    "2 Cor.": "2 Corintios", "2 co.": "2 Corintios", "2 Cor": "2 Corintios", "2 Co": "2 Corintios",
    "Gal.": "Galatas", "Gl.": "Galatas", "Gal": "Galatas", "Gl": "Galatas",
    "Ef.": "Efesios", "Efe.": "Efesios", "Ef": "Efesios", "Efe": "Efesios",
    "Fil.": "Filipenses", "Flp.": "Filipenses", "Fil": "Filipenses", "Php": "Filipenses", "Flp": "Filipenses",
    "Col.": "Colosenses", "Col": "Colosenses",
    "1 Tes.": "1 Tesalonicenses", "1 ts.": "1 Tesalonicenses", "1 Tes": "1 Tesalonicenses", "1 Ts": "1 Tesalonicenses",
    "2 Tes.": "2 Tesalonicenses", "2 ts.": "2 Tesalonicenses", "2 Tes": "2 Tesalonicenses", "2 Ts": "2 Tesalonicenses",
    "1 Tim.": "1 Timoteo", "1 ti.": "1 Timoteo", "1 Tim": "1 Timoteo", "1 Ti": "1 Timoteo",
    "2 Tim.": "2 Timoteo", "2 ti.": "2 Timoteo", "2 Tim": "2 Timoteo", "2 Ti": "2 Timoteo",
    "Tit.": "Tito", "Tit": "Tito",
    "Flm.": "Filemon", "Flm": "Filemon",
    "Heb.": "Hebreos", "Heb": "Hebreos",
    "Sant.": "Santiago", "Stg.": "Santiago", "Sant": "Santiago", "Stg": "Santiago",
    "1 Ped.": "1 Pedro", "1 pe.": "1 Pedro", "1 Ped": "1 Pedro", "1 Pe": "1 Pedro",
    "2 Ped.": "2 Pedro", "2 pe.": "2 Pedro", "2 Ped": "2 Pedro", "2 Pe": "2 Pedro",
    "1 Jn.": "1 Juan", "1 jn": "1 Juan", "1 Jn": "1 Juan",
    "2 Jn.": "2 Juan", "2 jn": "2 Juan", "2 Jn": "2 Juan",
    "3 Jn.": "3 Juan", "3 jn": "3 Juan", "3 Jn": "3 Juan",
    "Jud.": "Judas", "Jud": "Judas",
    "Apoc.": "Apocalipsis", "Ap.": "Apocalipsis", "Ap": "Apocalipsis", "Apoc": "Apocalipsis"
};

export const resolveBookName = (input: string): string => {
    // Normalize input
    let clean = input.trim();
    // Case-insensitive lookup
    const lowerInput = clean.toLowerCase();

    // 1. Try direct keys (case insensitive)
    const key = Object.keys(ABBREVIATIONS).find(k => k.toLowerCase() === lowerInput);
    if (key) return ABBREVIATIONS[key];

    // 2. Try adding a dot if missing (e.g. "Fil" -> "Fil.")
    if (!clean.endsWith('.')) {
        const withDot = lowerInput + '.';
        const keyDot = Object.keys(ABBREVIATIONS).find(k => k.toLowerCase() === withDot);
        if (keyDot) return ABBREVIATIONS[keyDot];
    }

    // 3. Try removing a dot (e.g. "Gén." -> "Gen")
    if (clean.endsWith('.')) {
        const noDot = clean.slice(0, -1);
        const noDotKey = Object.keys(ABBREVIATIONS).find(k => k.toLowerCase() === noDot.toLowerCase());
        if (noDotKey) return ABBREVIATIONS[noDotKey];
    }

    // 4. Fallback to basic normalization (accents) for full names
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedInput = normalize(clean);

    if (BOOK_MAPPINGS[normalizedInput]) return normalizedInput;

    return normalizedInput;
};

// Helper to extract verses from the full chapter text
// Text format is typically: "[1] Verse 1 text\n[2] Verse 2 text..."
export const getVerseText = async (book: string, chapter: number, verses: string): Promise<string> => {
    try {
        const resolvedBook = resolveBookName(book);
        console.log(`Getting verses for: ${resolvedBook} ${chapter}:${verses} (Raw: ${book})`);

        // Use resolveBookName inside fetchDailyChapter if needed, but we pass it explicitly here.
        // Actually, let's just allow fetchDailyChapter to be smart too.

        const fullChapter = await fetchDailyChapter(resolvedBook, chapter);
        if (!fullChapter || !fullChapter.text) return "Versículo no encontrado.";

        // If error returned from API
        if (fullChapter.text.startsWith('Error')) return fullChapter.text;

        let resultText = "";

        const verseMap = new Map<number, string>();

        // Strategy 1: Standard Brackets [1]
        let regex = /\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g;
        let match;
        let count = 0;

        while ((match = regex.exec(fullChapter.text)) !== null) {
            verseMap.set(parseInt(match[1]), match[2].trim());
            count++;
        }

        // Strategy 2: If no brackets found, try "1. Text" or "1 Text" at start of lines
        if (count === 0) {
            // Regex for "1. text" or "1 text" at start of string or after newline
            const fallbackRegex = /(?:^|\n)\s*(\d+)[\.\s]\s*([\s\S]*?)(?=(?:\n\s*\d+[\.\s])|$)/g;
            while ((match = fallbackRegex.exec(fullChapter.text)) !== null) {
                // Ensure the number is reasonable (1-200) to avoid matching "2025" in text
                const vNum = parseInt(match[1]);
                if (vNum > 0 && vNum < 200) {
                    verseMap.set(vNum, match[2].trim());
                    count++;
                }
            }
        }

        if (count === 0) {
            // If still no parse, return full text but warn
            return `(Vista Completa - No se pudo filtrar versículo)\n\n${fullChapter.text}`;
        }

        // Parse requested range "4", "4-7", "1, 3", "1-3, 5"
        const normalizedVerses = verses.replace(/[–—]/g, '-');
        const targetVerses = new Set<number>();
        const parts = normalizedVerses.split(',');

        parts.forEach(part => {
            const trimmed = part.trim();
            if (trimmed.includes('-')) {
                const [start, end] = trimmed.split('-').map(val => parseInt(val.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    // Ensure start <= end and sensible range
                    const finalStart = Math.min(start, end);
                    const finalEnd = Math.max(start, end);
                    for (let i = finalStart; i <= finalEnd; i++) targetVerses.add(i);
                }
            } else {
                const num = parseInt(trimmed);
                if (!isNaN(num)) targetVerses.add(num);
            }
        });

        // Sort verses to ensure correct order
        const sortedVerses = Array.from(targetVerses).sort((a, b) => a - b);

        if (sortedVerses.length === 0) {
            return `No se encontraron versículos válidos en la referencia: ${verses}.`;
        }

        sortedVerses.forEach(vNum => {
            if (verseMap.has(vNum)) {
                resultText += `[${vNum}] ${verseMap.get(vNum)}\n`;
            }
        });

        return resultText.trim() || `Los versículos ${verses} no se encontraron en ${resolvedBook} ${chapter}.`;

    } catch (e) {
        console.error("Error getting verse:", e);
        return "Error al cargar el versículo.";
    }
}
