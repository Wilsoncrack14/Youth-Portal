import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Rankings from './components/Rankings';
import ReadingRoom from './components/ReadingRoom';
import BibleLibrary from './components/BibleLibrary';
import Profile from './components/Profile';
import Maintenance from './components/Maintenance';
import Studies from './components/Studies';
import Community from './components/Community';
import Settings from './components/Settings';
import Auth from './components/Auth';
import { UserStats, RankingEntry, Badge } from './types';
import { supabase } from './services/supabase.ts';
import SabbathSchool from './components/SabbathSchool';
import Admin from './components/Admin';
import { getCurrentUser } from './services/auth';
import { User } from '@supabase/supabase-js';
import { UserProvider } from './contexts/UserContext';

const App: React.FC = () => {
  const [session, setSession] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Default stats until loaded
  const [userStats, setUserStats] = useState<UserStats>({
    level: 1,
    xp: 0,
    maxXp: 100,
    streak: 0,
    totalXp: 0,
    badges: 0,
  });

  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    // Check active session
    getCurrentUser().then(user => {
      setSession(user);
      if (user) loadUserData(user.id);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      // 1. Get Profile
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Create profile if not exists
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ id: userId, username: session?.email?.split('@')[0] || 'Usuario' }])
          .select()
          .single();

        if (!createError) profile = newProfile;
      }

      if (profile) {
        // Calculate weeks completed
        const { data: weeksData } = await supabase.rpc('calculate_weeks_completed', { user_id_param: userId });
        const weeksCompleted = weeksData || 0;

        // Get current week's reading count
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        const { data: thisWeekReadings } = await supabase
          .from('daily_readings')
          .select('id')
          .eq('user_id', userId)
          .gte('created_at', startOfWeek.toISOString());

        const thisWeekCount = thisWeekReadings?.length || 0;

        // Get total chapters read (for level name)
        const { data: allReadings } = await supabase
          .from('daily_readings')
          .select('id')
          .eq('user_id', userId);

        const totalChaptersRead = allReadings?.length || 0;

        // Calculate current streak
        const { data: streakData } = await supabase.rpc('calculate_streak', { user_id_param: userId });
        const currentStreak = streakData || 0;

        setUserStats({
          level: weeksCompleted + 1, // Current week level
          xp: thisWeekCount * 50, // Each day = 50 XP
          maxXp: 350, // 7 days * 50 XP = 350 XP per week
          streak: currentStreak, // Calculated streak
          totalXp: totalChaptersRead, // Store total chapters for level name
          badges: profile.badges_count || 0
        });
      }

      // 2. Get Badges (Both available and unlocked)
      const { data: allBadges } = await supabase.from('badges').select('*');
      const { data: userBadges } = await supabase.from('user_badges').select('*').eq('user_id', userId);

      if (allBadges) {
        const mappedBadges: Badge[] = allBadges.map(b => {
          const userBadge = userBadges?.find(ub => ub.badge_id === b.id);
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
        setBadges(mappedBadges);

        // Update unlocked badges count
        const unlockedCount = mappedBadges.filter(b => b.unlocked).length;
        setUserStats(prev => ({ ...prev, badges: unlockedCount }));
      }

    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const handleStudyComplete = async (xp: number, data?: { type?: 'quiz'; score?: number; reflection?: string; verse?: string; reference?: string }) => {
    if (!session) return;

    // Optimistic update
    setUserStats(prev => ({
      ...prev,
      xp: prev.xp + xp,
      totalXp: prev.totalXp + xp
    }));

    // DB Update
    try {
      // 1. Update XP
      const { error } = await supabase.rpc('increment_xp', { amount: xp, user_id: session.id });
      if (error) {
        const { data: current } = await supabase.from('profiles').select('xp').eq('id', session.id).single();
        if (current) {
          await supabase.from('profiles').update({ xp: current.xp + xp }).eq('id', session.id);
        }
      }

      // 2. Save or Update Reading Record
      if (data && data.type === 'quiz' && data.score !== undefined) {
        const today = new Date().toISOString().split('T')[0];

        // Check if record already exists for this chapter today
        const { data: existing } = await supabase
          .from('daily_readings')
          .select('*')
          .eq('user_id', session.id)
          .eq('reference', data.reference || '')
          .gte('created_at', today)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const reflection = `Quiz completado - score: ${data.score}/3`;

        if (existing) {
          // Extract existing score
          const existingScoreMatch = existing.reflection?.match(/score: (\d+)\/3/);
          const existingScore = existingScoreMatch ? parseInt(existingScoreMatch[1]) : 0;

          // Only update if new score is higher
          if (data.score > existingScore) {
            await supabase
              .from('daily_readings')
              .update({
                reflection: reflection,
                verse: data.verse || existing.verse
              })
              .eq('id', existing.id);
          }
        } else {
          // Insert new record
          await supabase.from('daily_readings').insert({
            user_id: session.id,
            verse: data.verse || '',
            reference: data.reference || '',
            reflection: reflection
          });
        }
      }
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="min-h-screen bg-background-dark flex items-center justify-center text-white">Cargando...</div>;

  if (!session) {
    return <Auth onLoginSuccess={() => { }} />;
  }

  return (
    <UserProvider>
      <Router>
        <Layout userStats={userStats}>
          <Routes>
            <Route path="/" element={<Dashboard stats={userStats} rankings={rankings} />} />
            <Route path="/studies" element={<Studies />} />
            <Route path="/rankings" element={<Rankings rankings={rankings} />} />
            <Route path="/community" element={<Community />} />
            <Route path="/reading" element={<ReadingRoom onComplete={handleStudyComplete} />} />
            <Route path="/bible" element={<BibleLibrary />} />
            <Route path="/profile" element={<Profile stats={userStats} badges={badges} />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/sabbath-school" element={<SabbathSchool />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      </Router>
    </UserProvider>
  );
};

export default App;
