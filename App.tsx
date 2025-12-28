
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Rankings from './components/Rankings';
import ReadingRoom from './components/ReadingRoom';
import Profile from './components/Profile';
import Studies from './components/Studies';
import Community from './components/Community';
import Settings from './components/Settings';
import { Screen, UserStats, RankingEntry, Badge } from './types';

const MOCK_RANKINGS: RankingEntry[] = [
  { rank: 1, name: 'Mateo G.', xp: 1200, avatar: 'https://picsum.photos/seed/mateo/100/100', title: 'Guerrero de la Fe' },
  { rank: 2, name: 'Sofía R.', xp: 950, avatar: 'https://picsum.photos/seed/sofia/100/100', title: 'Exploradora' },
  { rank: 3, name: 'Lucas P.', xp: 820, avatar: 'https://picsum.photos/seed/lucas/100/100', title: 'Discípulo' },
  { rank: 4, name: 'Isabella M.', xp: 780, avatar: 'https://picsum.photos/seed/isabella/100/100', title: 'Lectora Diaria' },
  { rank: 5, name: 'Daniel K.', xp: 750, avatar: 'https://picsum.photos/seed/daniel/100/100', title: 'Novato' },
  { rank: 6, name: 'Ana S.', xp: 620, avatar: 'https://picsum.photos/seed/ana/100/100', title: 'Principiante' },
  { rank: 7, name: 'Juan Pérez (Tú)', xp: 590, avatar: 'https://picsum.photos/seed/juan/100/100', title: 'Discípulo', isMe: true },
  { rank: 8, name: 'Carlos V.', xp: 550, avatar: 'https://picsum.photos/seed/carlos/100/100', title: 'Principiante' },
];

const MOCK_BADGES: Badge[] = [
  { id: '1', name: 'Primeros Pasos', icon: 'footprint', unlocked: true, date: '12 Oct' },
  { id: '2', name: 'Lector Diario', icon: 'calendar_month', unlocked: true, date: '19 Oct' },
  { id: '3', name: 'Guerrero de Oración', icon: 'volunteer_activism', unlocked: false, progress: 12, total: 30 },
  { id: '4', name: 'Teólogo Experto', icon: 'school', unlocked: false, progress: 1, total: 10 },
];

const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
  const [userStats, setUserStats] = useState<UserStats>({
    level: 5,
    xp: 350,
    maxXp: 500,
    streak: 12,
    totalXp: 4500,
    badges: 8,
  });

  const handleStudyComplete = (xp: number) => {
    setUserStats(prev => ({
      ...prev,
      xp: prev.xp + xp,
      totalXp: prev.totalXp + xp,
      xp_to_next: prev.maxXp - (prev.xp + xp)
    }));
    setActiveScreen('dashboard');
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <Dashboard stats={userStats} rankings={MOCK_RANKINGS} setActiveScreen={setActiveScreen} />;
      case 'studies':
        return <Studies setActiveScreen={setActiveScreen} />;
      case 'rankings':
        return <Rankings rankings={MOCK_RANKINGS} />;
      case 'community':
        return <Community />;
      case 'reading':
        return <ReadingRoom onComplete={handleStudyComplete} />;
      case 'profile':
        return <Profile stats={userStats} badges={MOCK_BADGES} />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
            <span className="material-symbols-outlined text-6xl">construction</span>
            <p>Pantalla en desarrollo: {activeScreen}</p>
            <button onClick={() => setActiveScreen('dashboard')} className="text-primary font-bold underline">Volver al inicio</button>
          </div>
        );
    }
  };

  return (
    <Layout activeScreen={activeScreen} setActiveScreen={setActiveScreen} userStats={userStats}>
      {renderScreen()}
    </Layout>
  );
};

export default App;
