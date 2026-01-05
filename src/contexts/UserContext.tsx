import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useUserData, UserProfile } from '../hooks/useUserData';
import { User } from '@supabase/supabase-js';

interface UserContextType {
    profile: UserProfile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode; user: User | null }> = ({ children, user }) => {
    const { profile, isLoading: userDataLoading, invalidateData } = useUserData(user?.id, user?.email);

    const refreshProfile = async () => {
        await invalidateData();
    };

    // If user exists, we are loading if data is loading. 
    // If no user, we are not loading.
    const loading = !!user && userDataLoading;

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
