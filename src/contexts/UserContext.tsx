import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

interface UserProfile {
    id: string;
    username: string;
    email: string;
    avatar_url: string | null;
    xp: number;
    level: number;
    streak: number;
    badges_count: number;
}

interface UserContextType {
    profile: UserProfile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async () => {
        try {
            console.log('🔵 [UserContext] Fetching profile...');
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log('⚠️ [UserContext] No user found');
                setProfile(null);
                setLoading(false);
                return;
            }

            console.log('🔵 [UserContext] User ID:', user.id);

            const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('❌ [UserContext] Error fetching profile:', error);
                // Create default profile if it doesn't exist
                setProfile({
                    id: user.id,
                    email: user.email || '',
                    username: user.email?.split('@')[0] || 'Usuario',
                    avatar_url: null,
                    xp: 0,
                    level: 1,
                    streak: 0,
                    badges_count: 0,
                });
                setLoading(false);
                return;
            }

            console.log('✅ [UserContext] Profile data:', profileData);
            console.log('🔵 [UserContext] Avatar URL:', profileData?.avatar_url);

            setProfile({
                id: user.id,
                email: user.email || '',
                username: profileData?.username || user.email?.split('@')[0] || 'Usuario',
                avatar_url: profileData?.avatar_url || null,
                xp: profileData?.xp || 0,
                level: profileData?.level || 1,
                streak: profileData?.streak || 0,
                badges_count: profileData?.badges_count || 0,
            });

            console.log('✅ [UserContext] Profile state updated');
        } catch (error) {
            console.error('❌ [UserContext] Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchProfile();
        });

        return () => subscription.unsubscribe();
    }, []);

    const refreshProfile = async () => {
        setLoading(true);
        await fetchProfile();
    };

    return (
        <UserContext.Provider value={{ profile, loading, refreshProfile }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
