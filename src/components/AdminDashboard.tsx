import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAdmin } from '../hooks/useAdmin';
import { useNavigate } from 'react-router-dom';

interface UserStats {
    total_users: number;
    active_users_7d: number;
    total_posts: number;
    total_readings: number;
}

interface TopUser {
    id: string;
    username: string;
    avatar_url: string;
    xp: number;
    readings_completed: number;
    posts_count: number;
}

const AdminDashboard: React.FC = () => {
    const { isAdmin, loading: checkingAdmin } = useAdmin();
    const navigate = useNavigate();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [topUsers, setTopUsers] = useState<TopUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!checkingAdmin && !isAdmin) {
            navigate('/');
        }
    }, [isAdmin, checkingAdmin, navigate]);

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [dailyProgress, setDailyProgress] = useState<any[]>([]);
    const [loadingDaily, setLoadingDaily] = useState(false);

    // Weekly Progress State
    const [weeks, setWeeks] = useState<any[]>([]);
    const [selectedWeekId, setSelectedWeekId] = useState<string>('');
    const [weeklyProgress, setWeeklyProgress] = useState<any[]>([]);
    const [loadingWeekly, setLoadingWeekly] = useState(false);

    useEffect(() => {
        if (isAdmin) {
            loadDashboardData();
            loadWeeks();
        }
    }, [isAdmin]);

    useEffect(() => {
        if (isAdmin && selectedDate) {
            loadDailyProgress();
        }
    }, [isAdmin, selectedDate]);

    useEffect(() => {
        if (isAdmin && selectedWeekId) {
            loadWeeklyProgress();
        }
    }, [isAdmin, selectedWeekId]);

    const loadWeeks = async () => {
        try {
            const { data, error } = await supabase
                .from('weeks')
                .select('id, title, start_date, end_date')
                .order('start_date', { ascending: false });

            if (error) throw error;
            setWeeks(data || []);
            if (data && data.length > 0) {
                // Select the first week (most recent/current) by default
                setSelectedWeekId(data[0].id);
            }
        } catch (error) {
            console.error('Error loading weeks:', error);
        }
    };

    const loadWeeklyProgress = async () => {
        try {
            setLoadingWeekly(true);
            const week = weeks.find(w => w.id === selectedWeekId);
            if (!week) return;

            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .order('username');

            if (!profiles) return;

            // 1. Get daily lessons for this week to know what IDs to check
            const { data: weekLessons } = await supabase
                .from('daily_lessons')
                .select('id, day')
                .eq('week_id', selectedWeekId);

            const lessonIds = weekLessons?.map(l => l.id) || [];

            // 2. Get lesson completions for these lessons
            // We need to know HOW MANY lessons each user completed
            let userLessonCounts: Record<string, number> = {};

            if (lessonIds.length > 0) {
                const { data: completions } = await supabase
                    .from('lesson_completions')
                    .select('user_id, daily_lesson_id')
                    .in('daily_lesson_id', lessonIds)
                    .gte('score', 2); // Assuming score >= 2 is completed

                completions?.forEach(c => {
                    userLessonCounts[c.user_id] = (userLessonCounts[c.user_id] || 0) + 1;
                });
            }

            // 3. Get readings within date range
            // We need to know HOW MANY readings each user did in this week's range
            let userReadingCounts: Record<string, number> = {};

            // Adjust end date to cover the full day
            const startDate = `${week.start_date}T00:00:00`;
            const endDate = `${week.end_date}T23:59:59`;

            const { data: readings } = await supabase
                .from('daily_readings')
                .select('user_id')
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            readings?.forEach(r => {
                userReadingCounts[r.user_id] = (userReadingCounts[r.user_id] || 0) + 1;
            });


            // Map data
            const progress = profiles.map(user => {
                const lessonCount = userLessonCounts[user.id] || 0;
                const readingCount = userReadingCounts[user.id] || 0;

                return {
                    ...user,
                    lesson_count: lessonCount,
                    reading_count: readingCount,
                    // Simple logic for status
                    status: (lessonCount > 0 && readingCount > 0) ? 'Active' : (lessonCount > 0 || readingCount > 0) ? 'Partial' : 'Inactive'
                };
            });

            // Sort by activity
            progress.sort((a, b) => {
                const aTotal = a.lesson_count + a.reading_count;
                const bTotal = b.lesson_count + b.reading_count;
                return bTotal - aTotal;
            });

            setWeeklyProgress(progress);

        } catch (error) {
            console.error('Error loading weekly progress:', error);
        } finally {
            setLoadingWeekly(false);
        }
    };

    const loadDailyProgress = async () => {
        try {
            setLoadingDaily(true);
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .order('username');

            if (!profiles) return;

            // Define start and end of selected day in UTC to match created_at
            // or just use date comparison if columns are timestamps
            const startDate = `${selectedDate}T00:00:00`;
            const endDate = `${selectedDate}T23:59:59`;

            // Get lesson completions for config date
            const { data: lessons } = await supabase
                .from('lesson_completions')
                .select('user_id, score, created_at')
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            // Get daily readings for config date
            // Note: reusing lesson_completions logic or daily_readings table? 
            // ReadingRoom uses 'daily_readings' table.
            const { data: readings } = await supabase
                .from('daily_readings')
                .select('user_id, reference, created_at')
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            // Map data
            const progress = profiles.map(user => {
                const userLesson = lessons?.find(l => l.user_id === user.id);
                const userReading = readings?.find(r => r.user_id === user.id);

                return {
                    ...user,
                    lesson_completed: !!userLesson,
                    lesson_score: userLesson?.score,
                    reading_completed: !!userReading,
                    reading_reference: userReading?.reference
                };
            });

            // Filter to show active users for that day or all users?
            // Let's show all users but sort by activity
            progress.sort((a, b) => {
                const aActive = a.lesson_completed || a.reading_completed ? 1 : 0;
                const bActive = b.lesson_completed || b.reading_completed ? 1 : 0;
                return bActive - aActive;
            });

            setDailyProgress(progress);

        } catch (error) {
            console.error('Error loading daily progress:', error);
        } finally {
            setLoadingDaily(false);
        }
    };

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Get system stats
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, updated_at'); // Changed created_at to updated_at

            // Posts table does not exist
            const posts: any[] = [];

            const { data: readings } = await supabase
                .from('lesson_completions') // Changed reading_progress to lesson_completions
                .select('id');

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const activeUsers = profiles?.filter(p =>
                new Date(p.updated_at) > sevenDaysAgo // Changed created_at to updated_at
            ).length || 0;

            setStats({
                total_users: profiles?.length || 0,
                active_users_7d: activeUsers,
                total_posts: 0, // Posts table doesn't exist
                total_readings: readings?.length || 0,
            });

            // Get top users by XP
            const { data: topUsersData } = await supabase
                .from('profiles')
                .select(`
          id,
          username,
          avatar_url,
          xp
        `)
                .order('xp', { ascending: false })
                .limit(10);

            // Get reading counts for top users
            const usersWithStats = await Promise.all(
                (topUsersData || []).map(async (user) => {
                    const { count: readingsCount } = await supabase
                        .from('lesson_completions') // Changed reading_progress
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id);

                    // Posts query removed

                    return {
                        ...user,
                        readings_completed: readingsCount || 0,
                        posts_count: 0,
                    };
                })
            );

            setTopUsers(usersWithStats);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (checkingAdmin || loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="p-4 lg:p-8 animate-fade-in-up">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard Administrativo</h1>
                    <p className="text-gray-400">Métricas y estadísticas del sistema</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div
                        onClick={() => document.getElementById('ranking-table')?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-6 cursor-pointer hover:border-blue-500/40 transition-colors"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-symbols-outlined text-blue-400 text-3xl">group</span>
                            <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-1 rounded-full">Total</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">{stats?.total_users || 0}</h3>
                        <p className="text-sm text-gray-400">Usuarios Registrados</p>
                    </div>

                    <div
                        onClick={() => document.getElementById('ranking-table')?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl p-6 cursor-pointer hover:border-green-500/40 transition-colors"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-symbols-outlined text-green-400 text-3xl">trending_up</span>
                            <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded-full">7 días</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">{stats?.active_users_7d || 0}</h3>
                        <p className="text-sm text-gray-400">Usuarios Nuevos</p>
                    </div>

                    <div
                        onClick={() => navigate('/community')}
                        className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-6 cursor-pointer hover:border-purple-500/40 transition-colors"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-symbols-outlined text-purple-400 text-3xl">forum</span>
                            <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full">Total</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">{stats?.total_posts || 0}</h3>
                        <p className="text-sm text-gray-400">Publicaciones</p>
                    </div>

                    <div
                        onClick={() => navigate('/sabbath-school')}
                        className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-6 cursor-pointer hover:border-orange-500/40 transition-colors"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-symbols-outlined text-orange-400 text-3xl">menu_book</span>
                            <span className="text-xs text-orange-300 bg-orange-500/20 px-2 py-1 rounded-full">Total</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">{stats?.total_readings || 0}</h3>
                        <p className="text-sm text-gray-400">Lecturas Completadas</p>
                    </div>
                </div>

                {/* Top Users Table */}
                <div id="ranking-table" className="bg-[#1a1b26] rounded-2xl border border-white/5 overflow-hidden mb-8">
                    <div className="p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-accent-gold text-2xl">emoji_events</span>
                            <h2 className="text-xl font-bold text-white">Ranking de Usuarios</h2>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Posición</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Usuario</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">XP</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Lecturas</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Publicaciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {topUsers.map((user, index) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {index < 3 ? (
                                                    <span className="material-symbols-outlined text-accent-gold">emoji_events</span>
                                                ) : (
                                                    <span className="text-gray-500 font-bold">#{index + 1}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={user.avatar_url || '/default-avatar.png'}
                                                    alt={user.username}
                                                    className="size-10 rounded-full object-cover"
                                                />
                                                <span className="text-white font-medium">{user.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary text-sm">stars</span>
                                                <span className="text-white font-bold">{user.xp.toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-gray-300">{user.readings_completed}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-gray-300">{user.posts_count}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* DAILY PROGRESS SECTION */}
                <div className="bg-[#1a1b26] rounded-2xl border border-white/5 overflow-hidden mb-8">
                    <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-green-400 text-2xl">calendar_today</span>
                            <div>
                                <h2 className="text-xl font-bold text-white">Seguimiento Diario</h2>
                                <p className="text-xs text-gray-400">Progreso de lecciones y lecturas por fecha</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/5">
                            <span className="material-symbols-outlined text-gray-400 text-sm">event</span>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none text-white focus:ring-0 text-sm outline-none"
                            />
                        </div>
                    </div>

                    {loadingDaily ? (
                        <div className="py-12 flex justify-center">
                            <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Usuario</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Escuela Sabática</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Reavivados</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {dailyProgress.map((user) => (
                                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={user.avatar_url || '/default-avatar.png'}
                                                        alt={user.username}
                                                        className="size-8 rounded-full object-cover"
                                                    />
                                                    <span className="text-white font-medium text-sm">{user.username}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {user.lesson_completed ? (
                                                    <div className="flex items-center gap-2 text-green-400">
                                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                                        <span className="text-xs font-bold">Completado ({user.lesson_score}/5)</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <span className="material-symbols-outlined text-sm">radio_button_unchecked</span>
                                                        <span className="text-xs">Pendiente</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {user.reading_completed ? (
                                                    <div className="flex items-center gap-2 text-blue-400">
                                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                                        <span className="text-xs font-bold">Leído ({user.reading_reference})</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <span className="material-symbols-outlined text-sm">radio_button_unchecked</span>
                                                        <span className="text-xs">Pendiente</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {(user.lesson_completed && user.reading_completed) ? (
                                                    <span className="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400">Excelente</span>
                                                ) : (user.lesson_completed || user.reading_completed) ? (
                                                    <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-500/20 text-yellow-400">En Progreso</span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded text-xs font-bold bg-red-500/10 text-red-400">Inactivo</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {dailyProgress.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                No se encontraron usuarios activos para esta fecha.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* WEEKLY PROGRESS SECTION */}
                <div className="bg-[#1a1b26] rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-purple-400 text-2xl">date_range</span>
                            <div>
                                <h2 className="text-xl font-bold text-white">Seguimiento Semanal</h2>
                                <p className="text-xs text-gray-400">Resumen de actividad por semana</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/5">
                            <span className="material-symbols-outlined text-gray-400 text-sm">event_note</span>
                            <select
                                value={selectedWeekId}
                                onChange={(e) => setSelectedWeekId(e.target.value)}
                                className="bg-transparent border-none text-white focus:ring-0 text-sm outline-none w-64"
                            >
                                {weeks.map(week => (
                                    <option key={week.id} value={week.id} className="bg-[#1e1e2d]">
                                        {week.title} ({week.start_date})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loadingWeekly ? (
                        <div className="py-12 flex justify-center">
                            <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Usuario</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Escuela Sabática</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Reavivados</th>
                                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {weeklyProgress.map((user) => (
                                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={user.avatar_url || '/default-avatar.png'}
                                                        alt={user.username}
                                                        className="size-8 rounded-full object-cover"
                                                    />
                                                    <span className="text-white font-medium text-sm">{user.username}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                                        <div
                                                            className="bg-green-500 h-2.5 rounded-full"
                                                            style={{ width: `${(Math.min(user.lesson_count, 7) / 7) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-300">{user.lesson_count} / 7 días</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                                        <div
                                                            className="bg-blue-500 h-2.5 rounded-full"
                                                            style={{ width: `${(Math.min(user.reading_count, 7) / 7) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-300">{user.reading_count} / 7 días</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {user.lesson_count >= 5 ? (
                                                    <span className="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400">Constante</span>
                                                ) : user.lesson_count >= 1 ? (
                                                    <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-500/20 text-yellow-400">Regular</span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded text-xs font-bold bg-red-500/10 text-red-400">Inactivo</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {weeklyProgress.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                No se encontraron datos para esta semana.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
