import React, { useEffect, useState } from 'react';
import { RankingEntry } from '../types';
import { supabase } from '../services/supabase';

const Rankings: React.FC = () => {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState<'weekly' | 'all-time'>('weekly');

  useEffect(() => {
    fetchRankings();
  }, [period]);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      let profiles: any[] | null = null;

      if (period === 'weekly') {
        // Fetch from RPC
        const { data, error } = await supabase.rpc('get_weekly_leaderboard');
        if (error) {
          console.error('Error fetching weekly leaderboard:', error);
          // Fallback to empty or handled error state if RPC doesn't exist yet
        }
        profiles = data;
      } else {
        // Fetch all time from profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, xp')
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
          avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username || 'U')}&background=random`,
          title: 'Discípulo',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-10 animate-fade-in-up">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h1 className="text-gray-900 dark:text-white text-3xl md:text-4xl font-black leading-tight">Salón de Talentos</h1>
            <p className="text-gray-600 dark:text-[#9e9fb7] text-base md:text-lg">Compite y gana talentos completando tus lecciones bíblicas.</p>
          </div>
          <div className="bg-gray-100 dark:bg-slate-800/50 p-1 rounded-xl flex gap-1 border border-gray-200 dark:border-white/5">
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === 'weekly' ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'}`}
            >
              Semanal
            </button>
            <button
              onClick={() => setPeriod('all-time')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === 'all-time' ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'}`}
            >
              Histórico
            </button>
          </div>
        </div>

        {/* Podium */}
        {rankings.length >= 3 && (
          <div className="flex justify-center items-end gap-1 md:gap-12 mt-8 md:mt-12 mb-12">
            {/* Rank 2 */}
            <div className="flex flex-col items-center gap-1 md:gap-3 w-1/3 max-w-[160px] order-1">
              <div className="relative">
                <div className="absolute -top-8 md:-top-10 left-1/2 -translate-x-1/2 text-gray-500 dark:text-gray-400 font-black text-lg md:text-xl flex flex-col items-center">
                  <span className="material-symbols-outlined text-sm md:text-2xl">keyboard_arrow_up</span>
                  2
                </div>
                <div className="size-14 md:size-24 rounded-full p-1 bg-gradient-to-b from-gray-300 to-gray-600 shadow-lg shadow-gray-400/20 dark:shadow-none">
                  <div className="w-full h-full rounded-full bg-cover bg-center border-2 md:border-4 border-white dark:border-[#111221]" style={{ backgroundImage: `url(${top3[1]?.avatar})` }}></div>
                </div>
              </div>
              <div className="text-center mt-1 md:mt-2 w-full">
                <p className="text-gray-700 dark:text-white font-bold text-xs md:text-lg truncate px-1">{top3[1]?.name}</p>
                <div className="flex items-center justify-center gap-1 text-amber-500 dark:text-amber-400 font-bold">
                  <span className="material-symbols-outlined text-[14px] md:text-[18px] fill-current">workspace_premium</span>
                  <span className="text-xs md:text-base">{top3[1]?.xp}</span>
                </div>
              </div>
            </div>

            {/* Rank 1 */}
            <div className="flex flex-col items-center gap-1 md:gap-3 w-1/3 max-w-[180px] order-2 -mt-12 md:-mt-16 z-10">
              <div className="relative">
                <div className="absolute -top-10 md:-top-14 left-1/2 -translate-x-1/2 text-accent-gold animate-bounce drop-shadow-md">
                  <span className="material-symbols-outlined text-3xl md:text-5xl">crown</span>
                </div>
                <div className="size-20 md:size-32 rounded-full p-1 bg-gradient-to-b from-yellow-300 to-yellow-600 shadow-xl shadow-yellow-500/30">
                  <div className="w-full h-full rounded-full bg-cover bg-center border-2 md:border-4 border-white dark:border-[#111221]" style={{ backgroundImage: `url(${top3[0]?.avatar})` }}></div>
                </div>
                <div className="absolute -bottom-3 md:-bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-xs md:text-sm font-black px-3 md:px-4 py-0.5 md:py-1 rounded-full border border-yellow-400 shadow-lg">
                  #1
                </div>
              </div>
              <div className="text-center mt-3 md:mt-4 w-full">
                <p className="text-gray-900 dark:text-white font-bold text-sm md:text-2xl truncate px-1">{top3[0]?.name}</p>
                <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-300 font-bold">
                  <span className="material-symbols-outlined text-[16px] md:text-[20px] fill-current">workspace_premium</span>
                  <span className="text-sm md:text-lg">{top3[0]?.xp}</span>
                </div>
              </div>
            </div>

            {/* Rank 3 */}
            <div className="flex flex-col items-center gap-1 md:gap-3 w-1/3 max-w-[160px] order-3">
              <div className="relative">
                <div className="absolute -top-8 md:-top-10 left-1/2 -translate-x-1/2 text-orange-600 dark:text-orange-600 font-black text-lg md:text-xl flex flex-col items-center">
                  <span className="material-symbols-outlined text-sm md:text-2xl">keyboard_arrow_down</span>
                  3
                </div>
                <div className="size-14 md:size-24 rounded-full p-1 bg-gradient-to-b from-orange-300 to-orange-700 shadow-lg shadow-orange-500/20 dark:shadow-none">
                  <div className="w-full h-full rounded-full bg-cover bg-center border-2 md:border-4 border-white dark:border-[#111221]" style={{ backgroundImage: `url(${top3[2]?.avatar})` }}></div>
                </div>
              </div>
              <div className="text-center mt-1 md:mt-2 w-full">
                <p className="text-gray-700 dark:text-white font-bold text-xs md:text-lg truncate px-1">{top3[2]?.name}</p>
                <div className="flex items-center justify-center gap-1 text-amber-500 dark:text-amber-400 font-bold">
                  <span className="material-symbols-outlined text-[14px] md:text-[18px] fill-current">workspace_premium</span>
                  <span className="text-xs md:text-base">{top3[2]?.xp}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex flex-col gap-3 pb-20">
          <div className="flex justify-between items-center px-4 pb-2 text-xs font-medium text-gray-400 dark:text-[#9e9fb7] uppercase tracking-wider">
            <span className="w-12 text-center">Pos</span>
            <span className="flex-1 ml-4">Usuario</span>
            <span className="text-right">Talentos</span>
          </div>
          {others.map((r) => (
            <div key={r.rank} className={`bg-white dark:bg-[#1e1e2d]/60 backdrop-blur-md rounded-xl p-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer border border-gray-100 dark:border-white/5 shadow-sm ${r.isMe ? 'bg-primary/5 dark:bg-primary/20 border-primary/20 dark:border-primary/40' : ''}`}>
              <div className="w-12 flex items-center justify-center">
                <span className="text-gray-700 dark:text-white font-bold text-lg">{r.rank}</span>
              </div>
              <div className="size-10 rounded-full bg-cover bg-center bg-gray-200 dark:bg-gray-600" style={{ backgroundImage: `url(${r.avatar})` }}></div>
              <div className="flex-1 flex flex-col justify-center">
                <p className="text-gray-900 dark:text-white font-medium text-base">{r.name}</p>
                <p className="text-gray-500 dark:text-[#9e9fb7] text-xs">{r.title}</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20">
                <span className="material-symbols-outlined text-amber-500 dark:text-amber-400 text-[18px]">workspace_premium</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">{r.xp}</span>
              </div>
            </div>
          ))}

          {rankings.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <span className="material-symbols-outlined text-4xl mb-2">leaderboard</span>
              <p>No hay datos de clasificación aún.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Rankings;
