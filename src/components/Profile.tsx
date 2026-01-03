
import React, { useState } from 'react';
import { UserStats, Badge } from '../types';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../services/supabase';
import { getDailyVerse } from '../services/dailyVerse';
import { useNavigate } from 'react-router-dom';

interface ProfileProps {
  stats: UserStats;
  badges: Badge[];
}

const Profile: React.FC<ProfileProps> = ({ stats, badges }) => {
  const { profile, refreshProfile } = useUser();
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [chaptersRead, setChaptersRead] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [dailyVerse, setDailyVerse] = useState<{ text: string; reference: string; book: string; chapter: number } | null>(null);
  const navigate = useNavigate();

  // Fetch chapters read count
  React.useEffect(() => {
    const fetchChaptersRead = async () => {
      if (!profile?.id) return;

      const { count } = await supabase
        .from('daily_readings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      setChaptersRead(count || 0);
    };

    fetchChaptersRead();

    // Listen for chapter completion events
    const handleChapterCompleted = () => {
      fetchChaptersRead(); // Refresh count when a chapter is completed
    };

    window.addEventListener('chapterCompleted', handleChapterCompleted);

    return () => {
      window.removeEventListener('chapterCompleted', handleChapterCompleted);
    };
  }, [profile?.id]);

  // Load daily verse
  React.useEffect(() => {
    const loadDailyVerse = async () => {
      const verse = await getDailyVerse(profile?.id);
      setDailyVerse(verse);
    };
    loadDailyVerse();
  }, [profile?.id]);

  const validateUsername = (username: string): string | null => {
    if (!username || username.trim().length === 0) {
      return 'El nombre de usuario no puede estar vacío';
    }
    if (username.length < 3) {
      return 'Mínimo 3 caracteres';
    }
    if (username.length > 20) {
      return 'Máximo 20 caracteres';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Solo letras, números y guión bajo';
    }
    return null;
  };

  const handleStartEdit = () => {
    setNewUsername(profile?.username || '');
    setIsEditingUsername(true);
    setUsernameError('');
  };

  const handleCancelEdit = () => {
    setIsEditingUsername(false);
    setNewUsername('');
    setUsernameError('');
  };

  const handleSaveUsername = async () => {
    if (!profile) return;

    const error = validateUsername(newUsername);
    if (error) {
      setUsernameError(error);
      return;
    }

    setIsSaving(true);
    setUsernameError('');

    try {
      // Check if username is already taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', newUsername)
        .neq('id', profile.id)
        .single();

      if (existing) {
        setUsernameError('Este nombre de usuario ya está en uso');
        setIsSaving(false);
        return;
      }

      // Update username
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setIsEditingUsername(false);
      setToastMessage('Nombre de usuario actualizado');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Error updating username:', error);
      setUsernameError('Error al actualizar el nombre de usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareProgress = () => {
    setShowShareModal(true);
  };

  const copyProgressToClipboard = () => {
    const progressText = `📚 Mi Progreso en Youth Portal 🙏

👤 ${profile?.username || 'Usuario'}
🏆 Nivel ${stats.level}
📚 ${chaptersRead} Capítulos Leídos
🔥 ${stats.streak} Días de Racha
⭐ ${stats.xp} / ${stats.maxXp} XP

¡Sigue creciendo espiritualmente! 🚀`;

    navigator.clipboard.writeText(progressText).then(() => {
      setToastMessage('¡Progreso copiado al portapapeles!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setShowShareModal(false);
    });
  };
  return (
    <div className="p-4 lg:p-10 animate-fade-in-up">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-2">Mi Perfil</h1>
            <p className="text-slate-400 text-lg">Sigue tu progreso espiritual y alcanza nuevas metas.</p>
          </div>
          <button onClick={handleShareProgress} className="glass-panel hover:bg-primary/20 transition-all text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium border border-white/10 shadow-lg">
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
                <div className="w-full h-full rounded-full border-4 border-[#1e1e2e] bg-cover bg-center overflow-hidden"
                  style={{ backgroundImage: profile?.avatar_url ? `url('${profile.avatar_url}')` : `url('https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.username || 'User')}&background=4b4ee7&color=fff&size=300')` }}></div>
              </div>
            </div>
            {isEditingUsername ? (
              <div className="w-full px-4">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-center text-xl font-bold focus:outline-none focus:border-primary"
                  placeholder="Nombre de usuario"
                  maxLength={20}
                />
                {usernameError && (
                  <p className="text-red-400 text-xs mt-1">{usernameError}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveUsername}
                    disabled={isSaving}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-white text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white mb-1">{profile?.username || 'Usuario'}</h2>
                <button
                  onClick={handleStartEdit}
                  className="text-gray-400 hover:text-primary transition-colors"
                  title="Editar nombre de usuario"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
              </div>
            )}
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
                <div className="mt-4"><h3 className="text-3xl font-bold text-white">{chaptersRead}</h3><p className="text-slate-400 text-sm">Capítulos Leídos</p></div>
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
              <div className="flex-1">
                <h4 className="text-white font-bold text-lg">Versículo del Día</h4>
                {dailyVerse ? (
                  <p className="text-slate-300 italic text-sm">"{dailyVerse.text}" - {dailyVerse.reference}</p>
                ) : (
                  <p className="text-slate-300 italic text-sm">Cargando versículo...</p>
                )}
              </div>
              {dailyVerse && (
                <button
                  onClick={() => navigate('/reading', { state: { book: dailyVerse.book, chapter: dailyVerse.chapter } })}
                  className="text-sm font-bold text-primary hover:text-white transition-colors flex items-center gap-1 shrink-0"
                >
                  Ir a leer <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              )}
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

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in flex items-center gap-2 z-50">
            <span className="material-symbols-outlined">check_circle</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
            <div className="glass-panel rounded-2xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Compartir Progreso</h3>
                <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-white/10">
                <div className="text-center mb-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-primary to-purple-500 p-1 mb-3">
                    <div className="w-full h-full rounded-full bg-cover bg-center overflow-hidden"
                      style={{ backgroundImage: profile?.avatar_url ? `url('${profile.avatar_url}')` : `url('https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.username || 'User')}&background=4b4ee7&color=fff&size=200')` }}></div>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-1">{profile?.username || 'Usuario'}</h4>
                  <p className="text-sm text-gray-400">Youth Portal</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-primary">{stats.level}</p>
                    <p className="text-xs text-gray-400">Nivel</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-blue-400">{chaptersRead}</p>
                    <p className="text-xs text-gray-400">Capítulos</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-orange-400">{stats.streak}</p>
                    <p className="text-xs text-gray-400">Racha</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-yellow-400">{stats.xp}</p>
                    <p className="text-xs text-gray-400">XP</p>
                  </div>
                </div>
              </div>

              <button
                onClick={copyProgressToClipboard}
                className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">content_copy</span>
                Copiar al Portapapeles
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
