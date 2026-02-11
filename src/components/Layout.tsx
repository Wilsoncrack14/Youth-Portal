
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Screen } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  userStats: any;
}

import { supabase } from '../services/supabase';
import BibleSearchModal from './BibleSearchModal';
import AIChatModal from './AIChatModal';
import { useUser } from '../contexts/UserContext';

const Layout: React.FC<LayoutProps> = ({ children, userStats }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const { profile } = useUser();

  // Simple mapping: /dashboard -> 'dashboard', / -> 'dashboard'
  const currentPath = location.pathname.substring(1) || 'dashboard';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/' },
    { id: 'reading', label: 'Reavivados', icon: 'auto_stories', path: '/reading' },
    { id: 'sabbath-school', label: 'Escuela Sabática', icon: 'school', path: '/sabbath-school' },
    { id: 'bible', label: 'Biblia', icon: 'menu_book', path: '/bible' },
    { id: 'community', icon: 'group', label: 'Comunidad', path: '/community' },
    { id: 'profile', icon: 'person', label: 'Perfil', path: '/profile' },
  ];

  const handleNavigation = (path: string) => {
    setIsMobileMenuOpen(false);
    navigate(path);
  };

  const onSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsSearchOpen(true);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <BibleSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        initialQuery={searchQuery}
      />

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:relative inset-y-0 left-0 z-50 w-72 flex flex-col justify-between bg-white dark:bg-[#0e0e15] border-r border-gray-200 dark:border-[#292938] p-6 shrink-0 h-full overflow-y-auto transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3 px-2 cursor-pointer" onClick={() => handleNavigation('/')}>
            <div className="size-12 rounded-full overflow-hidden shadow-lg shadow-primary/20 flex items-center justify-center">
              <img src="/logo.png" alt="JA Logo" className="w-full h-full object-cover scale-110" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Jóvenes</h2>
              <p className="text-xs font-semibold text-primary dark:text-accent-gold">Adventistas</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1a1b26] p-4 rounded-xl flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none" onClick={() => handleNavigation('/profile')}>
            <div className="relative">
              <div className="size-12 rounded-full bg-cover bg-center border-2 border-primary overflow-hidden"
                style={{ backgroundImage: profile?.avatar_url ? `url('${profile.avatar_url}')` : `url('https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.username || 'User')}&background=4b4ee7&color=fff')` }}></div>
              <div className="absolute -bottom-1 -right-1 bg-accent-gold text-black text-[10px] font-black px-1.5 py-0.5 rounded-full border border-white dark:border-[#0e0e15]">LVL {userStats.level}</div>
            </div>
            <div className="flex flex-col overflow-hidden">
              <h3 className="text-sm font-black truncate text-gray-900 dark:text-white">{profile?.username || 'Usuario'}</h3>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate">Discípulo</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${(currentPath === item.id || (currentPath === 'dashboard' && item.path === '/'))
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#292938] hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <span className={`material-symbols-outlined ${currentPath === item.id ? 'fill-1' : ''}`}>{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleNavigation('/settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentPath === 'settings' ? 'bg-primary/10 text-primary dark:bg-white/10 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#292938] hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-medium">Configuración</span>
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              // Force reload or let auth state listener handle it
              window.location.href = '/';
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark relative h-screen">
        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-8 border-b border-[#292938] bg-background-light/50 dark:bg-background-dark/50 backdrop-blur-md sticky top-0 z-20">
          <div className="lg:hidden flex items-center gap-3 text-gray-900 dark:text-white">
            <span className="material-symbols-outlined cursor-pointer" onClick={() => setIsMobileMenuOpen(true)}>menu</span>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="JA Logo" className="w-8 h-8 object-contain" />
              <span className="font-bold text-lg">JA</span>
            </div>
          </div>

          <div className="hidden lg:flex w-full max-w-md">
            <div className="relative w-full group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-gray-100 dark:bg-[#292938] text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-[#1e1e2d] sm:text-sm transition-all"
                placeholder="Buscar (ej. Juan 3:16, Salmos 23)..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={onSearchSubmit}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#292938] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" onClick={() => handleNavigation('/community')}>
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full"></span>
            </button>
            <div
              onClick={() => handleNavigation('/rankings')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#292938] border border-gray-200 dark:border-[#3d3d52] shadow-sm dark:shadow-none cursor-pointer hover:bg-gray-50 dark:hover:bg-[#323242] transition-colors"
            >
              <span className="text-accent-gold material-symbols-outlined text-[18px]">local_fire_department</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{userStats.streak}</span>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>


      {/* AI Chat Button & Modal */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 size-14 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all group"
      >
        <span className="material-symbols-outlined text-3xl group-hover:rotate-12 transition-transform">smart_toy</span>
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
        </span>
      </button>

      <AIChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div >
  );
};

export default Layout;
