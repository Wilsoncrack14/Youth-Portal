import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { useColor, BRAND_COLORS } from '../contexts/ColorContext';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useUser();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [pushNotifications, setPushNotifications] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const { primaryColor, setPrimaryColor } = useColor();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ show: false, originalSize: 0, compressedSize: 0, percentage: 0 });
  const [previewModal, setPreviewModal] = useState({ show: false, imageUrl: '', file: null as File | null, compressedBlob: null as Blob | null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUserData();
    loadPreferences();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');

        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();

        if (profile?.username) {
          setUsername(profile.username);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = () => {
    const savedNotifications = localStorage.getItem('pushNotifications');
    const savedDarkMode = localStorage.getItem('darkMode');

    if (savedNotifications !== null) {
      setPushNotifications(savedNotifications === 'true');
    }
    if (savedNotifications !== null) {
      setPushNotifications(savedNotifications === 'true');
    }
    // Theme is handled effectively by the context initializer
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const maxSize = 1200;
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          let quality = 0.8;
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Error al comprimir imagen'));
                  return;
                }

                if (blob.size > 2 * 1024 * 1024 && quality > 0.3) {
                  quality -= 0.1;
                  tryCompress();
                } else {
                  resolve(blob);
                }
              },
              'image/jpeg',
              quality
            );
          };

          tryCompress();
        };

        img.onerror = () => reject(new Error('Error al cargar imagen'));
      };

      reader.onerror = () => reject(new Error('Error al leer archivo'));
    });
  };

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToastMessage('Solo se permiten imágenes');
        return;
      }

      const originalSize = file.size;
      const imageUrl = URL.createObjectURL(file);

      setUploadProgress({ show: true, originalSize, compressedSize: 0, percentage: 0 });

      const compressedBlob = await compressImage(file);
      const compressedSize = compressedBlob.size;
      const reduction = ((originalSize - compressedSize) / originalSize) * 100;

      setUploadProgress({ show: true, originalSize, compressedSize, percentage: reduction });

      setPreviewModal({
        show: true,
        imageUrl,
        file,
        compressedBlob
      });

    } catch (error) {
      console.error('Error processing image:', error);
      showToastMessage('Error al procesar la imagen');
      setUploadProgress({ show: false, originalSize: 0, compressedSize: 0, percentage: 0 });
    }
  };

  const confirmUpload = async () => {
    try {
      if (!previewModal.compressedBlob) return;

      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToastMessage('Usuario no autenticado');
        return;
      }

      const fileName = `${user.id}-${Date.now()}.jpg`;
      const filePath = `avatars/${fileName}`;



      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, previewModal.compressedBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw uploadError;
      }



      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);



      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Update error:', updateError);
        throw updateError;
      }



      // Verify the update
      const { data: verifyData } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();




      await refreshProfile();


      showToastMessage('Foto actualizada exitosamente');
      closePreviewModal();
    } catch (error) {
      console.error('❌ Error uploading photo:', error);
      showToastMessage(`Error: ${error instanceof Error ? error.message : 'Error al subir la foto'}`);
    } finally {
      setUploading(false);
    }
  };

  const closePreviewModal = () => {
    if (previewModal.imageUrl) {
      URL.revokeObjectURL(previewModal.imageUrl);
    }
    setPreviewModal({ show: false, imageUrl: '', file: null, compressedBlob: null });
    setUploadProgress({ show: false, originalSize: 0, compressedSize: 0, percentage: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveChanges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ username })
        .eq('id', user.id);

      localStorage.setItem('pushNotifications', pushNotifications.toString());
      localStorage.setItem('pushNotifications', pushNotifications.toString());
      // Theme is automatically saved by context


      showToastMessage('Cambios guardados exitosamente');
    } catch (error) {
      console.error('Error saving changes:', error);
      showToastMessage('Error al guardar cambios');
    }
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const toggleNotifications = () => {
    setPushNotifications(!pushNotifications);
  };

  const toggleDarkMode = () => {
    toggleTheme();
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-10 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-10 animate-fade-in-up">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">Configuración</h1>
          <p className="text-gray-500 dark:text-gray-400">Personaliza tu experiencia en el portal.</p>
        </div>

        <section className="bg-white dark:bg-transparent dark:glass-panel rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-white/5 border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none">
          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Cuenta y Perfil</h3>
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-slate-600 overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-slate-600">
                      <span className="material-symbols-outlined text-gray-400">person</span>
                    </div>
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-primary hover:bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg mb-1 disabled:opacity-50 transition-colors"
                  >
                    {uploading ? 'Subiendo...' : 'Cambiar Foto'}
                  </button>

                  <p className="text-xs text-gray-500">JPG o PNG, máx 2MB</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Nombre de Usuario</label>
                  <input
                    className="bg-gray-100 dark:bg-[#292938] border-none rounded-xl text-gray-900 dark:text-white text-sm p-3 focus:ring-2 focus:ring-primary transition-all"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Correo Electrónico</label>
                  <input
                    className="bg-gray-100 dark:bg-[#292938] border-none rounded-xl text-gray-900 dark:text-white text-sm p-3 opacity-60"
                    type="email"
                    value={email}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Preferencias</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-900 dark:text-white font-medium">Notificaciones Push</p>
                  <p className="text-xs text-gray-500">Recibir alertas de nuevos estudios y mensajes.</p>
                </div>
                <button
                  onClick={toggleNotifications}
                  className={`relative inline-block w-12 h-6 rounded-full transition-all hover:scale-105 ${pushNotifications ? 'bg-primary' : 'bg-gray-600'
                    }`}
                >
                  <div
                    className={`absolute top-1 size-4 bg-white rounded-full transition-transform ${pushNotifications ? 'right-1' : 'left-1'
                      }`}
                  ></div>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-900 dark:text-white font-medium">Modo Oscuro</p>
                  <p className="text-xs text-gray-500">Cambiar entre tema claro y oscuro.</p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-block w-12 h-6 rounded-full transition-all hover:scale-105 ${theme === 'dark' ? 'bg-primary' : 'bg-gray-600'
                    }`}
                >
                  <div
                    className={`absolute top-1 size-4 bg-white rounded-full transition-transform ${theme === 'dark' ? 'right-1' : 'left-1'
                      }`}
                  ></div>
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Administración</h3>
            <button
              onClick={() => navigate('/admin')}
              className="bg-gray-100 dark:bg-[#292938] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-all w-full md:w-auto flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined">admin_panel_settings</span>
              Acceder al Panel de Admin
            </button>
          </div>

          <div className="p-6 bg-red-50 dark:bg-red-500/5">
            <h3 className="text-lg font-bold text-red-400 mb-6">Zona de Peligro</h3>
            <button
              disabled
              className="text-red-400 border border-red-400/20 px-6 py-2 rounded-xl text-sm font-bold opacity-50 cursor-not-allowed"
            >
              Desactivar Cuenta
            </button>
          </div>
        </section>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 rounded-xl text-gray-400 font-bold hover:text-white hover:bg-white/5 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveChanges}
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-blue-600 transition-all"
          >
            Guardar Cambios
          </button>
        </div>
      </div >

      {/* Toast Notification */}
      {
        showToast && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in flex items-center gap-2 z-50">
            <span className="material-symbols-outlined">check_circle</span>
            <span>{toastMessage}</span>
          </div>
        )
      }

      {/* Preview Modal */}
      {
        previewModal.show && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e1e2d] rounded-2xl max-w-2xl w-full border border-white/10 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Previsualización de Foto</h3>
                  <button onClick={closePreviewModal} className="text-gray-400 hover:text-white transition-colors">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>

              {/* Image Preview */}
              <div className="p-6">
                <div className="relative aspect-square max-h-96 mx-auto rounded-xl overflow-hidden bg-black/20">
                  <img
                    src={previewModal.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Optimization Stats */}
                {uploadProgress.show && (
                  <div className="mt-6 space-y-4">
                    <div className="bg-[#292938] rounded-xl p-4 border border-white/5">
                      <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">compress</span>
                        Optimización de Imagen
                      </h4>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Tamaño Original</p>
                          <p className="text-white font-bold">{(uploadProgress.originalSize / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Tamaño Optimizado</p>
                          <p className="text-green-400 font-bold">{(uploadProgress.compressedSize / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-[#1e1e2d] rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-green-500 transition-all duration-500"
                            style={{ width: `${uploadProgress.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-green-400 font-bold text-sm">{uploadProgress.percentage.toFixed(0)}% reducido</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-white/10 flex gap-3 justify-end">
                <button
                  onClick={closePreviewModal}
                  className="px-6 py-2.5 rounded-xl text-gray-400 font-bold hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmUpload}
                  disabled={uploading}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">upload</span>
                      Confirmar y Subir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Settings;
