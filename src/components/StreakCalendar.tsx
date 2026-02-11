import React, { useMemo } from 'react';
import { DailyActivity } from '../types';

interface StreakCalendarProps {
    activity: DailyActivity[];
    year?: number;
    month?: number;
}

const StreakCalendar: React.FC<StreakCalendarProps> = ({
    activity,
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1
}) => {
    const daysInMonth = useMemo(() => {
        return new Date(year, month, 0).getDate();
    }, [year, month]);

    const firstDayOfWeek = useMemo(() => {
        // 0 = Sunday, 1 = Monday, etc.
        return new Date(year, month - 1, 1).getDay();
    }, [year, month]);

    const calendarDays = useMemo(() => {
        const days = [];

        // Empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push(null);
        }

        // Days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayActivity = activity.find(a => a.day === dateStr);
            days.push({
                day: i,
                date: dateStr,
                reavivados: dayActivity?.reavivados || false,
                sabbath_school: dayActivity?.sabbath_school || false
            });
        }

        return days;
    }, [year, month, activity]);

    const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

    return (
        <div className="glass-panel bg-white/50 dark:bg-[#1e1e2d]/60 border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">calendar_month</span>
                    Actividad Mensual
                </h3>
                <span className="text-sm font-medium text-gray-500 capitalize">
                    {new Date(year, month - 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
            </div>

            <div className="grid grid-cols-7 gap-1 lg:gap-2 mb-2">
                {weekDays.map((day, index) => (
                    <div key={index} className="text-center text-xs font-semibold text-gray-400 py-1">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1 lg:gap-2">
                {calendarDays.map((date, index) => (
                    <div
                        key={index}
                        className={`
                aspect-square rounded-lg flex items-center justify-center relative group
                ${!date ? 'bg-transparent' : 'bg-white dark:bg-[#292938] border border-gray-100 dark:border-white/5'}
            `}
                    >
                        {date && (
                            <>
                                <span className={`text-xs font-medium z-10 ${(date.reavivados || date.sabbath_school) ? 'text-white' : 'text-gray-400'
                                    }`}>
                                    {date.day}
                                </span>

                                {/* Indicators */}
                                {(date.reavivados && date.sabbath_school) ? (
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm"></div>
                                ) : date.reavivados ? (
                                    <div className="absolute inset-0 bg-blue-500 rounded-lg shadow-sm opacity-80"></div>
                                ) : date.sabbath_school ? (
                                    <div className="absolute inset-0 bg-purple-500 rounded-lg shadow-sm opacity-80"></div>
                                ) : null}

                                {/* Tooltip */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                    {date.reavivados && date.sabbath_school ? 'Ambos Completados 🔥' :
                                        date.reavivados ? 'Reavivados Completado 📖' :
                                            date.sabbath_school ? 'Escuela Sabática Completada 🎓' : 'Sin Actividad'}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex gap-4 mt-6 justify-center">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                    <span className="text-xs text-gray-500">Reavivados</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-purple-500"></div>
                    <span className="text-xs text-gray-500">E. Sabática</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gradient-to-br from-blue-500 to-purple-600"></div>
                    <span className="text-xs text-gray-500">Ambos</span>
                </div>
            </div>
        </div>
    );
};

export default StreakCalendar;
