import React from 'react';

export interface WeeklyProgressProps {
    title?: string;
    subtitle?: React.ReactNode;
    days?: string[];
    progress: boolean[];
    currentDayIndex?: number;
    onClickDay?: (index: number) => void;
    completedCount: number;
    completedMessage?: string;
    incompleteMessage?: string;
}

const WeeklyProgress: React.FC<WeeklyProgressProps> = ({
    title = "Progreso Semanal",
    subtitle,
    days = ['S', 'D', 'L', 'M', 'M', 'J', 'V'],
    progress,
    // Default currentDayIndex logic: today's index relative to Sabbath start
    // Sat=0, Sun=1 ... Fri=6
    currentDayIndex = (new Date().getDay() + 1) % 7,
    onClickDay,
    completedCount,
    completedMessage = "¡Vas bien!",
    incompleteMessage = "¡Comienza hoy!"
}) => {

    return (
        <div className="bg-white dark:bg-[#1a1b26] border border-gray-200 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-sm dark:shadow-none transition-colors">

            <div className="mb-6">
                <h3 className="font-serif text-2xl font-bold text-gray-900 dark:text-white">{title}</h3>
                {subtitle && (
                    <div className="mt-2 text-sm text-gray-500 font-medium tracking-wide uppercase opacity-80 border-b border-gray-200 dark:border-white/10 pb-4 inline-block pr-8">
                        {subtitle}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center max-w-3xl mx-auto">
                {days.map((d, i) => {
                    // Logic:
                    // If we have a record for this day (progress[i] is true) -> COMPLETED
                    // If not completed AND it is today -> ACTIVE
                    // If not completed AND it is past -> MISSED
                    // If future -> UPCOMING

                    const isDone = progress[i];
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
                        <div
                            key={i}
                            className={`flex flex-col items-center gap-3 ${onClickDay ? 'cursor-pointer hover:opacity-80' : ''}`}
                            onClick={() => onClickDay && onClickDay(i)}
                        >
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
                <span className="text-accent-gold font-bold">{completedCount > 0 ? completedMessage : incompleteMessage}</span>
            </div>
        </div>
    );
};

export default WeeklyProgress;
