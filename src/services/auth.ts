
import { supabase } from './supabase.ts';

export const signIn = async (email: string) => {
    // Simplest login: Magic Link
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error };
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
};

export const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
};
