import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDangerous = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#1a1b26] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all animate-scale-up">
                <div className="flex items-center gap-3 mb-4 text-white">
                    <div className={`size-10 rounded-full flex items-center justify-center ${isDangerous ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
                        <span className="material-symbols-outlined text-2xl">
                            {isDangerous ? 'warning' : 'info'}
                        </span>
                    </div>
                    <h3 className="text-xl font-bold">{title}</h3>
                </div>

                <p className="text-gray-300 mb-8 leading-relaxed">
                    {message}
                </p>

                <div className="flex items-center gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-gray-400 font-bold hover:bg-white/5 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-6 py-2.5 rounded-xl text-white font-bold shadow-lg transition-all transform hover:scale-105 ${isDangerous
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                : 'bg-primary hover:bg-blue-600 shadow-blue-500/20'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
