
interface ReadingPlanEntry {
    book: string;
    chapter: number;
}

export type ReadingPlan = { [key: string]: ReadingPlanEntry };

export const BOOK_CHAPTERS = [
    { name: "Genesis", count: 50 }, { name: "Exodo", count: 40 }, { name: "Levitico", count: 27 },
    { name: "Numeros", count: 36 }, { name: "Deuteronomio", count: 34 }, { name: "Josue", count: 24 },
    { name: "Jueces", count: 21 }, { name: "Rut", count: 4 }, { name: "1 Samuel", count: 31 },
    { name: "2 Samuel", count: 24 }, { name: "1 Reyes", count: 22 }, { name: "2 Reyes", count: 25 },
    { name: "1 Cronicas", count: 29 }, { name: "2 Cronicas", count: 36 }, { name: "Esdras", count: 10 },
    { name: "Nehemias", count: 13 }, { name: "Ester", count: 10 }, { name: "Job", count: 42 },
    { name: "Salmos", count: 150 }, { name: "Proverbios", count: 31 }, { name: "Eclesiastes", count: 12 },
    { name: "Cantares", count: 8 }, { name: "Isaias", count: 66 }, { name: "Jeremias", count: 52 },
    { name: "Lamentaciones", count: 5 }, { name: "Ezequiel", count: 48 }, { name: "Daniel", count: 12 },
    { name: "Oseas", count: 14 }, { name: "Joel", count: 3 }, { name: "Amos", count: 9 },
    { name: "Abdias", count: 1 }, { name: "Jonas", count: 4 }, { name: "Miqueas", count: 7 },
    { name: "Nahum", count: 3 }, { name: "Habacuc", count: 3 }, { name: "Sofonias", count: 3 },
    { name: "Hageo", count: 2 }, { name: "Zacarias", count: 14 }, { name: "Malaquias", count: 4 },
    { name: "Mateo", count: 28 }, { name: "Marcos", count: 16 }, { name: "Lucas", count: 24 },
    { name: "Juan", count: 21 }, { name: "Hechos", count: 28 }, { name: "Romanos", count: 16 },
    { name: "1 Corintios", count: 16 }, { name: "2 Corintios", count: 13 }, { name: "Galatas", count: 6 },
    { name: "Efesios", count: 6 }, { name: "Filipenses", count: 4 }, { name: "Colosenses", count: 4 },
    { name: "1 Tesalonicenses", count: 5 }, { name: "2 Tesalonicenses", count: 3 }, { name: "1 Timoteo", count: 6 },
    { name: "2 Timoteo", count: 4 }, { name: "Tito", count: 3 }, { name: "Filemon", count: 1 },
    { name: "Hebreos", count: 13 }, { name: "Santiago", count: 5 }, { name: "1 Pedro", count: 5 },
    { name: "2 Pedro", count: 3 }, { name: "1 Juan", count: 5 }, { name: "2 Juan", count: 1 },
    { name: "3 Juan", count: 1 }, { name: "Judas", count: 1 }, { name: "Apocalipsis", count: 22 }
];

// Genera un plan de lectura secuencial por defecto
const generateDefaultPlan = (): ReadingPlan => {
    const plan: ReadingPlan = {};

    // CONFIGURACIÓN: Iniciar Genesis 1 el 1 de Enero
    const startDate = new Date(new Date().getFullYear(), 0, 1);
    // O si prefieres una fecha fija como 1 de Enero: new Date(new Date().getFullYear(), 0, 1);

    let currentBookIndex = 0;
    let currentChapter = 1;

    // Iterar para 366 días (un año completo desde hoy)
    for (let i = 0; i < 366; i++) {
        // Crear fecha incrementando días desde startDate
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const key = `${date.getMonth()}-${date.getDate()}`; // Format: Month-Day

        if (currentBookIndex < BOOK_CHAPTERS.length) {
            const book = BOOK_CHAPTERS[currentBookIndex];

            plan[key] = {
                book: book.name,
                chapter: currentChapter
            };

            currentChapter++;
            if (currentChapter > book.count) {
                currentBookIndex++;
                currentChapter = 1;
            }
        } else {
            // Ciclo al principio
            currentBookIndex = 0;
            currentChapter = 1;
            const book = BOOK_CHAPTERS[currentBookIndex];
            plan[key] = { book: book.name, chapter: currentChapter };
            currentChapter++;
        }
    }

    return plan;
};

export const READING_PLAN: ReadingPlan = generateDefaultPlan();

// Aquí puedes sobreescribir días específicos si es necesario
// READING_PLAN["0-1"] = { book: "Genesis", chapter: 1 };
