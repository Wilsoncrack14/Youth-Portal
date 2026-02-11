import React, { useState, useEffect } from 'react';
import ImageOptimizerModal from './ImageOptimizerModal';
import { supabase } from '../services/supabase';
import { useAdmin } from '../hooks/useAdmin';
import BibleVerseModal from './BibleVerseModal';
import DailyLessonEditor from './DailyLessonEditor';
import { generateQuizQuestion } from '../services/ai';

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
    const { isAdmin } = useAdmin();
    const [showAdmin, setShowAdmin] = useState(false);



    const [quarters, setQuarters] = useState<Quarter[]>([]);
    const [selectedQuarter, setSelectedQuarter] = useState<Quarter | null>(null);
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
    const [dailyLessons, setDailyLessons] = useState<DailyLesson[]>([]);
    const [selectedDay, setSelectedDay] = useState<string>('saturday');

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

    // Admin Editing State
    const [adminEditingLesson, setAdminEditingLesson] = useState<DailyLesson | null>(null);

    const handleVerseClick = (ref: string) => {
        setSelectedVerseRef(ref);
        setVerseModalOpen(true);
    };

    const handleAdminSaveLesson = async (updatedData: any) => {
        try {
            const { error } = await supabase
                .from('daily_lessons')
                .update({
                    title: updatedData.title,
                    content: updatedData.content,
                    bible_verses: updatedData.bible_verses,
                    reflection_questions: updatedData.reflection_questions
                })
                .eq('id', updatedData.id);

            if (error) throw error;

            showToast('✅ Lección actualizada correctamente', 'success');
            setAdminEditingLesson(null);

            // Refresh local state without full reload
            setDailyLessons(lessons => lessons.map(l => l.id === updatedData.id ? { ...l, ...updatedData } : l));
        } catch (error: any) {
            showToast(`❌ Error al guardar: ${error.message}`, 'error');
        }
    };

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

    // Admin form state
    const [newQuarter, setNewQuarter] = useState({
        year: new Date().getFullYear(),
        quarter: 1,
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        introduction: ''
    });
    const [quarterCover, setQuarterCover] = useState<File | null>(null);

    useEffect(() => {
        loadQuarters();
    }, []);

    useEffect(() => {
        if (selectedQuarter) {
            loadWeeks(selectedQuarter.id);
            // Populate form for editing
            setNewQuarter({
                year: selectedQuarter.year,
                quarter: selectedQuarter.quarter,
                title: selectedQuarter.title,
                description: selectedQuarter.description,
                start_date: selectedQuarter.start_date,
                end_date: selectedQuarter.end_date,
                introduction: selectedQuarter.introduction || ''
            });
            setActiveTab('weeks');
        } else {
            // Reset form for creation
            setNewQuarter({
                year: new Date().getFullYear(),
                quarter: 1,
                title: '',
                description: '',
                start_date: '',
                end_date: '',
                introduction: ''
            });
        }
    }, [selectedQuarter]);

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
                .select('id, title, start_date')
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
            setWeeks(data || []);
        } catch (error) {
            console.error('Error loading weeks:', error);
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

    const handleCreateQuarter = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            let coverUrl = '';

            // Upload cover if exists
            if (quarterCover) {
                const fileName = `quarter_${newQuarter.year}_Q${newQuarter.quarter}_${Date.now()}.${quarterCover.name.split('.').pop()}`;
                const { error: uploadError } = await supabase.storage
                    .from('quarter-covers')
                    .upload(fileName, quarterCover);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('quarter-covers')
                    .getPublicUrl(fileName);

                coverUrl = publicUrl;
            }

            // Create quarter
            const { data: quarterData, error: quarterError } = await supabase
                .from('quarters')
                .insert({
                    ...newQuarter,
                    cover_image_url: coverUrl
                })
                .select()
                .single();

            if (quarterError) throw quarterError;

            // Create 13 empty weeks
            const weeksToCreate = Array.from({ length: 13 }, (_, i) => ({
                quarter_id: quarterData.id,
                week_number: i + 1,
                title: `Semana ${i + 1}`,
                memory_verse: '',
                start_date: newQuarter.start_date,
                end_date: newQuarter.end_date
            }));

            const { error: weeksError } = await supabase
                .from('weeks')
                .insert(weeksToCreate);

            if (weeksError) throw weeksError;

            showToast('✅ Trimestre creado con 13 semanas', 'success');
            setNewQuarter({
                year: new Date().getFullYear(),
                quarter: 1,
                title: '',
                description: '',
                start_date: '',
                end_date: '',
                introduction: ''
            });
            setQuarterCover(null);
            await loadQuarters();
            setShowAdmin(false);
        } catch (error: any) {
            showToast(`❌ Error: ${error.message}`, 'error');
        }
    };

    const handleUpdateQuarter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQuarter) return;

        try {
            let coverUrl = selectedQuarter.cover_image_url;

            // Upload new cover if exists
            if (quarterCover) {
                const fileName = `quarter_${newQuarter.year}_Q${newQuarter.quarter}_${Date.now()}.${quarterCover.name.split('.').pop()}`;
                const { error: uploadError } = await supabase.storage
                    .from('quarter-covers')
                    .upload(fileName, quarterCover);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('quarter-covers')
                    .getPublicUrl(fileName);

                coverUrl = publicUrl;
            }

            const { error } = await supabase
                .from('quarters')
                .update({
                    ...newQuarter,
                    cover_image_url: coverUrl
                })
                .eq('id', selectedQuarter.id);

            if (error) throw error;

            showToast('✅ Trimestre actualizado con éxito', 'success');
            setQuarterCover(null);
            await loadQuarters();
            // Update local state to reflect changes immediately
            setSelectedQuarter({
                ...selectedQuarter,
                ...newQuarter,
                cover_image_url: coverUrl
            });
        } catch (error: any) {
            showToast(`❌ Error al actualizar: ${error.message}`, 'error');
        }
    };

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

            // XP: 50 if on-time, 10 if late
            const xpEarned = isOnTime ? 50 : 10;

            // Upsert into lesson_completions (unique constraint on user_id + daily_lesson_id)
            const { data: existing } = await supabase
                .from('lesson_completions')
                .select('id, score')
                .eq('user_id', user.id)
                .eq('daily_lesson_id', lesson.id)
                .single();

            let error;
            if (existing) {
                // Only update if new score is higher
                if (score > existing.score) {
                    const { error: err } = await supabase
                        .from('lesson_completions')
                        .update({ score, on_time: isOnTime, notes: `Quiz score: ${score}/3` })
                        .eq('id', existing.id);
                    error = err;
                }
            } else {
                const { error: err } = await supabase
                    .from('lesson_completions')
                    .insert({
                        user_id: user.id,
                        daily_lesson_id: lesson.id,
                        score,
                        on_time: isOnTime,
                        notes: `Quiz score: ${score}/3`
                    });
                error = err;
            }

            if (error) throw error;

            const timeLabel = isOnTime ? '¡Puntual! ⏰' : 'Fuera de tiempo';
            showToast(`🎉 ${timeLabel} Lección completada! (+${xpEarned} XP)`, 'success');
            setQuizCompletedToday(true);
            setTodayQuizScore(score);
            fetchWeeklyProgress(); // Refresh progress

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

    // Reusable Form Logic (Render function)
    const renderQuarterForm = (isEditing: boolean) => (
        <form onSubmit={isEditing ? handleUpdateQuarter : handleCreateQuarter} className="space-y-4 mb-8 bg-[#222330] p-6 rounded-xl border border-white/5">
            <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">
                {isEditing ? 'Editar Detalles del Trimestre' : 'Crear Nuevo Trimestre'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs text-gray-400 block mb-1">Año</label>
                    <input
                        type="number"
                        placeholder="2026"
                        value={newQuarter.year}
                        onChange={(e) => setNewQuarter({ ...newQuarter, year: parseInt(e.target.value) })}
                        className="w-full bg-[#1a1b26] text-white rounded-lg p-3 border border-white/10 focus:border-primary focus:outline-none"
                        required
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-400 block mb-1">Trimestre</label>
                    <select
                        value={newQuarter.quarter}
                        onChange={(e) => setNewQuarter({ ...newQuarter, quarter: parseInt(e.target.value) })}
                        className="w-full bg-[#1a1b26] text-white rounded-lg p-3 border border-white/10 focus:border-primary focus:outline-none"
                        required
                    >
                        <option value={1}>Q1 (Enero - Marzo)</option>
                        <option value={2}>Q2 (Abril - Junio)</option>
                        <option value={3}>Q3 (Julio - Septiembre)</option>
                        <option value={4}>Q4 (Octubre - Diciembre)</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-400 block mb-1">Inicio</label>
                    <input
                        type="date"
                        value={newQuarter.start_date}
                        onChange={(e) => setNewQuarter({ ...newQuarter, start_date: e.target.value })}
                        className="w-full bg-[#1a1b26] text-white rounded-lg p-3 border border-white/10 focus:border-primary focus:outline-none"
                        required
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-400 block mb-1">Fin</label>
                    <input
                        type="date"
                        value={newQuarter.end_date}
                        onChange={(e) => setNewQuarter({ ...newQuarter, end_date: e.target.value })}
                        className="w-full bg-[#1a1b26] text-white rounded-lg p-3 border border-white/10 focus:border-primary focus:outline-none"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="text-xs text-gray-400 block mb-1">Título del Trimestre</label>
                <input
                    type="text"
                    placeholder="Ej: Uniendo el Cielo y la Tierra"
                    value={newQuarter.title}
                    onChange={(e) => setNewQuarter({ ...newQuarter, title: e.target.value })}
                    className="w-full bg-[#1a1b26] text-white rounded-lg p-3 border border-white/10 focus:border-primary focus:outline-none"
                    required
                />
            </div>

            <div>
                <label className="text-xs text-gray-400 block mb-1">Descripción corta</label>
                <textarea
                    placeholder="Breve descripción para la tarjeta..."
                    value={newQuarter.description}
                    onChange={(e) => setNewQuarter({ ...newQuarter, description: e.target.value })}
                    className="w-full bg-[#1a1b26] text-white rounded-lg p-3 border border-white/10 resize-none focus:border-primary focus:outline-none"
                    rows={2}
                />
            </div>

            <div>
                <label className="text-xs text-gray-400 block mb-1">Introducción Completa</label>
                <textarea
                    placeholder="Texto completo de introducción del folleto..."
                    value={newQuarter.introduction}
                    onChange={(e) => setNewQuarter({ ...newQuarter, introduction: e.target.value })}
                    className="w-full bg-[#1a1b26] text-white rounded-lg p-3 border border-white/10 resize-none focus:border-primary focus:outline-none"
                    rows={4}
                />
            </div>

            <div>
                <label className="block text-sm text-gray-400 mb-2">Imagen de Portada (Trimestre)</label>
                <div className="flex items-center gap-4">
                    <label className="flex-1 cursor-pointer bg-[#1a1b26] border border-dashed border-white/20 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-[#25263a] transition-colors">
                        <span className="material-symbols-outlined text-3xl text-gray-500 mb-1">add_photo_alternate</span>
                        <span className="text-xs text-gray-400">{quarterCover ? quarterCover.name : 'Click para subir nueva imagen'}</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setFileToOptimize(file);
                                    setOptimizationModalOpen(true);
                                }
                            }}
                            className="hidden"
                        />
                    </label>
                    {isEditing && selectedQuarter?.cover_image_url && !quarterCover && (
                        <div className="size-20 rounded-lg overflow-hidden border border-white/10">
                            <img src={selectedQuarter.cover_image_url} className="w-full h-full object-cover" alt="Actual" />
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-2">
                <button
                    type="submit"
                    className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex justify-center items-center gap-2"
                >
                    <span className="material-symbols-outlined">{isEditing ? 'save' : 'add_circle'}</span>
                    {isEditing ? 'Guardar Cambios' : 'Crear Trimestre'}
                </button>
            </div>
        </form>
    );

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

                {adminEditingLesson && (
                    <DailyLessonEditor
                        initialData={adminEditingLesson}
                        isOpen={!!adminEditingLesson}
                        onCancel={() => setAdminEditingLesson(null)}
                        onSave={handleAdminSaveLesson}
                    />
                )}

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
                <div className="bg-gradient-to-r from-[#1e3a8a] to-[#1e1e2d] rounded-2xl p-6 md:p-12 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <span className="material-symbols-outlined text-9xl text-white">school</span>
                    </div>

                    {isAdmin && (
                        <button
                            onClick={() => setShowAdmin(!showAdmin)}
                            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl backdrop-blur-sm transition-all shadow-lg z-20"
                            title="Administrar"
                        >
                            <span className="material-symbols-outlined">settings</span>
                        </button>
                    )}

                    <div className="relative z-10 max-w-2xl">
                        <div className="flex items-center gap-3 mb-4 text-blue-200">
                            <span className="material-symbols-outlined">menu_book</span>
                            <span className="uppercase tracking-widest text-xs font-bold">Escuela Sabática</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
                            {!selectedQuarter ? 'Lección Semanal' :
                                !selectedWeek ? selectedQuarter.title :
                                    selectedWeek.title}
                        </h1>
                        <p className="text-lg text-blue-100 mb-8 opacity-90">
                            Conecta con Dios a través del estudio profundo de su Palabra y el crecimiento espiritual diario.
                        </p>

                        {/* Optional: Add Action Button if needed, mostly context dependent */}
                    </div>
                </div>

                {/* WEEKLY PROGRESS - MATCHING READINGROOM */}
                <div className="bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/5 rounded-2xl p-4 md:p-8 shadow-sm dark:shadow-none">
                    <h3 className="font-serif text-2xl font-bold text-gray-900 dark:text-white mb-6">Progreso Semanal</h3>
                    {currentWeekInfo && (
                        <div className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                            {currentWeekInfo.quarterTitle} • Semana {currentWeekInfo.weekNumber}
                        </div>
                    )}
                    <div className="flex justify-between items-center max-w-3xl mx-auto">
                        {['S', 'D', 'L', 'M', 'M', 'J', 'V'].map((day, index) => {
                            const todayDay = new Date().getDay(); // 0=Sun, 6=Sat
                            // Sabbath School week: Sat(0), Sun(1)... Fri(6) in our array logic?
                            // The existing logic used `DAYS` array order: sat, sun, mon...
                            // Let's align visual index with logic index.
                            // visual index 0 = 'S' (Sat). JS Day 6.
                            // visual index 1 = 'D' (Sun). JS Day 0.

                            // Determine if "Today" matches this index
                            // index 0 -> Sat (6)
                            // index 1 -> Sun (0)
                            // index 2 -> Mon (1)
                            // Formula: (index + 6) % 7 === todayDay? 
                            // Check: 
                            // i=0 -> 6%7=6 (Sat) -> Correct.
                            // i=1 -> 7%7=0 (Sun) -> Correct.

                            const isToday = ((index + 6) % 7) === todayDay;
                            const isCompleted = weeklyProgress[index];

                            let status = 'upcoming';
                            if (isCompleted) {
                                status = 'completed';
                            } else if (isToday) {
                                status = 'active';
                            } else if (!isCompleted && !isToday) {
                                // Simple past check? 
                                // If today is Monday(1, index 2), then Sat(0) and Sun(1) are past.
                                // Logic: current index > this index ?
                                // Need to map todayDay to 0-6 scale where Sat=0.
                                const currentDayIndex = (todayDay + 1) % 7;
                                if (index < currentDayIndex) status = 'missed';
                            }

                            return (
                                <div key={index} className="flex flex-col items-center gap-3">
                                    <span className="text-xs font-bold text-gray-500">{day}</span>
                                    <div className={`size-8 md:size-12 rounded-full flex items-center justify-center border-2 transition-all
                                        ${status === 'completed' ? 'bg-accent-gold border-accent-gold text-black' :
                                            status === 'active' ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' :
                                                status === 'missed' ? 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-300' :
                                                    'bg-gray-100 dark:bg-[#292938] border-gray-200 dark:border-[#3d3d52] text-gray-400 dark:text-gray-600'}
                                     `}>
                                        {status === 'completed' && <span className="material-symbols-outlined">check</span>}
                                        {status === 'active' && <span className="material-symbols-outlined">play_arrow</span>}
                                        {status === 'missed' && <span className="size-2 bg-red-400 rounded-full"></span>}
                                        {status === 'upcoming' && <span className="size-2 bg-gray-600 rounded-full"></span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-8 flex justify-between items-center text-sm text-gray-400 px-4">
                        <span>{Math.round((completedCount / 7) * 100)}% Completado</span>
                        <span className="text-accent-gold font-bold">{completedCount > 0 ? "¡Vas bien!" : "¡Comienza hoy!"}</span>
                    </div>
                </div>

                {/* MAIN CONTENT AREA */}

                {/* VIEW 1: QUARTER LIST (If nothing selected) */}
                {!selectedQuarter && !showAdmin && (
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
                {selectedQuarter && !selectedWeek && !showAdmin && (
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
                                        <div>
                                            <p className="text-gray-900 dark:text-white font-bold text-base">{week.title}</p>
                                            <p className="text-gray-500 text-xs">
                                                {week.start_date} - {week.end_date}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-colors">arrow_forward</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* VIEW 3: WEEKLY LESSON CONTENT (Reader) */}
                {selectedWeek && !showAdmin && (
                    <div className="bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/5 rounded-2xl p-4 md:p-8 shadow-sm overflow-hidden">
                        {/* Week Header */}
                        <div className="mb-8 border-b border-gray-100 dark:border-white/5 pb-6">
                            <span className="text-primary text-sm font-bold tracking-wider uppercase mb-1 block">Lección Semanal</span>
                            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">{selectedWeek.title}</h2>
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
                {selectedWeek && !showAdmin && getCurrentDayLesson() && (
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

                {/* --- ADMIN PANEL (Retained Functional, Styles Updated Lite) --- */}
                {showAdmin && isAdmin && (
                    <div className="bg-white dark:bg-[#1a1b26] rounded-2xl border border-gray-200 dark:border-white/5 p-6 mb-8 animate-fade-in shadow-xl">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-white/10 pb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-accent-gold">settings_suggest</span>
                                Panel de Administración
                            </h2>
                            {selectedQuarter && (
                                <div className="flex items-center gap-4">
                                    <span className="text-gray-500 text-sm">Editando: <strong className="text-gray-900 dark:text-white">{selectedQuarter.title}</strong></span>
                                    <button
                                        onClick={() => setSelectedQuarter(null)}
                                        className="text-xs bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-white px-3 py-1.5 rounded transition-colors"
                                    >
                                        Cambiar Trimestre
                                    </button>
                                </div>
                            )}
                        </div>

                        {!selectedQuarter ? (
                            renderQuarterForm(false)
                        ) : (
                            <div className="animate-fade-in">
                                <div className="flex gap-4 mb-6 border-b border-gray-100 dark:border-white/10">
                                    <button onClick={() => setActiveTab('weeks')} className={`pb-2 px-2 font-medium ${activeTab === 'weeks' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}>Gestionar Lecciones</button>
                                    <button onClick={() => setActiveTab('details')} className={`pb-2 px-2 font-medium ${activeTab === 'details' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}>Editar Detalles</button>
                                </div>
                                {activeTab === 'weeks' ? (
                                    <div className="bg-gray-50 dark:bg-[#222330] p-6 rounded-xl border border-gray-200 dark:border-white/5">
                                        <WeekManagement weeks={weeks} quarterId={selectedQuarter.id} onUpdate={() => loadWeeks(selectedQuarter.id)} />
                                    </div>
                                ) : renderQuarterForm(true)}
                            </div>
                        )}
                    </div>
                )}


            </div>
        </>
    );
};

// Week Management Component (for admin)
const WeekManagement: React.FC<{ weeks: Week[]; quarterId: string; onUpdate: () => void }> = ({ weeks, quarterId, onUpdate }) => {
    const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

    return (
        <div className="space-y-3">
            {weeks.map((week) => (
                <WeekUploader
                    key={week.id}
                    week={week}
                    isExpanded={expandedWeek === week.id}
                    onToggle={() => setExpandedWeek(expandedWeek === week.id ? null : week.id)}
                    onUpdate={onUpdate}
                />
            ))}
        </div>
    );
};

// Week Uploader Component
const WeekUploader: React.FC<{
    week: Week;
    isExpanded: boolean;
    onToggle: () => void;
    onUpdate: () => void;
}> = ({ week, isExpanded, onToggle, onUpdate }) => {
    const [title, setTitle] = useState(week.title || '');
    const [memoryVerse, setMemoryVerse] = useState(week.memory_verse || '');
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');
    const [generatedContent, setGeneratedContent] = useState<any>(null); // For AI Review
    const [editingLessonIndex, setEditingLessonIndex] = useState<number | null>(null); // Index of day being edited in generatedContent
    const [reviewTab, setReviewTab] = useState(0);

    // Optimization State
    const [optimizationModalOpen, setOptimizationModalOpen] = useState(false);
    const [fileToOptimize, setFileToOptimize] = useState<File | null>(null);

    const handleUpload = async () => {
        if (!pdfFile) {
            setStatus('❌ Selecciona un PDF');
            return;
        }

        try {
            setUploading(true);
            setStatus('📤 Subiendo archivos...');

            // Update week info
            await supabase
                .from('weeks')
                .update({ title, memory_verse: memoryVerse })
                .eq('id', week.id);

            // Upload cover image if provided
            let coverUrl = week.cover_image_url;
            if (coverImage) {
                const coverFileName = `week_${week.id}_cover_${Date.now()}.${coverImage.name.split('.').pop()}`;
                const { error: coverError } = await supabase.storage
                    .from('lesson-covers')
                    .upload(coverFileName, coverImage, { upsert: true });

                if (coverError) throw coverError;

                const { data: { publicUrl } } = supabase.storage
                    .from('lesson-covers')
                    .getPublicUrl(coverFileName);

                coverUrl = publicUrl;

                await supabase
                    .from('weeks')
                    .update({ cover_image_url: coverUrl })
                    .eq('id', week.id);
            }

            // Upload PDF
            setStatus('📄 Subiendo PDF...');
            const pdfFileName = `week_${week.id}_${Date.now()}.pdf`;
            const { error: pdfError } = await supabase.storage
                .from('lesson-pdfs')
                .upload(pdfFileName, pdfFile, { upsert: true });

            if (pdfError) throw pdfError;

            const { data: { publicUrl: pdfUrl } } = supabase.storage
                .from('lesson-pdfs')
                .getPublicUrl(pdfFileName);

            // Process with AI
            setStatus('🤖 Procesando con IA (esto puede tardar 1 min)...');

            const { data, error } = await supabase.functions.invoke('process-weekly-lesson', {
                body: { weekId: week.id, pdfUrl, weekTitle: title }
            });

            if (error) throw error;

            console.log("AI Response:", data);

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.data) {
                // If we got data back for review
                const extractedDays = data.data.weeks?.[0]?.days || [];
                console.log(`Extracted ${extractedDays.length} days:`, extractedDays.map((d: any) => d.day));

                setGeneratedContent(data.data);
                setStatus(`✅ IA completada. Extraídos ${extractedDays.length}/7 días. Revisa y guarda.`);
            } else {
                // Fallback for old behavior (if any)
                setStatus(`✅ ¡Lección procesada!`);
                onUpdate();
            }

            setCoverImage(null);
            setPdfFile(null);
        } catch (error: any) {
            console.error(error);
            setStatus(`❌ Error: ${error.message || 'Error desconocido'}`);
        } finally {
            setUploading(false);
        }
    };

    const handleSaveAIContent = async () => {
        console.log("💾 handleSaveAIContent INICIADO", generatedContent);
        if (!generatedContent || !generatedContent.weeks) {
            console.error("❌ No hay contenido generado o semanas indefinidas");
            return;
        }

        try {
            setUploading(true);
            setStatus('💾 Guardando en base de datos...');
            console.log("🔄 Procesando semanas:", generatedContent.weeks.length);

            // We assume 1 week per PDF for now, but structure supports multiple
            for (const genWeek of generatedContent.weeks) {
                console.log("  ➡️ Procesando semana, verso:", genWeek.memoryVerse);
                // Insert/Update week details (memory verse might have been extracted)
                if (genWeek.memoryVerse) {
                    const { error: weekError } = await supabase
                        .from('weeks')
                        .update({ memory_verse: genWeek.memoryVerse })
                        .eq('id', week.id);

                    if (weekError) console.error("❌ Error actualizando semana:", weekError);
                }

                let lessonsCreated = 0;
                console.log("  ➡️ Insertando días:", genWeek.days.length);

                // Insert daily lessons
                for (const day of genWeek.days) {
                    console.log("    📅 Guardando día:", day.day);

                    // Use UPSERT to update if exists, insert if not (avoids RLS delete permission issues)
                    const { error: lessonError } = await supabase
                        .from('daily_lessons')
                        .upsert({
                            week_id: week.id,
                            day: day.day.toLowerCase(),
                            title: day.title,
                            content: day.content,
                            bible_verses: day.verses || [],
                            reflection_questions: day.questions || []
                        }, {
                            onConflict: 'week_id,day'
                        });

                    if (lessonError) {
                        console.error('❌ Error inserting lesson:', lessonError);
                        throw lessonError;
                    }
                    console.log("    ✅ Día guardado:", day.day);
                    lessonsCreated++;
                }
            }

            console.log("🎉 Guardado completado con éxito");
            setStatus('✅ ¡Contenido guardado exitosamente!');
            setGeneratedContent(null); // Clear review
            onUpdate(); // Refresh parent
        } catch (error: any) {
            console.error("❌ Error CRÍTICO en handleSaveAIContent:", error);
            console.error(error);
            setStatus(`❌ Error al guardar: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };



    const handleUpdateGeneratedLesson = (updatedLesson: any) => {
        if (editingLessonIndex === null || !generatedContent) return;

        const newDays = [...generatedContent.weeks[0].days];
        newDays[editingLessonIndex] = {
            ...newDays[editingLessonIndex],
            title: updatedLesson.title,
            content: updatedLesson.content,
            verses: updatedLesson.bible_verses, // Map back to internal format
            questions: updatedLesson.reflection_questions
        };

        setGeneratedContent({
            ...generatedContent,
            weeks: [{
                ...generatedContent.weeks[0],
                days: newDays
            }]
        });
        setEditingLessonIndex(null);
    };

    return (
        <div className="bg-[#1a1b26] rounded-lg border border-white/10 overflow-hidden">
            <ImageOptimizerModal
                isOpen={optimizationModalOpen}
                onClose={() => setOptimizationModalOpen(false)}
                imageFile={fileToOptimize}
                onOptimize={(file) => {
                    setCoverImage(file);
                    setOptimizationModalOpen(false);
                }}
            />
            <button
                onClick={onToggle}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className={`size-10 rounded-full flex items-center justify-center font-bold text-sm ${week.cover_image_url ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-400'}`}>
                        {week.week_number}
                    </div>
                    <div>
                        <h4 className="text-white font-medium">{week.title}</h4>
                        <div className="flex items-center gap-2 text-xs">
                            {week.cover_image_url ?
                                <span className="text-green-400 flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">image</span> Portada</span> :
                                <span className="text-gray-600">Sin portada</span>}
                            <span className="text-gray-700">•</span>
                            {week.memory_verse ?
                                <span className="text-green-400 flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">check_circle</span> Configurado</span> :
                                <span className="text-gray-600">Pendiente</span>}
                        </div>
                    </div>
                </div>
                <span className="material-symbols-outlined text-white/50">
                    {isExpanded ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {isExpanded && (
                <div className="p-4 bg-[#15161e] border-t border-white/5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Título de la semana</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-[#1a1b26] text-white rounded-lg p-2.5 border border-white/10 text-sm focus:border-primary focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Versículo para memorizar</label>
                            <input
                                type="text"
                                value={memoryVerse}
                                onChange={(e) => setMemoryVerse(e.target.value)}
                                className="w-full bg-[#1a1b26] text-white rounded-lg p-2.5 border border-white/10 text-sm focus:border-primary focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Imagen de Portada</label>
                            <label className="flex items-center gap-2 cursor-pointer bg-[#1a1b26] border border-dashed border-white/20 rounded-lg p-3 hover:bg-[#20212e] transition-colors">
                                <span className="material-symbols-outlined text-gray-500">add_photo_alternate</span>
                                <span className="text-xs text-gray-400 truncate">{coverImage ? coverImage.name : 'Subir imagen... (JPG, PNG)'}</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setFileToOptimize(file);
                                            setOptimizationModalOpen(true);
                                        }
                                    }}
                                    className="hidden"
                                />
                            </label>
                            {week.cover_image_url && !coverImage && <p className="text-xs text-green-500 mt-1 pl-1">✓ Imagen actual guardada</p>}
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-1">PDF de la Semana</label>
                            <label className="flex items-center gap-2 cursor-pointer bg-[#1a1b26] border border-dashed border-white/20 rounded-lg p-3 hover:bg-[#20212e] transition-colors">
                                <span className="material-symbols-outlined text-gray-500">picture_as_pdf</span>
                                <span className="text-xs text-gray-400 truncate">{pdfFile ? pdfFile.name : 'Subir PDF de la lección...'}</span>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    {status && (
                        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${status.startsWith('✅') ? 'bg-green-500/10 text-green-300' :
                            status.startsWith('❌') ? 'bg-red-500/10 text-red-300' :
                                'bg-blue-500/10 text-blue-300'
                            }`}>
                            {status.includes('Procesando') && <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>}
                            {status}
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={uploading || !pdfFile}
                        className="w-full bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
                    >
                        {uploading ? 'Procesando...' : 'Generar Lección con IA'}
                    </button>

                    {/* AI REVIEW SECTION */}
                    {generatedContent && (
                        <div className="mt-4 p-4 bg-[#1f1f2e] rounded-lg border border-accent-gold/30 animate-fade-in">
                            <div className="flex items-center gap-2 mb-4 text-accent-gold font-bold">
                                <span className="material-symbols-outlined">reviews</span>
                                Revisión de Contenido Generado
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4">
                                {generatedContent.weeks[0].days.map((day: any, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => setReviewTab(idx)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${reviewTab === idx
                                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                            : 'bg-[#15161e] border-white/10 text-gray-400 hover:bg-white/5'
                                            }`}
                                    >
                                        {day.day}
                                    </button>
                                ))}
                            </div>

                            {generatedContent.weeks[0].days[reviewTab] && (
                                <div className="bg-[#15161e] p-6 rounded-lg border border-white/10 shadow-sm relative animate-fade-in">
                                    <div className="absolute top-4 right-4 text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">
                                        {generatedContent.weeks[0].days[reviewTab].verses?.length || 0} versículos
                                    </div>
                                    <h4 className="text-sm uppercase text-primary font-bold mb-3 tracking-wider border-b border-white/5 pb-2">
                                        {generatedContent.weeks[0].days[reviewTab].day}
                                    </h4>
                                    <h5 className="font-bold text-white text-xl mb-4 leading-tight">{generatedContent.weeks[0].days[reviewTab].title}</h5>
                                    <div className="text-base text-gray-300 whitespace-pre-wrap leading-relaxed">
                                        {generatedContent.weeks[0].days[reviewTab].content}
                                    </div>
                                    {generatedContent.weeks[0].days[reviewTab].questions && generatedContent.weeks[0].days[reviewTab].questions.length > 0 && (
                                        <div className="mt-6 pt-4 border-t border-white/5">
                                            <p className="text-xs text-gray-500 font-bold mb-2 uppercase">Preguntas:</p>
                                            <ul className="list-disc list-inside text-sm text-gray-400 space-y-2">
                                                {generatedContent.weeks[0].days[reviewTab].questions.map((q: string, i: number) => (
                                                    <li key={i}>{q}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleSaveAIContent}
                                disabled={uploading}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-500/20"
                            >
                                <span className="material-symbols-outlined">save</span>
                                {uploading ? 'Guardando...' : 'Confirmar y Guardar Todo'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
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
        <div className="prose prose-invert max-w-none animate-fade-in relative group break-words overflow-x-hidden">
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="w-1 h-8 bg-primary rounded-full"></span>
                    {lesson.title}
                </h3>
                {isAdmin && onEdit && (
                    <button
                        onClick={onEdit}
                        className="bg-[#2a2b3d] hover:bg-primary text-white p-2 rounded-lg transition-colors flex items-center gap-2 text-sm shadow opacity-50 group-hover:opacity-100"
                        title="Editar esta lección"
                    >
                        <span className="material-symbols-outlined text-lg">edit_note</span>
                        <span className="hidden md:inline">Editar Contenido</span>
                    </button>
                )}
            </div>

            <div className="text-gray-300 mb-8 text-lg leading-relaxed font-light">
                <BibleTextParser text={lesson.content} onVerseClick={onVerseClick} />
            </div>

            {verses.length > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-5 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="flex items-center gap-2 text-base font-bold text-white">
                            <span className="material-symbols-outlined text-primary">menu_book</span>
                            Versículos para estudiar
                        </h4>
                        <span className="text-xs font-medium text-primary/70 bg-primary/10 px-2 py-1 rounded-full">
                            {verses.length} citas
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 transition-all duration-500 ease-in-out">
                        {displayedVerses.map((verse, i) => (
                            <button
                                key={i}
                                onClick={() => onVerseClick?.(verse)}
                                className="bg-[#1a1b26] hover:bg-white hover:text-black text-primary border border-primary/30 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer text-left flex items-center justify-between group/verse active:scale-[0.98]"
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
                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6">
                    <h4 className="flex items-center gap-2 text-base font-bold text-white mb-4">
                        <span className="material-symbols-outlined text-indigo-400">psychology</span>
                        Preguntas de reflexión
                    </h4>
                    <ul className="space-y-4">
                        {lesson.reflection_questions.map((q, i) => (
                            <li key={i} className="flex gap-3 text-gray-300">
                                <span className="bg-indigo-500/20 text-indigo-300 size-6 min-w-[24px] rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
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
