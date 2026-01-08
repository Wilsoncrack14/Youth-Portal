import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAdmin } from '../hooks/useAdmin';

interface Quarter {
    id: string;
    year: number;
    quarter: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
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

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
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
    const [selectedDay, setSelectedDay] = useState<string>('sunday');
    const [loading, setLoading] = useState(true);

    // Admin form state
    const [newQuarter, setNewQuarter] = useState({
        year: new Date().getFullYear(),
        quarter: 1,
        title: '',
        description: '',
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        loadQuarters();
    }, []);

    useEffect(() => {
        if (selectedQuarter) {
            loadWeeks(selectedQuarter.id);
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
            if (data && data.length > 0) {
                setSelectedQuarter(data[0]);
            }
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
            // Create quarter
            const { data: quarterData, error: quarterError } = await supabase
                .from('quarters')
                .insert(newQuarter)
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

            alert('✅ Trimestre creado con 13 semanas');
            setNewQuarter({
                year: new Date().getFullYear(),
                quarter: 1,
                title: '',
                description: '',
                start_date: '',
                end_date: ''
            });
            await loadQuarters();
            setShowAdmin(false);
        } catch (error: any) {
            alert(`❌ Error: ${error.message}`);
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

    return (
        <div className="p-4 lg:p-8 animate-fade-in-up">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Escuela Sabática</h1>
                        <p className="text-gray-400">
                            {selectedQuarter ? `${selectedQuarter.year} Q${selectedQuarter.quarter} - ${selectedQuarter.title}` : 'Selecciona un trimestre'}
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setShowAdmin(!showAdmin)}
                            className="bg-accent-gold hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined">{showAdmin ? 'visibility_off' : 'admin_panel_settings'}</span>
                            {showAdmin ? 'Vista Usuario' : 'Modo Admin'}
                        </button>
                    )}
                </div>

                {/* Admin Panel */}
                {showAdmin && isAdmin && (
                    <div className="bg-[#1a1b26] rounded-2xl border border-white/5 p-6 mb-8">
                        <h2 className="text-xl font-bold text-white mb-6">Panel de Administración</h2>

                        {/* Create Quarter Form */}
                        <form onSubmit={handleCreateQuarter} className="space-y-4 mb-8">
                            <h3 className="text-lg font-semibold text-white">Crear Nuevo Trimestre</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    type="number"
                                    placeholder="Año"
                                    value={newQuarter.year}
                                    onChange={(e) => setNewQuarter({ ...newQuarter, year: parseInt(e.target.value) })}
                                    className="bg-[#292938] text-white rounded-lg p-3 border border-white/10"
                                    required
                                />
                                <select
                                    value={newQuarter.quarter}
                                    onChange={(e) => setNewQuarter({ ...newQuarter, quarter: parseInt(e.target.value) })}
                                    className="bg-[#292938] text-white rounded-lg p-3 border border-white/10"
                                    required
                                >
                                    <option value={1}>Q1 (Enero - Marzo)</option>
                                    <option value={2}>Q2 (Abril - Junio)</option>
                                    <option value={3}>Q3 (Julio - Septiembre)</option>
                                    <option value={4}>Q4 (Octubre - Diciembre)</option>
                                </select>
                                <input
                                    type="date"
                                    value={newQuarter.start_date}
                                    onChange={(e) => setNewQuarter({ ...newQuarter, start_date: e.target.value })}
                                    className="bg-[#292938] text-white rounded-lg p-3 border border-white/10"
                                    required
                                />
                                <input
                                    type="date"
                                    value={newQuarter.end_date}
                                    onChange={(e) => setNewQuarter({ ...newQuarter, end_date: e.target.value })}
                                    className="bg-[#292938] text-white rounded-lg p-3 border border-white/10"
                                    required
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="Título del Trimestre"
                                value={newQuarter.title}
                                onChange={(e) => setNewQuarter({ ...newQuarter, title: e.target.value })}
                                className="w-full bg-[#292938] text-white rounded-lg p-3 border border-white/10"
                                required
                            />
                            <textarea
                                placeholder="Descripción"
                                value={newQuarter.description}
                                onChange={(e) => setNewQuarter({ ...newQuarter, description: e.target.value })}
                                className="w-full bg-[#292938] text-white rounded-lg p-3 border border-white/10 resize-none"
                                rows={3}
                            />
                            <button
                                type="submit"
                                className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg"
                            >
                                Crear Trimestre (13 Semanas)
                            </button>
                        </form>

                        {/* Week Management */}
                        {selectedQuarter && weeks.length > 0 && (
                            <WeekManagement
                                weeks={weeks}
                                quarterId={selectedQuarter.id}
                                onUpdate={() => loadWeeks(selectedQuarter.id)}
                            />
                        )}
                    </div>
                )}

                {/* User View */}
                {!showAdmin && selectedQuarter && (
                    <>
                        {/* Weeks Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                            {weeks.map((week) => (
                                <div
                                    key={week.id}
                                    onClick={() => setSelectedWeek(week)}
                                    className={`cursor-pointer rounded-2xl overflow-hidden border-2 transition-all ${selectedWeek?.id === week.id
                                            ? 'border-primary shadow-lg shadow-primary/20'
                                            : 'border-white/10 hover:border-white/30'
                                        }`}
                                >
                                    {week.cover_image_url ? (
                                        <img
                                            src={week.cover_image_url}
                                            alt={week.title}
                                            className="w-full h-48 object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-6xl text-white/30">menu_book</span>
                                        </div>
                                    )}
                                    <div className="p-4 bg-[#1a1b26]">
                                        <p className="text-xs text-gray-400 mb-1">Semana {week.week_number}</p>
                                        <h3 className="text-white font-bold text-sm line-clamp-2">{week.title}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Selected Week Content */}
                        {selectedWeek && (
                            <div className="bg-[#1a1b26] rounded-2xl border border-white/5 p-6">
                                <h2 className="text-2xl font-bold text-white mb-2">{selectedWeek.title}</h2>
                                {selectedWeek.memory_verse && (
                                    <p className="text-gray-400 italic mb-6">"{selectedWeek.memory_verse}"</p>
                                )}

                                {/* Days Navigation */}
                                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                                    {DAYS.map((day) => (
                                        <button
                                            key={day}
                                            onClick={() => setSelectedDay(day)}
                                            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${selectedDay === day
                                                    ? 'bg-primary text-white'
                                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            {DAY_NAMES[day]}
                                        </button>
                                    ))}
                                </div>

                                {/* Daily Lesson Content */}
                                {getCurrentDayLesson() ? (
                                    <DailyLessonView lesson={getCurrentDayLesson()!} />
                                ) : (
                                    <div className="text-center py-12 text-gray-400">
                                        <span className="material-symbols-outlined text-6xl mb-4 block">description</span>
                                        <p>No hay contenido disponible para este día</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {quarters.length === 0 && !showAdmin && (
                    <div className="text-center py-12 text-gray-400">
                        <span className="material-symbols-outlined text-6xl mb-4 block">school</span>
                        <p>No hay trimestres disponibles</p>
                        {isAdmin && (
                            <button
                                onClick={() => setShowAdmin(true)}
                                className="mt-4 bg-primary hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg"
                            >
                                Crear Primer Trimestre
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Week Management Component (for admin)
const WeekManagement: React.FC<{ weeks: Week[]; quarterId: string; onUpdate: () => void }> = ({ weeks, quarterId, onUpdate }) => {
    const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

    return (
        <div>
            <h3 className="text-lg font-semibold text-white mb-4">Gestionar 13 Lecciones Semanales</h3>
            <div className="space-y-2">
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
    const [title, setTitle] = useState(week.title);
    const [memoryVerse, setMemoryVerse] = useState(week.memory_verse);
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');

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
                const coverFileName = `week_${week.id}_cover.${coverImage.name.split('.').pop()}`;
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
            const pdfFileName = `week_${week.id}.pdf`;
            const { error: pdfError } = await supabase.storage
                .from('lesson-pdfs')
                .upload(pdfFileName, pdfFile, { upsert: true });

            if (pdfError) throw pdfError;

            const { data: { publicUrl: pdfUrl } } = supabase.storage
                .from('lesson-pdfs')
                .getPublicUrl(pdfFileName);

            // Process with AI
            setStatus('🤖 Procesando con IA...');
            const { data, error } = await supabase.functions.invoke('process-weekly-lesson', {
                body: { weekId: week.id, pdfUrl, weekTitle: title }
            });

            if (error) throw error;

            setStatus(`✅ ¡Lección procesada! ${data.lessonsCreated} días creados`);
            setCoverImage(null);
            setPdfFile(null);
            onUpdate();
        } catch (error: any) {
            setStatus(`❌ Error: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-[#292938] rounded-lg border border-white/10">
            <button
                onClick={onToggle}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-primary font-bold">#{week.week_number}</span>
                    <span className="text-white">{week.title}</span>
                    {week.cover_image_url && <span className="text-green-400 text-sm">✓ Portada</span>}
                </div>
                <span className="material-symbols-outlined text-white">
                    {isExpanded ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {isExpanded && (
                <div className="p-4 border-t border-white/10 space-y-4">
                    <input
                        type="text"
                        placeholder="Título de la semana"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-[#1a1b26] text-white rounded-lg p-3 border border-white/10"
                    />
                    <input
                        type="text"
                        placeholder="Versículo para memorizar"
                        value={memoryVerse}
                        onChange={(e) => setMemoryVerse(e.target.value)}
                        className="w-full bg-[#1a1b26] text-white rounded-lg p-3 border border-white/10"
                    />

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Imagen de Portada</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                            className="w-full text-white"
                        />
                        {coverImage && <p className="text-sm text-green-400 mt-1">✓ {coverImage.name}</p>}
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">PDF de la Semana</label>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                            className="w-full text-white"
                        />
                        {pdfFile && <p className="text-sm text-green-400 mt-1">✓ {pdfFile.name}</p>}
                    </div>

                    {status && (
                        <div className={`p-3 rounded-lg text-sm ${status.startsWith('✅') ? 'bg-green-500/10 text-green-300' :
                                status.startsWith('❌') ? 'bg-red-500/10 text-red-300' :
                                    'bg-blue-500/10 text-blue-300'
                            }`}>
                            {status}
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={uploading || !pdfFile}
                        className="w-full bg-primary hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Procesando...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">auto_awesome</span>
                                Procesar con IA
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

// Daily Lesson View Component
const DailyLessonView: React.FC<{ lesson: DailyLesson }> = ({ lesson }) => {
    return (
        <div className="prose prose-invert max-w-none">
            <h3 className="text-xl font-bold text-white mb-4">{lesson.title}</h3>
            <div className="text-gray-300 whitespace-pre-wrap mb-6">{lesson.content}</div>

            {lesson.bible_verses.length > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-semibold text-primary mb-2">Versículos para estudiar:</h4>
                    <div className="flex flex-wrap gap-2">
                        {lesson.bible_verses.map((verse, i) => (
                            <span key={i} className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm">
                                {verse}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {lesson.reflection_questions.length > 0 && (
                <div className="bg-accent-gold/10 border border-accent-gold/20 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-accent-gold mb-3">Preguntas de reflexión:</h4>
                    <ul className="space-y-2">
                        {lesson.reflection_questions.map((q, i) => (
                            <li key={i} className="text-gray-300">{q}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SabbathSchool;
