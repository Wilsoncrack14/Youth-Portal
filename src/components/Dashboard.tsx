
import React from 'react';
import { UserStats, RankingEntry } from '../types';
import { getCurrentQuarterlyInfo, QuarterlyInfo } from '../services/quarterly';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { getLevelName, getNextLevelName } from '../services/levels';

interface DashboardProps {
  stats: UserStats;
  rankings: RankingEntry[];
}

const Dashboard: React.FC<DashboardProps> = ({ stats, rankings }) => {
  const navigate = useNavigate();
  const { profile } = useUser();
  const [dailyReading, setDailyReading] = React.useState<{ book: string; chapter: number; text: string; reference: string } | null>(null);
  const [quarterly, setQuarterly] = React.useState<QuarterlyInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = React.useState<string>("");

  React.useEffect(() => {
    // Load Quarterly Info
    getCurrentQuarterlyInfo().then(setQuarterly);

    let interval: NodeJS.Timeout;
    import('../services/biblePlan').then(async (module) => {
      try {
        const data = await module.fetchDailyChapter();
        setDailyReading(data);

        // Start Countdown Timer
        const updateTimer = () => {
          const now = new Date();
          const nextTime = module.getNextReadingTime();
          const diff = nextTime.getTime() - now.getTime();

          if (diff <= 0) {
            setTimeRemaining("¡Ya disponible!");
            // Optionally reload reading here
          } else {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
          }
        };

        updateTimer();
        interval = setInterval(updateTimer, 1000);

      } catch (error) {
        console.error("Failed to load daily reading preview", error);
      }
    });

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 lg:p-10 animate-fade-in-up">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        {/* Welcome Section */}
        <section className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 flex flex-col justify-center gap-2">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">¡Hola, {profile?.username || 'Usuario'}! 👋</h1>
            <p className="text-gray-400 text-lg">Manten tu racha activa. ¡Lo estás haciendo genial!</p>

            <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-[#1e1e2d] to-[#161621] border border-[#292938] shadow-lg">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-accent-gold text-xs font-bold uppercase tracking-wider mb-1">Nivel Actual</p>
                  <p className="text-white text-xl font-bold">Nivel {stats.level}: {getLevelName(stats.level - 1, stats.totalXp)}</p>
                </div>
                <span className="text-primary font-bold text-lg">{Math.min(100, Math.round((stats.xp / stats.maxXp) * 100))}%</span>
              </div>
              <div className="w-full bg-[#292938] rounded-full h-3 mb-2 overflow-hidden">
                <div className="bg-primary h-3 rounded-full relative" style={{ width: `${Math.min(100, (stats.xp / stats.maxXp) * 100)}%` }}>
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <p className="text-xs text-gray-500 text-right">{Math.max(0, stats.maxXp - stats.xp)} XP para {getNextLevelName(stats.level, stats.totalXp)}</p>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 md:max-w-md">
            <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-full bg-[#1A1A24] cursor-pointer" onClick={() => navigate('/rankings')}>
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
            <div className="glass-card p-4 rounded-xl flex flex-col justify-between h-full bg-[#1A1A24] col-span-2 sm:col-span-1" onClick={() => navigate('/profile')}>
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
            <button onClick={() => navigate('/studies')} className="text-primary text-sm font-medium hover:text-white transition-colors underline-offset-4 hover:underline">Ver Todos</button>
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
                  <div className="flex flex-col items-end">
                    <span className="px-2.5 py-1 rounded-lg bg-[#292938] text-xs font-medium text-gray-300 border border-white/5">
                      {timeRemaining ? `Próximo: ${timeRemaining}` : 'Cargando...'}
                    </span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center py-4">
                  {dailyReading ? (
                    <>
                      <h4 className="text-3xl font-bold text-white">{dailyReading.reference}</h4>
                      <p className="text-gray-400 text-sm mt-1 line-clamp-3">
                        "{dailyReading.text.substring(0, 150)}..."
                      </p>
                    </>
                  ) : (
                    <div className="animate-pulse flex flex-col gap-2">
                      <div className="h-8 bg-white/10 rounded w-1/2"></div>
                      <div className="h-4 bg-white/5 rounded w-full"></div>
                      <div className="h-4 bg-white/5 rounded w-3/4"></div>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-4">
                  <button
                    onClick={() => navigate('/reading?mode=read')}
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
                  <h4 className="text-xl font-bold text-white mb-1">
                    {quarterly?.title || "Cargando Trimestre..."}
                  </h4>
                  <p className="text-gray-400 text-sm mb-4">
                    {quarterly ? `Estudio: ${quarterly.books}` : "Obteniendo datos..."}
                  </p>

                  {quarterly && (
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>Autor: {quarterly.author}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span>Progreso Semanal</span>
                    <span className="text-white font-bold">1/13 Semanas</span>
                  </div>
                  <div className="flex gap-1">
                    {[1].map(i => <div key={i} className="h-1.5 flex-1 rounded-full bg-primary"></div>)}
                    {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-1.5 flex-1 rounded-full bg-[#3d3d52]"></div>)}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <button onClick={() => navigate('/sabbath_school')} className="w-full bg-[#292938] hover:bg-[#323246] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/5">
                    Ir al Estudio
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
              <button onClick={() => navigate('/rankings')} className="text-xs text-primary font-bold uppercase hover:underline">Ver Todos</button>
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
