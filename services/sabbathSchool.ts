
import { supabase } from './supabase.ts';

export interface SSDay {
    id: string;
    week_id: string;
    day_index: number;
    name: string;
    date: string;
    title: string;
    readings: string | null;
    memory_text: string | null;
    content: string;
}

export interface SSWeek {
    id: string;
    title: string;
}

export const getWeekInfo = async (weekId: string): Promise<SSWeek | null> => {
    const { data, error } = await supabase
        .from('ss_weeks')
        .select('*')
        .eq('id', weekId)
        .single();

    if (error) {
        console.error("Error fetching week:", error);
        return null;
    }
    return data;
};

export const getDayLesson = async (weekId: string, dayIndex: number): Promise<SSDay | null> => {
    const { data, error } = await supabase
        .from('ss_days')
        .select('*')
        .eq('week_id', weekId)
        .eq('day_index', dayIndex)
        .single();

    if (error) {
        console.error("Error fetching day lesson:", error);
        return null;
    }
    return data;
};

export const getLessonByDate = async (date: Date): Promise<SSDay | null> => {
    // Format YYYY-MM-DD
    const isoDate = date.toISOString().split('T')[0];

    // Simplification: Try to find a lesson that matches the exact date
    const { data, error } = await supabase
        .from('ss_days')
        .select('*')
        .eq('date', isoDate)
        .single();

    if (error) {
        // Fallback or just return null
        return null;
    }
    return data;
}
