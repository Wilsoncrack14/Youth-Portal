// Bible books with chapter counts and level names
export interface BibleBook {
    name: string;
    chapters: number;
    levelName: string;
    description: string;
}

export const BIBLE_BOOKS: BibleBook[] = [
    // Pentateuco
    { name: "Genesis", chapters: 50, levelName: "Creador del Principio", description: "En el principio... iniciando tu viaje" },
    { name: "Exodus", chapters: 40, levelName: "Libertador", description: "Saliendo de la esclavitud hacia la promesa" },
    { name: "Leviticus", chapters: 27, levelName: "Sacerdote Santo", description: "Aprendiendo la santidad de Dios" },
    { name: "Numbers", chapters: 36, levelName: "Peregrino del Desierto", description: "Caminando por el desierto de la fe" },
    { name: "Deuteronomy", chapters: 34, levelName: "Guardián de la Ley", description: "Recordando los mandamientos" },

    // Históricos
    { name: "Joshua", chapters: 24, levelName: "Conquistador de Promesas", description: "Tomando la tierra prometida" },
    { name: "Judges", chapters: 21, levelName: "Libertador de Israel", description: "Defendiendo al pueblo de Dios" },
    { name: "Ruth", chapters: 4, levelName: "Fiel Redentor", description: "Historia de lealtad y redención" },
    { name: "1 Samuel", chapters: 31, levelName: "Profeta Ungido", description: "El llamado de Samuel" },
    { name: "2 Samuel", chapters: 24, levelName: "Rey Según el Corazón", description: "El reino de David" },
    { name: "1 Kings", chapters: 22, levelName: "Sabio de Israel", description: "La sabiduría de Salomón" },
    { name: "2 Kings", chapters: 25, levelName: "Guardián del Reino", description: "Los reyes de Israel y Judá" },
    { name: "1 Chronicles", chapters: 29, levelName: "Cronista de la Historia", description: "Registrando la historia de Dios" },
    { name: "2 Chronicles", chapters: 36, levelName: "Memoria del Pacto", description: "Recordando las promesas" },
    { name: "Ezra", chapters: 10, levelName: "Restaurador del Templo", description: "Reconstruyendo el templo" },
    { name: "Nehemiah", chapters: 13, levelName: "Constructor de Muros", description: "Edificando los muros de Jerusalén" },
    { name: "Esther", chapters: 10, levelName: "Protector del Pueblo", description: "Salvando a Israel" },

    // Poéticos
    { name: "Job", chapters: 42, levelName: "Perseverante en Pruebas", description: "Fe en medio del sufrimiento" },
    { name: "Psalms", chapters: 150, levelName: "Adorador del Altísimo", description: "Alabanzas y oraciones" },
    { name: "Proverbs", chapters: 31, levelName: "Sabio de Salomón", description: "Sabiduría para la vida" },
    { name: "Ecclesiastes", chapters: 12, levelName: "Buscador de Sentido", description: "Encontrando propósito" },
    { name: "Song of Solomon", chapters: 8, levelName: "Amante del Esposo", description: "El amor de Cristo" },

    // Profetas Mayores
    { name: "Isaiah", chapters: 66, levelName: "Visionario de la Salvación", description: "Profecías del Mesías" },
    { name: "Jeremiah", chapters: 52, levelName: "Profeta Llorón", description: "Lágrimas por el pueblo" },
    { name: "Lamentations", chapters: 5, levelName: "Consolador Afligido", description: "Lamento por Jerusalén" },
    { name: "Ezekiel", chapters: 48, levelName: "Vidente de Visiones", description: "Visiones del trono de Dios" },
    { name: "Daniel", chapters: 12, levelName: "Intérprete de Sueños", description: "Fiel en tierra extraña" },

    // Profetas Menores
    { name: "Hosea", chapters: 14, levelName: "Amor Inquebrantable", description: "El amor fiel de Dios" },
    { name: "Joel", chapters: 3, levelName: "Heraldo del Día", description: "El día del Señor" },
    { name: "Amos", chapters: 9, levelName: "Voz de Justicia", description: "Clamando por justicia" },
    { name: "Obadiah", chapters: 1, levelName: "Juez de Naciones", description: "Juicio sobre Edom" },
    { name: "Jonah", chapters: 4, levelName: "Misionero Renuente", description: "Predicando a Nínive" },
    { name: "Micah", chapters: 7, levelName: "Defensor del Débil", description: "Justicia y misericordia" },
    { name: "Nahum", chapters: 3, levelName: "Consolador de Judá", description: "Consuelo para el pueblo" },
    { name: "Habakkuk", chapters: 3, levelName: "Vigilante de la Fe", description: "El justo por la fe vivirá" },
    { name: "Zephaniah", chapters: 3, levelName: "Purificador del Remanente", description: "Purificando al pueblo" },
    { name: "Haggai", chapters: 2, levelName: "Constructor del Templo", description: "Reconstruyendo el templo" },
    { name: "Zechariah", chapters: 14, levelName: "Visionario del Mesías", description: "Visiones del Rey venidero" },
    { name: "Malachi", chapters: 4, levelName: "Mensajero del Pacto", description: "Último profeta del AT" },

    // Nuevo Testamento - Evangelios
    { name: "Matthew", chapters: 28, levelName: "Testigo del Rey", description: "Jesús el Rey de Israel" },
    { name: "Mark", chapters: 16, levelName: "Siervo Veloz", description: "Jesús el Siervo" },
    { name: "Luke", chapters: 24, levelName: "Médico del Alma", description: "Jesús el Hijo del Hombre" },
    { name: "John", chapters: 21, levelName: "Amado del Señor", description: "Jesús el Hijo de Dios" },

    // Historia
    { name: "Acts", chapters: 28, levelName: "Apóstol del Evangelio", description: "La iglesia primitiva" },

    // Epístolas Paulinas
    { name: "Romans", chapters: 16, levelName: "Justificado por Fe", description: "La justicia de Dios" },
    { name: "1 Corinthians", chapters: 16, levelName: "Constructor de Iglesias", description: "Edificando el cuerpo" },
    { name: "2 Corinthians", chapters: 13, levelName: "Ministro de Reconciliación", description: "Reconciliados con Dios" },
    { name: "Galatians", chapters: 6, levelName: "Libertado en Cristo", description: "Libres de la ley" },
    { name: "Ephesians", chapters: 6, levelName: "Ciudadano del Cielo", description: "Sentados en lugares celestiales" },
    { name: "Philippians", chapters: 4, levelName: "Gozoso en Cristo", description: "El gozo del Señor" },
    { name: "Colossians", chapters: 4, levelName: "Completo en Él", description: "La plenitud de Cristo" },
    { name: "1 Thessalonians", chapters: 5, levelName: "Esperanza Viva", description: "Esperando su venida" },
    { name: "2 Thessalonians", chapters: 3, levelName: "Firme en la Fe", description: "Permaneciendo firmes" },
    { name: "1 Timothy", chapters: 6, levelName: "Mentor Fiel", description: "Instruyendo en la fe" },
    { name: "2 Timothy", chapters: 4, levelName: "Soldado de Cristo", description: "Peleando la buena batalla" },
    { name: "Titus", chapters: 3, levelName: "Líder de Integridad", description: "Liderazgo piadoso" },
    { name: "Philemon", chapters: 1, levelName: "Reconciliador", description: "Restaurando relaciones" },

    // Epístolas Generales
    { name: "Hebrews", chapters: 13, levelName: "Sumo Sacerdote Eterno", description: "Jesús nuestro Sumo Sacerdote" },
    { name: "James", chapters: 5, levelName: "Hacedor de la Palabra", description: "Fe con obras" },
    { name: "1 Peter", chapters: 5, levelName: "Piedra Firme", description: "Firmes en la fe" },
    { name: "2 Peter", chapters: 3, levelName: "Guardián de la Verdad", description: "Creciendo en gracia" },
    { name: "1 John", chapters: 5, levelName: "Caminante en Luz", description: "Andando en luz" },
    { name: "2 John", chapters: 1, levelName: "Amante de la Verdad", description: "Verdad y amor" },
    { name: "3 John", chapters: 1, levelName: "Hospitalario", description: "Sirviendo a los hermanos" },
    { name: "Jude", chapters: 1, levelName: "Contendedor de la Fe", description: "Defendiendo la fe" },

    // Profecía
    { name: "Revelation", chapters: 22, levelName: "Vencedor del Cordero", description: "Victoria final en Cristo" },
];

// Calculate total chapters up to a book
export function getTotalChaptersUpTo(bookIndex: number): number {
    return BIBLE_BOOKS.slice(0, bookIndex + 1).reduce((sum, book) => sum + book.chapters, 0);
}

// Get current book based on chapter number
export function getCurrentBook(totalChaptersRead: number): BibleBook {
    let accumulated = 0;
    for (const book of BIBLE_BOOKS) {
        accumulated += book.chapters;
        if (totalChaptersRead < accumulated) {
            return book;
        }
    }
    // If completed all books, return last book
    return BIBLE_BOOKS[BIBLE_BOOKS.length - 1];
}

// Get level name based on current reading
export function getLevelName(weeksCompleted: number, totalChaptersRead: number): string {
    const currentBook = getCurrentBook(totalChaptersRead);
    return currentBook.levelName;
}

export function getLevelDescription(totalChaptersRead: number): string {
    const currentBook = getCurrentBook(totalChaptersRead);
    return currentBook.description;
}

export function getNextLevelName(weeksCompleted: number, totalChaptersRead: number): string {
    // Assuming 7 chapters per week
    const nextWeekChapters = totalChaptersRead + 7;
    const nextBook = getCurrentBook(nextWeekChapters);
    return nextBook.levelName;
}
