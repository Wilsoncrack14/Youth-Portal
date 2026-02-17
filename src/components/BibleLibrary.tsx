import React, { useState } from 'react';
import { fetchDailyChapter, BIBLE_BOOKS_List, getVerseText } from '@/services/biblePlan';

const BibleLibrary: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [chapterData, setChapterData] = useState<{ reference: string; text: string; book: string; chapter: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const cleanText = (text: string) => {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    const parseQuery = (query: string) => {
        const normalizedQuery = cleanText(query);

        // Regex for "1 Cronicas 20:1-5" or "Juan 3"
        // Supports 1st/2nd/3rd books
        const match = normalizedQuery.match(/^((?:[1-3]\s)?[a-z\s]+?)\s*(\d+)(?::(\d+(?:-\d+)?))?$/);

        if (!match) return null;

        const bookPart = match[1].trim(); // "juan" or "1 cronicas"
        const chapterPart = parseInt(match[2]);
        const versePart = match[3]; // "16" or "1-5" or undefined

        // Find actual book name casing
        const foundBook = BIBLE_BOOKS_List.find(b => cleanText(b) === bookPart);

        if (!foundBook) return { error: `El libro '${bookPart}' no fue encontrado.` };

        return { book: foundBook, chapter: chapterPart, verses: versePart };
    };

    const handleNavigation = (direction: 'next' | 'prev') => {
        if (!chapterData) return;

        const currentBookIndex = BIBLE_BOOKS_List.findIndex(b => cleanText(b) === cleanText(chapterData.book));
        if (currentBookIndex === -1) return;

        let newBook = chapterData.book;
        let newChapter = chapterData.chapter;

        if (direction === 'next') {
            newChapter++;
            // Simple logic: If we go beyond a "safe" limit, we might hit an error, but the API handles it.
            // Ideally we know chapter counts. For now, let's try to fetch.
            // If it fails (caught in handleSearch logic if we reused it, but here we need custom logic), we interact.
            // Better strategy: Just increment/decrement and let the user try, or if specific transitions needed:
            // For this MVP, we just strictly increment chapter. 
            // Real Bible app would know that Gen 50 -> Exod 1. 
            // Let's implement a 'safe' Next that moves to next book if 404? 
            // No, simplest is just increment chapter number, providing navigation within book.
        } else {
            newChapter--;
            if (newChapter < 1) return; // Can't go below 1
        }

        setSearchQuery(`${newBook} ${newChapter}`);
        // Trigger search manually or via effect?
        // We can call handleSearch with a synthetic event or refactor handleSearch to take string.
        // Let's refactor handleSearch slightly to allow direct string call or just calling it here:

        // We can't easily call handleSearch because it relies on state 'searchQuery' which isn't updated instantly.
        // So we call the internal fetch logic directly.
        executeSearch(`${newBook} ${newChapter}`);
    };

    const executeSearch = async (query: string) => {
        setLoading(true);
        setError(null);
        setSearchQuery(query); // Update UI

        const parsed = parseQuery(query);
        if (!parsed || parsed.error) {
            setLoading(false);
            if (parsed?.error) setError(parsed.error);
            else setError("Formato no reconocido. Intenta: 'Juan 3:16' o 'Salmos 23'");
            return;
        }

        try {
            let text = '';
            let reference = '';

            if (parsed.verses) {
                // Fetch specific verses or range
                text = await getVerseText(parsed.book!, parsed.chapter!, parsed.verses);
                if (!text || text.includes("no encontrado")) {
                    throw new Error(`No se encontraron los versículos ${parsed.verses} en ${parsed.book} ${parsed.chapter}.`);
                }
                reference = `${parsed.book} ${parsed.chapter}:${parsed.verses}`;
            } else {
                // Fetch whole chapter
                const data = await fetchDailyChapter(parsed.book!, parsed.chapter!);
                if (!data || !data.text) throw new Error("Capítulo no encontrado");
                text = data.text;
                reference = `${parsed.book} ${parsed.chapter}`;
            }

            setChapterData({
                book: parsed.book!,
                chapter: parsed.chapter!,
                text,
                reference
            });

        } catch (err: any) {
            setError(err.message || "No pudimos cargar el contenido.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;
        executeSearch(searchQuery);
    };

    const [showBookList, setShowBookList] = useState(false);

    const toggleBookList = () => setShowBookList(!showBookList);

    const selectBookFromList = (book: string) => {
        // Default to chapter 1
        executeSearch(`${book} 1`);
        setShowBookList(false);
    };

    return (
        <div className="h-full flex flex-col relative animate-fade-in">

            {/* TOOLBAR Header */}
            <div className="bg-white dark:bg-[#14151f] border-b border-gray-200 dark:border-white/5 p-4 sticky top-0 z-30 shadow-sm dark:shadow-xl">
                <div className="max-w-6xl mx-auto w-full flex flex-col md:flex-row gap-4 items-center">

                    {/* Book List Toggle */}
                    <div className="relative">
                        <button
                            onClick={toggleBookList}
                            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#1a1b26] dark:hover:bg-[#292938] text-gray-900 dark:text-white px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 transition-all font-bold min-w-[200px] justify-between"
                        >
                            <span>{chapterData ? chapterData.book : 'Libros'}</span>
                            <span className={`material-symbols-outlined transition-transform ${showBookList ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>

                        {/* Book Dropdown Panel */}
                        {showBookList && (
                            <div className="absolute top-full left-0 mt-2 w-[80vw] max-w-3xl bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 z-50 animate-fade-in overflow-hidden">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-black dark:text-gray-400 text-xs tracking-widest uppercase">SELECCIONA UN LIBRO</h3>
                                    <button onClick={() => setShowBookList(false)} className="text-black hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"><span className="material-symbols-outlined">close</span></button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    {BIBLE_BOOKS_List.map(b => (
                                        <button
                                            key={b}
                                            onClick={() => selectBookFromList(b)}
                                            className={`text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${chapterData?.book === b ? 'text-primary font-bold bg-primary/10' : 'text-black dark:text-gray-300 font-medium'}`}
                                        >
                                            {b}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={(e) => { e.preventDefault(); executeSearch(searchQuery); }} className="flex-1 w-full relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined text-gray-500">search</span>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar referencia (ej: Juan 3:16)..."
                            className="w-full bg-gray-100 dark:bg-[#1a1b26] border border-gray-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-20 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        />
                        <button
                            type="submit"
                            className="absolute right-1.5 top-1.5 bottom-1.5 bg-primary/20 hover:bg-primary text-primary hover:text-white px-4 rounded-lg font-bold text-xs transition-colors"
                        >
                            IR
                        </button>
                    </form>

                    {/* Version Selector (Static for MVP) */}
                    <div className="hidden md:flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-[#1a1b26] border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-500 dark:text-gray-400 cursor-not-allowed" title="Más versiones pronto">
                        <span>RVR1960</span>
                        <span className="material-symbols-outlined text-xs">lock</span>
                    </div>
                </div>
            </div>

            {/* ERROR */}
            {error && (
                <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-200 text-center text-sm font-bold">
                    {error}
                </div>
            )}

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto relative bg-white dark:bg-background-dark">
                {!chapterData && !loading ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400 dark:text-gray-500 opacity-60">
                        <span className="material-symbols-outlined text-6xl mb-4">auto_stories</span>
                        <h2 className="text-2xl font-bold mb-2 text-gray-600 dark:text-gray-300">Comienza tu lectura</h2>
                        <p className="max-w-md mx-auto">Usa el buscador o el menú de libros para encontrar un pasaje.</p>
                    </div>
                ) : (
                    <div className="max-w-5xl mx-auto min-h-full flex relative">

                        {/* Left Nav Arrow (Desktop) */}
                        <button
                            onClick={() => handleNavigation('prev')}
                            disabled={!chapterData || chapterData.chapter <= 1}
                            className="hidden lg:flex w-16 items-center justify-center sticky top-0 h-screen hover:bg-white/5 text-gray-600 hover:text-white transition-colors disabled:opacity-0"
                        >
                            <span className="material-symbols-outlined text-4xl">chevron_left</span>
                        </button>

                        <div className="flex-1 p-6 md:p-12 pb-32">
                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="animate-fade-in">
                                    <div className="mb-8 text-center md:text-left border-b border-gray-100 dark:border-white/5 pb-6">
                                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-2">{chapterData?.reference}</h1>
                                        <span className="text-gray-500 text-sm font-bold tracking-wider uppercase">Reina-Valera 1960</span>
                                    </div>

                                    <article className="font-serif text-gray-800 dark:text-gray-300 text-xl leading-9 md:leading-10 max-w-prose">
                                        {(() => {
                                            if (!chapterData?.text) return null;
                                            // Split by verse numbers like [1], [2], etc.
                                            const parts = chapterData.text.split(/\[(\d+)\]/);
                                            return parts.map((part, index) => {
                                                if (part.match(/^\d+$/)) {
                                                    return <sup key={index} className="text-xs text-primary font-bold mr-1 select-none">{part}</sup>;
                                                } else if (part.trim() === "") {
                                                    return null;
                                                } else {
                                                    return <span key={index} className="hover:bg-gray-100 dark:hover:bg-white/5 transition-colors rounded px-0.5">{part}</span>;
                                                }
                                            });
                                        })()}
                                    </article>

                                    {/* Mobile Navigation Footer */}
                                    <div className="lg:hidden flex justify-between mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
                                        <button
                                            onClick={() => handleNavigation('prev')}
                                            disabled={!chapterData || chapterData.chapter <= 1}
                                            className="px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-lg flex items-center gap-2 text-sm font-bold disabled:opacity-50 text-gray-700 dark:text-gray-200"
                                        >
                                            <span className="material-symbols-outlined">chevron_left</span> Anterior
                                        </button>
                                        <button
                                            onClick={() => handleNavigation('next')}
                                            className="px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-lg flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200"
                                        >
                                            Siguiente <span className="material-symbols-outlined">chevron_right</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Nav Arrow (Desktop) */}
                        <button
                            onClick={() => handleNavigation('next')}
                            disabled={!chapterData}
                            className="hidden lg:flex w-16 items-center justify-center sticky top-0 h-screen hover:bg-white/5 text-gray-600 hover:text-white transition-colors disabled:opacity-0"
                        >
                            <span className="material-symbols-outlined text-4xl">chevron_right</span>
                        </button>

                    </div>
                )}
            </div>

        </div>
    );
};

export default BibleLibrary;
