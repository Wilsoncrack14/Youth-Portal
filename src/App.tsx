import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
// Lazy load components for performance
const DashboardRouter = React.lazy(() => import('./components/DashboardRouter'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const Rankings = React.lazy(() => import('./components/Rankings'));
const ReadingRoom = React.lazy(() => import('./components/ReadingRoom'));
const BibleLibrary = React.lazy(() => import('./components/BibleLibrary'));
const Profile = React.lazy(() => import('./components/Profile'));
const Maintenance = React.lazy(() => import('./components/Maintenance'));
const Studies = React.lazy(() => import('./components/Studies'));
const Community = React.lazy(() => import('./components/Community'));
const Settings = React.lazy(() => import('./components/Settings'));
const Auth = React.lazy(() => import('./components/Auth'));
const UpdatePassword = React.lazy(() => import('./components/UpdatePassword'));
const Onboarding = React.lazy(() => import('./components/Onboarding'));
const SabbathSchool = React.lazy(() => import('./components/SabbathSchool'));
const SabbathSchoolAdmin = React.lazy(() => import('./components/SabbathSchoolAdmin'));
const Admin = React.lazy(() => import('./components/Admin'));
const UserProgress = React.lazy(() => import('./components/UserProgress'));
import { supabase } from './services/supabase';
import { getCurrentUser } from './services/auth';
import { User } from '@supabase/supabase-js';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ColorProvider } from './contexts/ColorContext';
import { useAdmin } from './hooks/useAdmin';

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
  const { userStats, badges, profile, monthlyActivity, isLoading: userDataLoading, invalidateData } = useUserData(session?.id);
  const loading = authLoading || (!!session && userDataLoading);

  /* Safe XP Update via RPC */
  const handleStudyComplete = async (xp: number, data?: { type?: 'quiz'; score?: number; reflection?: string; verse?: string; reference?: string; date?: Date; isCatchUp?: boolean }) => {
    if (!session) return;

    // Only process quiz data with RPC
    if (data?.type === 'quiz' && data.score !== undefined && data.reference) {
      try {
        if (data.isCatchUp && data.date) {
          // New logic: Catch-up reading
          const { error } = await supabase.rpc('submit_catchup_reading', {
            p_reference: data.reference,
            p_target_date: data.date.toISOString(),
            p_verse: data.verse || 'Versículo no disponible',
            p_reflection: data.reflection || `Lectura completada (Recuperación) - score: ${data.score}/3`
          });
          if (error) console.error("Error submitting catch-up (RPC):", error);
          else await invalidateData();

        } else {
          // Standard logic: Today's reading
          const { error } = await supabase.rpc('submit_quiz_activity', {
            p_reference: data.reference,
            p_score: data.score,
            p_max_score: 3,
            p_reflection: data.reflection || `Quiz completado - score: ${data.score}/3`,
            p_verse: data.verse || 'Versículo no disponible'
          });

          if (error) {
            console.error("Error submitting quiz activity (RPC):", error);
          } else {
            // Success - Refresh UI
            await invalidateData();
          }
        }
      } catch (e) {
        console.error("Error in handleStudyComplete:", e);
      }
    } else {
      // Fallback for non-quiz completions (if any)
      console.log("Skipping XP update for non-quiz activity or missing data.");
    }
  };

  if (loading) return <div className="min-h-screen bg-background-dark flex items-center justify-center text-white">Cargando...</div>;



  return (
    <UserProvider user={session}>
      <ColorProvider>
        <ThemeProvider>
          <Router>
            <Routes>
              <Route path="/update-password" element={
                <Suspense fallback={<div className="min-h-screen bg-background-dark flex items-center justify-center text-white">Cargando...</div>}>
                  <UpdatePassword />
                </Suspense>
              } />
              <Route path="*" element={
                !session ? (
                  <Suspense fallback={<div className="min-h-screen bg-background-dark flex items-center justify-center text-white">Cargando...</div>}>
                    <Auth onLoginSuccess={() => { }} />
                  </Suspense>
                ) : (
                  <Suspense fallback={<div className="min-h-screen bg-background-dark flex items-center justify-center text-white">Cargando...</div>}>
                    <Routes>
                      <Route path="/onboarding" element={
                        (profile?.birth_date && profile?.church) ? <Navigate to="/" replace /> : <Onboarding />
                      } />
                      <Route path="*" element={
                        (!profile?.birth_date || !profile?.church) ? (
                          <Navigate to="/onboarding" replace />
                        ) : (
                          <Layout userStats={userStats}>
                            <Routes>
                              <Route path="/" element={<DashboardRouter stats={userStats} monthlyActivity={monthlyActivity} />} />
                              <Route path="/studies" element={<Studies />} />
                              <Route path="/rankings" element={<Rankings />} />
                              <Route path="/community" element={<Community />} />
                              <Route path="/reading" element={<ReadingRoom onComplete={handleStudyComplete} />} />
                              <Route path="/bible" element={<BibleLibrary />} />
                              <Route path="/profile" element={<Profile stats={userStats} badges={badges} />} />
                              <Route path="/settings" element={<Settings />} />
                              <Route path="/sabbath-school" element={<SabbathSchool />} />
                              <Route path="/sabbath-school/admin" element={<SabbathSchoolAdmin />} />
                              <Route path="/progress" element={<UserProgress />} />
                              <Route path="/admin" element={<Admin />} />
                              <Route path="/maintenance" element={<Maintenance />} />
                              <Route path="*" element={<Navigate to="/dashboard" replace />} />
                            </Routes>
                          </Layout>
                        )
                      } />
                    </Routes>
                  </Suspense>
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
