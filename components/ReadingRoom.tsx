
import React, { useState, useEffect } from 'react';
import { analyzeReflection } from '../services/gemini';

interface ReadingRoomProps {
  onComplete: (xp: number) => void;
}

const ReadingRoom: React.FC<ReadingRoomProps> = ({ onComplete }) => {
  const [reflection, setReflection] = useState('');
  const [feedback, setFeedback] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const handleRegister = async () => {
    if (reflection.length < 50 || selectedOption === null) return;
    
    setAnalyzing(true);
    const result = await analyzeReflection(reflection);
    setFeedback(result || '¡Gran trabajo!');
    setAnalyzing(false);
    
    setTimeout(() => {
      onComplete(50);
    }, 3000);
  };

  return (
    <div className="p-4 lg:p-10 animate-fade-in-up">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        {/* Lesson Header */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
              <span className="bg-primary/10 px-2 py-1 rounded">Día 45</span>
              <span>•</span>
              <span>Sabiduría</span>
            </div>
            <h1 className="text-white text-4xl md:text-5xl font-black leading-tight tracking-[-0.02em]">
              Confianza en el Señor
            </h1>
            <p className="text-[#9e9fb7] text-lg font-normal">Lectura Principal: Proverbios 3:1-6</p>
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
            <div className="font-serif text-gray-300 text-lg md:text-xl leading-8 md:leading-9 space-y-8 max-w-prose mx-auto">
              <p>
                <span className="text-4xl float-left mr-2 mt-[-10px] text-primary font-bold font-display">1</span>
                Hijo mío, no te olvides de mi ley, Y tu corazón guarde mis mandamientos; Porque largura de días y años de vida Y paz te aumentarán.
              </p>
              <p>
                <span className="text-primary font-bold text-sm font-display align-top mr-1">3</span>
                Nunca se aparten de ti la misericordia y la verdad; Atalas a tu cuello, Escríbelas en la tabla de tu corazón; Y hallarás gracia y buena opinión Ante los ojos de Dios y de los hombres.
              </p>
              <p className="border-l-4 border-primary/40 pl-6 italic text-gray-400 bg-primary/5 py-4 rounded-r-lg">
                <span className="text-primary font-bold text-sm font-display align-top mr-1 not-italic">5</span>
                Fíate de Jehová de todo tu corazón, Y no te apoyes en tu propia prudencia. Reconócelo en todos tus caminos, Y él enderezará tus veredas.
              </p>
            </div>
          </article>
        </section>

        {/* Validation Section */}
        <section className="glass-panel rounded-2xl p-6 md:p-8 shadow-lg mb-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary/20 p-2 rounded-lg text-primary">
              <span className="material-symbols-outlined">school</span>
            </div>
            <h3 className="text-xl font-bold text-white">Validación del Estudio</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-baseline">
                <label className="text-sm font-medium text-white">Tu Reflexión</label>
                <span className="text-xs text-[#9e9fb7]">Mínimo 50 caracteres ({reflection.length})</span>
              </div>
              <textarea 
                className="w-full bg-[#1c1c26] border border-[#292938] rounded-xl p-4 text-gray-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all resize-none h-40"
                placeholder="¿Qué significa para ti 'fiarte de todo corazón'?"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-4">
              <span className="text-sm font-medium text-white">Pregunta Rápida</span>
              <div className="bg-[#1c1c26] border border-[#292938] rounded-xl p-5 flex flex-col gap-4">
                <p className="text-gray-200 font-medium">Según el versículo 5, ¿en qué NO debemos apoyarnos?</p>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 0, label: 'En nuestros amigos' },
                    { id: 1, label: 'En nuestra propia prudencia' },
                    { id: 2, label: 'En la suerte' }
                  ].map((opt) => (
                    <label 
                      key={opt.id}
                      className={`relative flex items-center p-3 rounded-lg border transition-all cursor-pointer ${
                        selectedOption === opt.id 
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
                <>
                  <span className="material-symbols-outlined text-lg">info</span>
                  <span>Completa ambos campos para desbloquear</span>
                </>
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
