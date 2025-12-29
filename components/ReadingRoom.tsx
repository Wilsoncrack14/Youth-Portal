import React, { useState, useEffect } from 'react';
import { analyzeReflection } from '../services/gemini';
import { fetchDailyChapter, BIBLE_BOOKS_List } from '@/services/biblePlan';

interface ReadingRoomProps {
  onComplete: (xp: number, data?: { reflection: string; verse: string; reference: string }) => void;
}

const ReadingRoom: React.FC<ReadingRoomProps> = ({ onComplete }) => {
  const [reflection, setReflection] = useState('');
  const [feedback, setFeedback] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const [chapterData, setChapterData] = useState<{ reference: string; text: string; book: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Manual Selection State - Initialize empty, will be populated by daily reading
  const [searchBook, setSearchBook] = useState("");
  const [searchChapter, setSearchChapter] = useState(0);

  useEffect(() => {
    loadReading();
  }, []);

  const loadReading = async (book?: string, chapter?: number) => {
    setLoading(true);

    let data;
    // Specific search
    if (book && chapter) {
      data = await fetchDailyChapter(book, chapter);
    } else {
      // Default to daily reading if no args provided (initial load)
      data = await fetchDailyChapter();
    }

    setChapterData(data);

    // Sync search inputs with loaded data
    if (data) {
      setSearchBook(data.book);
      setSearchChapter(data.chapter);
    }

    setLoading(false);
  };

  const handleSearch = () => {
    loadReading(searchBook, searchChapter);
  }

  const handleRegister = async () => {
    if (reflection.length < 50 || selectedOption === null) return;

    setAnalyzing(true);
    // Use gemini for analysis only if available, otherwise just mock success
    // Start with quick feedback for now since user wants free mostly
    const result = await analyzeReflection(reflection);
    setFeedback(result || '¡Gran trabajo!');
    setAnalyzing(false);

    setTimeout(() => {
      onComplete(50, {
        reflection,
        verse: chapterData?.text?.substring(0, 100) + "..." || "",
        reference: chapterData?.reference || "Lectura Diaria"
      });
    }, 2000);
  };

  if (loading) return <div className="text-white text-center p-20 animate-pulse">Cargando lectura...</div>;

  return (
    <div className="p-4 lg:p-10 animate-fade-in-up">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        {/* Selector Section */}
        <section className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between bg-[#1a1b26] border border-white/5 shadow-md">
          <div className="flex gap-4 flex-wrap items-center">
            <select
              value={searchBook}
              onChange={(e) => setSearchBook(e.target.value)}
              className="bg-[#14151f] text-white border border-[#292938] rounded-lg p-2 focus:ring-1 focus:ring-primary outline-none"
            >
              {BIBLE_BOOKS_List.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              max="150"
              value={searchChapter}
              onChange={(e) => setSearchChapter(Number(e.target.value))}
              className="bg-[#14151f] text-white border border-[#292938] rounded-lg p-2 w-20 focus:ring-1 focus:ring-primary outline-none"
            />
            <button
              onClick={handleSearch}
              className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">search</span>
              Buscar
            </button>
          </div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
            <span className="bg-primary/10 px-2 py-1 rounded">Reavivados</span>
            <span>•</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </section>

        {/* Lesson Header */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">

            {/* Removed date header from here since moved up or redundant */}
            <h1 className="text-white text-4xl md:text-5xl font-black leading-tight tracking-[-0.02em]">
              {chapterData?.book}
            </h1>
            <p className="text-[#9e9fb7] text-lg font-normal">Lectura Principal: {chapterData?.reference}</p>
          </div>
        </section>

        {/* Text Area */}
        <section className="relative rounded-2xl overflow-hidden shadow-2xl bg-[#1a1b26] border border-white/5">
          <div className="flex items-center justify-between px-6 py-3 bg-[#14151f] border-b border-white/5">
            <button className="text-[#9e9fb7] hover:text-white flex items-center gap-2 text-xs font-medium uppercase tracking-widest transition-colors">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Anterior
            </button>
            <div className="flex gap-3">
              <button className="p-2 text-[#9e9fb7] hover:text-white rounded-lg transition-colors"><span className="material-symbols-outlined">text_decrease</span></button>
              <button className="p-2 text-[#9e9fb7] hover:text-white rounded-lg transition-colors"><span className="material-symbols-outlined">text_increase</span></button>
              <button className="p-2 text-[#9e9fb7] hover:text-white rounded-lg transition-colors"><span className="material-symbols-outlined">bookmark</span></button>
            </div>
          </div>

          <article className="p-8 md:p-12">
            <div className="font-serif text-gray-300 text-lg md:text-xl leading-8 md:leading-9 space-y-8 max-w-prose mx-auto whitespace-pre-wrap">
              {chapterData?.text}
            </div>
          </article>
        </section>

        {/* Validation Section */}
        <section className="glass-panel rounded-2xl p-6 md:p-8 shadow-lg mb-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary/20 p-2 rounded-lg text-primary">
              <span className="material-symbols-outlined">Escuela</span>
            </div>
            <h3 className="text-xl font-bold text-white">Validación de tu estudio</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-baseline">
                <label className="text-sm font-medium text-white">Tu Reflexión</label>
                <span className="text-xs text-[#9e9fb7]">Mínimo 50 caracteres ({reflection.length})</span>
              </div>
              <textarea
                className="w-full bg-[#1c1c26] border border-[#292938] rounded-xl p-4 text-gray-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all resize-none h-40"
                placeholder="¿Qué te habló Dios en este capítulo?"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-4">
              <span className="text-sm font-medium text-white">Confirmación</span>
              <div className="bg-[#1c1c26] border border-[#292938] rounded-xl p-5 flex flex-col gap-4">
                <p className="text-gray-200 font-medium">He leído el capítulo completo de hoy.</p>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 1, label: 'Sí, lo leí completo' },
                    { id: 0, label: 'Aún no' },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`relative flex items-center p-3 rounded-lg border transition-all cursor-pointer ${selectedOption === opt.id
                        ? 'border-primary bg-primary/5 text-white'
                        : 'border-[#3d3d52] hover:bg-[#2a2a35] text-gray-400'
                        }`}
                    >
                      <input
                        type="radio"
                        name="trivia"
                        className="peer h-4 w-4 text-primary bg-transparent"
                        checked={selectedOption === opt.id}
                        onChange={() => setSelectedOption(opt.id)}
                      />
                      <span className="ml-3 text-sm">{opt.label}</span>
                      {selectedOption === opt.id && <span className="material-symbols-outlined absolute right-3 text-primary text-lg">check_circle</span>}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#292938] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-[#9e9fb7]">
              {feedback ? (
                <p className="text-green-400 animate-pulse">{feedback}</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {reflection.length < 50 && (
                    <span className="text-red-400 text-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">error</span>
                      Escribe {50 - reflection.length} caracteres más
                    </span>
                  )}
                  {selectedOption === null && (
                    <span className="text-red-400 text-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">error</span>
                      Confirma tu lectura
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleRegister}
              disabled={analyzing || reflection.length < 50 || selectedOption === null}
              className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {analyzing ? 'Analizando...' : 'Registrar Estudio'}
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">+50 XP</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ReadingRoom;
