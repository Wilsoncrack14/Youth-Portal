import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { generateQuizQuestion, getChapterContext } from '../services/ai';
import { fetchDailyChapter, BIBLE_BOOKS_List, getTodayChapterReference, START_DATE } from '@/services/biblePlan';
import { supabase } from '../services/supabase';
import { extractHighlightedVerse } from '../services/dailyVerse';

interface ReadingRoomProps {
  onComplete: (xp: number, data?: { type: 'quiz'; score: number; reference: string }) => void;
}

const getTodayDayName = () => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
};

const formatBibleText = (text: string) => {
  if (!text) return null;

  // Split by verse numbers like [1], [2], etc.
  // The regex captures the number so we can use it in the map
  const parts = text.split(/\[(\d+)\]/);

  return (
    <div className="space-y-4">
      {parts.map((part, index) => {
        // If the part is a number (from the capture group), render it as superscript
        // Note: split with capture group returns: [text, capture, text, capture...]
        // So odd indices are the captured numbers, even indices are the text content.

        // HOWEVER, we want to group the number with its following text.
        // Let's reorganize.

        // Actually, a simpler way for React rendering:
        if (part.match(/^\d+$/)) {
          // It's a verse number
          return <sup key={index} className="text-xs text-primary font-bold mr-1 select-none">{part}</sup>;
        } else if (part.trim() === "") {
          return null;
        } else {
          // It's text
          return <span key={index} className="leading-relaxed hover:bg-gray-100 dark:hover:bg-white/5 transition-colors rounded px-0.5">{part}</span>;
        }
      })}
    </div>
  );
};



const ReadingRoom: React.FC<ReadingRoomProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'hub' | 'read'>('hub');
  const [readingData, setReadingData] = useState<{ book: string; chapter: number; date: Date } | null>(null);

  // Reset reading data when going back to hub
  const handleBack = () => {
    setViewMode('hub');
    setReadingData(null);
  };

  return (
    <div className="animate-fade-in-up h-full">
      {viewMode === 'read' ? (
        <ReadingView
          onComplete={onComplete}
          onBack={handleBack}
          readingData={readingData}
        />
      ) : (
        <ReavivadosHub
          onRead={() => setViewMode('read')}
          onReadData={setReadingData}
        />
      )}
    </div>
  );
};

// --- SUB-COMPONENTS ---

