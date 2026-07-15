import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CustomDateTimePicker({ value, onChange, isDark, theme, placeholder = "Seleccionar fecha y hora" }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  
  // Parse initial value or current date
  const initialDate = value ? new Date(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const [time, setTime] = useState(value ? `${String(initialDate.getHours()).padStart(2, '0')}:${String(initialDate.getMinutes()).padStart(2, '0')}` : '08:00');

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => prev === 0 ? 11 : prev - 1);
    setCurrentYear(prev => currentMonth === 0 ? prev - 1 : prev);
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(prev => prev === 11 ? 0 : prev + 1);
    setCurrentYear(prev => currentMonth === 11 ? prev + 1 : prev);
  };

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay(); // 0 is Sunday
  
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Start on Monday
  
  const days = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const weekDays = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];

  const handleDateSelect = (day) => {
    const newDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(newDate);
    updateExternalValue(newDate, time);
  };

  const handleTimeChange = (e) => {
    setTime(e.target.value);
    if (selectedDate) updateExternalValue(selectedDate, e.target.value);
  };

  const updateExternalValue = (date, timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const finalDate = new Date(date);
    finalDate.setHours(parseInt(hours, 10) || 0);
    finalDate.setMinutes(parseInt(minutes, 10) || 0);
    
    // Format to YYYY-MM-DDTHH:mm
    const pad = (n) => String(n).padStart(2, '0');
    const localISOTime = `${finalDate.getFullYear()}-${pad(finalDate.getMonth()+1)}-${pad(finalDate.getDate())}T${pad(finalDate.getHours())}:${pad(finalDate.getMinutes())}`;
    
    onChange(localISOTime);
  };

  const displayValue = selectedDate ? `${selectedDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} ${time}` : placeholder;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 rounded-lg border outline-none text-sm transition-all flex justify-between items-center cursor-pointer hover:ring-2 hover:ring-blue-500"
        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: selectedDate ? theme.text : theme.textSecondary }}
      >
        <span className="truncate">{displayValue}</span>
        <Calendar className="w-4 h-4 flex-shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-2 p-4 rounded-xl border shadow-2xl w-[300px] left-0" style={{ background: theme.surface, borderColor: theme.border }}>
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <button type="button" onClick={handlePrevMonth} className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors" style={{ color: theme.text }}><ChevronLeft size={16}/></button>
            <span className="font-bold text-sm tracking-wide capitalize" style={{ color: theme.text }}>{monthNames[currentMonth]} {currentYear}</span>
            <button type="button" onClick={handleNextMonth} className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors" style={{ color: theme.text }}><ChevronRight size={16}/></button>
          </div>
          
          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(d => (
              <div key={d} className="text-center text-[10px] font-black opacity-50 tracking-wider" style={{ color: theme.text }}>{d}</div>
            ))}
          </div>
          
          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {days.map((day, i) => {
              const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth && selectedDate.getFullYear() === currentYear;
              return day ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={`w-8 h-8 mx-auto rounded-full text-xs font-medium flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-bold scale-110' : 'hover:bg-black/10 dark:hover:bg-white/10 hover:scale-110'}`}
                  style={!isSelected ? { color: theme.text } : {}}
                >
                  {day}
                </button>
              ) : <div key={i} className="w-8 h-8" />;
            })}
          </div>
          
          {/* Time Picker */}
          <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: theme.border }}>
            <Clock size={16} style={{ color: theme.textSecondary }} />
            <input 
              type="time" 
              value={time} 
              onChange={handleTimeChange}
              className="flex-1 px-3 py-1.5 rounded-lg border text-sm outline-none font-medium text-center focus:ring-2 focus:ring-blue-500 transition-all"
              style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text, colorScheme: isDark ? 'dark' : 'light' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
