
import React, { useState, useRef, useEffect } from 'react';

interface ImageOptimizerModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageFile: File | null;
    onOptimize: (file: File) => void;
}

const ImageOptimizerModal: React.FC<ImageOptimizerModalProps> = ({ isOpen, onClose, imageFile, onOptimize }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [originalSize, setOriginalSize] = useState<string>('');
    const [optimizedSize, setOptimizedSize] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [optimizedFile, setOptimizedFile] = useState<File | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (imageFile) {
            const url = URL.createObjectURL(imageFile);
            setPreviewUrl(url);
            setOriginalSize(formatBytes(imageFile.size));
            setOptimizedFile(null); // Reset previous optimization
            setOptimizedSize('');

            // Auto-optimize on load
            optimizeImage(imageFile);

            return () => URL.revokeObjectURL(url);
        }
    }, [imageFile]);

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const optimizeImage = (file: File) => {
        setIsProcessing(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas'); // Use loose canvas for calculations
                const ctx = canvas.getContext('2d');

                if (!ctx) return;

                // Max dimensions
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width = Math.round((width * MAX_HEIGHT) / height);
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                            type: 'image/webp',
                            lastModified: Date.now(),
                        });
                        setOptimizedFile(newFile);
                        setOptimizedSize(formatBytes(newFile.size));
                        setIsProcessing(false);
                    }
                }, 'image/webp', 0.8); // 80% quality WebP
            };
        };
    };

    const handleConfirm = () => {
        if (optimizedFile) {
            onOptimize(optimizedFile);
            onClose();
        }
    };

    if (!isOpen || !imageFile) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-[#1a1b26] rounded-2xl max-w-2xl w-full border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#222330]">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-accent-gold">compress</span>
                        Optimizar Imagen
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Image Preview */}
                        <div className="flex-1 bg-black/40 rounded-lg flex items-center justify-center p-2 border border-white/5">
                            {previewUrl && (
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="max-h-[300px] object-contain rounded"
                                />
                            )}
                        </div>

                        {/* Stats & Info */}
                        <div className="md:w-64 space-y-6">
                            <div className="bg-[#222330] p-4 rounded-xl border border-white/5">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Estadísticas</h4>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-gray-400">Tamaño Original</label>
                                        <p className="text-lg font-mono text-red-400">{originalSize}</p>
                                    </div>

                                    <div className="relative">
                                        <label className="text-xs text-gray-400">Tamaño Optimizado</label>
                                        <p className="text-lg font-mono text-green-400 flex items-center gap-2">
                                            {isProcessing ? (
                                                <span className="animate-pulse">Calculando...</span>
                                            ) : (
                                                <>
                                                    {optimizedSize}
                                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="text-sm text-gray-400 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                                <p className="flex gap-2">
                                    <span className="material-symbols-outlined text-blue-400 text-lg">info</span>
                                    <span>La imagen se convertirá a <strong>WebP</strong> para mejor rendimiento y menor peso.</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 bg-[#222330] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!optimizedFile || isProcessing}
                        className={`px-6 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg transition-colors font-bold shadow-lg shadow-primary/20 flex items-center gap-2 ${(!optimizedFile || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        {isProcessing ? 'Procesando...' : 'Confirmar y Usar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageOptimizerModal;
