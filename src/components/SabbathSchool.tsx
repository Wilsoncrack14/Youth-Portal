import React, { useState, useEffect } from 'react';
import ImageOptimizerModal from './ImageOptimizerModal';
import { supabase } from '../services/supabase';
import { useAdmin } from '../hooks/useAdmin';
import BibleVerseModal from './BibleVerseModal';
import DailyLessonEditor from './DailyLessonEditor';

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
        <div className="p-4 lg:p-8 animate-fade-in-up">
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
                    <button onClick={() => setToast(null)} className="ml-4 opacity-50 hover:opacity-100">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                {/* Header & Breadcrumbs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div className="flex-1">
                        {renderBreadcrumbs()}
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {!selectedQuarter ? 'Escuela Sabática' :
                                !selectedWeek ? selectedQuarter.title :
                                    selectedWeek.title}
                        </h1>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setShowAdmin(!showAdmin)}
                            className="bg-accent-gold hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-lg flex items-center gap-2 w-fit"
                        >
                            <span className="material-symbols-outlined">{showAdmin ? 'visibility_off' : 'admin_panel_settings'}</span>
                            {showAdmin ? 'Vista Usuario' : 'Modo Admin'}
                        </button>
                    )}
                </div>

                {/* --- VIEW 1: QUARTER LIST --- */}
                {!selectedQuarter && !showAdmin && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {quarters.map((quarter) => (
                            <div
                                key={quarter.id}
                                onClick={() => setSelectedQuarter(quarter)}
                                className="group cursor-pointer bg-[#1a1b26] rounded-2xl overflow-hidden border border-white/10 hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
                            >
                                {/* Quarter Cover */}
                                <div className="h-48 overflow-hidden relative">
                                    {quarter.cover_image_url ? (
                                        <img
                                            src={quarter.cover_image_url}
                                            alt={quarter.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-6xl text-white/30">auto_stories</span>
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                                        <span className="font-bold text-white text-sm">{quarter.year} Q{quarter.quarter}</span>
                                    </div>
                                </div>

                                {/* Quarter Info */}
                                <div className="p-5">
                                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{quarter.title}</h3>
                                    <p className="text-gray-400 text-sm line-clamp-3 mb-4">{quarter.description}</p>
                                    <div className="flex items-center text-primary text-sm font-medium">
                                        <span>Ver lecciones</span>
                                        <span className="material-symbols-outlined text-lg ml-1 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {quarters.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-400">
                                <span className="material-symbols-outlined text-6xl mb-4 block">school</span>
                                <p>No hay trimestres disponibles</p>
                            </div>
                        )}
                    </div>
                )}

                {/* --- VIEW 2: QUARTER DETAILS & WEEKS --- */}
                {selectedQuarter && !selectedWeek && !showAdmin && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Introduction Card */}
                        <div className="bg-[#1a1b26] rounded-2xl border border-white/10 overflow-hidden flex flex-col lg:flex-row shadow-lg">
                            <div className="lg:w-1/3 h-64 lg:h-auto relative">
                                {selectedQuarter.cover_image_url ? (
                                    <img src={selectedQuarter.cover_image_url} alt={selectedQuarter.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-8xl text-white/20">auto_stories</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 lg:p-8 flex-1 flex flex-col justify-center">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold border border-primary/20">
                                        {selectedQuarter.year} Q{selectedQuarter.quarter}
                                    </span>
                                    <span className="text-gray-400 text-sm">
                                        {selectedQuarter.start_date} - {selectedQuarter.end_date}
                                    </span>
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-4">{selectedQuarter.title}</h2>
                                <div className="prose prose-invert max-w-none text-gray-300">
                                    <h3 className="text-lg font-semibold text-white/80 mb-2">Introducción</h3>
                                    <p className="whitespace-pre-wrap leading-relaxed">{selectedQuarter.introduction || selectedQuarter.description}</p>
                                </div>
                            </div>
                        </div>

                        {/* Weeks Grid */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">calendar_view_week</span>
                                    Lecciones del Trimestre
                                </h3>
                                {isAdmin && (
                                    <button
                                        onClick={() => setShowAdmin(true)}
                                        className="bg-primary/20 hover:bg-primary/30 text-primary font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm"
                                    >
                                        <span className="material-symbols-outlined text-lg">edit</span>
                                        Editar Trimestre
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                                {weeks.map((week) => (
                                    <div
                                        key={week.id}
                                        onClick={() => setSelectedWeek(week)}
                                        className="group cursor-pointer bg-[#1a1b26] rounded-xl overflow-hidden border border-white/10 hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-200"
                                    >
                                        <div className="h-40 overflow-hidden relative">
                                            {week.cover_image_url ? (
                                                <img
                                                    src={week.cover_image_url}
                                                    alt={week.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-[#292938] to-[#1f1f2e] flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-4xl text-white/20">menu_book</span>
                                                </div>
                                            )}
                                            <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-bold text-white border border-white/10">
                                                Lesson {week.week_number}
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h4 className="text-white font-bold text-sm lg:text-base line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                                                {week.title}
                                            </h4>
                                            <p className="text-xs text-gray-500 group-hover:text-primary/70 transition-colors">Click para estudiar</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- VIEW 3: WEEKLY LESSON CONTENT --- */}
                {selectedWeek && !showAdmin && (
                    <div className="bg-[#1a1b26] rounded-2xl border border-white/5 p-4 lg:p-8 animate-fade-in shadow-xl shadow-black/20">
                        {/* Week Header */}
                        <div className="mb-8 border-b border-white/10 pb-6">
                            <span className="text-primary text-sm font-bold tracking-wider uppercase mb-1 block">Lección Semanal</span>
                            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">{selectedWeek.title}</h2>
                            {selectedWeek.memory_verse && (
                                <div className="bg-[#25263a] p-4 lg:p-6 rounded-xl border-l-4 border-accent-gold italic text-gray-300 relative">
                                    <span className="material-symbols-outlined absolute top-4 left-4 text-accent-gold/20 text-4xl">format_quote</span>
                                    <p className="pl-6 md:pl-8 text-lg">"{selectedWeek.memory_verse}"</p>
                                </div>
                            )}
                        </div>

                        {/* Days Navigation */}
                        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                            {DAYS.map((day) => (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={`px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all duration-200 flex flex-col items-center min-w-[80px] ${selectedDay === day
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30 transform -translate-y-1'
                                        : 'bg-[#292938] text-gray-400 hover:bg-[#343447] hover:text-white'
                                        }`}
                                >
                                    <span className="text-xs opacity-70 uppercase tracking-wider">{DAY_NAMES[day].substring(0, 3)}</span>
                                    <span className="text-sm font-bold">{DAY_NAMES[day]}</span>
                                </button>
                            ))}
                        </div>

                        {/* Daily Lesson Content */}
                        <div className="min-h-[400px]">
                            {getCurrentDayLesson() ? (
                                <DailyLessonView
                                    lesson={getCurrentDayLesson()!}
                                    onVerseClick={handleVerseClick}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-[#15161e] rounded-xl border border-dashed border-white/10">
                                    <span className="material-symbols-outlined text-4xl mb-4 opacity-50">content_paste_off</span>
                                    <p>No hay contenido disponible para este día</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- ADMIN PANEL --- */}
                {showAdmin && isAdmin && (
                    <div className="bg-[#1a1b26] rounded-2xl border border-white/5 p-6 mb-8 animate-fade-in shadow-xl">
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-accent-gold">settings_suggest</span>
                                Panel de Administración
                            </h2>
                            {selectedQuarter && (
                                <div className="flex items-center gap-4">
                                    <span className="text-gray-400 text-sm">Editando: <strong className="text-white">{selectedQuarter.title}</strong></span>
                                    <button
                                        onClick={() => setSelectedQuarter(null)}
                                        className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition-colors"
                                    >
                                        Cambiar Trimestre
                                    </button>
                                </div>
                            )}
                        </div>

                        {!selectedQuarter ? (
                            // CREATE NEW QUARTER
                            renderQuarterForm(false)
                        ) : (
                            // MANAGE EXISTING QUARTER (TABS)
                            <div className="animate-fade-in">
                                {/* Tabs */}
                                <div className="flex gap-4 mb-6 border-b border-white/10">
                                    <button
                                        onClick={() => setActiveTab('weeks')}
                                        className={`pb-2 px-2 font-medium transition-colors relative ${activeTab === 'weeks' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Gestionar Lecciones
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('details')}
                                        className={`pb-2 px-2 font-medium transition-colors relative ${activeTab === 'details' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        Editar Detalles del Trimestre
                                    </button>
                                </div>

                                {/* Tab Content */}
                                {activeTab === 'weeks' ? (
                                    <div className="bg-[#222330] p-6 rounded-xl border border-white/5">
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">Gestionar Lecciones</h3>
                                                <p className="text-gray-400 text-sm">Sube el PDF e imagen para cada semana</p>
                                            </div>
                                        </div>

                                        {weeks.length > 0 ? (
                                            <WeekManagement
                                                weeks={weeks}
                                                quarterId={selectedQuarter.id}
                                                onUpdate={() => loadWeeks(selectedQuarter.id)}
                                            />
                                        ) : (
                                            <div className="text-center py-8 text-gray-500 bg-black/20 rounded-lg border border-dashed border-white/10">
                                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">warning</span>
                                                <p>No hay semanas generadas. Algo salió mal al crear el trimestre.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="animate-fade-in">
                                        {renderQuarterForm(true)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

            </div >
        </div >
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
    return (
        <div className="prose prose-invert max-w-none animate-fade-in relative group">
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

            {lesson.bible_verses && lesson.bible_verses.length > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 mb-8">
                    <h4 className="flex items-center gap-2 text-base font-bold text-white mb-4">
                        <span className="material-symbols-outlined text-primary">menu_book</span>
                        Versículos para estudiar
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {lesson.bible_verses.map((verse, i) => (
                            <button
                                key={i}
                                onClick={() => onVerseClick?.(verse)}
                                className="bg-[#1a1b26] hover:bg-white hover:text-black text-primary border border-primary/30 px-3 py-1.5 rounded-lg text-sm transition-all duration-300 cursor-pointer no-underline"
                            >
                                {verse}
                            </button>
                        ))}
                    </div>
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
