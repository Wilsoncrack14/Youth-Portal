
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Screen } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  userStats: any;
}

const Layout: React.FC<LayoutProps> = ({ children, userStats }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Simple mapping: /dashboard -> 'dashboard', / -> 'dashboard'
  const currentPath = location.pathname.substring(1) || 'dashboard';

  const menuItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', path: '/' },
    { id: 'studies', icon: 'menu_book', label: 'Mis Estudios', path: '/studies' },
    { id: 'rankings', icon: 'trophy', label: 'Rankings', path: '/rankings' },
    { id: 'community', icon: 'group', label: 'Comunidad', path: '/community' },
    { id: 'profile', icon: 'person', label: 'Perfil', path: '/profile' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col justify-between bg-[#0e0e15] border-r border-[#292938] p-6 shrink-0 h-full overflow-y-auto">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3 px-2 cursor-pointer" onClick={() => handleNavigation('/')}>
            <div className="size-10 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-2xl">church</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">Youth Portal</h2>
          </div>

          <div className="glass-panel p-4 rounded-xl flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleNavigation('/profile')}>
            <div className="relative">
              <div className="size-12 rounded-full bg-cover bg-center border-2 border-primary"
                style={{ backgroundImage: `url('https://picsum.photos/seed/juan/200/200')` }}></div>
              <div className="absolute -bottom-1 -right-1 bg-accent-gold text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-[#0e0e15]">LVL {userStats.level}</div>
            </div>
            <div className="flex flex-col overflow-hidden">
              <h3 className="text-sm font-bold truncate">Juan Pérez</h3>
              <p className="text-xs text-gray-400 truncate">Discípulo</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${(currentPath === item.id || (currentPath === 'dashboard' && item.path === '/'))
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-gray-400 hover:bg-[#292938] hover:text-white'
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
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentPath === 'settings' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-[#292938] hover:text-white'
              }`}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-medium">Configuración</span>
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark relative h-screen">
        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-8 border-b border-[#292938] bg-background-light/50 dark:bg-background-dark/50 backdrop-blur-md sticky top-0 z-20">
          <div className="lg:hidden flex items-center gap-3 text-white">
            <span className="material-symbols-outlined" onClick={() => handleNavigation('/')}>menu</span>
            <span className="font-bold text-lg">Youth Portal</span>
          </div>

          <div className="hidden lg:flex w-full max-w-md">
            <div className="relative w-full group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-[#292938] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-[#1e1e2d] sm:text-sm transition-all" placeholder="Buscar lecciones, amigos, versículos..." type="text" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-full hover:bg-[#292938] text-gray-400 hover:text-white transition-colors" onClick={() => handleNavigation('/community')}>
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#292938] border border-[#3d3d52]">
              <span className="text-accent-gold material-symbols-outlined text-[18px]">local_fire_department</span>
              <span className="text-sm font-bold text-white">{userStats.streak}</span>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
