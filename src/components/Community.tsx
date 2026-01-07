
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { UserProfile } from '../hooks/useUserData';
import { Prayer, PrayerComment } from '../types';
import { useUser } from '../contexts/UserContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const Community: React.FC = () => {
  const { profile } = useUser();
  const [birthdays, setBirthdays] = useState<UserProfile[]>([]);
  const [loadingBirthdays, setLoadingBirthdays] = useState(true);

  // Prayer Wall State
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loadingPrayers, setLoadingPrayers] = useState(true);
  const [newPrayer, setNewPrayer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [visibleComments, setVisibleComments] = useState<{ [key: string]: boolean }>({});

  const fetchPrayers = async () => {
    try {
      const { data, error } = await supabase
        .from('prayers')
        .select(`
          *,
          profiles:user_id (username, avatar_url),
          prayer_amens (count),
          prayer_comments (
            id, content, created_at, user_id,
            profiles:user_id (username, avatar_url)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check if current user has liked
      const prayersWithLikes = await Promise.all((data || []).map(async (p: any) => {
        const amensCount = p.prayer_amens[0]?.count || 0;
        let userHasAmened = false;

        if (profile?.id) {
          const { data: amenData } = await supabase
            .from('prayer_amens')
            .select('id')
            .eq('prayer_id', p.id)
            .eq('user_id', profile.id)
            .single();
          userHasAmened = !!amenData;
        }

        return {
          ...p,
          amens_count: amensCount,
          user_has_amened: userHasAmened,
          prayer_comments: p.prayer_comments || []
        } as Prayer;
      }));

      setPrayers(prayersWithLikes);
    } catch (error) {
      console.error('Error fetching prayers:', error);
    } finally {
      setLoadingPrayers(false);
    }
  };

  useEffect(() => {
    fetchPrayers();
  }, [profile?.id]);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        const { data, error } = await supabase.rpc('get_birthdays_of_month');
        if (error) throw error;
        setBirthdays(data || []);
      } catch (error) {
        console.error('Error fetching birthdays:', error);
      } finally {
        setLoadingBirthdays(false);
      }
    };
    fetchBirthdays();
  }, []);

  const handlePostPrayer = async () => {
    if (!newPrayer.trim() || !profile) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('prayers').insert({
        user_id: profile.id,
        content: newPrayer
      });
      if (error) throw error;
      setNewPrayer('');
      fetchPrayers();
    } catch (error) {
      console.error('Error posting prayer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmen = async (prayer: Prayer) => {
    if (!profile) return;

    // Optimistic Update could go here, but for simplicity we fetch after
    try {
      if (prayer.user_has_amened) {
        await supabase.from('prayer_amens').delete().match({ prayer_id: prayer.id, user_id: profile.id });
      } else {
        await supabase.from('prayer_amens').insert({ prayer_id: prayer.id, user_id: profile.id });
      }
      fetchPrayers();
    } catch (error) {
      console.error('Error toggling amen:', error);
    }
  };

  const toggleComments = (prayerId: string) => {
    setVisibleComments(prev => ({ ...prev, [prayerId]: !prev[prayerId] }));
  };

  const handlePostComment = async (prayerId: string) => {
    const content = commentText[prayerId];
    if (!content?.trim() || !profile) return;

    try {
      const { error } = await supabase.from('prayer_comments').insert({
        prayer_id: prayerId,
        user_id: profile.id,
        content: content
      });
      if (error) throw error;
      setCommentText(prev => ({ ...prev, [prayerId]: '' }));
      fetchPrayers();
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const groups = [
    { name: 'Grupo de Jóvenes Caleb', members: 24, lastActive: '2 min', icon: 'groups' },
    { name: 'Intercesores Nocturnos', members: 12, lastActive: '15 min', icon: 'volunteer_activism' },
    { name: 'Música & Alabanza', members: 8, lastActive: '1h', icon: 'music_note' },
  ];



  return (
    <div className="p-4 lg:p-10 animate-fade-in-up">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">Comunidad</h1>
            <p className="text-gray-500 dark:text-gray-400">Conecta, comparte y crece con tus hermanos en Cristo.</p>
          </div>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Muro de Oración</h2>
            <div className="bg-white dark:bg-[#1a1b26] p-4 rounded-2xl border border-gray-200 dark:border-primary/20 shadow-sm dark:shadow-none">
              <textarea
                className="w-full bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                placeholder="¿Por qué podemos orar hoy por ti?"
                rows={3}
                value={newPrayer}
                onChange={(e) => setNewPrayer(e.target.value)}
              ></textarea>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200 dark:border-white/10">
                <div className="flex gap-2">
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><span className="material-symbols-outlined text-xl">image</span></button>
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><span className="material-symbols-outlined text-xl">sentiment_satisfied</span></button>
                </div>
                <button
                  onClick={handlePostPrayer}
                  disabled={isSubmitting || !newPrayer.trim()}
                  className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white text-sm font-bold px-6 py-2 rounded-lg transition-colors"
                >
                  {isSubmitting ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {loadingPrayers ? (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : prayers.length > 0 ? (
                prayers.map((p) => (
                  <div key={p.id} className="bg-white dark:bg-[#1a1b26] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        {p.profiles?.avatar_url ? (
                          <img src={p.profiles.avatar_url} className="size-10 rounded-full object-cover" alt="User" />
                        ) : (
                          <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold uppercase">{p.profiles?.username?.substring(0, 2) || 'US'}</div>
                        )}
                        <div>
                          <p className="text-gray-900 dark:text-white font-bold">{p.profiles?.username || 'Usuario'}</p>
                          <p className="text-xs text-gray-500">Hace {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: es })}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">{p.content}</p>
                    <div className="flex gap-6 border-t border-gray-200 dark:border-white/5 pt-4">
                      <button
                        onClick={() => handleAmen(p)}
                        className={`flex items-center gap-2 text-sm transition-colors ${p.user_has_amened ? 'text-primary font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-primary'}`}
                      >
                        <span className={`material-symbols-outlined text-lg ${p.user_has_amened ? 'fill-current' : ''}`}>church</span> Amén ({p.amens_count})
                      </button>
                      <button
                        onClick={() => toggleComments(p.id)}
                        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">chat_bubble</span> Comentar ({p.prayer_comments?.length || 0})
                      </button>
                    </div>

                    {/* Comments Section */}
                    {visibleComments[p.id] && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/5 animate-fade-in-down">
                        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                          {p.prayer_comments?.map(comment => (
                            <div key={comment.id} className="flex gap-3">
                              <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center text-xs font-bold">
                                {comment.profiles?.avatar_url ? (
                                  <img src={comment.profiles.avatar_url} className="size-8 rounded-full" alt="C" />
                                ) : (
                                  comment.profiles?.username?.substring(0, 1) || '?'
                                )}
                              </div>
                              <div className="bg-gray-100 dark:bg-black/20 rounded-lg p-3 flex-1">
                                <p className="text-xs font-bold text-gray-900 dark:text-white mb-1">{comment.profiles?.username}</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentText[p.id] || ''}
                            onChange={(e) => setCommentText(prev => ({ ...prev, [p.id]: e.target.value }))}
                            placeholder="Escribe un comentario..."
                            className="flex-1 bg-gray-100 dark:bg-black/20 border-none rounded-lg px-4 py-2 text-sm focus:ring-1 ring-primary dark:text-white"
                            onKeyDown={(e) => e.key === 'Enter' && handlePostComment(p.id)}
                          />
                          <button
                            onClick={() => handlePostComment(p.id)}
                            className="bg-primary text-white p-2 rounded-lg hover:bg-primary/80 transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">send</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))) : (
                <div className="text-center py-10 text-gray-500">
                  <p>Aún no hay pedidos de oración. Sé el primero.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <div className="bg-white dark:bg-[#1a1b26] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Mis Grupos</h3>
            <div className="flex flex-col gap-4">
              {groups.map((g, i) => (
                <div key={i} className="flex items-center gap-4 group cursor-pointer">
                  <div className="size-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">{g.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{g.name}</p>
                    <p className="text-xs text-gray-500">{g.members} miembros</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-[#3d3d52] text-gray-500 dark:text-gray-400 text-sm hover:border-primary hover:text-primary dark:hover:text-white transition-all">
              + Unirse a un grupo
            </button>
          </div>

          <div className="bg-white dark:bg-[#1a1b26] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none animate-fade-in-up delay-100">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-gold">cake</span>
              Cumpleaños del Mes
            </h3>
            {loadingBirthdays ? (
              <div className="flex justify-center p-4">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : birthdays.length > 0 ? (
              <div className="flex flex-col gap-4">
                {birthdays.map((user) => {
                  const birthDate = new Date(user.birth_date!);
                  // Adjust for timezone if necessary, but just displaying Day is usually safe enough provided UTC handling
                  // Using getUTCDate to avoid timezone shifts
                  const day = birthDate.getUTCDate();

                  return (
                    <div key={user.id} className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="size-10 rounded-full object-cover border border-white/10" />
                      ) : (
                        <div className="size-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.username}</p>
                        <p className="text-xs text-green-500 font-medium">Cumple el día {day}</p>
                      </div>
                      <button className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-full transition-colors">
                        Saludar
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No hay cumpleaños este mes.
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-[#1a1b26] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Eventos Próximos</h3>
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="flex flex-col items-center justify-center size-12 bg-accent-gold/10 text-accent-gold rounded-lg border border-accent-gold/20 shrink-0">
                  <span className="text-xs font-black">VIE</span>
                  <span className="text-lg font-black">24</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Vigilia de Jóvenes</p>
                  <p className="text-xs text-gray-500">20:00 - Salón Principal</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Community;
