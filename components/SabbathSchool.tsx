import React, { useState, useEffect, useRef } from 'react';
import { getLessonByDate, SSDay } from '../services/sabbathSchool';
import { generateQuizQuestion } from '../services/gemini';
import { getVerseText } from '../services/biblePlan';

const SabbathSchool: React.FC = () => {
    const [lesson, setLesson] = useState<SSDay | null>(null);
    const [loading, setLoading] = useState(true);
    const [canFinish, setCanFinish] = useState(false);
    const [finished, setFinished] = useState(false);
    const [quiz, setQuiz] = useState<{ question: string, options: string[], correctAnswer: number } | null>(null);
    const [showQuiz, setShowQuiz] = useState(false);
    const [quizResult, setQuizResult] = useState<'success' | 'failure' | null>(null);
    const [validating, setValidating] = useState(false);

    // Verse Modal State
    const [verseModal, setVerseModal] = useState<{ show: boolean, title: string, content: string }>({ show: false, title: '', content: '' });
    const [loadingVerse, setLoadingVerse] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadDailyLesson();
    }, []);

    const loadDailyLesson = async () => {
        setLoading(true);
        // Hardcoded test date as requested by user ("usa esta fecha como prueba")
        // Using 2025-12-28 (Domingo) which exists in our inserted data.
        const testDate = new Date('2025-12-28');
        const data = await getLessonByDate(testDate);
        setLesson(data);
        setLoading(false);
    };

    const handleScroll = () => {
        if (contentRef.current && !canFinish) {
            const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
            // If we are close to the bottom (within 50px)
            if (scrollTop + clientHeight >= scrollHeight - 50) {
                setCanFinish(true);
            }
        }
    };

    const handleValidate = async () => {
        if (!lesson) return;
        setValidating(true);
        const q = await generateQuizQuestion(lesson.content);
        setQuiz(q);
        setShowQuiz(true);
        setValidating(false);
    };

    const handleAnswer = (index: number) => {
        if (!quiz) return;
        if (index === quiz.correctAnswer) {
            setQuizResult('success');
            setFinished(true); // Mark as officially read/completed
            // TODO: Save to DB user progress
        } else {
            setQuizResult('failure');
        }
    };

    const handleVerseClick = async (reference: string) => {
        // Parse reference: "Efesios 3:1" or "2 Corintios 4:7-12"
        // Regex groups: Book, Chapter, VerseRange
        const regex = /((?:[1-3]\s)?[A-ZÀ-ÿ][a-zÀ-ÿ]+\.?)\s+(\d+):(\d+(?:-\d+)?)/;
        const match = reference.match(regex);

        setVerseModal({ show: true, title: reference, content: 'Cargando...' });
        setLoadingVerse(true);

        if (match) {
            const book = match[1];
            const chapter = parseInt(match[2]);
            const verses = match[3];

            const text = await getVerseText(book, chapter, verses);
            setVerseModal({ show: true, title: reference, content: text });
        } else {
            setVerseModal({ show: true, title: reference, content: 'No se pudo cargar el versículo.' });
        }
        setLoadingVerse(false);
    };

    // Function to process text and make verses clickable
    const renderContentWithVerses = (text: string) => {
        // Regex to find references like "Efesios 3:1", "2 Corintios 4:7-12", "Fil. 4:4"
        // Simple approximation
        const regex = /((?:[1-3]\s)?[A-ZÀ-ÿ][a-zÀ-ÿ]+\.?\s+\d+:\d+(?:-\d+)?)/g;

        const parts = text.split(regex);

        return parts.map((part, index) => {
            if (part.match(regex)) {
                return (
                    <span
                        key={index}
                        onClick={() => handleVerseClick(part)}
                        className="text-primary cursor-pointer hover:underline font-bold bg-primary/10 rounded px-1 -mx-0.5"
                    >
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    if (loading) {
        return <div className="h-full flex items-center justify-center text-white">Cargando lección...</div>;
    }

    if (!lesson) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400 flex-col gap-4">
                <span className="material-symbols-outlined text-4xl">event_busy</span>
                <p>No hay lección disponible para hoy.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-4 animate-fade-in-up relative">
            <div className="max-w-4xl mx-auto w-full h-full flex flex-col gap-6">

                {/* Header */}
                <div className="flex flex-col gap-1">
                    <span className="text-primary text-sm font-bold tracking-wider uppercase">{lesson.nombre} - {lesson.date}</span>
                    <h1 className="text-3xl font-black text-white leading-tight">{lesson.title}</h1>
                </div>

                {/* Content Card */}
                <div className="flex-1 glass-card rounded-2xl overflow-hidden flex flex-col relative border border-white/5">

                    {/* Scrollable Content */}
                    <div
                        ref={contentRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar"
                    >
                        {/* Verses */}
                        {lesson.readings && (
                            <div className="bg-[#292938] p-4 rounded-xl border-l-4 border-primary">
                                <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Lectura Bíblica</span>
                                <p className="text-white font-medium whitespace-pre-wrap">{renderContentWithVerses(lesson.readings)}</p>
                            </div>
                        )}

                        {/* Memory Text */}
                        {lesson.memory_text && (
                            <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/20">
                                <span className="text-xs text-orange-400 uppercase font-bold block mb-1">Para Memorizar</span>
                                <p className="text-orange-200 italic font-medium">"{renderContentWithVerses(lesson.memory_text)}"</p>
                            </div>
                        )}

                        {/* Main Content */}
                        <div className="prose prose-invert max-w-none">
                            <p className="text-lg leading-relaxed text-gray-200 whitespace-pre-wrap font-serif">
                                {renderContentWithVerses(lesson.content)}
                            </p>
                        </div>

                        {/* Padding at bottom for button space */}
                        <div className="h-20"></div>
                    </div>

                    {/* Floating / Sticky Footer Action */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex justify-center">
                        {!showQuiz ? (
                            <button
                                disabled={!canFinish}
                                onClick={handleValidate}
                                className={`
                            px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg
                            ${canFinish
                                        ? 'bg-primary hover:bg-primary/90 text-white cursor-pointer translate-y-0 opacity-100'
                                        : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-80'
                                    }
                        `}
                            >
                                {validating ? (
                                    <>
                                        <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                                        Generando Pregunta...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">quiz</span>
                                        Validar Estudio
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="w-full max-w-md bg-[#1A1A24] border border-white/10 rounded-xl p-4 shadow-2xl animate-fade-in-up pb-8 mb-4">
                                {quizResult === 'success' ? (
                                    <div className="text-center py-4">
                                        <div className="size-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-3">
                                            <span className="material-symbols-outlined text-3xl">check</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">¡Lección Completada!</h3>
                                        <p className="text-gray-400 text-sm">Has validado tu estudio de hoy.</p>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="text-lg font-bold text-white mb-4 text-center">{quiz?.question}</h3>
                                        <div className="space-y-2">
                                            {quiz?.options.map((option, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => handleAnswer(index)}
                                                    disabled={quizResult === 'failure'}
                                                    className={`w-full p-3 rounded-lg text-left text-sm transition-all border ${quizResult === 'failure' && index !== quiz.correctAnswer
                                                        ? 'bg-red-500/10 border-red-500/50 text-red-200'
                                                        : 'bg-[#292938] border-white/5 hover:bg-[#323246] text-gray-300'
                                                        }`}
                                                >
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                        {quizResult === 'failure' && (
                                            <p className="text-red-400 text-center text-xs mt-3">Respuesta incorrecta. Inténtalo de nuevo.</p>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Verse Modal */}
            {verseModal.show && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#1A1A24] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80%]">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#292938]">
                            <h3 className="text-lg font-bold text-white">{verseModal.title}</h3>
                            <button
                                onClick={() => setVerseModal({ ...verseModal, show: false })}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {loadingVerse ? (
                                <div className="flex flex-col items-center justify-center py-8 gap-3 text-gray-400">
                                    <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                                    <p className="text-sm">Buscando versículo...</p>
                                </div>
                            ) : (
                                <p className="text-lg text-gray-200 leading-relaxed font-serif whitespace-pre-wrap">
                                    {verseModal.content}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SabbathSchool;
