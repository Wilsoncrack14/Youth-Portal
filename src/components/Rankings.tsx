import React, { useEffect, useState } from 'react';
import { RankingEntry } from '../types';
import { supabase } from '../services/supabase';

const Rankings: React.FC = () => {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'weekly' | 'all-time'>('weekly');
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    fetchRankings();
  }, [period, weekOffset]);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      let profiles: any[] | null = null;

      if (period === 'weekly') {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + (weekOffset * 7));

        const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
          p_date: targetDate.toISOString()
        });

        if (error) console.error('Error fetching weekly leaderboard:', error);
        profiles = data;
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, xp, level')
          .order('xp', { ascending: false })
          .limit(20);
        if (error) throw error;
        profiles = data;
      }

      if (profiles) {
        const rankingData: RankingEntry[] = profiles.map((p, index) => ({
          rank: index + 1,
          name: p.username || 'Usuario',
          xp: p.xp || 0,
          level: p.level || Math.floor((p.xp || 0) / 100) + 1,
          avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username || 'U')}&background=random`,
          title: (p.level || Math.floor((p.xp || 0) / 100) + 1) >= 10 ? 'Maestro' : 'Discípulo',
          isMe: currentUser?.id === p.id
        }));
        setRankings(rankingData);
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const top3 = rankings.slice(0, 3);
  const others = rankings.slice(3);

  // Reorder top3 for layout: [2, 1, 3] if full, or [2, 1] if only two
  const podiumOrder = top3.length === 3
    ? [top3[1], top3[0], top3[2]]
    : top3.length === 2
      ? [top3[1], top3[0]]
      : top3;

  if (loading) {
    return (
      <div className="p-4 lg:p-10 max-w-4xl mx-auto space-y-12 animate-pulse">
        <div className="h-20 bg-gray-200 dark:bg-white/5 rounded-2xl w-2/3"></div>
        <div className="flex justify-center items-end gap-12 h-64">
          <div className="w-24 h-40 bg-gray-200 dark:bg-white/5 rounded-2xl"></div>
          <div className="w-32 h-56 bg-gray-200 dark:bg-white/5 rounded-2xl"></div>
          <div className="w-24 h-32 bg-gray-200 dark:bg-white/5 rounded-2xl"></div>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-white/5 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-10 min-h-screen bg-gray-50 dark:bg-transparent transition-colors">
      <div className="max-w-4xl mx-auto flex flex-col gap-6 md:gap-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-black uppercase tracking-wider mb-2 md:mb-3">
              <span className="material-symbols-outlined text-sm">social_leaderboard</span>
              Competencia en vivo
            </div>
            <h1 className="text-gray-900 dark:text-white text-3xl md:text-5xl font-black leading-tight tracking-tight">
              Salón de <span className="text-primary">Talentos</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm md:text-lg font-medium">Compite y crece espiritualmente cada semana.</p>
          </div>

          <div className="flex flex-col items-end gap-3 md:gap-4 w-full md:w-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="bg-white dark:bg-white/5 p-1 rounded-xl sm:rounded-2xl flex gap-0.5 sm:gap-1 border border-gray-200 dark:border-white/10 shadow-sm w-full md:w-auto">
              {(['weekly', 'all-time'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setWeekOffset(0); }}
                  className={`flex-1 md:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all duration-300 ${period === p ? 'bg-primary text-white shadow-lg shadow-primary/25 translate-y-[-1px]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
                >
                  {p === 'weekly' ? 'Semanal' : 'Histórico'}
                </button>
              ))}
            </div>

            {period === 'weekly' && (
              <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-4 bg-white dark:bg-white/5 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm w-full md:w-auto">
                <button
                  onClick={() => setWeekOffset(prev => prev - 1)}
                  className="size-8 sm:size-10 flex items-center justify-center rounded-lg sm:rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 transition-all active:scale-90"
                >
                  <span className="material-symbols-outlined text-xl sm:text-2xl">chevron_left</span>
                </button>
                <div className="text-center min-w-[120px] sm:min-w-[160px]">
                  <p className="text-[8px] sm:text-[10px] uppercase font-black tracking-[0.2em] text-primary mb-0.5">
                    {weekOffset === 0 ? 'Esta Semana' : weekOffset === -1 ? 'Semana Pasada' : `Hace ${Math.abs(weekOffset)} Semanas`}
                  </p>
                  <p className="text-[10px] sm:text-xs font-bold text-gray-900 dark:text-white">
                    {(() => {
                      const d = new Date();
                      d.setDate(d.getDate() + (weekOffset * 7));
                      const start = new Date(d);
                      start.setDate(d.getDate() - ((d.getDay() + 1) % 7));
                      const end = new Date(start);
                      end.setDate(start.getDate() + 6);
                      return `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  disabled={weekOffset >= 0}
                  className="size-8 sm:size-10 flex items-center justify-center rounded-lg sm:rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 transition-all active:scale-90 disabled:opacity-20 translate-x-[2px]"
                >
                  <span className="material-symbols-outlined text-xl sm:text-2xl">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Podium Section */}
        {rankings.length > 0 && (
          <div className="mt-8 sm:mt-12 mb-12 sm:mb-16 relative">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="flex justify-center items-end gap-2 sm:gap-4 md:gap-14 relative z-10 px-0.5 sm:px-4 max-w-lg mx-auto">
              {podiumOrder.map((entry, idx) => {
                const isFirst = entry.rank === 1;
                const isSecond = entry.rank === 2;
                const isThird = entry.rank === 3;

                return (
                  <div
                    key={entry.rank}
                    className={`flex flex-col items-center group animate-fade-in-up`}
                    style={{
                      animationDelay: `${idx * 0.1}s`,
                      flex: isFirst ? '1.3 1 0%' : '1 1 0%',
                      maxWidth: isFirst ? '220px' : '160px'
                    }}
                  >
                    <div className="relative mb-4 sm:mb-6">
                      {isFirst && (
                        <div className="absolute -top-10 sm:-top-14 left-1/2 animate-crown">
                          <span className="material-symbols-outlined text-4xl sm:text-6xl text-accent-gold fill-current">crown</span>
                        </div>
                      )}

                      <div className={`relative rounded-2xl sm:rounded-3xl p-0.5 sm:p-1 shadow-xl sm:shadow-2xl transition-transform duration-500 group-hover:scale-105 ${isFirst
                        ? 'bg-gradient-to-br from-yellow-300 via-amber-200 to-yellow-600 size-24 sm:size-32 md:size-44 animate-float'
                        : isSecond
                          ? 'bg-gradient-to-br from-gray-200 to-gray-500 size-16 sm:size-24 md:size-32'
                          : 'bg-gradient-to-br from-orange-300 to-orange-700 size-16 sm:size-24 md:size-32'
                        }`}>
                        <div className="w-full h-full rounded-xl sm:rounded-2xl md:rounded-[28px] overflow-hidden border-2 border-white dark:border-[#111221] bg-gray-200">
                          <img src={entry.avatar} alt={entry.name} className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all text-xs" />
                        </div>

                        {/* Rank Badge */}
                        <div className={`absolute -bottom-2 sm:-bottom-3 left-1/2 -translate-x-1/2 px-2 sm:px-4 py-0.5 rounded-full text-[8px] sm:text-xs font-black border-2 border-white dark:border-[#111221] shadow-xl ${isFirst ? 'bg-amber-500 text-white' : isSecond ? 'bg-gray-400 text-white' : 'bg-orange-600 text-white'}`}>
                          #{entry.rank}
                        </div>
                      </div>
                    </div>

                    <div className="text-center w-full">
                      <h3 className={`font-black text-gray-900 dark:text-white truncate px-1 sm:px-2 ${isFirst ? 'text-sm sm:text-lg md:text-2xl' : 'text-[10px] sm:text-base'}`}>
                        {entry.name}
                      </h3>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 mt-0.5 sm:mt-1">
                        <div className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[8px] sm:text-[10px] font-black uppercase">
                          LVL {entry.level || 1}
                        </div>
                        <div className="flex items-center text-amber-500/80 dark:text-amber-400/80 font-black">
                          <span className="material-symbols-outlined text-xs sm:text-sm">workspace_premium</span>
                          <span className={`${isFirst ? 'text-xs sm:text-xl' : 'text-[10px] sm:text-sm'}`}>{entry.xp}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rankings List */}
        <div className="flex flex-col gap-3 sm:gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex justify-between items-center px-4 sm:px-8 pb-1 sm:pb-2 text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] border-b border-gray-100 dark:border-white/5">
            <span className="w-8 sm:w-12 text-center material-symbols-outlined text-[16px] sm:text-[18px] opacity-70">social_leaderboard</span>
            <span className="flex-1 ml-4 sm:ml-6">Discípulo</span>
            <span className="text-right">Talentos</span>
          </div>

          <div className="space-y-2 sm:space-y-3 pb-20">
            {others.length > 0 ? (
              others.map((r, idx) => (
                <div
                  key={r.rank}
                  className={`relative group bg-white dark:bg-white/[0.03] backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex items-center gap-3 sm:gap-6 border border-gray-100 dark:border-white/[0.06] hover:border-primary/30 dark:hover:border-primary/30 transition-all duration-300 hover:shadow-lg sm:hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5 ${r.isMe ? 'ring-2 ring-primary/20 bg-primary/[0.02] dark:bg-primary/[0.05]' : ''}`}
                >
                  {/* Position */}
                  <div className="w-8 sm:w-12 flex flex-col items-center justify-center border-r border-gray-100 dark:border-white/5 shrink-0">
                    <span className={`font-black text-sm sm:text-lg ${r.isMe ? 'text-primary' : 'text-gray-400 dark:text-white/20'}`}>
                      {r.rank < 10 ? `0${r.rank}` : r.rank}
                    </span>
                  </div>

                  {/* Avatar & Info */}
                  <div className="flex-1 flex items-center gap-2 sm:gap-4 min-w-0">
                    <div className="relative size-10 sm:size-12 shrink-0">
                      <img src={r.avatar} alt={r.name} className="size-full rounded-xl sm:rounded-2xl object-cover border-2 border-white dark:border-white/10 shadow-sm" />
                      {r.isMe && (
                        <div className="absolute -top-1 -right-1 size-3 sm:size-4 bg-green-500 rounded-full border-2 border-white dark:border-[#111221]" title="Tú"></div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-gray-900 dark:text-white font-black text-sm sm:text-base truncate">{r.name}</span>
                        {r.isMe && <span className="px-1 py-0.5 rounded-md bg-primary text-[7px] sm:text-[8px] text-white font-black uppercase shrink-0">Tú</span>}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                        <span className="text-[8px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-wider">{r.title}</span>
                        <div className="size-0.5 sm:size-1 rounded-full bg-gray-300 dark:bg-white/10"></div>
                        <span className="text-[8px] sm:text-[10px] text-primary font-black uppercase tracking-wider">Nivel {r.level}</span>
                      </div>
                    </div>
                  </div>

                  {/* XP Badge */}
                  <div className="bg-gray-50 dark:bg-white/[0.05] border border-gray-100 dark:border-white/5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex items-center gap-1.5 sm:gap-2 group-hover:bg-primary group-hover:border-primary/20 transition-all duration-300 group-hover:scale-105 shrink-0">
                    <span className="material-symbols-outlined text-amber-500 dark:text-amber-400 text-base sm:text-lg group-hover:text-white transition-colors">workspace_premium</span>
                    <span className="text-gray-900 dark:text-white font-black text-sm sm:text-lg group-hover:text-white transition-colors">
                      {r.xp.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : rankings.length <= 3 && !loading ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
                <div className="size-24 rounded-full bg-primary/5 flex items-center justify-center mb-6 relative">
                  <span className="material-symbols-outlined text-5xl text-primary/30">workspace_premium</span>
                  <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-20"></div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">¡Sé el primero en la lista!</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-[280px] font-medium leading-relaxed mx-auto">
                  Completa tus lecciones diarias para aparecer en el Salón de Talentos y ganar reconocimiento.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rankings;
