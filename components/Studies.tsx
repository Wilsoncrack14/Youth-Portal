
import React, { useState } from 'react';
import { Study } from '../types';
import { useNavigate } from 'react-router-dom';

const MOCK_STUDIES: Study[] = [
  { id: '1', title: 'El Conflicto de los Siglos', category: 'Historia', progress: 65, totalLessons: 12, completedLessons: 8, image: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=400&h=250&auto=format&fit=crop' },
  { id: '2', title: 'Profecías de Daniel', category: 'Profecía', progress: 30, totalLessons: 10, completedLessons: 3, image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=400&h=250&auto=format&fit=crop' },
  { id: '3', title: 'Vida de Jesús', category: 'Evangelios', progress: 100, totalLessons: 15, completedLessons: 15, image: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=400&h=250&auto=format&fit=crop' },
  { id: '4', title: 'Caminando con Dios', category: 'Vida Cristiana', progress: 10, totalLessons: 8, completedLessons: 1, image: 'https://images.unsplash.com/photo-1473163928189-3f40ddc749bd?q=80&w=400&h=250&auto=format&fit=crop' },
];

const Studies: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('Todos');
  const categories = ['Todos', 'Profecía', 'Historia', 'Evangelios', 'Vida Cristiana'];

  const filteredStudies = filter === 'Todos'
    ? MOCK_STUDIES
    : MOCK_STUDIES.filter(s => s.category === filter);

  return (
    <div className="p-4 lg:p-10 animate-fade-in-up">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <div>
          <h1 className="text-4xl font-black text-white mb-2">Mis Estudios</h1>
          <p className="text-gray-400">Continúa tu crecimiento espiritual con estas lecciones.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all shrink-0 ${filter === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-[#292938] text-gray-400 hover:text-white'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudies.map(study => (
            <div key={study.id} className="glass-card rounded-2xl overflow-hidden flex flex-col group">
              <div className="h-48 overflow-hidden relative">
                <img src={study.image} alt={study.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute top-4 left-4">
                  <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border border-white/10">
                    {study.category}
                  </span>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-white mb-2">{study.title}</h3>
                <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                  <span>Progreso: {study.completedLessons}/{study.totalLessons} Lecciones</span>
                  <span className="font-bold text-primary">{study.progress}%</span>
                </div>
                <div className="w-full bg-[#292938] h-1.5 rounded-full overflow-hidden mb-6">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${study.progress}%` }}></div>
                </div>
                <button
                  onClick={() => navigate('/reading')}
                  className="mt-auto w-full bg-[#292938] hover:bg-primary text-white font-bold py-3 rounded-xl transition-all border border-white/5 hover:border-primary/50"
                >
                  {study.progress === 100 ? 'Repasar Curso' : 'Continuar Estudio'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Studies;
