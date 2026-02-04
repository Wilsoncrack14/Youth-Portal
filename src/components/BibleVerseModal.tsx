import React, { useState, useEffect } from 'react';
import { getVerseText, resolveBookName } from '../services/biblePlan';

interface BibleVerseModalProps {
    isOpen: boolean;
    onClose: () => void;
    reference: string | null;
}

const BibleVerseModal: React.FC<BibleVerseModalProps> = ({ isOpen, onClose, reference }) => {
    const [text, setText] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && reference) {
            fetchVerse();
        } else {
            setText('');
            setError(null);
        }
    }, [isOpen, reference]);

    const parseReference = (query: string) => {
        // Parse "Book Chapter:Verse" or "Book Chapter:Verse-Verse"
        // Examples: "Col. 4:3", "Fil. 1:7", "Hech. 16:24", "1 Cor. 15:1-4"
        const match = query.trim().match(/^(.+?)\s+(\d+):(\d+(?:-\d+)?)$/);

        if (!match) return null;

        const bookPart = match[1].trim();
        const chapterPart = parseInt(match[2]);
        const versePart = match[3];

        // Use the existing resolveBookName function to handle abbreviations
        const resolvedBook = resolveBookName(bookPart);

        return { book: resolvedBook, chapter: chapterPart, verses: versePart };
    };

    const fetchVerse = async () => {
        if (!reference) return;

        setLoading(true);
        setError(null);

        try {
            const parsed = parseReference(reference);

            if (!parsed) {
                // Fallback: Try to send as is if parsing fails, but getVerseText expects separate args
                // Let's rely on getVerseText error handling if we assume bad format
                throw new Error("Formato de referencia no reconocido");
            }

            const content = await getVerseText(parsed.book, parsed.chapter, parsed.verses);
            setText(content);

        } catch (err: any) {
            console.error(err);
            setError("No pudimos cargar el versículo. Verifica la referencia.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#1a1b26] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl transform transition-all scale-100 p-6 relative">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                <div className="mb-6">
                    <span className="text-xs font-bold text-accent-gold uppercase tracking-wider mb-1 block">Lectura Bíblica</span>
                    <h3 className="text-2xl font-bold text-white">{reference}</h3>
                </div>

                <div className="min-h-[100px] max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : error ? (
                        <div className="text-red-400 bg-red-500/10 p-4 rounded-lg text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined">error</span>
                            {error}
                        </div>
                    ) : (
                        <p className="text-gray-300 text-lg leading-relaxed font-serif whitespace-pre-wrap">
                            {text}
                        </p>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                    <a
                        href={`https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference || '')}&version=RVR1960`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
                    >
                        Ver en BibleGateway <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default BibleVerseModal;
