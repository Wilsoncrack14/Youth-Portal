
import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="p-4 lg:p-10 animate-fade-in-up">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div>
          <h1 className="text-4xl font-black text-white mb-2">Configuración</h1>
          <p className="text-gray-400">Personaliza tu experiencia en el portal.</p>
        </div>

        <section className="glass-panel rounded-2xl overflow-hidden divide-y divide-white/5 border border-white/5">
          <div className="p-6">
            <h3 className="text-lg font-bold text-white mb-6">Cuenta y Perfil</h3>
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-slate-600"></div>
                <div>
                  <button className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg mb-1">Cambiar Foto</button>
                  <p className="text-xs text-gray-500">JPG o PNG, máx 2MB</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Nombre de Usuario</label>
                  <input className="bg-[#292938] border-none rounded-xl text-white text-sm" type="text" defaultValue="juan_perez" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Correo Electrónico</label>
                  <input className="bg-[#292938] border-none rounded-xl text-white text-sm" type="email" defaultValue="juan@ejemplo.com" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-lg font-bold text-white mb-6">Preferencias</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Notificaciones Push</p>
                  <p className="text-xs text-gray-500">Recibir alertas de nuevos estudios y mensajes.</p>
                </div>
                <div className="relative inline-block w-12 h-6 rounded-full bg-primary">
                  <div className="absolute right-1 top-1 size-4 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Modo Oscuro</p>
                  <p className="text-xs text-gray-500">Cambiar entre tema claro y oscuro.</p>
                </div>
                <div className="relative inline-block w-12 h-6 rounded-full bg-primary">
                  <div className="absolute right-1 top-1 size-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-red-500/5">
            <h3 className="text-lg font-bold text-red-400 mb-6">Zona de Peligro</h3>
            <button className="text-red-400 border border-red-400/20 px-6 py-2 rounded-xl text-sm font-bold hover:bg-red-500 hover:text-white transition-all">
              Desactivar Cuenta
            </button>
          </div>
        </section>
        <div className="flex justify-end gap-3">
            <button className="px-6 py-2.5 rounded-xl text-gray-400 font-bold hover:text-white">Cancelar</button>
            <button className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20">Guardar Cambios</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
