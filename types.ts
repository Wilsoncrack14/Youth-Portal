
export type Screen = 'dashboard' | 'studies' | 'rankings' | 'community' | 'profile' | 'reading' | 'settings';

export interface UserStats {
  level: number;
  xp: number;
  maxXp: number;
  streak: number;
  totalXp: number;
  badges: number;
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
