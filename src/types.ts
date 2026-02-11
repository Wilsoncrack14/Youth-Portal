
export type Screen = 'dashboard' | 'studies' | 'rankings' | 'community' | 'profile' | 'reading' | 'settings' | 'sabbath_school' | 'admin';

export interface UserStats {
  level: number;
  xp: number;
  maxXp: number;
  streak: number;
  streakReavivados: number;
  streakSabbathSchool: number;
  totalXp: number;
  badges: number;
  dailyProgress: number; // 0, 1 (50%), or 2 (100%)
}

export interface DailyActivity {
  day: string;
  reavivados: boolean;
  sabbath_school: boolean;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  unlocked: boolean;
  date?: string;
  progress?: number;
  total?: number;
}

export interface RankingEntry {
  rank: number;
  name: string;
  xp: number;
  avatar: string;
  title: string;
  isMe?: boolean;
}

export interface Study {
  id: string;
  title: string;
  category: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  image: string;
}

export interface Prayer {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: UserProfile;
  prayer_amens?: { count: number }[];
  amens_count?: number;
  user_has_amened?: boolean;
  prayer_comments?: PrayerComment[];
}

export interface PrayerComment {
  id: string;
  prayer_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: UserProfile;
}

// Add UserProfile here if not already imported or defined, but reuse logic if needed.
// Since UserProfile is in useUserData, let's export it from there or redefine minimally here if causing circular deps.
// For now, assuming UserProfile is available via import or we use 'any' temporarily if types are strict
import { UserProfile } from './hooks/useUserData';
