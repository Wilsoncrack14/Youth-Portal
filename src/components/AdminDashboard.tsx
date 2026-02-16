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

    useEffect(() => {
        if (isAdmin) {
            loadDashboardData();
        }
    }, [isAdmin]);

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
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-symbols-outlined text-blue-400 text-3xl">group</span>
                            <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-1 rounded-full">Total</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">{stats?.total_users || 0}</h3>
                        <p className="text-sm text-gray-400">Usuarios Registrados</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-symbols-outlined text-green-400 text-3xl">trending_up</span>
                            <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded-full">7 días</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">{stats?.active_users_7d || 0}</h3>
                        <p className="text-sm text-gray-400">Usuarios Nuevos</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-symbols-outlined text-purple-400 text-3xl">forum</span>
                            <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full">Total</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">{stats?.total_posts || 0}</h3>
                        <p className="text-sm text-gray-400">Publicaciones</p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-symbols-outlined text-orange-400 text-3xl">menu_book</span>
                            <span className="text-xs text-orange-300 bg-orange-500/20 px-2 py-1 rounded-full">Total</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">{stats?.total_readings || 0}</h3>
                        <p className="text-sm text-gray-400">Lecturas Completadas</p>
                    </div>
                </div>

                {/* Top Users Table */}
                <div className="bg-[#1a1b26] rounded-2xl border border-white/5 overflow-hidden">
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
            </div>
        </div>
    );
};

export default AdminDashboard;
