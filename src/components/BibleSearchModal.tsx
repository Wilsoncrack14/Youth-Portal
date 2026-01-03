import React, { useState, useEffect } from 'react';
import { fetchDailyChapter, resolveBookName, BIBLE_BOOKS_List, getVerseText } from '../services/biblePlan';

interface BibleSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialQuery?: string;
}

const BibleSearchModal: React.FC<BibleSearchModalProps> = ({ isOpen, onClose, initialQuery }) => {
    const [query, setQuery] = useState(initialQuery || '');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{ book: string; chapter: number; text: string; reference: string } | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (initialQuery) {
            setQuery(initialQuery);
            handleSearch(initialQuery);
        }
    }, [initialQuery, isOpen]);

    // Handle escape key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const parseQuery = (q: string) => {
        const clean = q.trim();
        // Pattern: [Book search] [Chapter] (optional :[VerseRange])
        // Supports: "Juan 3", "Juan 3:16", "Juan 3:1-5"
        const match = clean.match(/^(.+?)\s+(\d+)(?::([\d\-,]+))?$/);

        if (match) {
            return {
                book: match[1],
                chapter: parseInt(match[2]),
                verse: match[3] // string, e.g. "1-7" or "5"
            };
        }
        return null;
    };

    const handleSearch = async (searchStr: string) => {
        if (!searchStr.trim()) return;

        setLoading(true);
        setError('');
        setResults(null);

        try {
            const parsed = parseQuery(searchStr);

            if (!parsed) {
                setError('Formato requerido: "Libro Capítulo" o "Libro Cap:Versos" (ej. Juan 3:16, Gen 1:1-5)');
                setLoading(false);
                return;
            }

            const bookName = resolveBookName(parsed.book);

            if (!bookName) {
                setError('Libro no encontrado.');
                setLoading(false);
                return;
            }

            let text = "";
            let reference = "";

            if (parsed.verse) {
                text = await getVerseText(bookName, parsed.chapter, parsed.verse);
                reference = `${bookName} ${parsed.chapter}:${parsed.verse}`;
            } else {
                const data = await fetchDailyChapter(bookName, parsed.chapter);
                text = data.text;
                reference = `${bookName} ${parsed.chapter}`;
            }

            // Check for specific error messages returned by the service
            if (text.startsWith("Error cargando lectura")) {
                if (text.includes("404")) {
                    setError(`El capítulo ${parsed.chapter} no existe en ${bookName}.`);
                } else {
                    setError('No se pudo cargar el capítulo. Verifica tu conexión.');
                }
                setLoading(false);
                return;
            }

            if (text.includes("no se encontraron") || text === "Versículo no encontrado." || text === "Error al cargar el versículo.") {
                setError(`El versículo ${parsed.verse} no existe en ${bookName} ${parsed.chapter}.`);
                setLoading(false);
                return;
            }

            setResults({
                book: bookName,
                chapter: parsed.chapter,
                text: text,
                reference: reference
            });

        } catch (err: any) {
            setError('Error al buscar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-2xl bg-[#1e1e2d] border border-[#292938] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">

                {/* Search Header */}
                <div className="p-4 border-b border-[#292938] flex items-center gap-3 bg-[#14151f]">
                    <span className="material-symbols-outlined text-primary">search</span>
                    <input
                        autoFocus
                        type="text"
                        className="flex-1 bg-transparent text-white text-lg placeholder-gray-500 focus:outline-none"
                        placeholder="Busca un pasaje (ej. Juan 3:16)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                    />
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-[#292938]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-400">Buscando en la Palabra...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-10">
                            <span className="material-symbols-outlined text-red-400 text-4xl mb-2">error_outline</span>
                            <p className="text-red-400">{error}</p>
                            <p className="text-gray-500 text-sm mt-2">Intenta con: "Salmos 23", "1 Juan 4", "Genesis 1"</p>
                        </div>
                    ) : results ? (
                        <div className="flex flex-col gap-4">
                            <h2 className="text-2xl font-bold text-white flex items-baseline gap-2">
                                {results.book} {results.chapter}
                                <span className="text-sm text-primary font-normal bg-primary/10 px-2 py-0.5 rounded-full">Resultado</span>
                            </h2>
                            <div className="font-serif text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {results.text}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <span className="material-symbols-outlined text-4xl mb-3 opacity-50">menu_book</span>
                            <p>Escribe una cita bíblica para comenzar.</p>
                            <div className="flex flex-wrap justify-center gap-2 mt-4">
                                {["Juan 3", "Salmos 23", "Filipenses 4", "Genesis 1"].map(ex => (
                                    <button
                                        key={ex}
                                        onClick={() => { setQuery(ex); handleSearch(ex); }}
                                        className="px-3 py-1 bg-[#292938] hover:bg-primary/20 hover:text-primary rounded-full text-xs transition-colors"
                                    >
                                        {ex}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BibleSearchModal;
