
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const UpdatePassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // Verify we have a session (link clicked)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                // If no session, maybe they just navigated here manually. Redirect to login.
                // But typically the magic link usually sets the session before rendering.
                // We'll give it a moment or just let them try.
            }
        });
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setMessage('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;

            setMessage('¡Contraseña actualizada correctamente! Redirigiendo...');
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (error: any) {
            setMessage(error.message || 'Error al actualizar la contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark text-white p-4">
            <div className="glass-panel p-8 rounded-2xl w-full max-w-md border border-white/10">
                <h1 className="text-2xl font-bold text-center mb-6">Nueva Contraseña</h1>

                <form onSubmit={handleUpdate} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Nueva Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary text-white placeholder-gray-600"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Confirmar Contraseña</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary text-white placeholder-gray-600"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm ${message.includes('correctamente') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-colors mt-2 disabled:opacity-50"
                    >
                        {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="w-full bg-transparent hover:bg-white/5 text-gray-400 hover:text-white font-medium py-3 rounded-lg transition-colors mt-2"
                    >
                        Cancelar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UpdatePassword;
