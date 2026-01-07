import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useUser } from '../contexts/UserContext';
import { User, Calendar, CheckCircle, Church } from 'lucide-react';

const Onboarding: React.FC = () => {
    const { profile, refreshProfile } = useUser();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [birthDate, setBirthDate] = useState('');
    const [church, setChurch] = useState('Iglesia Adventista del Séptimo Día');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!profile?.id) {
            setError('No se pudo identificar al usuario.');
            setLoading(false);
            return;
        }

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    birth_date: birthDate,
                    church: church
                })
                .eq('id', profile.id);

            if (updateError) throw updateError;

            await refreshProfile();
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setError(err.message || 'Error al guardar los datos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background-dark text-white flex flex-col items-center justify-center p-4">
            <div className="glass-panel p-8 rounded-2xl w-full max-w-md border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-purple-500"></div>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/30">
                        <User className="text-primary w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold font-display mb-2">¡Bienvenido!</h1>
                    <p className="text-gray-400">Ayúdanos a personalizar tu experiencia completando tu perfil.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/20 text-red-300 text-sm flex items-start gap-2">
                            <span className="mt-0.5">•</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            Fecha de Nacimiento
                        </label>
                        <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary text-white transition-all"
                            required
                        />
                        <p className="text-xs text-gray-500">Usamos esto para personalizar contenido para tu edad.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
                            <Church className="w-4 h-4 text-primary" />
                            Iglesia
                        </label>
                        <select
                            value={church}
                            onChange={(e) => setChurch(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary text-white transition-all appearance-none"
                            required
                        >
                            <option value="Iglesia Adventista del Séptimo Día" className="bg-gray-900">Iglesia Adventista del Séptimo Día</option>
                        </select>
                        <p className="text-xs text-gray-500">Por el momento, esta funcionalidad está optimizada para miembros de la IASD.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <>
                                Continuar <CheckCircle className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Onboarding;
