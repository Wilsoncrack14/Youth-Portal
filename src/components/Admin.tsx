import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../hooks/useAdmin';

const Admin: React.FC = () => {
    const { isAdmin, loading: checkingAdmin } = useAdmin();
    const navigate = useNavigate();
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<string>('');

    useEffect(() => {
        if (!checkingAdmin && !isAdmin) {
            navigate('/'); // Redirect non-admins
        }
    }, [isAdmin, checkingAdmin, navigate]);

    if (checkingAdmin) {
        return (
            <div className="h-full flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Verificando permisos...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setStatus('Iniciando subida...');

        try {
            const fileName = `uploads/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const { data, error } = await supabase.storage
                .from('lessons')
                .upload(fileName, file);

            if (error) {
                throw error;
            }

            setStatus(`✅ Archivo subido con éxito: ${fileName}`);

            setStatus('🧠 Procesando con IA (Gemini)...');
            const { data: funcData, error: funcError } = await supabase.functions.invoke('process-pdf-lesson', {
                body: { fileKey: fileName }
            });

            if (funcError) throw funcError;

            setStatus(`🎉 ¡Lección procesada y guardada! (${funcData.processed} días extraídos)`);
            console.log('AI Processing result:', funcData);
            setUploading(false); // Stop extracting


        } catch (error: any) {
            console.error('Error uploading:', error);
            setStatus(`❌ Error al subir: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-4 lg:p-10 animate-fade-in-up text-white h-full flex flex-col">
            <div className="max-w-4xl mx-auto w-full">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-white">Panel de Administración</h1>
                        <p className="text-gray-400">Gestión de Contenido y Lecciones</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Upload Card */}
                    <div className="glass-card p-6 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="size-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <span className="material-symbols-outlined">upload_file</span>
                            </div>
                            <h2 className="text-xl font-bold">Subir Lección (PDF)</h2>
                        </div>

                        <div className={`border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors relative ${uploading ? 'bg-white/5 animate-pulse' : 'hover:bg-white/5 cursor-pointer'}`}>
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span className="material-symbols-outlined text-4xl text-gray-500 mb-2">cloud_upload</span>
                            <p className="text-sm font-medium text-white">Arrastra un PDF aquí</p>
                            <p className="text-xs text-gray-500 mt-1">o haz clic para seleccionar</p>
                        </div>

                        {status && (
                            <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${status.startsWith('✅') ? 'bg-green-500/10 text-green-300' : status.startsWith('❌') ? 'bg-red-500/10 text-red-300' : 'bg-blue-500/10 text-blue-300'}`}>
                                {status.startsWith('Iniciando') && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                                {status}
                            </div>
                        )}
                    </div>

                    {/* Stats / Recent Uploads Placeholders */}
                    <div className="glass-card p-6 rounded-2xl border border-white/5 opacity-50 pointer-events-none">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="size-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                                <span className="material-symbols-outlined">analytics</span>
                            </div>
                            <h2 className="text-xl font-bold">Estado del Sistema</h2>
                        </div>
                        <p className="text-gray-400 text-sm">Próximamente: Estadísticas de procesamiento y logs.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Admin;
