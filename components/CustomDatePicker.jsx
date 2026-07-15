import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';

const CustomDatePicker = ({ value, onChange, placeholder = "Seleccionar fecha...", className = "", style = {} }) => {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const wrapperRef = useRef(null);

    // Initialize currentMonth based on value
    useEffect(() => {
        if (value) {
            const [year, month, day] = value.split('-').map(Number);
            if (year && month && day) {
                setCurrentMonth(new Date(year, month - 1, day));
            }
        }
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    const handleDateSelect = (day) => {
        const year = currentMonth.getFullYear();
        const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
        const formattedDay = String(day).padStart(2, '0');
        onChange(`${year}-${month}-${formattedDay}`);
        setIsOpen(false);
    };

    const nextMonth = (e) => {
        e.stopPropagation();
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = (e) => {
        e.stopPropagation();
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dayNames = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];

    const renderCalendarDays = () => {
        let days = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const isSelected = value === dateStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            days.push(
                <button
                    key={`day-${i}`}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDateSelect(i); }}
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-all duration-200
                        ${isSelected ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30' : 
                          isToday ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium' : 
                          'hover:bg-gray-100 dark:hover:bg-white/10'}`}
                    style={(!isSelected && !isToday) ? { color: theme.text } : {}}
                >
                    {i}
                </button>
            );
        }
        return days;
    };

    const displayValue = value ? (() => {
        const [y, m, d] = value.split('-');
        return `${d}/${m}/${y}`;
    })() : '';

    return (
        <div className="relative" ref={wrapperRef}>
            <div 
                className={`flex items-center px-3 py-2 rounded-lg text-sm border cursor-pointer transition-colors ${className}`}
                style={{ ...style, borderColor: theme.border }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <input
                    type="text"
                    readOnly
                    value={displayValue}
                    placeholder={placeholder}
                    className="w-full bg-transparent outline-none cursor-pointer"
                    style={{ color: theme.text }}
                />
                <CalendarIcon size={16} className="ml-2" style={{ color: theme.textSecondary }} />
            </div>

            {isOpen && (
                <div 
                    className="absolute z-50 top-full left-0 mt-2 p-4 rounded-xl border shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
                    style={{ 
                        background: isDark ? 'rgba(20,20,20,0.85)' : 'rgba(255,255,255,0.95)',
                        borderColor: theme.border,
                        minWidth: '280px'
                    }}
                >
                    <div className="flex justify-between items-center mb-4">
                        <button type="button" onClick={prevMonth} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                            <ChevronLeft size={18} style={{ color: theme.text }} />
                        </button>
                        <span className="font-semibold text-sm" style={{ color: theme.text }}>
                            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </span>
                        <button type="button" onClick={nextMonth} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                            <ChevronRight size={18} style={{ color: theme.text }} />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {dayNames.map(day => (
                            <div key={day} className="w-8 text-center text-xs font-medium" style={{ color: theme.textSecondary }}>
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {renderCalendarDays()}
                    </div>
                    
                    <div className="mt-4 pt-3 border-t flex justify-end" style={{ borderColor: theme.border }}>
                        <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); onChange(''); setIsOpen(false); }}
                            className="text-xs font-medium px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                            style={{ color: theme.textSecondary }}
                        >
                            Limpiar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomDatePicker;
