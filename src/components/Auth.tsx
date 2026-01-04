
import React, { useState } from 'react';
import { supabase } from '../services/supabase.ts';

interface AuthProps {
    onLoginSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [message, setMessage] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username: username || email.split('@')[0]
                        }
                    }
                });
                if (error) throw error;
                setMessage('¡Registro exitoso! Revisa tu email para confirmar.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                onLoginSuccess();
            }
        } catch (error: any) {
            setMessage(error.message || 'Error de autenticación');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}`
                }
            });
            if (error) throw error;
        } catch (error: any) {
            setMessage(error.message || 'Error al iniciar sesión con Google');
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });
            if (error) throw error;
            setMessage('¡Revisa tu correo! Te hemos enviado un enlace para restablecer tu contraseña.');
        } catch (error: any) {
            setMessage(error.message || 'Error al enviar el correo de recuperación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark text-white p-4">
            <div className="glass-panel p-8 rounded-2xl w-full max-w-md border border-white/10">
                <h1 className="text-3xl font-display font-bold text-center mb-2">Youth Portal</h1>
                <p className="text-center text-gray-400 mb-8">Tu espacio de crecimiento espiritual</p>

                <h2 className="text-2xl font-bold text-center mb-6">
                    {isResettingPassword ? 'Recuperar Contraseña' : (isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión')}
                </h2>

                <form onSubmit={isResettingPassword ? handlePasswordReset : handleAuth} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary text-white placeholder-gray-600"
                            placeholder="tu@email.com"
                            required
                        />
                    </div>
                    {!isResettingPassword && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary text-white placeholder-gray-600"
                                placeholder="••••••••"
                                required
                            />
                            {!isSignUp && (
                                <div className="flex justify-end mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsResettingPassword(true)}
                                        className="text-xs text-primary hover:text-blue-400 transition-colors"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {!isResettingPassword && isSignUp && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Nombre de Usuario</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary text-white placeholder-gray-600"
                                placeholder="tu_usuario"
                                minLength={3}
                                maxLength={20}
                            />
                            <p className="text-xs text-gray-500 mt-1">Opcional - Se usará tu email si lo dejas vacío</p>
                        </div>
                    )}

                    {message && (
                        <div className={`p-3 rounded-lg text-sm ${message.includes('exitoso') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-colors mt-2 disabled:opacity-50"
                    >
                        {loading ? 'Procesando...' : (isResettingPassword ? 'Enviar Enlace' : (isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'))}
                    </button>

                    {!isResettingPassword && (
                        <>
                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-600"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-[#1e1e2d] text-gray-400">O continúa con</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                                Google
                            </button>
                        </>
                    )}
                </form>

                <div className="mt-6 text-center">
                    {isResettingPassword ? (
                        <button
                            onClick={() => setIsResettingPassword(false)}
                            className="text-sm text-gray-400 hover:text-white transition-colors underline"
                        >
                            Volver al inicio de sesión
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-sm text-gray-400 hover:text-white transition-colors underline"
                        >
                            {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Auth;
