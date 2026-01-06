
import React from 'react';

const Community: React.FC = () => {
  const groups = [
    { name: 'Grupo de Jóvenes Caleb', members: 24, lastActive: '2 min', icon: 'groups' },
    { name: 'Intercesores Nocturnos', members: 12, lastActive: '15 min', icon: 'volunteer_activism' },
    { name: 'Música & Alabanza', members: 8, lastActive: '1h', icon: 'music_note' },
  ];

  const prayers = [
    { user: 'Sofía R.', text: 'Pido oración por mi abuela que está en el hospital.', likes: 12, time: '3h' },
    { user: 'Mateo G.', text: 'Gracias a Dios por aprobar mis exámenes finales.', likes: 25, time: '5h' },
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
              ></textarea>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200 dark:border-white/10">
                <div className="flex gap-2">
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><span className="material-symbols-outlined text-xl">image</span></button>
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><span className="material-symbols-outlined text-xl">sentiment_satisfied</span></button>
                </div>
                <button className="bg-primary text-white text-sm font-bold px-6 py-2 rounded-lg">Publicar</button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {prayers.map((p, i) => (
                <div key={i} className="bg-white dark:bg-[#1a1b26] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-600"></div>
                      <div>
                        <p className="text-gray-900 dark:text-white font-bold">{p.user}</p>
                        <p className="text-xs text-gray-500">Hace {p.time}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">{p.text}</p>
                  <div className="flex gap-6 border-t border-gray-200 dark:border-white/5 pt-4">
                    <button className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-lg">church</span> Amén ({p.likes})
                    </button>
                    <button className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-lg">chat_bubble</span> Comentar
                    </button>
                  </div>
                </div>
              ))}
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
