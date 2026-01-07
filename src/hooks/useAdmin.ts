import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

interface UseAdminReturn {
    isAdmin: boolean;
    loading: boolean;
    error: Error | null;
}

/**
 * Hook to check if the current user has admin privileges
 * @returns {UseAdminReturn} Object containing isAdmin status, loading state, and error
 */
export function useAdmin(): UseAdminReturn {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        checkAdminStatus();
    }, []);

    const checkAdminStatus = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single();

            if (profileError) {
                throw profileError;
            }

            setIsAdmin(profile?.is_admin || false);
        } catch (err) {
            console.error('Error checking admin status:', err);
            setError(err as Error);
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    return { isAdmin, loading, error };
}
