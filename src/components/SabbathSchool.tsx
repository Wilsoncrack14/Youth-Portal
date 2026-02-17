import React, { useState, useEffect, useMemo } from 'react';
import ImageOptimizerModal from './ImageOptimizerModal';
import { supabase } from '../services/supabase';
// import { useAdmin } from '../hooks/useAdmin'; // Removed
import { useNavigate } from 'react-router-dom'; // keeping just in case, though not used in reader?
import BibleVerseModal from './BibleVerseModal';
// import DailyLessonEditor from './DailyLessonEditor'; // Removed
import { generateQuizQuestion, generateLessonSummary, getSabbathContext } from '../services/ai';
import WeeklyProgress from './WeeklyProgress';

import { extractHighlightedVerse } from '../services/dailyVerse';

interface Quarter {
    id: string;
    year: number;
    quarter: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    cover_image_url?: string;
    introduction?: string;
}

interface Week {
    id: string;
    quarter_id: string;
    week_number: number;
    title: string;
    memory_verse: string;
    start_date: string;
    end_date: string;
    cover_image_url?: string;
}

interface DailyLesson {
    id: string;
    week_id: string;
    day: string;
    title: string;
    content: string;
    bible_verses: string[];
    reflection_questions: string[];
    summary?: string;
}

const DAYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_NAMES: Record<string, string> = {
    sunday: 'Domingo',
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado'
};

