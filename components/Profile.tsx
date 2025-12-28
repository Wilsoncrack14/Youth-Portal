
import React from 'react';
import { UserStats, Badge } from '../types';

interface ProfileProps {
  stats: UserStats;
  badges: Badge[];
}

const Profile: React.FC<ProfileProps> = ({ stats, badges }) => {
  return (
    <div className="p-4 lg:p-10 animate-fade-in-up">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-2">Mi Perfil</h1>
            <p className="text-slate-400 text-lg">Sigue tu progreso espiritual y alcanza nuevas metas.</p>
          </div>
          <button className="glass-panel hover:bg-primary/20 transition-all text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium border border-white/10 shadow-lg">
            <span className="material-symbols-outlined">share</span>
            Compartir Progreso
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1 glass-panel rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/20 to-transparent opacity-50"></div>
            <div className="relative z-10 mt-4 mb-4">
              <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary to-purple-500 shadow-2xl">
                <div className="w-full h-full rounded-full border-4 border-[#1e1e2e] bg-cover bg-center" style={{ backgroundImage: `url('https://picsum.photos/seed/juan/300/300')` }}></div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Juan Pérez</h2>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase mb-6">
              <span className="material-symbols-outlined text-sm">verified</span>
              Discípulo
            </span>
            <div className="w-full mt-auto bg-slate-800/50 rounded-xl p-4 border border-white/5">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xl font-bold text-white">Nivel {stats.level}</span>
                <span className="text-xs text-primary font-bold">{stats.xp} / {stats.maxXp} XP</span>
              </div>
              <div className="h-3 w-full bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(stats.xp / stats.maxXp) * 100}%` }}></div>
              </div>
              <p className="text-xs text-slate-400 mt-3 text-left">Lee 5 capítulos más para el Nivel {stats.level + 1}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
              <div className="glass-panel rounded-xl p-5 flex flex-col justify-between">
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 w-fit"><span className="material-symbols-outlined text-3xl">menu_book</span></div>
                <div className="mt-4"><h3 className="text-3xl font-bold text-white">128</h3><p className="text-slate-400 text-sm">Capítulos Leídos</p></div>
              </div>
              <div className="glass-panel rounded-xl p-5 flex flex-col justify-between">
                <div className="p-3 rounded-lg bg-orange-500/10 text-orange-400 w-fit"><span className="material-symbols-outlined text-3xl">local_fire_department</span></div>
                <div className="mt-4"><h3 className="text-3xl font-bold text-white">{stats.streak} Días</h3><p className="text-slate-400 text-sm">Racha Actual</p></div>
              </div>
              <div className="glass-panel rounded-xl p-5 flex flex-col justify-between">
                <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400 w-fit"><span className="material-symbols-outlined text-3xl">military_tech</span></div>
                <div className="mt-4"><h3 className="text-3xl font-bold text-white">Top 5%</h3><p className="text-slate-400 text-sm">Ranking Global</p></div>
              </div>
            </div>
            
            <div className="glass-panel rounded-xl p-6 flex flex-col sm:flex-row gap-6 items-center border-l-4 border-l-primary">
              <div className="bg-primary/20 p-3 rounded-full text-primary shrink-0"><span className="material-symbols-outlined">lightbulb</span></div>
              <div>
                <h4 className="text-white font-bold text-lg">Versículo del Día</h4>
                <p className="text-slate-300 italic text-sm">"Lámpara es a mis pies tu palabra, y lumbrera a mi camino." - Salmos 119:105</p>
              </div>
              <button className="text-sm font-bold text-primary hover:text-white transition-colors flex items-center gap-1 ml-auto">
                Ir a leer <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <section className="pb-20">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">hotel_class</span>
              Logros y Medallas
            </h2>
            <span className="text-slate-400 text-sm">{badges.filter(b => b.unlocked).length} de {badges.length} Desbloqueados</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {badges.map((b) => (
              <div key={b.id} className={`glass-panel rounded-xl p-5 relative group transition-all duration-300 ${!b.unlocked ? 'opacity-50 grayscale' : 'hover:bg-white/5 border-primary/30'}`}>
                {b.unlocked && <div className="absolute top-3 right-3 text-primary"><span className="material-symbols-outlined text-lg">check_circle</span></div>}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${b.icon === 'lock' ? 'bg-gray-800' : 'bg-gradient-to-br from-primary to-purple-500'}`}>
                  <span className="material-symbols-outlined text-white text-3xl">{b.icon}</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{b.name}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Achievement description goes here.</p>
                {b.date && <div className="mt-3 text-xs font-semibold text-primary">Desbloqueado el {b.date}</div>}
                {!b.unlocked && b.progress !== undefined && (
                  <div className="mt-4">
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full" style={{ width: `${(b.progress / (b.total || 1)) * 100}%` }}></div>
                    </div>
                    <p className="text-[10px] text-right text-slate-400 mt-1">{b.progress}/{b.total} Completado</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
