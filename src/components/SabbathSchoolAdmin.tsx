import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAdmin } from '../hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import ImageOptimizerModal from './ImageOptimizerModal';
import ConfirmationModal from './ConfirmationModal';

interface Quarter {
    id: string;
    year: number;
    quarter: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    pdf_url?: string;
    created_at?: string;
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
            setStatus('📄 Subiendo PDF a almacenamiento seguro...');
            // Use sanitized filename
            const sanitizedFileName = pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `week_${week.id}_${Date.now()}_${sanitizedFileName}`;

            const { error: pdfError } = await supabase.storage
                .from('lesson-pdfs')
                .upload(storagePath, pdfFile, { upsert: true });

            if (pdfError) throw pdfError;


            // Process with AI
            setStatus('🤖 Procesando con IA (esto puede tardar 1 min)...');


            const { data: { session } } = await supabase.auth.getSession();
            console.log("Session present:", !!session);

            if (!session?.access_token) throw new Error('No hay sesión activa');

            const { data, error } = await supabase.functions.invoke('process-weekly-lesson', {
                body: {
                    weekId: week.id,
                    storagePath, // Pass PATH, not URL
                    weekTitle: title
                }
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
                            <label className="block text-xs text-gray-400 mb-1">PDF de la Lección</label>
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


// Week Management Component (for admin)
const WeekManagement: React.FC<{ weeks: Week[]; quarterId: string; onUpdate: () => void; onDeleteWeek: (id: string) => void }> = ({ weeks, quarterId, onUpdate, onDeleteWeek }) => {
    const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newWeek, setNewWeek] = useState<Partial<Week>>({
        title: '',
        memory_verse: '',
        start_date: '',
        end_date: ''
    });

    const handleCreateWeek = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Determine week number (max + 1)
            const maxWeek = weeks.length > 0 ? Math.max(...weeks.map(w => w.week_number)) : 0;
            const nextWeekNum = maxWeek + 1;

            const { error } = await supabase
                .from('weeks')
                .insert({
                    quarter_id: quarterId,
                    week_number: nextWeekNum,
                    title: newWeek.title,
                    memory_verse: newWeek.memory_verse,
                    start_date: newWeek.start_date,
                    end_date: newWeek.end_date
                });

            if (error) throw error;
            setIsCreating(false);
            setNewWeek({ title: '', memory_verse: '', start_date: '', end_date: '' });
            onUpdate();
        } catch (error) {
            console.error('Error creating week:', error);
            alert('Error al crear semana');
        }
    };