const ReavivadosHub: React.FC<{ onRead: () => void; onReadData: (data: any) => void }> = ({ onRead, onReadData }) => {
  const [dailyReading, setDailyReading] = useState<{ book: string; chapter: number; text: string; reference: string } | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<boolean[]>(new Array(7).fill(false));
  const [completedCount, setCompletedCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false); // State for full history modal
  const [completedReadings, setCompletedReadings] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDailyChapter().then(setDailyReading);
    fetchDailyChapter().then(setDailyReading);
    fetchWeeklyProgress();
    fetchWeeklyProgress();
  }, []);

  const fetchWeeklyProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      // Adjust to Sabbath School Week (Sat -> Fri)
      // JS Day: 0=Sun, 1=Mon, ..., 6=Sat
      const dayOfWeek = today.getDay();
      // Calculate inputs relative to Sat=0, Sun=1, etc.
      // If Today is Sat (6) -> 0
      // If Today is Sun (0) -> 1
      // Formula: (day + 1) % 7
      const diffToSaturday = (dayOfWeek + 1) % 7;

      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - diffToSaturday);
      startOfWeek.setHours(0, 0, 0, 0);

      const { data: readings, error } = await supabase
        .from('daily_readings')
        .select('created_at, reflection')
        .eq('user_id', user.id)
        .gte('created_at', startOfWeek.toISOString());

      if (error) throw error;

      const progress = new Array(7).fill(false);

      if (readings) {
        readings.forEach((reading) => {
          const readingDate = new Date(reading.created_at);
          const rDay = readingDate.getDay();
          // Map JS Day to our Index (Sat=0)
          const mappedIndex = (rDay + 1) % 7;

          let isPassed = false;
          if (reading.reflection && typeof reading.reflection === 'string') {
            const scoreMatch = reading.reflection.match(/score:\s*(\d+)/);
            if (scoreMatch) {
              const score = parseInt(scoreMatch[1]);
              if (score >= 2) isPassed = true;
            }
          }

          if (isPassed && mappedIndex >= 0 && mappedIndex <= 6) {
            progress[mappedIndex] = true;
          }
        });
      }

      setWeeklyProgress(progress);
      setCompletedCount(progress.filter(Boolean).length);

    } catch (err) {
      console.error("Error fetching weekly progress:", err);
    }
  };


  // Week starts on Saturday (Sabbath) -> Friday
  const days = ['S', 'D', 'L', 'M', 'M', 'J', 'V'];
  // Current Day Index relative to [Sat, Sun, Mon...]
  // Sat(6)->0, Sun(0)->1 ... Fri(5)->6
  const currentDayIndex = (new Date().getDay() + 1) % 7;


  // Calculate past readings dynamically
  const getRecentReadings = () => {
    const readings = [];
    const today = new Date();
    // Show last 4 days
    for (let i = 1; i <= 4; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ref = getTodayChapterReference(d);
      if (ref) {
        const refString = `${ref.book} ${ref.chapter}`;
        const normalizedRef = refString.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        readings.push({
          ...ref,
          reference: refString,
          displayDate: d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
          isCompleted: completedReadings.has(normalizedRef)
        });
      }
    }
    return readings;
  };

  const recentReadings = getRecentReadings();

  const getAllPastReadings = () => {
    const readings = [];
    const today = new Date();
    let current = new Date(today);
    current.setDate(current.getDate() - 1); // Start from yesterday

    while (current >= START_DATE) {
      const ref = getTodayChapterReference(new Date(current));
      if (ref) {
        // Construct reference string since ref.reference might be missing
        const refString = `${ref.book} ${ref.chapter}`;
        const normalizedRef = refString.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        readings.push({
          ...ref,
          reference: refString, // Ensure reference property exists
          date: new Date(current),
          displayDate: current.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
          fullDate: current.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          isCompleted: completedReadings.has(normalizedRef)
        });
      }
      current.setDate(current.getDate() - 1);
    }
    return readings;
  };



  const fetchHistoryStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('daily_readings')
        .select('reference, reflection')
        .eq('user_id', user.id);

      if (data) {
        const completed = new Set<string>();
        data.forEach(r => {
          if (r.reference) {
            const normalized = r.reference.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            completed.add(normalized);
          }
        });
        console.log("Fetched history status:", completed); // Debug log
        setCompletedReadings(completed);
      }
    } catch (e) {
      console.error("Error fetching history status", e);
    }
  };

  useEffect(() => {
    if (showHistory) {
      fetchHistoryStatus();
    }
  }, [showHistory]);

  // Initial fetch to ensure recent readings have correct status
  useEffect(() => {
    fetchHistoryStatus();
  }, []);

  const allHistory = showHistory ? getAllPastReadings() : [];

  const handleReadingClick = (reading: any) => {
    // It's a past reading
    onReadData({
      book: reading.book,
      chapter: reading.chapter,
      date: reading.date // Pass the explicit date!
    });
    onRead();
  };

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
            Lectura Diaria
          </h1>
          <p className="text-lg text-blue-100 mb-8 opacity-90">
            Conecta con Dios cada día a través de la lectura diaria de la Biblia.
          </p>
        </div>
      </div>

      {/* WEEKLY PROGRESS */}
      <div className="bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-sm dark:shadow-none">
        <h3 className="font-serif text-2xl font-bold text-gray-900 dark:text-white mb-6">Progreso Semanal</h3>
        <div className="flex justify-between items-center max-w-3xl mx-auto">
          {days.map((d, i) => {
            // Logic:
            // If we have a record for this day (weeklyProgress[i] is true) -> COMPLETED
            // If not completed AND it is today -> ACTIVE
            // If not completed AND it is past -> MISSED (Gray outline or Red dot?) -> Let's keep it simple: just empty
            // If future -> UPCOMING

            const isDone = weeklyProgress[i];
            const isToday = i === currentDayIndex;
            const isPast = i < currentDayIndex;

            let status = 'upcoming';
            if (isDone) {
              status = 'completed';
            } else if (isToday) {
              status = 'active';
            } else if (isPast) {
              status = 'missed';
            }

            return (
              <div key={i} className="flex flex-col items-center gap-3">
                <span className="text-xs font-bold text-gray-500">{d}</span>
                <div
                  className={`size-10 md:size-12 rounded-full flex items-center justify-center border-2 transition-all 
                    ${status === 'completed' ? 'bg-accent-gold border-accent-gold text-black shadow-lg shadow-yellow-500/20' :
                      status === 'active' ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110' :
                        status === 'missed' ? 'bg-transparent border-gray-300 dark:border-gray-600' :
                          'bg-gray-100 dark:bg-[#292938] border-gray-200 dark:border-[#3d3d52]'
                    }`}
                >
                  {status === 'completed' && <span className="material-symbols-outlined font-bold">check</span>}
                  {status === 'active' && <span className="material-symbols-outlined">play_arrow</span>}
                  {status === 'missed' && <span className="size-2 bg-red-400 rounded-full"></span>}
                  {status === 'upcoming' && <span className="size-2 bg-gray-500 rounded-full opacity-50"></span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex justify-between items-center text-sm text-gray-400 px-4">
          <span>{Math.round((completedCount / 7) * 100)}% Completado</span>
          <span className="text-accent-gold font-bold">{completedCount > 0 ? "¡Vas bien!" : "¡Comienza hoy!"}</span>
        </div>
      </div>



      {/* CONTENT */}
      <div>
        {/* TODAY'S READING CARD */}
        <div className="bg-[#fffbf0] dark:bg-[#1a1b26] border border-white/5 rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-black/20 to-transparent pointer-events-none"></div>

          <div className="max-w-2xl relative z-10 animate-fade-in">
            <span className="text-gray-500 font-bold text-sm mb-2 block">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <h2 className="text-4xl font-serif font-black text-gray-900 dark:text-white mb-4 capitalize">
              {dailyReading ? dailyReading.reference : "Cargando..."}
            </h2>
            <div className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-8 line-clamp-3">
              {dailyReading ? formatBibleText(dailyReading.text.substring(0, 200) + '...') : "Preparando la lectura de hoy..."}
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  onReadData(null); // Today
                  onRead();
                }}
                className="bg-accent-gold hover:bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition-transform active:scale-95 shadow-lg"
              >
                <span className="material-symbols-outlined">auto_stories</span>
                Leer Capítulo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT READINGS LIST */}
      <div className="grid gap-4">
        <h3 className="font-bold text-gray-400 text-sm uppercase tracking-widest ml-1">Lecturas Recientes</h3>
        {recentReadings.map((reading, idx) => (
          <div
            key={idx}
            onClick={() => {
              // Determine date for thsi recent reading
              // getRecentReadings generates them: [today-1, today-2...]
              const d = new Date();
              d.setDate(d.getDate() - (idx + 1));
              const ref = getTodayChapterReference(d);
              if (ref) {
                // Pass the full reference object correctly
                const refString = `${ref.book} ${ref.chapter}`;
                handleReadingClick({ ...reading, reference: refString, date: d });
              }
            }}
            className="cursor-pointer bg-white dark:bg-[#14151f] hover:bg-gray-50 dark:hover:bg-[#1a1b26] border border-gray-200 dark:border-white/5 rounded-xl p-4 flex items-center justify-between transition-colors group shadow-sm dark:shadow-none"
          >
            <div className="flex items-center gap-4">
              <div className={`size-10 rounded-lg flex items-center justify-center transition-colors ${reading.isCompleted
                ? 'bg-green-500/10 text-green-500'
                : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                }`}>
                <span className="material-symbols-outlined">{reading.isCompleted ? 'check' : 'auto_stories'}</span>
              </div>
              <div>
                <p className="text-gray-900 dark:text-white font-serif font-bold text-lg capitalize">{reading.book} {reading.chapter}</p>
                <p className="text-gray-500 text-xs capitalize">{reading.displayDate}</p>
              </div>
            </div>
            {reading.isCompleted ? (
              <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">Completado</span>
            ) : (
              <span className="text-gray-500 text-sm font-bold opacity-50 group-hover:opacity-100 transition-opacity">+10 pts</span>
            )}
          </div>
        ))}
      </div>

      {/* SHOW ALL HISTORY BUTTON */}
      <div className="flex justify-center -mt-4">
        <button
          onClick={() => setShowHistory(true)}
          className="text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white text-sm font-bold flex items-center gap-2 transition-colors px-4 py-2"
        >
          <span className="material-symbols-outlined">history</span>
          Ver historial completo
        </button>
      </div>

      {/* HISTORY MODAL (Portal) */}
      {showHistory && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#1e1e2d] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#1e1e2d] rounded-t-2xl z-10">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history_edu</span>
                Historial de Lecturas
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* List */}
            <div className="p-4 overflow-y-auto space-y-3">
              {allHistory.length > 0 ? (
                allHistory.map((reading, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      handleReadingClick(reading);
                      setShowHistory(false);
                    }}
                    className="cursor-pointer bg-gray-50 dark:bg-[#14151f] hover:bg-blue-50 dark:hover:bg-primary/20 hover:border-blue-200 dark:hover:border-primary/50 border border-transparent rounded-xl p-4 flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`size-10 rounded-full flex items-center justify-center transition-colors ${reading.isCompleted
                        ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                        : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 group-hover:bg-primary group-hover:text-white'
                        }`}>
                        <span className="material-symbols-outlined">{reading.isCompleted ? 'check' : 'auto_stories'}</span>
                      </div>
                      <div>
                        <p className="text-gray-900 dark:text-white font-serif font-bold text-lg capitalize">{reading.book} {reading.chapter}</p>
                        <p className="text-gray-500 text-xs capitalize">{reading.fullDate}</p>
                      </div>
                    </div>
                    {reading.isCompleted && (
                      <span className="text-xs font-bold bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-1 rounded">
                        Completado
                      </span>
                    )}
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full mb-1">+10 XP</span>
                      <span className="text-xs text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">Leer ahora</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-500">
                  No hay historial disponible aún.
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* TIPS */}
      <div className="bg-white dark:bg-[#1a1b26] border border-orange-500/20 rounded-2xl p-6 md:p-8 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">💡</span>
          <h3 className="font-serif text-xl font-bold text-gray-900 dark:text-white">Consejos para tu estudio</h3>
        </div>
        <ul className="space-y-3 text-gray-600 dark:text-gray-400">
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

const ReadingView: React.FC<{
  onComplete: (xp: number, data?: any) => void;
  onBack: () => void;
  readingData: { book: string; chapter: number; date: Date } | null;
}> = ({ onComplete, onBack, readingData }) => {
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isTodaysChapter, setIsTodaysChapter] = useState(true); // Track if this is today's chapter
  const [isCatchUp, setIsCatchUp] = useState(false);

  // set isCatchUp if readingData.date is not today
  useEffect(() => {
    if (readingData?.date) {
      const today = new Date();
      const rDate = new Date(readingData.date);
      const isSameDay = today.getDate() === rDate.getDate() &&
        today.getMonth() === rDate.getMonth() &&
        today.getFullYear() === rDate.getFullYear();
      setIsCatchUp(!isSameDay);
    } else {
      setIsCatchUp(false);
    }
  }, [readingData]);

  // Reading State
  const [chapterData, setChapterData] = useState<{ reference: string; text: string; book: string; chapter: number } | null>(null);
  const [contextData, setContextData] = useState<{ previous_summary: string; current_preview: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if navigation state has book and chapter
    const state = location.state as { book?: string; chapter?: number } | null;

    const loadContent = async () => {
      setLoading(true);
      try {
        if (readingData) {
          // Priority to explicit readingData passed from Hub (History/Catchup)
          await loadReading(readingData.book, readingData.chapter);
        } else if (state?.book && state?.chapter) {
          // Routing state fallback
          await loadReading(state.book, state.chapter);
        } else {
          // Default to today
          await loadReading();
        }
      } catch (e) { console.error(e) }
      setLoading(false);
    };

    loadContent();
    fetchUserProfile();
  }, [location.state, readingData]);

  // Check quiz completion when chapter data changes
  useEffect(() => {
    if (chapterData) {
      checkQuizCompletion();
    }
  }, [chapterData]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();

        if (profile?.username) {
          setUsername(profile.username);
        } else {
          setUsername(user.email?.split('@')[0] || 'Usuario');
        }
        if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
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
        // .gte('created_at', today) // Removed to check ALL history
        .order('created_at', { ascending: false }) // Get the LATEST attempt
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

    try {
      // Fetch chapter data and context in parallel
      const chapterPromise = book && chapter
        ? fetchDailyChapter(book, chapter)
        : fetchDailyChapter();

      const data = await chapterPromise;

      if (data) {
        // VALIDATION: Prevent future readings
        // Compare indexes to check if it's future
        const todayRef = getTodayChapterReference();
        const targetBookIndex = BIBLE_BOOKS_List.indexOf(data.book);
        const todayBookIndex = BIBLE_BOOKS_List.indexOf(todayRef.book);

        let isFuture = false;
        if (targetBookIndex !== -1 && todayBookIndex !== -1) {
          if (targetBookIndex > todayBookIndex) isFuture = true;
          else if (targetBookIndex === todayBookIndex && data.chapter > todayRef.chapter) isFuture = true;
        }

        if (isFuture) {
          alert("No puedes acceder a lecturas futuras.");
          onBack();
          return;
        }

        // Start context fetch immediately while setting chapter data
        const contextPromise = getChapterContext(data.book, data.chapter);

        // Set chapter data immediately
        setChapterData(data);

        // Check if this is today's chapter
        // Re-use todayRef calculated above
        const todayReference = `${todayRef.book} ${todayRef.chapter} `;
        setIsTodaysChapter(data.reference === todayReference);

        // Wait for context and set it (happens in parallel with render)
        contextPromise.then(ctx => setContextData(ctx)).catch(err => {
          console.error('Error loading context:', err);
        });
      }
    } catch (error) {
      console.error('Error loading reading:', error);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    const textContent = chapterData?.text;
    if (!textContent) return;


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

        // VALIDATION: Prevent duplicate XP if already completed today
        if (quizCompletedToday) {
          // User already completed it previously (score >= 2), checking if they are just retaking it?
          // Actually `quizCompletedToday` is set if score >= 2 in checkQuizCompletion.
          // If so, we should NOT award XP again.
          // We can show a toast or just skip onComplete logic for XP.
          return;
        }

        // Simplify: Just save the score as the "verse" (or a summary) since user requested it.
        const summary = `Cuestionario completado: ${finalScore}/${questions.length} aciertos.`;

        // Calculate XP
        // Re-verify catch-up status at moment of completion to ensure accuracy
        let isCatchUpReading = false;
        if (readingData?.date) {
          const today = new Date();
          const rDate = new Date(readingData.date);
          const isSameDay = today.getDate() === rDate.getDate() &&
            today.getMonth() === rDate.getMonth() &&
            today.getFullYear() === rDate.getFullYear();
          isCatchUpReading = !isSameDay;
        }

        let xpEarned = 0;
        if (isCatchUpReading) {
          xpEarned = 10;
        } else {
          xpEarned = finalScore === 3 ? 50 : (finalScore === 2 ? 20 : 0);
        }

        onComplete(xpEarned, {
          type: 'quiz',
          score: finalScore,
          reference: chapterData?.reference || "",
          verse: summary, // Use summary instead of AI verse
          date: readingData?.date, // Pass the date if catchup
          isCatchUp: isCatchUpReading
        });
      }
    }
  };

  if (loading) return <div className="text-white text-center p-20 animate-pulse">Cargando lectura...</div>;

  return (
    <div className="p-4 lg:p-10 animate-fade-in-up">
      {/* NAV BACK */}
      <div className="max-w-4xl mx-auto mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
          Volver al Hub
        </button>
      </div>

      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        {/* Reavivados Header Banner */}
        {/* Reavivados Header Banner */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e1e2d] to-[#16161f] border border-white/5 shadow-2xl p-6">
          {/* Decorative Background Icon */}
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] pointer-events-none">
            <span className="material-symbols-outlined text-[150px]">auto_stories</span>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600/20 p-3 rounded-xl text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30">
                <span className="material-symbols-outlined text-3xl">auto_stories</span>
              </div>
              <div>
                <h2 className="text-white font-black text-xl md:text-2xl leading-tight tracking-tight">Reavivados Por Su Palabra</h2>
                <p className="text-gray-400 text-sm font-medium mt-1">Lectura diaria para tu crecimiento espiritual</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 text-gray-300 text-sm font-bold shadow-sm self-start md:self-auto">
              <span className="material-symbols-outlined text-blue-400 text-lg">calendar_today</span>
              <span>{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </section>

        {/* Reading Header & Context */}
        <section className="flex flex-col gap-6">
          {loading || !chapterData ? (
            // Skeleton Loader for Header
            <div className="flex flex-col gap-2 animate-pulse">
              <div className="h-12 md:h-14 w-72 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-5 w-64 bg-gray-200 dark:bg-gray-600 rounded"></div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <h1 className="text-gray-900 dark:text-white text-4xl md:text-5xl font-black leading-tight tracking-[-0.02em] capitalize">
                {chapterData?.book} {chapterData?.chapter}
              </h1>
              <p className="text-gray-500 dark:text-[#9e9fb7] text-lg font-normal">Lectura Principal: <span className="capitalize">{chapterData?.reference}</span></p>
            </div>
          )}

          {/* AI Context Card */}
          <div className="grid md:grid-cols-2 gap-4">
            {contextData ? (
              <>
                <div className="bg-gray-100 dark:bg-[#1c1c26] border border-gray-200 dark:border-[#292938] p-4 rounded-lg relative overflow-hidden group animate-fade-in">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-4xl text-gray-500">history</span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">En el capítulo anterior</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">"{contextData.previous_summary}"</p>
                </div>
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg relative overflow-hidden group animate-fade-in">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-4xl text-primary">light_mode</span>
                  </div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Estudio de hoy</h4>
                  <p className="text-sm text-gray-900 dark:text-white leading-relaxed font-medium">"{contextData.current_preview}"</p>
                </div>
              </>
            ) : (
              <>
                {/* Skeleton Loaders */}
                <div className="bg-gray-100 dark:bg-[#1c1c26] border border-gray-200 dark:border-[#292938] p-4 rounded-lg animate-pulse">
                  <div className="h-3 w-32 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
                  </div>
                </div>
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg animate-pulse">
                  <div className="h-3 w-24 bg-primary/30 rounded mb-2"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-primary/30 rounded w-full"></div>
                    <div className="h-4 bg-primary/30 rounded w-4/5"></div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Text Body */}
        <section className="relative rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/5">
          <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-[#14151f] border-b border-gray-200 dark:border-white/5">
            {/* Toolbar placeholders */}
          </div>

          <article className="p-8 md:p-12">
            {loading || !chapterData?.text ? (
              <div className="max-w-prose mx-auto space-y-6 animate-pulse">{/* Skeleton Loader for Bible Text */}
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-11/12"></div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="font-serif text-gray-800 dark:text-gray-300 text-lg md:text-xl leading-8 md:leading-9 space-y-8 max-w-prose mx-auto whitespace-pre-wrap">
                {formatBibleText(chapterData.text)}
              </div>
            )}
          </article>
        </section>

        {/* QUIZ SECTION */}
        <section className="glass-panel bg-white dark:bg-[#1e1e2d]/60 rounded-2xl p-6 md:p-8 shadow-lg mb-20 scroll-mt-10" id="quiz-section">
          {/* ... (Same quiz logic as before) ... */}
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-accent-gold/20 p-2 rounded-lg text-accent-gold">
              <span className="material-symbols-outlined">quiz</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Prueba de Comprensión</h3>
          </div>

          {!showQuiz ? (
            !quizCompletedToday ? (
              <div className="text-center py-10">
                <h4 className="text-gray-900 dark:text-white text-lg font-bold mb-2">¿Terminaste de leer?</h4>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Demuestra tu conocimiento respondiendo 3 preguntas simples generadas por IA.</p>
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
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-primary/10 dark:to-blue-600/10 border border-blue-100 dark:border-primary/30 rounded-xl p-4 mb-6 max-w-md mx-auto shadow-sm dark:shadow-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-full bg-cover bg-center border-2 border-primary/20 bg-gray-200 overflow-hidden"
                        style={{ backgroundImage: avatarUrl ? `url('${avatarUrl}')` : `url('https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}&background=4b4ee7&color=fff')` }}
                      ></div>
                      <div className="text-left">
                        <h3 className="text-gray-900 dark:text-white font-bold text-sm">@{username || 'Usuario'}</h3>
                        <p className="text-primary dark:text-blue-200 text-xs font-medium">Reavivados por Su Palabra</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                        {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="size-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500/30">
                  <span className="material-symbols-outlined text-4xl text-green-500 dark:text-green-400">check_circle</span>
                </div>
                <h4 className="text-gray-900 dark:text-white text-2xl font-bold mb-2">¡Cuestionario Completado!</h4>
                <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-4">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span>{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>

                {todayQuizScore !== null ? (
                  <div className="mt-6 space-y-4">
                    <div className="bg-gray-100 dark:bg-[#1c1c26] border border-gray-200 dark:border-[#292938] rounded-xl p-6 max-w-md mx-auto">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">Tu puntuación</span>
                        <div className="flex items-center gap-2">
                          <span className="text-3xl font-bold text-primary">{todayQuizScore}</span>
                          <span className="text-gray-500">/3</span>
                        </div>
                      </div>

                      <div className="w-full bg-gray-200 dark:bg-[#292938] rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${todayQuizScore === 3 ? 'bg-green-500' :
                            todayQuizScore === 2 ? 'bg-yellow-500' : 'bg-orange-500'
                            }`}
                          style={{ width: `${(todayQuizScore / 3) * 100}%` }}
                        ></div>
                      </div>

                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">
                        {todayQuizScore === 3 ? '¡Excelente! Dominas el contenido 🎉' :
                          todayQuizScore === 2 ? '¡Muy bien! Sigue así 👏' :
                            'Buen intento. Sigue leyendo 📖'}
                      </p>

                      {todayQuizScore < 2 && (
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
                          Intentar Nuevamente
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 mt-4">
                      <p className="text-gray-500 text-sm">Vuelve mañana para un nuevo desafío</p>
                      <button
                        onClick={() => navigate('/rankings')}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-lg w-full"
                      >
                        <span className="material-symbols-outlined">trophy</span>
                        Ir al Salón de Talentos
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 mt-4">Ya completaste el cuestionario de hoy. Vuelve mañana para más.</p>
                )}
              </div>
            )
          ) : quizFinished ? (
            <div className="text-center py-10 animate-fade-in">
              {/* User Info Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-primary/10 dark:to-blue-600/10 border border-blue-100 dark:border-primary/30 rounded-xl p-4 mb-6 max-w-md mx-auto shadow-sm dark:shadow-none">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-cover bg-center border-2 border-primary/20 bg-gray-200 overflow-hidden"
                      style={{ backgroundImage: avatarUrl ? `url('${avatarUrl}')` : `url('https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}&background=4b4ee7&color=fff')` }}
                    ></div>
                    <div className="text-left">
                      <h3 className="text-gray-900 dark:text-white font-bold text-sm">@{username || 'Usuario'}</h3>
                      <p className="text-primary dark:text-blue-200 text-xs font-medium">Reavivados por Su Palabra</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                      {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="size-20 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-400">
                <span className="material-symbols-outlined text-4xl">emoji_events</span>
              </div>
              <h4 className="text-2xl font-black text-gray-900 dark:text-white mb-2">¡Cuestionario Completado!</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium text-lg">
                Acertaste <span className="text-gray-900 dark:text-white font-black text-xl mx-1">{score}</span> de <span className="text-gray-900 dark:text-white font-black text-xl mx-1">{questions.length}</span>
              </p>

              {score >= 2 ? (
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30 rounded-lg text-green-800 dark:text-green-300 mb-2 inline-block font-bold">
                    ¡Excelente trabajo! +{isCatchUp ? 10 : (score === 3 ? 50 : 20)} XP han sido añadidos a tu perfil.
                  </div>

                  <button
                    onClick={() => navigate('/rankings')}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-lg mx-auto mb-2"
                  >
                    <span className="material-symbols-outlined">trophy</span>
                    Ir al Salón de Talentos
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 animate-shake">
                  <div className="p-4 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-800 dark:text-red-300">
                    <p className="font-bold mb-1">¡No te desanimes!</p>
                    <p className="text-sm opacity-90">Necesitas al menos 2 aciertos.</p>
                  </div>
                  <button
                    onClick={() => { setShowQuiz(false); }}
                    className="text-gray-600 dark:text-white bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 px-6 py-2 rounded-lg transition-all flex items-center justify-center gap-2 mx-auto mt-2 font-bold"
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
                <div className="flex-1 h-2 bg-gray-200 dark:bg-[#292938] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              <h4 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-8 leading-snug">
                {questions[currentQuestion].question}
              </h4>
              <div className="grid gap-3">
                {questions[currentQuestion].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className="group text-left p-4 rounded-xl border border-gray-200 dark:border-[#292938] bg-white dark:bg-[#1c1c26] hover:bg-gray-50 dark:hover:bg-[#292938] hover:border-primary/50 transition-all active:scale-[0.99] flex items-center gap-4"
                  >
                    <div className="size-8 rounded-full bg-gray-100 dark:bg-[#292938] group-hover:bg-primary group-hover:text-white text-gray-400 flex items-center justify-center font-bold text-sm transition-colors border border-gray-200 dark:border-white/5">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{option}</span>
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
