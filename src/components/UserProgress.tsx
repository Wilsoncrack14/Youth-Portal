import React from 'react';
import { useUserData } from '../hooks/useUserData';
import { useUser } from '../contexts/UserContext';
import StreakCalendar from './StreakCalendar';
import { useNavigate } from 'react-router-dom';

const UserProgress: React.FC = () => {
    const { profile, loading: userLoading } = useUser();
    const { userStats, monthlyActivity, isLoading: statsLoading } = useUserData(profile?.id);
    const navigate = useNavigate();

    if (userLoading || statsLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-10 animate-fade-in-up pb-24 md:pb-10">
            <div className="max-w-4xl mx-auto flex flex-col gap-8">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <span className="material-symbols-outlined text-gray-900 dark:text-white">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">Tu Progreso</h1>
                        <p className="text-gray-500 dark:text-gray-400">Detalle de tu actividad diaria y rachas.</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Reavivados Detail */}
                    <div className="glass-panel bg-white dark:bg-[#1e1e2d]/60 border-gray-200 dark:border-white/5 p-6 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <span className="material-symbols-outlined text-9xl text-blue-500">local_fire_department</span>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                                    <span className="material-symbols-outlined">local_fire_department</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Racha Biblia</h3>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-4xl font-black text-blue-500">{userStats.streakReavivados}</span>
                                <span className="text-sm font-medium text-gray-500 mb-1">días seguidos</span>
                            </div>
                            <p className="text-sm text-gray-400 mt-2">¡Sigue leyendo cada día para aumentar tu racha!</p>
                        </div>
                    </div>

                    {/* Sabbath School Detail */}
                    <div className="glass-panel bg-white dark:bg-[#1e1e2d]/60 border-gray-200 dark:border-white/5 p-6 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <span className="material-symbols-outlined text-9xl text-purple-500">school</span>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 rounded-full bg-purple-500/10 text-purple-500">
                                    <span className="material-symbols-outlined">school</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Racha Lección</h3>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-4xl font-black text-purple-500">{userStats.streakSabbathSchool}</span>
                                <span className="text-sm font-medium text-gray-500 mb-1">días seguidos</span>
                            </div>
                            <p className="text-sm text-gray-400 mt-2">Completa tu lección diaria para mantener la racha.</p>
                        </div>
                    </div>
                </div>

                {/* Streak Calendar */}
                <StreakCalendar activity={monthlyActivity || []} />

            </div>
        </div>
    );
};

export default UserProgress;
