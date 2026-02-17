
import React, { useEffect } from 'react';
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
import { useAdmin } from '../hooks/useAdmin';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();

  /* Notification State */
  const { isAdmin } = useAdmin();
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);

  useEffect(() => {
    if (profile?.id) fetchNotifications();
  }, [profile?.id]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile?.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      const today = new Date().toDateString();
      const expiredIds: string[] = [];

      const validNotifications = data.filter((n: any) => {
        if (n.type === 'birthday') {
          // Check if notification is from a previous day
          const notificationDate = new Date(n.created_at).toDateString();
          if (notificationDate !== today) {
            expiredIds.push(n.id);
            return false; // Filter out
          }
        }
        return true;
      });

      setNotifications(validNotifications);
      setUnreadCount(validNotifications.filter((n: any) => !n.is_read).length);

      // Clean up expired notifications
      if (expiredIds.length > 0) {
        // Fire and forget cleanup
        supabase
          .from('notifications')
          .delete()
          .in('id', expiredIds)
          .then(({ error }) => {
            if (error) console.error('Error auto-cleaning notifications:', error);
          });
      }
    }
  };

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile?.id).eq('is_read', false);
  };

  const handleNotificationClick = async (notification: any) => {
    await markAsRead(notification.id);
    setIsNotificationsOpen(false);

    if (notification.type === 'birthday' && notification.metadata?.birthday_user_id) {
      navigate(`/community?greet_user=${notification.metadata.birthday_user_id}`);
    } else if (notification.type === 'system') {
      // Handle other types if needed
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/' },
    { id: 'reading', label: 'Reavivados', icon: 'auto_stories', path: '/reading' },
    { id: 'sabbath-school', label: 'Escuela Sabática', icon: 'school', path: '/sabbath-school' },
    ...(isAdmin ? [{ id: 'sabbath-school-admin', label: 'Admin ES', icon: 'admin_panel_settings', path: '/sabbath-school/admin' }] : []),
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
            <div className="relative z-50 flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#292938] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                <span className="material-symbols-outlined">
                  {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
              </button>

              <button
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#292938] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              >
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1a1b26] rounded-2xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 z-50 overflow-hidden animate-fade-in-up origin-top-right">
                    <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900 dark:text-white">Notificaciones</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-primary hover:text-primary/80 font-medium"
                        >
                          Marcar leídas
                        </button>
                      )}
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-4 border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${!n.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                          >
                            <div className="flex gap-3">
                              <div className={`mt-1 size-8 rounded-full flex items-center justify-center shrink-0 ${n.type === 'birthday' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                <span className="material-symbols-outlined text-lg">
                                  {n.type === 'birthday' ? 'cake' : 'notifications'}
                                </span>
                              </div>
                              <div>
                                <h4 className={`text-sm font-bold ${!n.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                  {n.title}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                  {n.message}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-2">
                                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                          <span className="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_off</span>
                          <p className="text-sm">No tienes notificaciones</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

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
