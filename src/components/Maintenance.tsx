import React from 'react';
import { useNavigate } from 'react-router-dom';

const Maintenance: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#111221] flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent-gold/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 max-w-2xl w-full text-center space-y-8 animate-fade-in-up">

                {/* Icon / Illustration */}
                <div className="mb-8 relative inline-block">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                    <div className="relative bg-[#1e1e2d] size-24 md:size-32 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl mx-auto transform rotate-3 hover:rotate-6 transition-transform duration-500">
                        <span className="material-symbols-outlined text-5xl md:text-6xl text-primary">engineering</span>
                    </div>
                    {/* Floating gear animation */}
                    <div className="absolute -top-4 -right-4 bg-[#1a1b26] p-2 rounded-xl border border-white/5 shadow-lg animate-bounce">
                        <span className="material-symbols-outlined text-accent-gold text-2xl animate-spin-slow">settings</span>
                    </div>
                </div>

                {/* Text Content */}
                <div className="space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">
                        Estamos Trabajando
                    </h1>
                    <p className="text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-blue-400 font-serif">
                        Para brindarte una mejor experiencia.
                    </p>
                    <p className="text-gray-400 max-w-lg mx-auto leading-relaxed">
                        Nuestros servidores están recibiendo mantenimiento o estamos desplegando nuevas mejoras increíbles.
                        La plataforma volverá a estar disponible muy pronto.
                    </p>
                </div>

                {/* Progress Indicator (Fake) */}
                <div className="max-w-md mx-auto bg-[#1e1e2d] rounded-full h-2 overflow-hidden border border-white/5">
                    <div className="h-full bg-gradient-to-r from-primary to-accent-gold w-3/4 animate-pulse rounded-full"></div>
                </div>

                {/* Actions */}
                <div className="pt-8 flex flex-wrap justify-center gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl font-bold transition-all border border-white/10 flex items-center gap-2 group"
                    >
                        <span className="material-symbols-outlined group-hover:rotate-180 transition-transform">refresh</span>
                        Reintentar
                    </button>
                    {/* Optional: Navigation back home if it's just a section error */}
                    <button
                        onClick={() => navigate('/')}
                        className="bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">home</span>
                        Ir al Inicio
                    </button>
                </div>

            </div>

            {/* Footer info */}
            <div className="absolute bottom-6 text-gray-600 text-xs text-center w-full z-10">
                <p>Código de estado: 503 Service Unavailable</p>
                <p>© 2026 JAPP Team</p>
            </div>
        </div>
    );
};

export default Maintenance;
