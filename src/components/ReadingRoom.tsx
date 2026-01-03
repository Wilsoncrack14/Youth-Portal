import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { generateQuizQuestion, getChapterContext } from '../services/ai';
import { fetchDailyChapter, BIBLE_BOOKS_List, getTodayChapterReference } from '@/services/biblePlan';
import { supabase } from '../services/supabase';
import { extractHighlightedVerse } from '../services/dailyVerse';

interface ReadingRoomProps {
  onComplete: (xp: number, data?: { type: 'quiz'; score: number; reference: string }) => void;
}

const ReadingRoom: React.FC<ReadingRoomProps> = ({ onComplete }) => {
  const [viewMode, setViewMode] = useState<'hub' | 'read'>('hub');

  return (
    <div className="animate-fade-in-up h-full">
      {viewMode === 'read' ? (
        <ReadingView onComplete={onComplete} onBack={() => setViewMode('hub')} />
      ) : (
        <ReavivadosHub onRead={() => setViewMode('read')} />
      )}
    </div>
  );
};

// --- SUB-COMPONENTS ---

const ReavivadosHub: React.FC<{ onRead: () => void }> = ({ onRead }) => {
  const [dailyReading, setDailyReading] = useState<{ book: string; chapter: number; text: string; reference: string } | null>(null);

  useEffect(() => {
    fetchDailyChapter().then(setDailyReading);
  }, []);

  const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const currentDayIndex = new Date().getDay();


  // Calculate past readings dynamically
  const getRecentReadings = () => {
    const readings = [];
    const today = new Date();
    // Show last 4 days
    for (let i = 1; i <= 4; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ref = getTodayChapterReference(d);
      readings.push({
        ...ref,
        displayDate: d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
      });
    }
    return readings;
  };

  const recentReadings = getRecentReadings();

  return (
    <div className="p-4 lg:p-10 max-w-5xl mx-auto flex flex-col gap-8">
      {/* HERO SECTION */}
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#1e1e2d] rounded-2xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <span className="material-symbols-outlined text-9xl text-white">auto_stories</span>
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-4 text-blue-200">
            <span className="material-symbols-outlined">menu_book</span>
            <span className="uppercase tracking-widest text-xs font-bold">Reavivados por su Palabra</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            Lectura Diaria de la Biblia
          </h1>
          <p className="text-lg text-blue-100 mb-8 opacity-90">
            Un capítulo de la Biblia cada día. Mantén tu racha activa, gana puntos y, lo más importante, conecta con Dios.
          </p>
        </div>
      </div>

      {/* WEEKLY PROGRESS */}
      <div className="bg-[#1a1b26] border border-white/5 rounded-2xl p-6 md:p-8">
        <h3 className="font-serif text-2xl font-bold text-white mb-6">Progreso Semanal</h3>
        <div className="flex justify-between items-center max-w-3xl mx-auto">
          {days.map((d, i) => {
            const status = i < currentDayIndex ? 'completed' : i === currentDayIndex ? 'active' : 'upcoming';
            return (
              <div key={i} className="flex flex-col items-center gap-3">
                <span className="text-xs font-bold text-gray-500">{d}</span>
                <div className={`size-10 md:size-12 rounded-full flex items-center justify-center border-2 transition-all
                        ${status === 'completed' ? 'bg-accent-gold border-accent-gold text-black' :
                    status === 'active' ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' :
                      'bg-[#292938] border-[#3d3d52] text-gray-600'}
                     `}>
                  {status === 'completed' && <span className="material-symbols-outlined">check</span>}
                  {status === 'active' && <span className="material-symbols-outlined">play_arrow</span>}
                  {status === 'upcoming' && <span className="size-2 bg-gray-600 rounded-full"></span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex justify-between items-center text-sm text-gray-400 px-4">
          <span>{Math.round((currentDayIndex / 7) * 100)}% Completado</span>
          <span className="text-accent-gold font-bold">¡Vas bien!</span>
        </div>
      </div>

      {/* TODAY'S READING CARD */}
      <div className="bg-[#fffbf0] dark:bg-[#1a1b26] border border-white/5 rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-black/20 to-transparent pointer-events-none"></div>

        <div className="max-w-2xl relative z-10">
          <span className="text-gray-500 font-bold text-sm mb-2 block">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h2 className="text-4xl font-serif font-black text-white mb-4">
            {dailyReading ? dailyReading.reference : "Cargando..."}
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed mb-8">
            {dailyReading ? `"${dailyReading.text.substring(0, 180)}..."` : "Preparando la lectura de hoy..."}
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={onRead}
              className="bg-accent-gold hover:bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition-transform active:scale-95 shadow-lg"
            >
              <span className="material-symbols-outlined">auto_stories</span>
              Leer Capítulo
            </button>
            <button className="px-6 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-green-400">check_circle</span>
              Marcar como Leído
            </button>
          </div>
        </div>
      </div>

      {/* RECENT READINGS LIST */}
      <div className="grid gap-4">
        <h3 className="font-bold text-gray-400 text-sm uppercase tracking-widest ml-1">Lecturas Recientes</h3>
        {recentReadings.map((reading, idx) => (
          <div key={idx} className="bg-[#14151f] hover:bg-[#1a1b26] border border-white/5 rounded-xl p-4 flex items-center justify-between transition-colors group">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                <span className="material-symbols-outlined">check</span>
              </div>
              <div>
                <p className="text-white font-serif font-bold text-lg">{reading.book} {reading.chapter}</p>
                <p className="text-gray-500 text-xs capitalize">{reading.displayDate}</p>
              </div>
            </div>
            <span className="text-gray-500 text-sm font-bold opacity-50 group-hover:opacity-100 transition-opacity">+10 pts</span>
          </div>
        ))}
      </div>

      {/* TIPS */}
      <div className="bg-[#1a1b26] border border-orange-500/20 rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">💡</span>
          <h3 className="font-serif text-xl font-bold text-white">Consejos para tu estudio</h3>
        </div>
        <ul className="space-y-3 text-gray-400">
          <li className="flex items-center gap-2"><span className="text-accent-gold">•</span> Lee el capítulo en la mañana para empezar tu día con la Palabra.</li>
          <li className="flex items-center gap-2"><span className="text-accent-gold">•</span> Toma notas de los versículos que más te impacten.</li>
          <li className="flex items-center gap-2"><span className="text-accent-gold">•</span> Comparte con el grupo lo que aprendiste.</li>
        </ul>
      </div>

    </div>
  );
}


// --- READER COMPONENT (Original Logic) ---

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

const ReadingView: React.FC<{ onComplete: (xp: number, data?: any) => void, onBack: () => void }> = ({ onComplete, onBack }) => {
  // Quiz State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizCompletedToday, setQuizCompletedToday] = useState(false);
  const [todayQuizScore, setTodayQuizScore] = useState<number | null>(null);
  const [username, setUsername] = useState<string>('');
  const [isTodaysChapter, setIsTodaysChapter] = useState(true); // Track if this is today's chapter

  // Reading State
  const [chapterData, setChapterData] = useState<{ reference: string; text: string; book: string; chapter: number } | null>(null);
  const [contextData, setContextData] = useState<{ previous_summary: string; current_preview: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if navigation state has book and chapter
    const state = location.state as { book?: string; chapter?: number } | null;
    if (state?.book && state?.chapter) {
      loadReading(state.book, state.chapter);
    } else {
      loadReading();
    }
    fetchUsername();
  }, [location.state]);

  // Check quiz completion when chapter data changes
  useEffect(() => {
    if (chapterData) {
      checkQuizCompletion();
    }
  }, [chapterData]);

  const fetchUsername = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (profile?.username) {
          setUsername(profile.username);
        } else {
          setUsername(user.email?.split('@')[0] || 'Usuario');
        }
      }
    } catch (error) {
      console.error('Error fetching username:', error);
      setUsername('Usuario');
    }
  };

  const checkQuizCompletion = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_readings')
        .select('*')
        .eq('user_id', user.id)
        .eq('reference', chapterData?.reference || '') // Must be this chapter
        .gte('created_at', today) // Must be from today
        .limit(1);

      if (!error && data && data.length > 0) {
        const record = data[0];
        // Mark as completed if score is 2/3 or 3/3
        if (record.reflection && typeof record.reflection === 'string') {
          const scoreMatch = record.reflection.match(/score:\s*(\d+)/);
          if (scoreMatch) {
            const score = parseInt(scoreMatch[1]);
            setTodayQuizScore(score);
            // Quiz is completed if score >= 2
            if (score >= 2) {
              setQuizCompletedToday(true);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking quiz completion:', error);
    }
  };

  const loadReading = async (book?: string, chapter?: number) => {
    setLoading(true);
    setQuestions([]);
    setShowQuiz(false);
    setQuizFinished(false);
    setScore(0);
    setCurrentQuestion(0);
    setContextData(null);

    let data;
    if (book && chapter) {
      data = await fetchDailyChapter(book, chapter);
    } else {
      data = await fetchDailyChapter();
    }

    setChapterData(data);

    if (data) {
      // Check if this is today's chapter
      const todayReference = getTodayChapterReference();
      setIsTodaysChapter(data.reference === todayReference);

      // Fetch context in background
      getChapterContext(data.book, data.chapter).then(ctx => setContextData(ctx));
    }

    setLoading(false);
  };

  const startQuiz = async () => {
    if (!chapterData?.text) return;


    setScore(0);
    setCurrentQuestion(0);
    setQuizFinished(false);
    setGeneratingQuiz(true);

    // Generate actual quiz from content
    const generated = await generateQuizQuestion(chapterData.text);

    if (Array.isArray(generated)) {
      setQuestions(generated);
      setShowQuiz(true);
    } else {
      setQuestions([
        { question: "¿Leíste el capítulo completo?", options: ["Sí", "No"], correctAnswer: 0 },
        { question: "¿Entendiste el mensaje?", options: ["Sí", "Más o menos"], correctAnswer: 0 },
        { question: "¿Estás listo para aplicar lo aprendido?", options: ["¡Amén!", "Quizás"], correctAnswer: 0 }
      ]);
      setShowQuiz(true);
    }

    setGeneratingQuiz(false);
  };

  const handleAnswer = (optionIndex: number) => {
    if (optionIndex === questions[currentQuestion].correctAnswer) {
      setScore(s => s + 1);
    }

    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(c => c + 1);
    } else {
      setQuizFinished(true);
      const finalScore = optionIndex === questions[currentQuestion].correctAnswer ? score + 1 : score;
      if (finalScore >= 2) {
        // Only mark as completed if perfect score
        if (finalScore === 3) {
          setQuizCompletedToday(true);
        }
        setTodayQuizScore(finalScore);

        // Emit event for real-time stats update
        window.dispatchEvent(new CustomEvent('chapterCompleted', {
          detail: { score: finalScore, reference: chapterData?.reference || "" }
        }));


        // Extract highlighted verse with AI and save
        setTimeout(async () => {
          let highlightedVerse = '';

          if (chapterData?.text && chapterData?.reference) {
            console.log('🤖 Extracting highlighted verse with AI from:', chapterData.reference);
            try {
              highlightedVerse = await extractHighlightedVerse(chapterData.text, chapterData.reference);
              console.log('✅ AI extracted verse:', highlightedVerse);
            } catch (error) {
              console.error('❌ Error extracting verse:', error);
            }
          }


          // Calculate XP based on score: 2/3 = 20 XP, 3/3 = 50 XP
          const xpEarned = finalScore === 3 ? 50 : (finalScore === 2 ? 20 : 0);

          onComplete(xpEarned, {
            type: 'quiz',
            score: finalScore,
            reference: chapterData?.reference || "",
            verse: highlightedVerse || chapterData?.text?.substring(0, 200) || ""
          });
        }, 2000);
      }
    }
  };

  if (loading) return <div className="text-white text-center p-20 animate-pulse">Cargando lectura...</div>;

  return (
    <div className="p-4 lg:p-10 animate-fade-in-up">
      {/* NAV BACK */}
      <div className="max-w-4xl mx-auto mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
          Volver al Hub
        </button>
      </div>

      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        {/* Reavivados Header Banner */}
        <section className="glass-panel p-4 rounded-xl flex items-center justify-between bg-[#1a1b26] border border-white/5 shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg text-primary">
              <span className="material-symbols-outlined">auto_stories</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Reavivados Por Su Palabra</h2>
              <p className="text-gray-400 text-sm">Lectura diaria para tu crecimiento espiritual</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </section>

        {/* Reading Header & Context */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-white text-4xl md:text-5xl font-black leading-tight tracking-[-0.02em]">
              {chapterData?.book} {chapterData?.chapter}
            </h1>
            <p className="text-[#9e9fb7] text-lg font-normal">Lectura Principal: {chapterData?.reference}</p>
          </div>

          {/* AI Context Card */}
          {contextData && (
            <div className="grid md:grid-cols-2 gap-4 animate-fade-in">
              <div className="bg-[#1c1c26] border border-[#292938] p-4 rounded-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-4xl text-gray-500">history</span>
                </div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">En el capítulo anterior</h4>
                <p className="text-sm text-gray-300 leading-relaxed italic">"{contextData.previous_summary}"</p>
              </div>
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-4xl text-primary">light_mode</span>
                </div>
                <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Estudio de hoy</h4>
                <p className="text-sm text-white leading-relaxed font-medium">"{contextData.current_preview}"</p>
              </div>
            </div>
          )}
        </section>

        {/* Text Body */}
        <section className="relative rounded-2xl overflow-hidden shadow-2xl bg-[#1a1b26] border border-white/5">
          <div className="flex items-center justify-between px-6 py-3 bg-[#14151f] border-b border-white/5">
            {/* Toolbar placeholders */}
          </div>

          <article className="p-8 md:p-12">
            <div className="font-serif text-gray-300 text-lg md:text-xl leading-8 md:leading-9 space-y-8 max-w-prose mx-auto whitespace-pre-wrap">
              {chapterData?.text}
            </div>
          </article>
        </section>

        {/* QUIZ SECTION */}
        <section className="glass-panel rounded-2xl p-6 md:p-8 shadow-lg mb-20 scroll-mt-10" id="quiz-section">
          {/* ... (Same quiz logic as before) ... */}
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-accent-gold/20 p-2 rounded-lg text-accent-gold">
              <span className="material-symbols-outlined">quiz</span>
            </div>
            <h3 className="text-xl font-bold text-white">Prueba de Comprensión</h3>
          </div>

          {!showQuiz ? (
            !quizCompletedToday ? (
              <div className="text-center py-10">
                <h4 className="text-white text-lg font-bold mb-2">¿Terminaste de leer?</h4>
                <p className="text-gray-400 mb-6">Demuestra tu conocimiento respondiendo 3 preguntas simples generadas por IA.</p>
                <button
                  onClick={startQuiz}
                  disabled={generatingQuiz}
                  className="bg-primary hover:bg-blue-600 px-8 py-3 rounded-xl text-white font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2 mx-auto"
                >
                  {generatingQuiz ? (
                    <>
                      <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Generando Preguntas...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">psychology</span>
                      Iniciar Cuestionario
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="size-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500/30">
                  <span className="material-symbols-outlined text-4xl text-green-400">check_circle</span>
                </div>
                <h4 className="text-white text-2xl font-bold mb-2">¡Cuestionario Completado!</h4>
                <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-4">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span>{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>

                {todayQuizScore !== null ? (
                  <div className="mt-6 space-y-4">
                    <div className="bg-[#1c1c26] border border-[#292938] rounded-xl p-6 max-w-md mx-auto">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-400 text-sm">Tu puntuación</span>
                        <div className="flex items-center gap-2">
                          <span className="text-3xl font-bold text-primary">{todayQuizScore}</span>
                          <span className="text-gray-500">/3</span>
                        </div>
                      </div>

                      <div className="w-full bg-[#292938] rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${todayQuizScore === 3 ? 'bg-green-500' :
                            todayQuizScore === 2 ? 'bg-yellow-500' : 'bg-orange-500'
                            }`}
                          style={{ width: `${(todayQuizScore / 3) * 100}%` }}
                        ></div>
                      </div>

                      <p className="text-gray-400 text-sm mt-4">
                        {todayQuizScore === 3 ? '¡Excelente! Dominas el contenido 🎉' :
                          todayQuizScore === 2 ? '¡Muy bien! Sigue así 👏' :
                            'Buen intento. Sigue leyendo 📖'}
                      </p>

                      {todayQuizScore < 3 && (
                        <button
                          onClick={() => {
                            setQuizCompletedToday(false);
                            setTodayQuizScore(null);
                            setShowQuiz(false);
                            setQuizFinished(false);
                            setScore(0);
                            setCurrentQuestion(0);
                          }}
                          className="mt-4 w-full bg-primary hover:bg-blue-600 px-4 py-2 rounded-lg text-white font-medium transition-all flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">refresh</span>
                          Resolver Nuevamente
                        </button>
                      )}
                    </div>

                    <p className="text-gray-500 text-sm">Vuelve mañana para un nuevo desafío</p>
                  </div>
                ) : (
                  <p className="text-gray-400 mt-4">Ya completaste el cuestionario de hoy. Vuelve mañana para más.</p>
                )}
              </div>
            )
          ) : quizFinished ? (
            <div className="text-center py-10 animate-fade-in">
              {/* User Info Card */}
              <div className="bg-gradient-to-r from-primary/10 to-blue-600/10 border border-primary/30 rounded-xl p-4 mb-6 max-w-md mx-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">person</span>
                    </div>
                    <div className="text-left">
                      <p className="text-white font-bold text-sm">@{username || 'Usuario'}</p>
                      <p className="text-gray-400 text-xs">Reavivados por Su Palabra</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-xs">
                      {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="size-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-green-400">
                <span className="material-symbols-outlined text-4xl">emoji_events</span>
              </div>
              <h4 className="text-2xl font-bold text-white mb-2">¡Cuestionario Completado!</h4>
              <p className="text-gray-400 mb-6 font-medium">
                Acertaste <span className="text-white text-xl mx-1">{score}</span> de <span className="text-white text-xl mx-1">{questions.length}</span>
              </p>

              {score >= 2 ? (
                <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 mb-4 inline-block">
                  ¡Excelente trabajo! +50 XP han sido añadidos a tu perfil.
                </div>
              ) : (
                <div className="flex flex-col gap-4 animate-shake">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300">
                    <p className="font-bold mb-1">¡No te desanimes!</p>
                    <p className="text-sm opacity-90">Necesitas al menos 2 aciertos.</p>
                  </div>
                  <button
                    onClick={() => { setShowQuiz(false); }}
                    className="text-white bg-white/10 hover:bg-white/20 px-6 py-2 rounded-lg transition-all flex items-center justify-center gap-2 mx-auto mt-2"
                  >
                    Intentar de nuevo
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs font-bold text-gray-500">PREGUNTA {currentQuestion + 1}/{questions.length}</span>
                <div className="flex-1 h-2 bg-[#292938] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              <h4 className="text-xl md:text-2xl font-bold text-white mb-8 leading-snug">
                {questions[currentQuestion].question}
              </h4>
              <div className="grid gap-3">
                {questions[currentQuestion].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className="group text-left p-4 rounded-xl border border-[#292938] bg-[#1c1c26] hover:bg-[#292938] hover:border-primary/50 transition-all active:scale-[0.99] flex items-center gap-4"
                  >
                    <div className="size-8 rounded-full bg-[#292938] group-hover:bg-primary group-hover:text-white text-gray-400 flex items-center justify-center font-bold text-sm transition-colors border border-white/5">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-gray-300 group-hover:text-white">{option}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ReadingRoom;
