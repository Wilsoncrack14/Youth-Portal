import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { UserStats, Badge } from '../types';

// Add UserProfile interface (should ideally be shared in types.ts but defining here for now to match)
export interface UserProfile {
    id: string;
    username: string;
    email?: string;
    avatar_url: string | null;
    streak: number;
    xp: number;
    level: number;
    badges_count: number;
    birth_date?: string;
    church?: string;
}


interface UseUserDataResult {
    userStats: UserStats;
    badges: Badge[];
    profile: UserProfile | null;
    isLoading: boolean;
    error: unknown;
    refetch: () => void;
    invalidateData: () => Promise<void>;
}

const DEFAULT_STATS: UserStats = {
    level: 1,
    xp: 0,
    maxXp: 100,
    streak: 0,
    totalXp: 0,
    badges: 0,
};

export const useUserData = (userId: string | undefined, userEmail?: string): UseUserDataResult => {
    const queryClient = useQueryClient();
    const enabled = !!userId;
    const QUERY_KEY = ['userData', userId];

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: QUERY_KEY,
        enabled,
        staleTime: 1000 * 60 * 5, // 5 minutes stale time
        gcTime: 1000 * 60 * 60 * 24, // 24 hours garbage collection time
        queryFn: async () => {
            if (!userId) throw new Error("User ID is required");

            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            startOfWeek.setHours(0, 0, 0, 0);

            const [
                profileResponse,
                weeksResponse,
                thisWeekResponse,
                allReadingsResponse,
                streakResponse,
                allBadgesResponse,
                userBadgesResponse
            ] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', userId).single(),
                supabase.rpc('calculate_weeks_completed', { user_id_param: userId }),
                supabase.from('daily_readings').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startOfWeek.toISOString()),
                supabase.from('daily_readings').select('id', { count: 'exact', head: true }).eq('user_id', userId),
                supabase.rpc('calculate_streak', { user_id_param: userId }),
                supabase.from('badges').select('*'),
                supabase.from('user_badges').select('*').eq('user_id', userId)
            ]);

            // Profile (Create if missing pattern handles PGRST116)
            let profileData = profileResponse.data;
            if (profileResponse.error && profileResponse.error.code === 'PGRST116') {
                const { data: newProfile } = await supabase
                    .from('profiles')
                    .insert([{ id: userId, username: userEmail?.split('@')[0] || 'Usuario' }])
                    .select()
                    .single();
                profileData = newProfile;
            }

            const weeksCompleted = weeksResponse.data || 0;
            const thisWeekCount = thisWeekResponse.count || 0;
            const totalChaptersRead = allReadingsResponse.count || 0;
            const currentStreak = streakResponse.data || 0;

            const userStats: UserStats = {
                level: weeksCompleted + 1,
                xp: thisWeekCount * 50,
                maxXp: 350,
                streak: currentStreak,
                totalXp: totalChaptersRead,
                badges: profileData?.badges_count || 0
            };

            const allBadges = allBadgesResponse.data || [];
            const userBadges = userBadgesResponse.data || [];

            const badges: Badge[] = allBadges.map(b => {
                const userBadge = userBadges.find(ub => ub.badge_id === b.id);
                return {
                    id: b.id,
                    name: b.name,
                    icon: b.icon,
                    unlocked: !!userBadge?.unlocked,
                    date: userBadge?.unlocked_at ? new Date(userBadge.unlocked_at).toLocaleDateString() : undefined,
                    progress: userBadge?.progress || 0,
                    total: b.total_required
                };
            });

            const unlockedCount = badges.filter(b => b.unlocked).length;
            userStats.badges = unlockedCount;

            const fullProfile: UserProfile | null = profileData ? {
                ...profileData,
                email: userEmail || '' // Start with passed email, eventually logic could fetch if needed
            } : null;

            return { userStats, badges, profile: fullProfile };
        }
    });

    const invalidateData = async () => {
        await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    };

    return {
        userStats: data?.userStats || DEFAULT_STATS,
        badges: data?.badges || [],
        profile: data?.profile || null,
        isLoading: enabled ? isLoading : false,
        error,
        refetch,
        invalidateData
    };
};
