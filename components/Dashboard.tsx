
import React from 'react';
import { Screen, UserStats, RankingEntry } from '../types';

interface DashboardProps {
  stats: UserStats;
  rankings: RankingEntry[];
  setActiveScreen: (s: Screen) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, rankings, setActiveScreen }) => {
  return (
    <div className="p-4 lg:p-10 animate-fade-in-up">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        {/* Welcome Section */}
        <section className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 flex flex-col justify-center gap-2">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">¡Hola, Juan! 👋</h1>
            <p className="text-gray-400 text-lg">Manten tu racha activa. ¡Lo estás haciendo genial!</p>
            
            <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-[#1e1e2d] to-[#161621] border border-[#292938] shadow-lg">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-accent-gold text-xs font-bold uppercase tracking-wider mb-1">Nivel Actual</p>
                  <p className="text-white text-xl font-bold">Nivel {stats.level}: Discípulo</p>
                </div>
                <span className="text-primary font-bold text-lg">{Math.round((stats.xp / stats.maxXp) * 100)}%</span>
              </div>
              <div className="w-full bg-[#292938] rounded-full h-3 mb-2 overflow-hidden">
                <div className="bg-primary h-3 rounded-full relative" style={{ width: `${(stats.xp / stats.maxXp) * 100}%` }}>
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <p className="text-xs text-gray-500 text-right">{stats.maxXp - stats.xp} XP para Nivel {stats.level + 1}</p>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 md:max-w-md">
            <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-full bg-[#1A1A24] cursor-pointer" onClick={() => setActiveScreen('rankings')}>
              <div className="size-10 rounded-full bg-accent-gold/10 flex items-center justify-center text-accent-gold mb-3">
                <span className="material-symbols-outlined">local_fire_department</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.streak}</p>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Días de Racha</p>
              </div>
            </div>
            <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-full bg-[#1A1A24]">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                <span className="material-symbols-outlined">bolt</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalXp / 1000}k</p>
                <p className="text-xs text-gray-400 uppercase tracking-wide">XP Total</p>
              </div>
            </div>
            <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-full bg-[#1A1A24] col-span-2 sm:col-span-1" onClick={() => setActiveScreen('profile')}>
              <div className="size-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 mb-3">
                <span className="material-symbols-outlined">military_tech</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.badges}</p>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Medallas</p>
              </div>
            </div>
          </div>
        </section>

        {/* Today's Tasks */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Estudios de Hoy</h2>
            <button onClick={() => setActiveScreen('studies')} className="text-primary text-sm font-medium hover:text-white transition-colors underline-offset-4 hover:underline">Ver Todos</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <article className="glass-card rounded-2xl overflow-hidden group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="p-6 relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <span className="material-symbols-outlined">auto_stories</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">Reavivados</h3>
                      <p className="text-sm text-gray-400">Lectura Bíblica Diaria</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-[#292938] text-xs font-medium text-gray-300 border border-white/5">Pendiente</span>
                </div>
                <div className="flex-1 flex flex-col justify-center py-4">
                  <h4 className="text-3xl font-bold text-white">Salmos 23</h4>
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2">"Jehová es mi pastor; nada me faltará. En lugares de delicados pastos me hará descansar..."</p>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-4">
                  <button 
                    onClick={() => setActiveScreen('reading')}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/25"
                  >
                    <span className="material-symbols-outlined text-[20px]">play_circle</span>
                    Leer Ahora
                  </button>
                </div>
              </div>
            </article>

            <article className="glass-card rounded-2xl overflow-hidden group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="p-6 relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                      <span className="material-symbols-outlined">school</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">Escuela Sabática</h3>
                      <p className="text-sm text-gray-400">Lección Semanal</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-accent-gold text-sm">star</span>
                    <span className="text-xs font-bold text-white">+50 XP</span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center py-2">
                  <h4 className="text-xl font-bold text-white mb-1">Lección 4: El Conflicto Cósmico</h4>
                  <p className="text-gray-400 text-sm mb-4">Entiende el gran conflicto entre el bien y el mal en el contexto de la salvación.</p>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span>Progreso Semanal</span>
                    <span className="text-white font-bold">3/7 Días</span>
                  </div>
                  <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className="h-1.5 flex-1 rounded-full bg-primary"></div>)}
                    {[4,5,6,7].map(i => <div key={i} className="h-1.5 flex-1 rounded-full bg-[#3d3d52]"></div>)}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <button onClick={() => setActiveScreen('studies')} className="w-full bg-[#292938] hover:bg-[#323246] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/5">
                    Continuar Estudio
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>

        {/* Secondary Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6 overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-gold">military_tech</span>
              Logros Recientes
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
              <BadgeItem icon="local_fire_department" name="7 Días Racha" color="from-yellow-400 to-orange-500" />
              <BadgeItem icon="auto_stories" name="Estudiante Fiel" color="from-blue-400 to-primary" />
              <BadgeItem icon="groups" name="Comunidad" color="from-purple-400 to-pink-500" />
              <BadgeItem icon="lock" name="Bloqueado" color="bg-[#1e1e2d]" locked />
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Líderes</h3>
              <button onClick={() => setActiveScreen('rankings')} className="text-xs text-primary font-bold uppercase hover:underline">Ver Todos</button>
            </div>
            <div className="flex flex-col gap-3">
              {rankings.slice(0, 3).map((r) => (
                <div key={r.rank} className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer ${r.isMe ? 'bg-[#292938] border border-primary/30' : 'hover:bg-[#292938]'}`}>
                  <span className={`font-bold w-4 text-center ${r.rank === 1 ? 'text-accent-gold' : 'text-gray-400'}`}>{r.rank}</span>
                  <div className="size-8 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${r.avatar})` }}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.name}</p>
                  </div>
                  <span className="text-xs font-bold text-primary">{r.xp} XP</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BadgeItem = ({ icon, name, color, locked = false }: { icon: string, name: string, color: string, locked?: boolean }) => (
  <div className={`flex flex-col items-center gap-2 min-w-[100px] p-3 rounded-xl ${locked ? 'bg-[#292938]/20 border border-dashed border-white/10 opacity-60' : 'bg-[#292938]/50 border border-white/5'}`}>
    <div className={`size-14 rounded-full flex items-center justify-center ${locked ? color : `bg-gradient-to-tr ${color} shadow-lg shadow-primary/20`}`}>
      <span className={`material-symbols-outlined text-white ${locked ? 'text-2xl text-gray-600' : 'text-3xl'}`}>{icon}</span>
    </div>
    <span className={`text-xs font-medium text-center ${locked ? 'text-gray-500' : 'text-gray-300'}`}>{name}</span>
  </div>
);

export default Dashboard;