const SabbathSchool: React.FC = () => {
    // const { isAdmin } = useAdmin(); // Removed
    // const [showAdmin, setShowAdmin] = useState(false); // Removed



    const [quarters, setQuarters] = useState<Quarter[]>([]);
    const [selectedQuarter, setSelectedQuarter] = useState<Quarter | null>(null);
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
    const [dailyLessons, setDailyLessons] = useState<DailyLesson[]>([]);
    const [selectedDay, setSelectedDay] = useState<string>('saturday');
    const [weeksProgress, setWeeksProgress] = useState<Record<string, { total: number; completed: number }>>({});

    // Quiz & Progress State
    const [weeklyProgress, setWeeklyProgress] = useState<boolean[]>(new Array(7).fill(false));
    const [completedCount, setCompletedCount] = useState(0);
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [generatingQuiz, setGeneratingQuiz] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [quizScore, setQuizScore] = useState(0);
    const [quizFinished, setQuizFinished] = useState(false);
    const [quizCompletedToday, setQuizCompletedToday] = useState(false);
    const [todayQuizScore, setTodayQuizScore] = useState(0);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [username, setUsername] = useState<string>('');

    // Current week auto-detection state
    const [currentWeekInfo, setCurrentWeekInfo] = useState<{
        quarterTitle: string;
        weekNumber: number;
        weekTitle: string;
        weekId: string;
        todayLessonTitle: string;
    } | null>(null);

    // AI Summaries State
    const [currentSummary, setCurrentSummary] = useState<string | null>(null);
    const [previousSummary, setPreviousSummary] = useState<string | null>(null);
    const [loadingSummaries, setLoadingSummaries] = useState(false);

    // Load Weekly Progress
    useEffect(() => {
        fetchWeeklyProgress();
    }, []);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'weeks' | 'details'>('weeks');

    // Optimization State
    const [optimizationModalOpen, setOptimizationModalOpen] = useState(false);
    const [fileToOptimize, setFileToOptimize] = useState<File | null>(null);

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Bible Verse Modal State
    const [verseModalOpen, setVerseModalOpen] = useState(false);
    const [selectedVerseRef, setSelectedVerseRef] = useState<string | null>(null);

    // Admin Editing State - REMOVED
    // const [adminEditingLesson, setAdminEditingLesson] = useState<DailyLesson | null>(null);

    const handleVerseClick = (ref: string) => {
        setSelectedVerseRef(ref);
        setVerseModalOpen(true);
    };

    // handleAdminSaveLesson REMOVED

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
    };

    // Day order matching daily_lessons.day column (Saturday-first Sabbath week)\r\n    const DAYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];\r\n\r\n    // --- HELPER FUNCTIONS FOR PROGRESS & QUIZ ---
    const getLessonDate = (weekStartDate: string, dayName: string) => {
        const days = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const dayIndex = days.indexOf(dayName.toLowerCase());
        if (dayIndex === -1) return null;

        const [y, m, d] = weekStartDate.split('-').map(Number);
        const localDate = new Date(y, m - 1, d); // Month is 0-indexed
        localDate.setDate(localDate.getDate() + dayIndex);

        // Return YYYY-MM-DD
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const fetchUserProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('id', user.id)
                    .single();

                if (profile?.username) setUsername(profile.username);
                else setUsername(user.email?.split('@')[0] || 'Usuario');

                if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            setUsername('Usuario');
        }
    };

    const fetchWeeklyProgress = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !selectedWeek) return;

            // Get all daily_lessons for the selected week
            const { data: lessons } = await supabase
                .from('daily_lessons')
                .select('id, day')
                .eq('week_id', selectedWeek.id);

            if (!lessons || lessons.length === 0) {
                setWeeklyProgress(new Array(7).fill(false));
                setCompletedCount(0);
                return;
            }

            const lessonIds = lessons.map(l => l.id);

            // Get completions for these lessons
            const { data: completions } = await supabase
                .from('lesson_completions')
                .select('daily_lesson_id, score')
                .eq('user_id', user.id)
                .in('daily_lesson_id', lessonIds);

            const completedLessonIds = new Set(
                (completions || []).filter(c => c.score >= 2).map(c => c.daily_lesson_id)
            );

            const progress = DAYS.map(dayName => {
                const lesson = lessons.find(l => l.day === dayName);
                return lesson ? completedLessonIds.has(lesson.id) : false;
            });

            setWeeklyProgress(progress);
            setCompletedCount(progress.filter(Boolean).length);
        } catch (e) {
            console.error("Error fetching weekly progress:", e);
        }
    };

    const checkQuizCompletion = async () => {
        if (!selectedWeek || !selectedDay) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const lesson = getCurrentDayLesson();
            if (!lesson) {
                setQuizCompletedToday(false);
                setTodayQuizScore(null);
                return;
            }

            const { data } = await supabase
                .from('lesson_completions')
                .select('score, on_time')
                .eq('user_id', user.id)
                .eq('daily_lesson_id', lesson.id)
                .limit(1);

            if (data && data.length > 0) {
                const s = data[0].score;
                setTodayQuizScore(s);
                if (s >= 2) setQuizCompletedToday(true);
                else setQuizCompletedToday(false);
            } else {
                setQuizCompletedToday(false);
                setTodayQuizScore(null);
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchWeeklyProgress();
        fetchUserProfile();
    }, [selectedWeek]);

    useEffect(() => {
        checkQuizCompletion();
    }, [selectedWeek, selectedDay]);

    const handleOptimizationConfirm = (file: File) => {
        setQuarterCover(file);
        setOptimizationModalOpen(false);
        setFileToOptimize(null);
    };

    // Admin form state - REMOVED
    const [quarterCover, setQuarterCover] = useState<File | null>(null);

    useEffect(() => {
        loadQuarters();
    }, []);

    useEffect(() => {
        if (selectedWeek) {
            loadDailyLessons(selectedWeek.id);
        }
    }, [selectedWeek]);

    const loadQuarters = async () => {
        try {
            const { data, error } = await supabase
                .from('quarters')
                .select('*')
                .order('year', { ascending: false })
                .order('quarter', { ascending: false });

            if (error) throw error;
            setQuarters(data || []);
        } catch (error) {
            console.error('Error loading quarters:', error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-detect the current week based on today's date
    const fetchCurrentWeekInfo = async () => {
        try {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // Step 1: Find the active quarter
            const { data: quarterData } = await supabase
                .from('quarters')
                .select('*')
                .lte('start_date', todayStr)
                .gte('end_date', todayStr)
                .limit(1)
                .single();

            if (!quarterData) return;

            // Step 2: Calculate current week number from quarter start date
            const [qy, qm, qd] = quarterData.start_date.split('-').map(Number);
            const quarterStart = new Date(qy, qm - 1, qd);
            const diffMs = today.getTime() - quarterStart.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const calculatedWeekNumber = Math.floor(diffDays / 7) + 1;

            // Step 3: Find the week with that week_number in this quarter
            const { data: weekData } = await supabase
                .from('weeks')
                .select('id, week_number, title, quarter_id, start_date, end_date')
                .eq('quarter_id', quarterData.id)
                .eq('week_number', calculatedWeekNumber)
                .single();

            if (!weekData) return;

            // Step 4: Get today's day name
            const jsDay = today.getDay(); // 0=Sun ... 6=Sat
            const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const todayDayName = dayMap[jsDay];

            // Step 5: Get today's lesson title
            const { data: lessonData } = await supabase
                .from('daily_lessons')
                .select('title')
                .eq('week_id', weekData.id)
                .eq('day', todayDayName)
                .single();

            setCurrentWeekInfo({
                quarterTitle: quarterData.title,
                weekNumber: weekData.week_number,
                weekTitle: weekData.title,
                weekId: weekData.id,
                todayLessonTitle: lessonData?.title || 'Sin lección asignada'
            });

            // Also use this for progress if no week is selected yet
            if (!selectedWeek) {
                setSelectedWeek({
                    id: weekData.id,
                    quarter_id: weekData.quarter_id,
                    week_number: weekData.week_number,
                    title: weekData.title,
                    memory_verse: '',
                    start_date: weekData.start_date,
                    end_date: weekData.end_date
                } as Week);

                // NEW: Also select the quarter and the current day to show the lesson immediately
                setSelectedQuarter(quarterData);
                setSelectedDay(todayDayName);

                // ALSO: Load the weeks for this quarter so if user navigates back, they are there
                loadWeeks(quarterData.id);
            }
        } catch (error) {
            console.error('Error fetching current week info:', error);
        }
    };

    useEffect(() => {
        fetchCurrentWeekInfo();
    }, []);

    const loadWeeks = async (quarterId: string) => {
        try {
            const { data, error } = await supabase
                .from('weeks')
                .select('*')
                .eq('quarter_id', quarterId)
                .order('week_number', { ascending: true });

            if (error) throw error;
            if (data) {
                setWeeks(data);
                // Fetch progress for these weeks
                fetchWeeksProgress(data.map(w => w.id));
            }
        } catch (error) {
            console.error('Error loading weeks:', error);
        }
    };

    const fetchWeeksProgress = async (weekIds: string[]) => {
        if (!weekIds.length) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get all daily lessons for these weeks
            const { data: lessons } = await supabase
                .from('daily_lessons')
                .select('id, week_id')
                .in('week_id', weekIds);

            if (!lessons) return;
            const lessonIds = lessons.map(l => l.id);

            // 2. Get completions for these lessons
            const { data: completions } = await supabase
                .from('lesson_completions')
                .select('daily_lesson_id')
                .eq('user_id', user.id)
                .in('daily_lesson_id', lessonIds);

            const completedSet = new Set(completions?.map(c => c.daily_lesson_id));

            // 3. Aggregate per week
            const progress: Record<string, { total: number; completed: number }> = {};
            weekIds.forEach(wid => {
                const weekLessons = lessons.filter(l => l.week_id === wid);
                progress[wid] = {
                    total: weekLessons.length,
                    completed: weekLessons.filter(l => completedSet.has(l.id)).length
                };
            });
            setWeeksProgress(progress);
        } catch (e) {
            console.error("Error fetching weeks progress", e);
        }
    };

    const loadDailyLessons = async (weekId: string) => {
        try {
            const { data, error } = await supabase
                .from('daily_lessons')
                .select('*')
                .eq('week_id', weekId);

            if (error) throw error;
            setDailyLessons(data || []);
        } catch (error) {
            console.error('Error loading daily lessons:', error);
        }
    };

    // Admin Handlers Removed (handleCreateQuarter, handleUpdateQuarter)

    // Calculate Previous Day Lesson
    const getPreviousDayLesson = () => {
        if (!dailyLessons.length || !selectedDay) return null;
        const currentIndex = DAYS.indexOf(selectedDay);
        if (currentIndex <= 0) return null; // No previous day in this week context
        const prevDayName = DAYS[currentIndex - 1];
        return dailyLessons.find(l => l.day === prevDayName);
    };

    // Fetch AI Summaries when day changes
    useEffect(() => {
        const fetchSummaries = async () => {
            const currentLesson = getCurrentDayLesson();
            if (!currentLesson) {
                setCurrentSummary(null);
                setPreviousSummary(null);
                return;
            }

            // 1. Try Cache First (Instant Load)
            const cacheKey = `sabbath_context_${currentLesson.id}`;
            const cached = localStorage.getItem(cacheKey);

            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    setCurrentSummary(parsed.current_hook);
                    setPreviousSummary(parsed.previous_impact);
                    setLoadingSummaries(false);
                    return;
                } catch (e) {
                    console.error("Error parsing cached summary", e);
                    localStorage.removeItem(cacheKey);
                }
            }

            // 2. If not cached, check auth and fetch
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setCurrentSummary("Inicia sesión para ver el análisis espiritual.");
                setPreviousSummary("Inicia sesión para ver el resumen.");
                return;
            }

            setLoadingSummaries(true);
            try {
                const prevLesson = getPreviousDayLesson();



                // Call new context API
                const context = await getSabbathContext(
                    currentLesson.content,
                    prevLesson ? prevLesson.content : null
                );

                // Save to Cache
                localStorage.setItem(cacheKey, JSON.stringify(context));

                setCurrentSummary(context.current_hook);
                setPreviousSummary(context.previous_impact);
            } catch (e) {
                console.error("Error fetching summaries", e);
                // Fallback to avoid empty state
                if (!currentSummary) setCurrentSummary("Conecta con Dios a través del estudio de su Palabra.");
                if (!previousSummary) setPreviousSummary("Conecta con Dios a través del estudio de su Palabra.");
            } finally {
                setLoadingSummaries(false);
            }
        };

        if (selectedWeek && selectedDay) {
            fetchSummaries();
        }
    }, [selectedWeek, selectedDay, dailyLessons]);

    const getCurrentDayLesson = () => {
        return dailyLessons.find(l => l.day === selectedDay);
    };

    const saveQuizCompletion = async (score: number) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !selectedWeek) return;

            const lesson = getCurrentDayLesson();
            if (!lesson) return;

            // Determine if studying on time (today matches the lesson's calendar date)
            const lessonDate = getLessonDate(selectedWeek.start_date, selectedDay);
            const todayStr = new Date().toISOString().split('T')[0];
            const isOnTime = lessonDate === todayStr;

            // Use RPC for atomic update and XP calculation
            // Rule: 50 XP if on_time (and first time), 10 XP otherwise (late or review)
            // The RPC handles the logic of "Review = 10 XP" internally by checking existence.
            const { data: result, error } = await supabase.rpc('submit_lesson_completion', {
                p_daily_lesson_id: lesson.id,
                p_score: score,
                p_on_time: isOnTime
            });

            if (error) throw error;

            const rpcResult = result as any;
            const xpEarned = rpcResult.xp_earned || 0;
            const message = rpcResult.message || 'Lección completada';

            showToast(`🎉 ${message}`, 'success');
            setQuizCompletedToday(true);
            setTodayQuizScore(score);
            fetchWeeklyProgress(); // Refresh progress locally

            // Also refresh weeks progress list
            fetchWeeksProgress(weeks.map(w => w.id));

            window.dispatchEvent(new CustomEvent('chapterCompleted', {
                detail: { score, xp: xpEarned, onTime: isOnTime, reference: `Lección: ${lessonDate}` }
            }));

        } catch (e: any) { console.error(e); showToast('Error guardando progreso', 'error'); }
    };

    const startQuiz = async () => {
        const lesson = getCurrentDayLesson();
        if (!lesson) return;

        setQuizScore(0);
        setCurrentQuestion(0);
        setQuizFinished(false);
        setGeneratingQuiz(true);
        setShowQuizModal(true);

        try {
            // Generate quiz
            const generated = await generateQuizQuestion(lesson.content);
            if (Array.isArray(generated) && generated.length > 0) {
                setQuizQuestions(generated);
            } else {
                setQuizQuestions([
                    { question: "¿Leíste la lección completa?", options: ["Sí", "No"], correctAnswer: 0 },
                    { question: "¿Entendiste el mensaje principal?", options: ["Sí", "Más o menos"], correctAnswer: 0 },
                    { question: "¿Tienes dudas?", options: ["No", "Sí"], correctAnswer: 0 }
                ]);
            }
        } catch (e) { console.error(e); }
        setGeneratingQuiz(false);
    };

    const handleAnswer = (optionIndex: number) => {
        if (!quizQuestions[currentQuestion]) return;

        // Calculate new score based on CURRENT question
        // Note: state update is async, so we use local var or functional update
        const isCorrect = optionIndex === quizQuestions[currentQuestion].correctAnswer;
        const newScore = isCorrect ? quizScore + 1 : quizScore;
        setQuizScore(newScore);

        if (currentQuestion + 1 < quizQuestions.length) {
            setCurrentQuestion(c => c + 1);
        } else {
            setQuizFinished(true);
            // Final check - save for any score >= 2
            const finalScore = newScore;
            if (finalScore >= 2) {
                saveQuizCompletion(finalScore);
            }
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // BREADCRUMB NAVIGATION
    const renderBreadcrumbs = () => {
        return (
            <div className="flex items-center text-sm text-gray-400 mb-6 gap-2">
                <button
                    onClick={() => { setSelectedQuarter(null); setSelectedWeek(null); }}
                    className="hover:text-white transition-colors flex items-center gap-1"
                >
                    <span className="material-symbols-outlined text-lg">home</span>
                    Inicio
                </button>
                {selectedQuarter && (
                    <>
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                        <button
                            onClick={() => setSelectedWeek(null)}
                            className={`hover:text-white transition-colors ${!selectedWeek ? 'text-white font-bold' : ''}`}
                        >
                            {selectedQuarter.year} Q{selectedQuarter.quarter}
                        </button>
                    </>
                )}
                {selectedWeek && (
                    <>
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                        <span className="text-white font-bold">Semana {selectedWeek.week_number}</span>
                    </>
                )}
            </div>
        );
    };

    return (
        <>
            <ImageOptimizerModal
                isOpen={optimizationModalOpen}
                onClose={() => setOptimizationModalOpen(false)}
                imageFile={fileToOptimize}
                onOptimize={handleOptimizationConfirm}
            />

            <BibleVerseModal
                isOpen={verseModalOpen}
                onClose={() => setVerseModalOpen(false)}
                reference={selectedVerseRef}
            />

            <div className="p-4 lg:p-10 animate-fade-in-up max-w-5xl mx-auto flex flex-col gap-8">

                {/* DailyLessonEditor Removed */}

                {/* Toast Notification */}
                {toast && (
                    <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border animate-fade-in-down transition-all duration-300 ${toast.type === 'success' ? 'bg-[#1a1b26] border-green-500/30 text-green-400' : 'bg-[#1a1b26] border-red-500/30 text-red-400'}`}>
                        <span className="material-symbols-outlined text-xl">
                            {toast.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        <div>
                            <h4 className="font-bold text-sm text-white">{toast.type === 'success' ? '¡Éxito!' : 'Error'}</h4>
                            <p className="text-xs opacity-90">{toast.message}</p>
                        </div>
                    </div>
                )}

                {/* Breadcrumbs - Only show if drilling down */}
                {(selectedQuarter || selectedWeek) && (
                    <div className="flex flex-wrap items-center text-sm text-gray-400 mb-[-1rem] gap-2">
                        <button
                            onClick={() => { setSelectedQuarter(null); setSelectedWeek(null); }}
                            className="hover:text-white transition-colors flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-lg">home</span>
                            Inicio
                        </button>
                        {selectedQuarter && (
                            <>
                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                                <button
                                    onClick={() => setSelectedWeek(null)}
                                    className={`hover:text-white transition-colors ${!selectedWeek ? 'text-white font-bold' : ''}`}
                                >
                                    {selectedQuarter.year} Q{selectedQuarter.quarter}
                                </button>
                            </>
                        )}
                        {selectedWeek && (
                            <>
                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                                <span className="text-white font-bold">Semana {selectedWeek.week_number}</span>
                            </>
                        )}
                    </div>
                )}

                {/* HERO SECTION - MATCHING READINGROOM */}
                <div className="bg-white dark:bg-gradient-to-r dark:from-[#1e3a8a] dark:to-[#1e1e2d] border border-gray-200 dark:border-white/5 rounded-2xl p-6 md:p-12 relative overflow-hidden shadow-xl dark:shadow-2xl min-h-[300px] flex flex-col justify-center transition-colors">

                    {/* Background Image if available - Dark mode only or overlay for light? Let's keep it responsive if possible or hidden in light mode depending on look. For now, let's keep it visible but maybe adjust opacity in light for a subtle effect or just hide it to be clean. Let's hide in light mode for the "clean" look user liked in ReadingRoom. */}
                    {selectedQuarter?.cover_image_url && !selectedWeek && (
                        <div className="absolute inset-0 z-0 hidden dark:block">
                            <img
                                src={selectedQuarter.cover_image_url}
                                alt="Cover"
                                className="w-full h-full object-cover opacity-30 mix-blend-overlay"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/95 to-[#1e1e2d]/95"></div>
                        </div>
                    )}

                    <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 pointer-events-none z-0">
                        <span className="material-symbols-outlined text-9xl text-gray-900 dark:text-white">school</span>
                    </div>

                    <div className="relative z-10 max-w-3xl">
                        <div className="flex items-center gap-3 mb-4 text-blue-600 dark:text-blue-200">
                            <span className="material-symbols-outlined">menu_book</span>
                            <span className="uppercase tracking-widest text-xs font-bold">Escuela Sabática</span>
                        </div>

                        <h1 className="text-2xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 md:mb-6 leading-tight drop-shadow-sm dark:drop-shadow-2xl">
                            {!selectedQuarter ? 'Lección Semanal' :
                                !selectedWeek ? selectedQuarter.title :
                                    selectedWeek.title}
                        </h1>

                        {/* Quarter Description (Always show description or fallback) */}
                        <p className="text-gray-600 dark:text-blue-100 text-lg mb-8 leading-relaxed max-w-2xl font-medium opacity-90">
                            {selectedWeek
                                ? "Estudia la lección de esta semana y fortalece tu fe a través de las Escrituras."
                                : (selectedQuarter?.description || "Explora las lecciones trimestrales de la Escuela Sabática.")}
                        </p>


                    </div>

                </div>

                {/* WEEKLY PROGRESS */}
                <div className="animate-fade-in-up">
                    <WeeklyProgress
                        title="Progreso Semanal"
                        subtitle={currentWeekInfo ? `${currentWeekInfo.quarterTitle} • Semana ${currentWeekInfo.weekNumber}` : undefined}
                        days={['S', 'D', 'L', 'M', 'M', 'J', 'V']}
                        progress={weeklyProgress}
                        completedCount={completedCount}
                        currentDayIndex={DAYS.indexOf(selectedDay)}
                        onClickDay={(index) => {
                            if (DAYS[index]) {
                                setSelectedDay(DAYS[index]);
                            }
                        }}
                    />
                </div>

                {/* MAIN CONTENT AREA */}

                {/* VIEW 1: QUARTER LIST (If nothing selected) */}
                {!selectedQuarter && (
                    <div className="grid gap-4">
                        <h3 className="font-bold text-gray-400 text-sm uppercase tracking-widest ml-1">Trimestres Disponibles</h3>
                        {quarters.map((quarter) => (
                            <div
                                key={quarter.id}
                                onClick={() => setSelectedQuarter(quarter)}
                                className="bg-white dark:bg-[#14151f] hover:bg-gray-50 dark:hover:bg-[#1a1b26] border border-gray-200 dark:border-white/5 rounded-xl p-4 flex items-center justify-between transition-colors group cursor-pointer shadow-sm dark:shadow-none"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-12 rounded bg-gray-200 overflow-hidden flex-shrink-0">
                                        {quarter.cover_image_url ? (
                                            <img src={quarter.cover_image_url} className="w-full h-full object-cover" alt="cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400"><span className="material-symbols-outlined">auto_stories</span></div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-gray-900 dark:text-white font-serif font-bold text-lg">{quarter.title}</p>
                                        <p className="text-gray-500 text-xs">
                                            {quarter.year} Q{quarter.quarter} • {quarter.start_date} - {quarter.end_date}
                                        </p>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-colors">arrow_forward_ios</span>
                            </div>
                        ))}
                        {quarters.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <span className="material-symbols-outlined text-4xl mb-2">school</span>
                                <p>No hay trimestres disponibles</p>
                            </div>
                        )}
                    </div>
                )}

                {/* VIEW 2: QUARTER DETAILS & WEEKS */}
                {selectedQuarter && !selectedWeek && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Intro Card */}
                        <div className="bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-sm">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="w-full md:w-1/3 aspect-video md:aspect-auto md:h-64 rounded-xl overflow-hidden relative">
                                    {selectedQuarter.cover_image_url ? (
                                        <img src={selectedQuarter.cover_image_url} alt={selectedQuarter.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-6xl text-white/20">auto_stories</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{selectedQuarter.title}</h2>
                                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                                        {selectedQuarter.introduction || selectedQuarter.description}
                                    </p>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold">
                                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                                        {selectedQuarter.start_date} - {selectedQuarter.end_date}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Weeks Grid */}
                        <div className="grid gap-4">
                            <h3 className="font-bold text-gray-400 text-sm uppercase tracking-widest ml-1">Lecciones</h3>
                            {weeks.map((week) => (
                                <div
                                    key={week.id}
                                    onClick={() => setSelectedWeek(week)}
                                    className="bg-white dark:bg-[#14151f] hover:bg-gray-50 dark:hover:bg-[#1a1b26] border border-gray-200 dark:border-white/5 rounded-xl p-4 flex items-center justify-between transition-colors group cursor-pointer shadow-sm dark:shadow-none"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold">
                                            {week.week_number}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="text-gray-900 dark:text-white font-bold text-base truncate">{week.title}</p>
                                                {weeksProgress[week.id] && (
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${weeksProgress[week.id].completed === weeksProgress[week.id].total ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'}`}>
                                                        {weeksProgress[week.id].completed}/{weeksProgress[week.id].total}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-500 text-xs mb-2">
                                                {week.start_date} - {week.end_date}
                                            </p>
                                            {weeksProgress[week.id] && weeksProgress[week.id].total > 0 && (
                                                <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${weeksProgress[week.id].completed === weeksProgress[week.id].total ? 'bg-green-500' : 'bg-primary'}`}
                                                        style={{ width: `${(weeksProgress[week.id].completed / weeksProgress[week.id].total) * 100}%` }}
                                                    ></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-colors">arrow_forward</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* VIEW 3: WEEKLY LESSON CONTENT (Reader) */}
                {selectedWeek && (
                    <div className="bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/5 rounded-2xl p-4 md:p-8 shadow-sm overflow-hidden">
                        {/* Week Header */}
                        <div className="mb-8 border-b border-gray-100 dark:border-white/5 pb-6">
                            <span className="text-primary text-sm font-bold tracking-wider uppercase mb-1 block">Lección Semanal</span>
                            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">{selectedWeek.title}</h2>

                            {/* AI SUMMARIES CARDS */}
                            {(currentSummary || previousSummary || loadingSummaries) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                    {/* Previous Lesson Card */}
                                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#25263a] dark:to-[#1e1e2d] p-5 rounded-xl border border-gray-200 dark:border-white/5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-3 opacity-10">
                                            <span className="material-symbols-outlined text-4xl">history</span>
                                        </div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-gray-400"></span>
                                            Resumen Anterior
                                        </h4>
                                        <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed min-h-[60px]">
                                            {loadingSummaries ? (
                                                <div className="animate-pulse space-y-2">
                                                    <div className="h-2 bg-gray-300 dark:bg-white/10 rounded w-3/4"></div>
                                                    <div className="h-2 bg-gray-300 dark:bg-white/10 rounded w-1/2"></div>
                                                </div>
                                            ) : previousSummary ? (
                                                <p>{previousSummary}</p>
                                            ) : (
                                                <p className="opacity-50 italic">No hay lección previa en esta semana.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Current Lesson Card */}
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-primary/10 dark:to-indigo-900/10 p-5 rounded-xl border border-blue-100 dark:border-primary/20 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 opacity-10">
                                            <span className="material-symbols-outlined text-4xl text-primary">auto_awesome</span>
                                        </div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-primary animate-pulse"></span>
                                            Al Día de Hoy
                                        </h4>
                                        <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed min-h-[60px]">
                                            {loadingSummaries ? (
                                                <div className="animate-pulse space-y-2">
                                                    <div className="h-2 bg-primary/20 rounded w-3/4"></div>
                                                    <div className="h-2 bg-primary/20 rounded w-5/6"></div>
                                                    <div className="h-2 bg-primary/20 rounded w-1/2"></div>
                                                </div>
                                            ) : (
                                                <p>{currentSummary || "Analizando contenido..."}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {selectedWeek.memory_verse && (
                                <div className="bg-gray-50 dark:bg-[#25263a] p-6 rounded-xl border-l-4 border-accent-gold italic text-gray-600 dark:text-gray-300 relative">
                                    <span className="material-symbols-outlined absolute top-4 left-4 text-accent-gold/20 text-4xl">format_quote</span>
                                    <p className="pl-6 md:pl-8 text-lg">"{selectedWeek.memory_verse}"</p>
                                </div>
                            )}
                        </div>

                        {/* Days Tabs (Scrollable) */}
                        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                            {DAYS.map((day) => (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={`px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all duration-200 flex flex-col items-center min-w-[80px] ${selectedDay === day
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30 transform -translate-y-1'
                                        : 'bg-gray-100 dark:bg-[#292938] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#343447]'
                                        }`}
                                >
                                    <span className="text-xs opacity-70 uppercase tracking-wider">{DAY_NAMES[day].substring(0, 3)}</span>
                                    <span className="text-sm font-bold">{DAY_NAMES[day]}</span>
                                </button>
                            ))}
                        </div>

                        {/* Content Body - Card Style Matching ReadingRoom */}
                        <div className="min-h-[400px] bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-sm dark:shadow-lg relative overflow-hidden group">
                            {getCurrentDayLesson() ? (
                                <DailyLessonView
                                    lesson={getCurrentDayLesson()!}
                                    onVerseClick={handleVerseClick}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-gray-50 dark:bg-[#15161e] rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                                    <span className="material-symbols-outlined text-4xl mb-4 opacity-50">content_paste_off</span>
                                    <p>No hay contenido disponible para este día</p>
                                </div>
                            )}

                        </div>
                    </div>
                )}

                {/* Quiz Call to Action OR Active Quiz - MOVED OUTSIDE CARD */}
                {selectedWeek && getCurrentDayLesson() && (
                    <div className="mt-8 animate-fade-in" id="quiz-section">
                        {!showQuizModal ? (
                            /* 1. STATE: CALL TO ACTION (Gradient Card) */
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-primary/10 dark:to-purple-500/10 rounded-2xl p-6 md:p-8 text-center border border-blue-100 dark:border-white/5 shadow-sm dark:shadow-none">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¿Terminaste el estudio de hoy?</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-6">Completa un breve cuestionario para registrar tu progreso y ganar experiencia.</p>

                                {quizCompletedToday ? (
                                    <div className="flex flex-col items-center gap-3 animate-fade-in">
                                        <div className="size-16 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-2 border border-green-500/30">
                                            <span className="material-symbols-outlined text-3xl">emoji_events</span>
                                        </div>
                                        <h4 className="text-xl font-bold text-gray-900 dark:text-white">¡Lección Completada!</h4>
                                        <p className="text-green-600 dark:text-green-400 font-medium">Puntuación: {todayQuizScore}/3</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={startQuiz}
                                        disabled={generatingQuiz}
                                        className="bg-primary hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        <span className="material-symbols-outlined">quiz</span>
                                        Completar Lección
                                    </button>
                                )}
                            </div>
                        ) : (
                            /* 2. STATE: ACTIVE QUIZ OR RESULTS (ReadingRoom Style - Clean Card) */
                            <div className="bg-white dark:bg-[#1e1e2d]/60 rounded-2xl p-6 md:p-8 shadow-lg border border-gray-200 dark:border-white/5 animate-fade-in max-w-3xl mx-auto">
                                {!quizFinished ? (
                                    /* ACTIVE QUIZ QUESTIONS */
                                    <div className="animate-fade-in">
                                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-white/5 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/20 p-2 rounded-lg text-primary">
                                                    <span className="material-symbols-outlined">quiz</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                                    Comprobación de Lectura
                                                </h3>
                                            </div>
                                            <button
                                                onClick={() => setShowQuizModal(false)}
                                                className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full"
                                                title="Cancelar cuestionario"
                                            >
                                                <span className="material-symbols-outlined">close</span>
                                            </button>
                                        </div>

                                        {generatingQuiz ? (
                                            <div className="text-center py-12">
                                                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                                <p className="text-gray-400 animate-pulse">Analizando la lección con IA...</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-8">
                                                    <div className="flex justify-between items-end mb-2">
                                                        <span className="text-xs font-bold text-primary tracking-wider uppercase">Pregunta {currentQuestion + 1} de {quizQuestions.length}</span>
                                                        <span className="text-xs text-gray-500 font-bold">{Math.round(((currentQuestion) / quizQuestions.length) * 100)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-2 mb-6">
                                                        <div className="bg-primary h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${((currentQuestion) / quizQuestions.length) * 100}%` }}></div>
                                                    </div>
                                                    <h4 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-snug">
                                                        {quizQuestions[currentQuestion]?.question}
                                                    </h4>
                                                </div>
                                                <div className="space-y-3">
                                                    {quizQuestions[currentQuestion]?.options.map((option: string, idx: number) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => handleAnswer(idx)}
                                                            className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-[#292938] bg-gray-50 dark:bg-[#25263a] hover:bg-white dark:hover:bg-[#2f304a] hover:border-primary/50 transition-all text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-white flex items-center gap-4 group active:scale-[0.99]"
                                                        >
                                                            <div className="size-8 rounded-full bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/10 group-hover:bg-primary group-hover:text-white group-hover:border-primary text-gray-400 flex items-center justify-center font-bold text-sm transition-colors shrink-0">
                                                                {String.fromCharCode(65 + idx)}
                                                            </div>
                                                            <span className="flex-1 text-base">{option}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    /* QUIZ RESULTS */
                                    <div className="text-center py-8 animate-scale-up">
                                        <div className="size-24 bg-green-500/10 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto border-4 border-green-500/10 dark:border-green-500/10 mb-6">
                                            <span className="material-symbols-outlined text-5xl text-green-600 dark:text-green-400">emoji_events</span>
                                        </div>
                                        <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-2">¡Lección Completada!</h3>
                                        <div className="flex items-center justify-center gap-2 mb-6">
                                            <span className="text-gray-500 dark:text-gray-400 font-medium">Tu puntuación:</span>
                                            <span className="text-2xl font-bold text-primary">{quizScore}/{quizQuestions.length}</span>
                                        </div>

                                        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-sm mx-auto">
                                            Has reforzado tu aprendizaje de hoy y has ganado puntos de experiencia.
                                        </p>

                                        <button
                                            onClick={() => setShowQuizModal(false)}
                                            className="bg-primary hover:bg-blue-600 text-white font-bold py-3.5 px-10 rounded-xl transition-all hover:scale-105 shadow-lg shadow-primary/25 w-full md:w-auto"
                                        >
                                            Continuar
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Admin Panel Removed */}


            </div>
        </>
    );
};

// Bible Text Parser Component - Detects and makes Bible references clickable
const BibleTextParser: React.FC<{
    text: string;
    onVerseClick?: (ref: string) => void;
}> = ({ text, onVerseClick }) => {
    // Regex pattern to match Bible references
    // Matches patterns like: Juan 3:16, Fil. 1:7, 1 Cor. 15:1-4, Hech. 16:24, etc.
    const bibleRefPattern = /(\d?\s?[A-ZÁ-Ú][a-záéíóúñ]+\.?\s+\d+:\d+(?:-\d+)?(?:,\s*\d+)?)/g;

    const parseText = (content: string) => {
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;
        let key = 0;

        // Reset regex index
        bibleRefPattern.lastIndex = 0;

        while ((match = bibleRefPattern.exec(content)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                const textBefore = content.substring(lastIndex, match.index);
                parts.push(<span key={`text-${key++}`}>{textBefore}</span>);
            }

            // Add the clickable Bible reference
            const reference = match[1].trim();
            parts.push(
                <button
                    key={`ref-${key++}`}
                    onClick={() => onVerseClick?.(reference)}
                    className="text-primary hover:text-blue-400 hover:underline cursor-pointer font-medium transition-colors inline"
                    title={`Click para ver ${reference}`}
                >
                    {reference}
                </button>
            );

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < content.length) {
            parts.push(<span key={`text-${key++}`}>{content.substring(lastIndex)}</span>);
        }

        return parts.length > 0 ? parts : content;
    };

    // Split by paragraphs and preserve line breaks
    const paragraphs = text.split('\n');

    return (
        <div className="whitespace-pre-wrap">
            {paragraphs.map((paragraph, idx) => (
                <React.Fragment key={idx}>
                    {parseText(paragraph)}
                    {idx < paragraphs.length - 1 && '\n'}
                </React.Fragment>
            ))}
        </div>
    );
};

// Daily Lesson View Component
const DailyLessonView: React.FC<{
    lesson: DailyLesson;
    onVerseClick?: (ref: string) => void;
    isAdmin?: boolean;
    onEdit?: () => void;
}> = ({ lesson, onVerseClick, isAdmin, onEdit }) => {
    const [expandVerses, setExpandVerses] = useState(false);

    // Reset state when lesson changes
    useEffect(() => {
        setExpandVerses(false);
    }, [lesson.id]);

    const verses = lesson.bible_verses || [];
    const VISIBLE_COUNT = 6;
    const hasMoreVerses = verses.length > VISIBLE_COUNT;
    const displayedVerses = expandVerses ? verses : verses.slice(0, VISIBLE_COUNT);

    return (
        <div className="prose dark:prose-invert max-w-none animate-fade-in relative group break-words overflow-x-hidden">
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-1 h-8 bg-primary rounded-full"></span>
                    {lesson.title}
                </h3>
                {isAdmin && onEdit && (
                    <button
                        onClick={onEdit}
                        className="bg-gray-100 dark:bg-[#2a2b3d] hover:bg-primary text-gray-900 dark:text-white hover:text-white p-2 rounded-lg transition-colors flex items-center gap-2 text-sm shadow opacity-50 group-hover:opacity-100"
                        title="Editar esta lección"
                    >
                        <span className="material-symbols-outlined text-lg">edit_note</span>
                        <span className="hidden md:inline">Editar Contenido</span>
                    </button>
                )}
            </div>

            <div className="text-gray-800 dark:text-gray-300 mb-8 text-lg leading-relaxed font-light">
                <BibleTextParser text={lesson.content} onVerseClick={onVerseClick} />
            </div>

            {verses.length > 0 && (
                <div className="bg-blue-50 dark:bg-primary/10 border border-blue-100 dark:border-primary/20 rounded-xl p-5 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
                            <span className="material-symbols-outlined text-primary">menu_book</span>
                            Versículos para estudiar
                        </h4>
                        <span className="text-xs font-medium text-primary/70 bg-white dark:bg-primary/10 px-2 py-1 rounded-full border border-blue-100 dark:border-transparent">
                            {verses.length} citas
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 transition-all duration-500 ease-in-out">
                        {displayedVerses.map((verse, i) => (
                            <button
                                key={i}
                                onClick={() => onVerseClick?.(verse)}
                                className="bg-white dark:bg-[#1a1b26] hover:bg-primary/5 dark:hover:bg-white hover:text-primary dark:hover:text-black text-primary border border-blue-100 dark:border-primary/30 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer text-left flex items-center justify-between group/verse active:scale-[0.98]"
                            >
                                <span className="truncate mr-2 font-medium">{verse}</span>
                                <span className="material-symbols-outlined text-[16px] opacity-0 group-hover/verse:opacity-100 transition-opacity -ml-4 group-hover/verse:ml-0">open_in_new</span>
                            </button>
                        ))}
                    </div>

                    {hasMoreVerses && (
                        <button
                            onClick={() => setExpandVerses(!expandVerses)}
                            className="w-full mt-3 py-2 text-xs font-bold uppercase tracking-wider text-primary/80 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                            {expandVerses ? (
                                <>
                                    <span className="material-symbols-outlined text-lg">expand_less</span>
                                    Ver menos
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">expand_more</span>
                                    Ver {verses.length - VISIBLE_COUNT} más
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}

            {lesson.reflection_questions && lesson.reflection_questions.length > 0 && (
                <div className="bg-indigo-50 dark:bg-gradient-to-br dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-6">
                    <h4 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white mb-4">
                        <span className="material-symbols-outlined text-indigo-500 dark:text-indigo-400">psychology</span>
                        Preguntas de reflexión
                    </h4>
                    <ul className="space-y-4">
                        {lesson.reflection_questions.map((q, i) => (
                            <li key={i} className="flex gap-3 text-gray-700 dark:text-gray-300">
                                <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 size-6 min-w-[24px] rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                                    {i + 1}
                                </span>
                                <span className="text-base">{q}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SabbathSchool;