    const handleDeleteWeek = (id: string) => {
        onDeleteWeek(id);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Semanas del Trimestre</h3>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="bg-primary/20 text-primary hover:bg-primary/30 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">{isCreating ? 'close' : 'add'}</span>
                    {isCreating ? 'Cancelar' : 'Nueva Semana'}
                </button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreateWeek} className="bg-[#1f1f2e] p-4 rounded-lg border border-primary/30 animate-fade-in space-y-4">
                    <h4 className="text-white font-bold text-sm">Crear Semana #{weeks.length + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text" placeholder="Título" required
                            value={newWeek.title} onChange={e => setNewWeek({ ...newWeek, title: e.target.value })}
                            className="bg-[#15161e] text-white p-2 rounded border border-white/10 w-full"
                        />
                        <input
                            type="text" placeholder="Versículo"
                            value={newWeek.memory_verse} onChange={e => setNewWeek({ ...newWeek, memory_verse: e.target.value })}
                            className="bg-[#15161e] text-white p-2 rounded border border-white/10 w-full"
                        />
                        <input
                            type="date" required
                            value={newWeek.start_date} onChange={e => setNewWeek({ ...newWeek, start_date: e.target.value })}
                            className="bg-[#15161e] text-white p-2 rounded border border-white/10 w-full"
                        />
                        <input
                            type="date" required
                            value={newWeek.end_date} onChange={e => setNewWeek({ ...newWeek, end_date: e.target.value })}
                            className="bg-[#15161e] text-white p-2 rounded border border-white/10 w-full"
                        />
                    </div>
                    <button type="submit" className="w-full bg-primary text-white font-bold py-2 rounded-lg">Guardar Semana</button>
                </form>
            )}

            <div className="space-y-3">
                {weeks.map((week) => (
                    <div key={week.id} className="relative group">
                        <div className="absolute right-14 top-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDeleteWeek(week.id)} className="text-red-400 bg-black/50 p-1 rounded hover:bg-red-500/20"><span className="material-symbols-outlined text-sm">delete</span></button>
                        </div>
                        <WeekUploader
                            week={week}
                            isExpanded={expandedWeek === week.id}
                            onToggle={() => setExpandedWeek(expandedWeek === week.id ? null : week.id)}
                            onUpdate={onUpdate}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

const SabbathSchoolAdmin: React.FC = () => {
    const { isAdmin, loading: checkingAdmin } = useAdmin();
    const navigate = useNavigate();

    // Global State
    const [quarters, setQuarters] = useState<Quarter[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState('');

    // Create Form State
    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState(1);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    // Management State (Single Quarter)
    const [selectedQuarterId, setSelectedQuarterId] = useState<string | null>(null);
    const [editingQuarter, setEditingQuarter] = useState<Partial<Quarter> | null>(null);
    const [quarterWeeks, setQuarterWeeks] = useState<Week[]>([]);
    const [loadingWeeks, setLoadingWeeks] = useState(false);

    // Modal State
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        type: 'quarter' as 'quarter' | 'week',
        itemId: '',
        title: '',
        message: ''
    });

    useEffect(() => {
        if (!checkingAdmin && !isAdmin) {
            navigate('/');
        }
    }, [isAdmin, checkingAdmin, navigate]);

    useEffect(() => {
        if (isAdmin) {
            loadQuarters();
        }
    }, [isAdmin]);

    // Load Weeks when a quarter is selected
    useEffect(() => {
        if (selectedQuarterId) {
            loadWeeks(selectedQuarterId);
        }
    }, [selectedQuarterId]);

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

    const loadWeeks = async (qId: string) => {
        setLoadingWeeks(true);
        const { data } = await supabase.from('weeks').select('*').eq('quarter_id', qId).order('week_number');
        if (data) setQuarterWeeks(data);
        setLoadingWeeks(false);
    };

    const handleCreateQuarter = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setStatus('📝 Creando trimestre...');

            // VALIDATION
            if (!title.trim() || !description.trim()) {
                setStatus('❌ El título y la descripción son obligatorios.');
                setUploading(false);
                return;
            }

            if (startDate >= endDate) {
                setStatus('❌ La fecha de inicio debe ser anterior a la fecha de fin.');
                setUploading(false);
                return;
            }

            const startYear = new Date(startDate).getFullYear();
            const endYear = new Date(endDate).getFullYear();

            // Optional: Warn if dates don't match the selected year, but don't block (flexible)
            if (startYear !== year && endYear !== year) {
                if (!confirm(`Las fechas seleccionadas (${startYear}-${endYear}) no coinciden con el Año del trimestre (${year}). ¿Continuar igual?`)) {
                    setUploading(false);
                    return;
                }
            }

            // 1. Create quarter in database
            const { data: quarterData, error: quarterError } = await supabase
                .from('quarters')
                .insert({
                    year,
                    quarter,
                    title,
                    description,
                    start_date: startDate,
                    end_date: endDate,
                })
                .select()
                .single();

            if (quarterError) throw quarterError;

            // 2. Upload and Process PDF if provided
            if (pdfFile) {
                setStatus('📤 Subiendo PDF a almacenamiento seguro...');
                const sanitizedFileName = pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
                const storagePath = `${year}_Q${quarter}_${Date.now()}_${sanitizedFileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('lesson-pdfs')
                    .upload(storagePath, pdfFile, { upsert: false });

                if (uploadError) throw uploadError;

                // Update quarter with PDF reference
                await supabase
                    .from('quarters')
                    .update({ pdf_url: storagePath })
                    .eq('id', quarterData.id);

                setUploading(false);
                setProcessing(true);
                setStatus('🤖 Procesando PDF con IA (Seguro)... Esto puede tomar varios minutos.');


                // Process PDF with AI
                const { data: { session } } = await supabase.auth.getSession();
                console.log("Session present:", !!session);

                if (!session?.access_token) throw new Error('No hay sesión activa');

                const { data: processData, error: processError } = await supabase.functions.invoke('process-weekly-lesson', {
                    body: {
                        storagePath: storagePath,
                        weekId: quarterData.id,
                        weekTitle: title
                    }
                });

                if (processError) throw processError;
                if (processData.error) throw new Error(processData.error);

                setStatus(`✅ ¡Trimestre creado exitosamente! ${processData.message || ''}`);
            } else {
                setStatus(`✅ ¡Trimestre creado exitosamente (sin PDF)!`);
            }

            // Reset form
            setTitle('');
            setDescription('');
            setStartDate('');
            setEndDate('');
            setPdfFile(null);

            // Reload quarters
            await loadQuarters();

        } catch (error: any) {
            console.error('Error:', error);
            let msg = error.message;

            // User-friendly error mapping
            if (error.message?.includes('quarters_year_quarter_key') || error.details?.includes('quarters_year_quarter_key')) {
                msg = `Ya existe el Trimestre Q${quarter} del año ${year}.`;
            } else if (error.message === 'The resource already exists') {
                msg = 'El archivo ya existe. Intenta con otro nombre o borra el anterior.';
            }

            setStatus(`❌ Error: ${msg}`);
        } finally {
            setUploading(false);
            setProcessing(false);
        }
    };

    const handleUpdateQuarterDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingQuarter || !editingQuarter.id) return;

        try {
            const { error } = await supabase
                .from('quarters')
                .update({
                    title: editingQuarter.title,
                    description: editingQuarter.description,
                    start_date: editingQuarter.start_date,
                    end_date: editingQuarter.end_date,
                    introduction: editingQuarter.introduction
                })
                .eq('id', editingQuarter.id);
            if (error) throw error;
            setStatus('✅ Trimestre actualizado');
            loadQuarters();
            setEditingQuarter(null); // Exit edit mode

            // Update local state if we are currently viewing this quarter
            if (selectedQuarterId === editingQuarter.id) {
                // The quarters list will update, but we might want to refresh the current view's data 
                // However, `quarters` state update should trigger re-render
            }
        } catch (error: any) {
            setStatus(`❌ Error updating: ${error.message}`);
        }
    };

    const confirmDelete = async () => {
        const { type, itemId } = deleteModal;
        try {
            if (type === 'quarter') {
                const { error } = await supabase.from('quarters').delete().eq('id', itemId);
                if (error) throw error;
                setStatus('✅ Trimestre eliminado');
                if (selectedQuarterId === itemId) setSelectedQuarterId(null);
                await loadQuarters();
            } else if (type === 'week') {
                const { error } = await supabase.from('weeks').delete().eq('id', itemId);
                if (error) throw error;
                setStatus('✅ Semana eliminada');
                if (selectedQuarterId) loadWeeks(selectedQuarterId);
            }
        } catch (error: any) {
            setStatus(`❌ Error al eliminar: ${error.message}`);
        }
    };

    const handleDeleteQuarterClick = (id: string) => {
        setDeleteModal({
            isOpen: true,
            type: 'quarter',
            itemId: id,
            title: '¿Eliminar Trimestre?',
            message: 'Esta acción eliminará el trimestre y TODAS las semanas y lecciones asociadas. No se puede deshacer.'
        });
    };

    const handleDeleteWeekClick = (id: string) => {
        setDeleteModal({
            isOpen: true,
            type: 'week',
            itemId: id,
            title: '¿Eliminar Semana?',
            message: 'Esta acción eliminará la semana y sus lecciones diarias. No se puede deshacer.'
        });
    };

    // Render Loading
    if (checkingAdmin || loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Render Unauth
    if (!isAdmin) return null;

    // View: Manage Specific Quarter
    if (selectedQuarterId) {
        const currentQ = quarters.find(q => q.id === selectedQuarterId);
        if (!currentQ) return <button onClick={() => setSelectedQuarterId(null)}>Volver</button>;

        return (
            <div className="p-4 lg:p-8 animate-fade-in-up">
                <div className="max-w-6xl mx-auto">
                    <button onClick={() => { setSelectedQuarterId(null); setEditingQuarter(null); }} className="mb-4 text-gray-400 hover:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined">arrow_back</span> Volver a Lista
                    </button>

                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">{currentQ.year} - Q{currentQ.quarter}: {currentQ.title}</h1>
                            <p className="text-gray-400 text-sm">Gestiona las semanas y el contenido de este trimestre.</p>
                        </div>
                        <button
                            onClick={() => setEditingQuarter(editingQuarter ? null : currentQ)}
                            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined">edit</span>
                            {editingQuarter ? 'Cancelar Edición' : 'Editar Datos'}
                        </button>
                    </div>

                    {/* Edit Form */}
                    {editingQuarter && (
                        <form onSubmit={handleUpdateQuarterDetails} className="bg-[#1f1f2e] p-6 rounded-xl border border-white/10 mb-8 animate-fade-in">
                            <h3 className="text-white font-bold mb-4">Editar Detalles</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Título</label>
                                    <input type="text" value={editingQuarter.title} onChange={e => setEditingQuarter({ ...editingQuarter, title: e.target.value })} className="w-full bg-[#15161e] text-white p-2 rounded border border-white/10" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Descripción</label>
                                    <input type="text" value={editingQuarter.description} onChange={e => setEditingQuarter({ ...editingQuarter, description: e.target.value })} className="w-full bg-[#15161e] text-white p-2 rounded border border-white/10" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Inicio</label>
                                    <input type="date" value={editingQuarter.start_date} onChange={e => setEditingQuarter({ ...editingQuarter, start_date: e.target.value })} className="w-full bg-[#15161e] text-white p-2 rounded border border-white/10" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Fin</label>
                                    <input type="date" value={editingQuarter.end_date} onChange={e => setEditingQuarter({ ...editingQuarter, end_date: e.target.value })} className="w-full bg-[#15161e] text-white p-2 rounded border border-white/10" />
                                </div>
                            </div>
                            <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-600">Guardar Cambios</button>
                        </form>
                    )}

                    {/* Week Management */}
                    <div className="bg-[#1a1b26] rounded-2xl border border-white/5 p-6">
                        {loadingWeeks ? (
                            <div className="text-center p-8"><span className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin inline-block"></span></div>
                        ) : (
                            <WeekManagement
                                weeks={quarterWeeks}
                                quarterId={selectedQuarterId}
                                onUpdate={() => loadWeeks(selectedQuarterId)}
                                onDeleteWeek={handleDeleteWeekClick}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // View: Dashboard (Default)
    return (
        <div className="p-4 lg:p-8 animate-fade-in-up">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Administración de Escuela Sabática</h1>
                    <p className="text-gray-400">Gestiona trimestres y lecciones.</p>
                </div>

                {/* Create Quarter Form */}
                <div className="bg-[#1a1b26] rounded-2xl border border-white/5 p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">add_circle</span>
                        Crear Nuevo Trimestre
                    </h2>

                    <form onSubmit={handleCreateQuarter} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Year */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Año</label>
                                <input
                                    type="number"
                                    value={year}
                                    onChange={(e) => setYear(parseInt(e.target.value))}
                                    className="w-full bg-[#292938] text-white rounded-lg p-3 border border-white/10 focus:border-primary focus:outline-none"
                                    required
                                />
                            </div>

                            {/* Quarter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Trimestre</label>
                                <select
                                    value={quarter}
                                    onChange={(e) => setQuarter(parseInt(e.target.value))}
                                    className="w-full bg-[#292938] text-white rounded-lg p-3 border border-white/10 focus:border-primary focus:outline-none"
                                    required
                                >
                                    <option value={1}>Q1 (Enero - Marzo)</option>
                                    <option value={2}>Q2 (Abril - Junio)</option>
                                    <option value={3}>Q3 (Julio - Septiembre)</option>
                                    <option value={4}>Q4 (Octubre - Diciembre)</option>
                                </select>
                            </div>

                            {/* Start Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Fecha de Inicio</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-[#292938] text-white rounded-lg p-3 border border-white/10 focus:border-primary focus:outline-none"
                                    required
                                />
                            </div>

                            {/* End Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Fecha de Fin</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-[#292938] text-white rounded-lg p-3 border border-white/10 focus:border-primary focus:outline-none"
                                    required
                                />
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Título del Trimestre</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ej: El Gran Conflicto"
                                className="w-full bg-[#292938] text-white rounded-lg p-3 border border-white/10 focus:border-primary focus:outline-none"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Descripción</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Breve descripción del trimestre..."
                                rows={3}
                                className="w-full bg-[#292938] text-white rounded-lg p-3 border border-white/10 focus:border-primary focus:outline-none resize-none"
                            />
                        </div>

                        {/* PDF Upload (Optional now) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Archivo PDF (Opcional - Crea semanas auto)</label>
                            <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} className="text-gray-400" />
                        </div>

                        {/* Status */}
                        {status && (
                            <div className={`p-4 rounded-lg ${status.startsWith('✅') ? 'bg-green-500/10 text-green-300' :
                                status.startsWith('❌') ? 'bg-red-500/10 text-red-300' :
                                    'bg-blue-500/10 text-blue-300'
                                }`}>
                                {processing && <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2"></div>}
                                {status}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={uploading || processing}
                            className="w-full bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {uploading || processing ? 'Procesando...' : 'Crear Trimestre'}
                        </button>
                    </form>
                </div>

                {/* Quarters List */}
                <div className="bg-[#1a1b26] rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-accent-gold">calendar_month</span>
                            Trimestres Creados
                        </h2>
                    </div>

                    <div className="divide-y divide-white/5">
                        {quarters.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                No hay trimestres creados aún
                            </div>
                        ) : (
                            quarters.map((q) => (
                                <div key={q.id} className="p-6 hover:bg-white/5 transition-colors group">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 cursor-pointer" onClick={() => setSelectedQuarterId(q.id)}>
                                            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">
                                                {q.year} Q{q.quarter} - {q.title}
                                            </h3>
                                            <p className="text-gray-400 text-sm mb-2">{q.description}</p>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span>{q.start_date} → {q.end_date}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedQuarterId(q.id)}
                                                className="bg-white/5 hover:bg-white/10 px-3 py-1 rounded text-sm text-white"
                                            >
                                                Gestionar
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQuarterClick(q.id)}
                                                className="text-red-400 hover:text-red-300 p-2"
                                                title="Eliminar trimestre"
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={confirmDelete}
                title={deleteModal.title}
                message={deleteModal.message}
                isDangerous={true}
                confirmText="Sí, Eliminar"
            />
        </div>
    );
};

export default SabbathSchoolAdmin;
