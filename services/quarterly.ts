import { supabase } from './supabase';

export interface QuarterlyInfo {
    id: string;
    title: string;
    books: string;
    author: string;
    motto_verse: string;
    start_date: string;
    end_date: string;
}

export const getCurrentQuarterlyInfo = async (): Promise<QuarterlyInfo | null> => {
    // Basic logic: get the active quarter based on current date
    // For now, simpler: get the latest entry or the one matching "2026-01-01" if today is > that date.
    // Or just "get the single row we have" for MVP.
    // Let's get the one with start_date <= today and end_date >= today

    const today = new Date().toISOString().split('T')[0];

    // Check if we are in expected range (testing 2025-12-29 vs 2026-01-01)
    // Since we are testing in 2025, but the data is for 2026, let's just fetch the *latest* added info for now
    // to ensure it shows up in "Future Preview" mode or simply just Show It.

    const { data, error } = await supabase
        .from('quarterly_info')
        .select('*')
        .order('start_date', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching quarterly info:', error);
        return null;
    }

    return data;
};
