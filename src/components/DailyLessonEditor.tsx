import React, { useState, useEffect } from 'react';

interface DailyLessonData {
    id?: string;
    day: string;
    title: string;
    content: string;
    bible_verses: string[];
    reflection_questions: string[];
}

interface DailyLessonEditorProps {
    initialData: DailyLessonData;
    onSave: (data: DailyLessonData) => void;
    onCancel: () => void;
    isOpen: boolean;
}

const DailyLessonEditor: React.FC<DailyLessonEditorProps> = ({ initialData, onSave, onCancel, isOpen }) => {
    const [formData, setFormData] = useState<DailyLessonData>(initialData);
    const [versesText, setVersesText] = useState(initialData.bible_verses.join('\n'));
    const [questionsText, setQuestionsText] = useState(initialData.reflection_questions.join('\n'));

    useEffect(() => {
        setFormData(initialData);
        setVersesText(initialData.bible_verses.join('\n'));
        setQuestionsText(initialData.reflection_questions.join('\n'));
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            bible_verses: versesText.split('\n').filter(v => v.trim()),
            reflection_questions: questionsText.split('\n').filter(q => q.trim())
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#1a1b26] w-full max-w-4xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#222330]">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">edit_document</span>
                        Editar Lección - <span className="text-primary capitalize">{formData.day}</span>
                    </h2>
                    <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="lesson-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Title */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Título del Día</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-[#0f1016] text-white rounded-lg p-4 border border-white/10 focus:border-primary focus:outline-none font-bold text-lg"
                                placeholder="Ej: El Domingo"
                            />
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                            <label className="block text-sm text-gray-400 mb-2">Contenido del Estudio (Soporta Markdown)</label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                className="w-full bg-[#0f1016] text-gray-300 rounded-lg p-4 border border-white/10 focus:border-primary focus:outline-none min-h-[300px] font-mono text-sm leading-relaxed"
                                placeholder="Escribe el contenido aquí..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Verses */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Versículos (Uno por línea)</label>
                                <textarea
                                    value={versesText}
                                    onChange={(e) => setVersesText(e.target.value)}
                                    className="w-full bg-[#0f1016] text-white rounded-lg p-4 border border-white/10 focus:border-primary focus:outline-none h-[150px]"
                                    placeholder="Juan 3:16&#10;Génesis 1:1"
                                />
                            </div>

                            {/* Questions */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Preguntas de Reflexión (Una por línea)</label>
                                <textarea
                                    value={questionsText}
                                    onChange={(e) => setQuestionsText(e.target.value)}
                                    className="w-full bg-[#0f1016] text-white rounded-lg p-4 border border-white/10 focus:border-primary focus:outline-none h-[150px]"
                                    placeholder="¿Qué aprendiste hoy?&#10;¿Cómo aplicas esto?"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-[#222330] flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-2.5 rounded-lg text-white hover:bg-white/5 transition-colors font-medium border border-transparent hover:border-white/10"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="lesson-form"
                        className="px-6 py-2.5 rounded-lg bg-primary hover:bg-blue-600 text-white font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">save</span>
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DailyLessonEditor;
