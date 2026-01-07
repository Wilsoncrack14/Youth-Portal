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
import UpdatePassword from './components/UpdatePassword';
import { UserStats, RankingEntry, Badge } from './types';
import { supabase } from './services/supabase.ts';
import SabbathSchool from './components/SabbathSchool';
import Admin from './components/Admin';
import { getCurrentUser } from './services/auth';
import { User } from '@supabase/supabase-js';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ColorProvider } from './contexts/ColorContext';

import { useUserData } from './hooks/useUserData';

const App: React.FC = () => {
  const [session, setSession] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);


  // Auth listener
  useEffect(() => {
    getCurrentUser().then(user => {
      setSession(user);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* New Hook Implementation */
  const { userStats, badges, isLoading: userDataLoading, invalidateData } = useUserData(session?.id);
  const loading = authLoading || (!!session && userDataLoading);

  const handleStudyComplete = async (xp: number, data?: { type?: 'quiz'; score?: number; reflection?: string; verse?: string; reference?: string }) => {
    if (!session) return;

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
        // ... (existing quiz logic remains) ...
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
          const existingScoreMatch = existing.reflection?.match(/score: (\d+)\/3/);
          const existingScore = existingScoreMatch ? parseInt(existingScoreMatch[1]) : 0;
          if (data.score > existingScore) {
            await supabase.from('daily_readings').update({ reflection, verse: data.verse || existing.verse }).eq('id', existing.id);
          }
        } else {
          await supabase.from('daily_readings').insert({
            user_id: session.id,
            verse: data.verse || '',
            reference: data.reference || '',
            reflection
          });
        }
      }

      // 3. Invalidate Query to re-fetch data
      await invalidateData();

    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="min-h-screen bg-background-dark flex items-center justify-center text-white">Cargando...</div>;



  return (
    <UserProvider user={session}>
      <ColorProvider>
        <ThemeProvider>
          <Router>
            <Routes>
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="*" element={
                !session ? (
                  <Auth onLoginSuccess={() => { }} />
                ) : (
                  <Layout userStats={userStats}>
                    <Routes>
                      <Route path="/" element={<Dashboard stats={userStats} />} />
                      <Route path="/studies" element={<Studies />} />
                      <Route path="/rankings" element={<Rankings />} />
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
                )
              } />
            </Routes>
          </Router>
        </ThemeProvider>
      </ColorProvider>
    </UserProvider>
  );
};

export default App;
