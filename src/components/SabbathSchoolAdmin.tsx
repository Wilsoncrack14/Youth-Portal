import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAdmin } from '../hooks/useAdmin';
import { useNavigate } from 'react-router-dom';

interface Quarter {
    id: string;
    year: number;
    quarter: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    pdf_url?: string;
    created_at: string;
}

const SabbathSchoolAdmin: React.FC = () => {
    const { isAdmin, loading: checkingAdmin } = useAdmin();
    const navigate = useNavigate();
    const [quarters, setQuarters] = useState<Quarter[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState('');

    // Form state
    const [year, setYear] = useState(new Date().getFullYear());
    const [quarter, setQuarter] = useState(1);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);

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

    const handleCreateQuarter = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!pdfFile) {
            setStatus('❌ Por favor selecciona un archivo PDF');
            return;
        }

        try {
            setUploading(true);
            setStatus('📝 Creando trimestre...');

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

            setStatus('📤 Subiendo PDF...');

            // 2. Upload PDF to storage
            const fileName = `${year}_Q${quarter}_${pdfFile.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('lesson-pdfs')
                .upload(fileName, pdfFile);

            if (uploadError) throw uploadError;

            // 3. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('lesson-pdfs')
                .getPublicUrl(fileName);

            // 4. Update quarter with PDF URL
            await supabase
                .from('quarters')
                .update({ pdf_url: publicUrl })
                .eq('id', quarterData.id);

            setUploading(false);
            setProcessing(true);
            setStatus('🤖 Procesando PDF con IA... Esto puede tomar varios minutos.');

            // 5. Process PDF with AI
            const { data: processData, error: processError } = await supabase.functions.invoke('process-weekly-lesson', {
                body: {
                    pdfUrl: publicUrl,
                    weekId: quarterData.id,
                    weekTitle: title
                }
            });

            if (processError) throw processError;

            setStatus(`✅ ¡Trimestre creado exitosamente! ${processData.weeksCreated} semanas y ${processData.lessonsCreated} lecciones procesadas.`);

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
            setStatus(`❌ Error: ${error.message}`);
        } finally {
            setUploading(false);
            setProcessing(false);
        }
    };

    const handleDeleteQuarter = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este trimestre? Esto eliminará todas las semanas y lecciones asociadas.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('quarters')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setStatus('✅ Trimestre eliminado');
            await loadQuarters();
        } catch (error: any) {
            setStatus(`❌ Error al eliminar: ${error.message}`);
        }
    };

    if (checkingAdmin || loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="p-4 lg:p-8 animate-fade-in-up">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Administración de Escuela Sabática</h1>
                    <p className="text-gray-400">Sube PDFs de lecciones y la IA procesará el contenido automáticamente</p>
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

                        {/* PDF Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Archivo PDF de Lecciones</label>
                            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${pdfFile ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-white/20'
                                }`}>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                    id="pdf-upload"
                                    disabled={uploading || processing}
                                />
                                <label htmlFor="pdf-upload" className="cursor-pointer">
                                    <span className="material-symbols-outlined text-5xl text-gray-500 mb-3 block">cloud_upload</span>
                                    {pdfFile ? (
                                        <div>
                                            <p className="text-white font-medium">{pdfFile.name}</p>
                                            <p className="text-sm text-gray-400 mt-1">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-white font-medium">Arrastra el PDF aquí o haz clic para seleccionar</p>
                                            <p className="text-sm text-gray-400 mt-1">Máximo 50 MB</p>
                                        </div>
                                    )}
                                </label>
                            </div>
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
                            disabled={uploading || processing || !pdfFile}
                            className="w-full bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {uploading || processing ? (
                                <>
                                    <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    {uploading ? 'Subiendo...' : 'Procesando con IA...'}
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">auto_awesome</span>
                                    Crear Trimestre y Procesar con IA
                                </>
                            )}
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
                                <div key={q.id} className="p-6 hover:bg-white/5 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-white mb-1">
                                                {q.year} Q{q.quarter} - {q.title}
                                            </h3>
                                            <p className="text-gray-400 text-sm mb-2">{q.description}</p>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span>{q.start_date} → {q.end_date}</span>
                                                {q.pdf_url && (
                                                    <a href={q.pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                                                        Ver PDF
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteQuarter(q.id)}
                                            className="text-red-400 hover:text-red-300 p-2"
                                            title="Eliminar trimestre"
                                        >
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SabbathSchoolAdmin;
