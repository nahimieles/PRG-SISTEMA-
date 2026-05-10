'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Users, AlertCircle, Clock, FileText, Building2, BadgeCheck } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { lightTheme, darkTheme } from '@/lib/colors';
import { getCompanies } from '../lib/auth';

// ─── Data ─────────────────────────────────────────────────────────────────────
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_OF_WEEK = ['L','M','X','J','V','S','D'];
const daysInMonth = (month) => new Date(2026, month + 1, 0).getDate();
const firstDayOffset = (month) => { const d = new Date(2026, month, 1).getDay(); return d === 0 ? 6 : d - 1; };

const RAW_OBLIGATIONS = [
  { id: 'm1', obligacion: 'Declaración mensual de IVA', frecuencia: 'Mensual', sujeto: 'Personas naturales y Sociedades', plazo: 'Según noveno dígito del RUC, desde el día 10 del mes siguiente al período declarado.', detalle: 'Formulario 104 / 104A. Debe incluir todas las ventas gravadas con tarifa 12%, 15% y 0%, así como las compras y retenciones del período.', months: 'all', days: [10,12,14,16,18,20,22,24,26,28], color: '#22c55e' },
  { id: 'm2', obligacion: 'Retenciones en la fuente IR', frecuencia: 'Mensual', sujeto: 'Personas naturales y Sociedades', plazo: 'Según noveno dígito del RUC, desde el día 10 del mes siguiente.', detalle: 'Formulario 103. Incluye retenciones por servicios profesionales, arriendos, honorarios y demás conceptos sujetos a retención.', months: 'all', days: [10,12,14,16,18,20,22,24,26,28], color: '#3b82f6' },
  { id: 'm3', obligacion: 'Anexo Transaccional – ATS', frecuencia: 'Mensual', sujeto: 'Personas naturales y Sociedades', plazo: 'Mes subsiguiente al período informado, según noveno dígito del RUC.', detalle: 'Detalle de compras, ventas, exportaciones, retenciones y comprobantes anulados del período. Se presenta en formato XML.', months: 'all', days: [10,12,14,16,18,20,22,24,26,28], color: '#f59e0b' },
  { id: 'm4', obligacion: 'Declaración ISD', frecuencia: 'Mensual', sujeto: 'Agentes de retención y percepción', plazo: 'Según noveno dígito del RUC, desde el día 10.', detalle: 'Impuesto a la Salida de Divisas. Aplica para transferencias al exterior, importaciones y pagos con tarjeta de crédito en el exterior.', months: 'all', days: [10,12,14,16,18,20,22,24,26,28], color: '#a855f7' },
  { id: 'm5', obligacion: 'Declaración ICE', frecuencia: 'Mensual', sujeto: 'Personas naturales y Sociedades', plazo: 'Según noveno dígito del RUC, desde el día 10.', detalle: 'Impuesto a los Consumos Especiales. Aplica a fabricantes e importadores de bienes y servicios gravados (vehículos, bebidas alcohólicas, cigarrillos, etc).', months: 'all', days: [10,12,14,16,18,20,22,24,26,28], color: '#ef4444' },
  { id: 'm6', obligacion: 'Impuesto Activos en el Exterior', frecuencia: 'Mensual', sujeto: 'Sociedades', plazo: 'Según noveno dígito del RUC, desde el día 10.', detalle: 'Aplica a entidades financieras y sociedades que mantengan activos monetarios fuera de Ecuador. Tasa del 0.25% mensual.', months: 'all', days: [10,12,14,16,18,20,22,24,26,28], color: '#06b6d4' },
  { id: 'm7', obligacion: 'IBP Botellas Plásticas', frecuencia: 'Mensual', sujeto: 'Personas naturales y Sociedades', plazo: 'Hasta el 5° día hábil del mes siguiente.', detalle: 'Impuesto Redimible a las Botellas Plásticas. Aplica a embotelladores e importadores. Se puede compensar con la recolección de botellas.', months: 'all', days: [5,6,7], color: '#ec4899' },
  { id: 'a1', obligacion: 'Proyección gastos personales', frecuencia: 'Anual', sujeto: 'Personas naturales', plazo: 'Según noveno dígito del RUC, enero.', detalle: 'Los empleados en relación de dependencia deben presentar la proyección de gastos personales a su empleador para el cálculo de retenciones del IR.', months: [0], days: [10,12,14,16,18,20,22,24,26,28], color: '#8b5cf6' },
  { id: 'a2', obligacion: 'Anexo RDEP', frecuencia: 'Anual', sujeto: 'Personas naturales y Sociedades', plazo: 'Según noveno dígito del RUC, febrero.', detalle: 'Anexo de Retenciones en la Fuente bajo Relación de Dependencia. Detalla los ingresos y retenciones de cada empleado del año anterior.', months: [1], days: [10,12,14,16,18,20,22,24,26,28], color: '#14b8a6' },
  { id: 'a3', obligacion: 'Anexo AIBT', frecuencia: 'Anual', sujeto: 'Personas naturales y Sociedades', plazo: 'Según noveno dígito del RUC, febrero.', detalle: 'Anexo de Incentivos y Beneficios Tributarios. Informa los beneficios tributarios utilizados en el ejercicio fiscal.', months: [1], days: [10,12,14,16,18,20,22,24,26,28], color: '#f97316' },
  { id: 'a4', obligacion: 'IR Sociedades', frecuencia: 'Anual', sujeto: 'Sociedades', plazo: 'Según noveno dígito del RUC, abril.', detalle: 'Formulario 101. Declaración del Impuesto a la Renta de Sociedades con estados financieros, conciliación tributaria y anticipo IR.', months: [3], days: [10,12,14,16,18,20,22,24,26,28], color: '#ef4444' },
  { id: 'a5', obligacion: 'Anexo APS (Accionistas)', frecuencia: 'Anual', sujeto: 'Sociedades', plazo: 'Según noveno dígito del RUC, abril.', detalle: 'Anexo de Accionistas, Partícipes y Socios. Informa la composición societaria y distribución de utilidades.', months: [3], days: [10,12,14,16,18,20,22,24,26,28], color: '#d946ef' },
  { id: 'a6', obligacion: 'Declaración Patrimonial', frecuencia: 'Anual', sujeto: 'Personas naturales', plazo: 'Según noveno dígito del RUC, marzo.', detalle: 'Obligatoria para personas con patrimonio superior a $200.000 USD o incremento patrimonial mayor a $40.000 en el año.', months: [2], days: [10,12,14,16,18,20,22,24,26,28], color: '#0ea5e9' },
  { id: 'a7', obligacion: 'IR Personas Naturales', frecuencia: 'Anual', sujeto: 'Personas naturales', plazo: 'Según noveno dígito del RUC, marzo.', detalle: 'Formulario 102 / 102A. Declaración anual con deducción de gastos personales, ingresos en relación de dependencia y por cuenta propia.', months: [2], days: [10,12,14,16,18,20,22,24,26,28], color: '#22c55e' },
  { id: 'a8', obligacion: 'Anexo ADI (Dividendos)', frecuencia: 'Anual', sujeto: 'Sociedades', plazo: 'Según noveno dígito del RUC, abril.', detalle: 'Anexo de Dividendos. Informa sobre dividendos distribuidos a accionistas residentes y no residentes.', months: [3], days: [10,12,14,16,18,20,22,24,26,28], color: '#6366f1' },
  { id: 'a9', obligacion: 'Anexo OPRE (Partes Rel.)', frecuencia: 'Anual', sujeto: 'Sociedades', plazo: 'Según noveno dígito del RUC, mayo.', detalle: 'Informe de Operaciones con Partes Relacionadas. Obligatorio cuando las transacciones superan $3M con partes relacionadas.', months: [4], days: [10,12,14,16,18,20,22,24,26,28], color: '#f43f5e' },
  { id: 'a10', obligacion: 'ICT (Cumplimiento Tributario)', frecuencia: 'Anual', sujeto: 'Personas naturales y Sociedades', plazo: 'Hasta el 31 de julio.', detalle: 'Informe de Cumplimiento Tributario preparado por el auditor externo. Obligatorio para sociedades que requieren auditoría externa.', months: [6], days: [31], color: '#0891b2' },
  { id: 'a11', obligacion: 'Anexo GAD', frecuencia: 'Anual', sujeto: 'GADs', plazo: 'Según noveno dígito del RUC, junio.', detalle: 'Gobiernos Autónomos Descentralizados reportan ingresos, gastos e inversión pública del ejercicio fiscal anterior.', months: [5], days: [10,12,14,16,18,20,22,24,26,28], color: '#65a30d' },
  { id: 's1', obligacion: 'IVA Semestral (RIMPE)', frecuencia: 'Semestral', sujeto: 'RIMPE', plazo: 'Según noveno dígito del RUC, enero y julio.', detalle: 'Contribuyentes del Régimen Simplificado (RIMPE Emprendedor) declaran IVA semestralmente en vez de mensualmente.', months: [0,6], days: [10,12,14,16,18,20,22,24,26,28], color: '#eab308' },
  { id: 's2', obligacion: 'Ret. fuente IR Semestral', frecuencia: 'Semestral', sujeto: 'RIMPE', plazo: 'Según noveno dígito del RUC, enero y julio.', detalle: 'Retenciones del IR para contribuyentes RIMPE que califican para presentación semestral.', months: [0,6], days: [10,12,14,16,18,20,22,24,26,28], color: '#84cc16' },
  { id: 's3', obligacion: 'ATS Semestral', frecuencia: 'Semestral', sujeto: 'Personas naturales y Sociedades', plazo: 'Según noveno dígito del RUC, agosto.', detalle: 'Anexo Transaccional Simplificado para contribuyentes que califican para presentación semestral.', months: [7], days: [10,12,14,16,18,20,22,24,26,28], color: '#f59e0b' },
  { id: 's4', obligacion: 'Regalías Mineras', frecuencia: 'Semestral', sujeto: 'Personas naturales y Sociedades', plazo: 'Según noveno dígito del RUC, marzo y septiembre.', detalle: 'Regalías por actividades de explotación minera a gran y mediana escala sobre ingresos brutos de ventas.', months: [2,8], days: [10,12,14,16,18,20,22,24,26,28], color: '#78716c' },
  { id: 's5', obligacion: 'Anticipo utilidades no dist.', frecuencia: 'Semestral', sujeto: 'Sociedades', plazo: 'Según noveno dígito del RUC, agosto-octubre.', detalle: 'Anticipo del impuesto a la renta sobre utilidades no distribuidas de ejercicios anteriores.', months: [7,8,9], days: [10,11], color: '#dc2626' },
  { id: 'a12', obligacion: '2da proyección gastos pers.', frecuencia: 'Anual', sujeto: 'Personas naturales', plazo: 'Hasta 30 de junio o 30 de septiembre.', detalle: 'Segunda presentación de la proyección de gastos personales para ajustar retenciones del segundo semestre.', months: [5,8], days: [30], color: '#7c3aed' },
];

const FREQ_COLORS = {
  Mensual: { bg: '#22c55e', light: 'rgba(34,197,94,0.08)', lightBorder: 'rgba(34,197,94,0.2)' },
  Anual: { bg: '#3b82f6', light: 'rgba(59,130,246,0.08)', lightBorder: 'rgba(59,130,246,0.2)' },
  Semestral: { bg: '#f59e0b', light: 'rgba(245,158,11,0.08)', lightBorder: 'rgba(245,158,11,0.2)' },
  Semanal: { bg: '#a855f7', light: 'rgba(168,85,247,0.08)', lightBorder: 'rgba(168,85,247,0.2)' },
};

export default function TaxCalendar2026() {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [modalDay, setModalDay] = useState(null);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await getCompanies();
      setCompanies(data || []);
    } catch (err) {
      console.error('Error loading companies for calendar:', err);
    }
  };

  // Close modal on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setModalDay(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const dayObligationsMap = useMemo(() => {
    const map = {};
    const total = daysInMonth(selectedMonth);
    for (let d = 1; d <= total; d++) map[d] = [];
    
    RAW_OBLIGATIONS.forEach(ob => {
      if (ob.months !== 'all' && !ob.months.includes(selectedMonth)) return;
      
      ob.days.forEach(day => { 
        if (day >= 1 && day <= total) {
          // Check which companies match this deadline
          const matchingCompanies = companies.filter(c => {
            if (!c.ruc) return false;
            const ninthDigit = c.ruc[8];
            
            // Standard Ecuadorian deadline logic:
            // 1=10, 2=12, 3=14, 4=16, 5=18, 6=20, 7=22, 8=24, 9=26, 0=28
            const deadlineDay = ninthDigit === '0' ? 28 : (parseInt(ninthDigit) * 2 + 8);
            return deadlineDay === day;
          });

          map[day].push({ ...ob, matchingCompanies }); 
        } 
      });
    });
    return map;
  }, [selectedMonth, companies]);

  const totalDays = daysInMonth(selectedMonth);
  const offset = firstDayOffset(selectedMonth);
  const isToday = (day) => today.getFullYear() === 2026 && today.getMonth() === selectedMonth && today.getDate() === day;
  const modalObligations = modalDay ? (dayObligationsMap[modalDay] || []) : [];

  // Sort obligations to put the ones with matching companies first
  const sortedModalObligations = useMemo(() => {
    return [...modalObligations].sort((a, b) => (b.matchingCompanies?.length || 0) - (a.matchingCompanies?.length || 0));
  }, [modalObligations]);

  const [isClosing, setIsClosing] = useState(false);

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setModalDay(null);
      setIsClosing(false);
    }, 400); // Duration of the exit animation
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes modalEnter {
          0% { opacity: 0; transform: scale(0.9) translateY(40px); filter: blur(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes modalExit {
          0% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
          100% { opacity: 0; transform: scale(0.95) translateY(20px); filter: blur(5px); }
        }
        @keyframes overlayEnter {
          0% { opacity: 0; backdrop-filter: blur(0); }
          100% { opacity: 1; backdrop-filter: blur(12px); }
        }
        @keyframes overlayExit {
          0% { opacity: 1; backdrop-filter: blur(12px); }
          100% { opacity: 0; backdrop-filter: blur(0); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); }
      `}} />

      {/* Calendar Grid Container */}
      <div className="rounded-3xl sm:rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-1000" style={{
        background: theme.surface,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.2)' : '0 10px 40px rgba(0,0,0,0.04)',
      }}>
        {/* Header */}
        <div className="px-5 sm:px-8 py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-[1.25rem] flex items-center justify-center shadow-inner" style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            }}>
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight" style={{ color: theme.text }}>
                Calendario Tributario 2026
              </h3>
              <p className="text-[10px] sm:text-[11px] font-bold opacity-30 uppercase tracking-[0.2em]" style={{ color: theme.textSecondary }}>SRI Ecuador</p>
            </div>
          </div>
          {/* Month nav */}
          <div className="flex items-center gap-1 bg-gray-100/50 dark:bg-white/5 p-1 rounded-2xl border border-transparent w-full sm:w-auto justify-between sm:justify-start">
            <button onClick={() => { setSelectedMonth(m => (m - 1 + 12) % 12); }} className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl transition-all hover:bg-white dark:hover:bg-white/10 hover:shadow-sm" style={{ color: theme.text }}>
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs sm:text-sm font-bold min-w-[80px] sm:min-w-[90px] text-center" style={{ color: theme.text }}>{MONTHS[selectedMonth]}</span>
            <button onClick={() => { setSelectedMonth(m => (m + 1) % 12); }} className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl transition-all hover:bg-white dark:hover:bg-white/10 hover:shadow-sm" style={{ color: theme.text }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Month selector - Dynamic Pills */}
        <div className="px-5 sm:px-8 pb-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {MONTHS.map((m, idx) => {
              const isActive = idx === selectedMonth;
              const isCurrent = today.getMonth() === idx && today.getFullYear() === 2026;
              return (
                <button key={m} onClick={() => setSelectedMonth(idx)}
                  className="px-4 sm:px-5 py-2 text-[10px] sm:text-[12px] font-bold rounded-full transition-all"
                  style={{
                    background: isActive ? '#3b82f6' : isCurrent ? (isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff') : 'transparent',
                    color: isActive ? '#fff' : isCurrent ? '#3b82f6' : theme.textSecondary,
                    boxShadow: isActive ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
                    opacity: isActive || isCurrent ? 1 : 0.4
                  }}
                >{m}</button>
              );
            })}
          </div>
        </div>

        {/* Calendar grid */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-3 mb-4 sm:mb-6">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="text-center text-[9px] sm:text-[11px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em]" style={{ color: theme.textSecondary, opacity: 0.4 }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`off-${i}`} className="h-11 sm:h-14" />
            ))}

            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const obs = dayObligationsMap[day] || [];
              const hasOb = obs.length > 0;
              const hasMatchingCompanies = obs.some(o => o.matchingCompanies?.length > 0);
              const isTodayCell = isToday(day);

              return (
                <button
                  key={day}
                  onClick={() => hasOb && setModalDay(day)}
                  className={`h-9 sm:h-14 relative flex flex-col items-center justify-center rounded-xl sm:rounded-[1.25rem] transition-all group ${hasOb ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 hover:scale-[1.02]' : 'cursor-default'}`}
                  style={{
                    background: isTodayCell ? '#3b82f6' : 'transparent',
                    color: isTodayCell ? '#fff' : theme.text,
                    border: isTodayCell ? '1px solid #3b82f6' : '1px solid transparent',
                  }}
                >
                  <span className={`text-[13px] sm:text-[15px] ${isTodayCell || hasMatchingCompanies ? 'font-black' : 'font-medium'}`}>{day}</span>
                  {hasOb && (
                    <div className="flex gap-[3px]">
                      {hasMatchingCompanies ? (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      ) : (
                        [...new Set(obs.map(o => o.color))].slice(0, 3).map((c, ci) => (
                          <div key={ci} className="w-1 h-1 rounded-full" style={{ background: isTodayCell ? '#fff' : c }} />
                        ))
                      )}
                    </div>
                  )}
                  {hasMatchingCompanies && !isTodayCell && (
                    <div className="absolute inset-0 rounded-[1.25rem] border-2 border-blue-500/10 pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 sm:px-8 py-4 flex flex-wrap items-center gap-4 sm:gap-8 justify-center bg-gray-50/30 dark:bg-black/10 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            Empresas vinculadas
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
             {Object.entries(FREQ_COLORS).map(([freq, colors]) => (
                <div key={freq} className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold opacity-40 uppercase tracking-tighter">
                  <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full" style={{ background: colors.bg }} />
                  {freq}
                </div>
             ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: Day Obligations
      ══════════════════════════════════════════════════════════════ */}
      {modalDay && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
          style={{ 
            background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)', 
            backdropFilter: 'blur(12px)',
            animation: isClosing ? 'overlayExit 0.4s ease-in forwards' : 'overlayEnter 0.5s ease-out forwards' 
          }}
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-3xl rounded-[3rem] overflow-hidden"
            style={{
              background: theme.surface,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
              boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)',
              maxHeight: '90vh',
              animation: isClosing ? 'modalExit 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'modalEnter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 sm:px-12 py-6 sm:py-10 flex items-center justify-between" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
              <div>
                <p className="text-[10px] sm:text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-1 sm:mb-2">Control de Obligaciones</p>
                <h3 className="text-2xl sm:text-4xl font-black tracking-tighter" style={{ color: theme.text }}>
                  {modalDay} de {MONTHS[selectedMonth]}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center rounded-xl sm:rounded-2xl transition-all hover:bg-red-500 hover:text-white"
                style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', color: theme.text }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 sm:px-12 py-6 sm:py-10 overflow-y-auto custom-scrollbar scroll-smooth" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              
              {/* Linked Companies Section */}
              {modalObligations.some(o => o.matchingCompanies?.length > 0) && (
                <div className="mb-8 sm:mb-12">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <h4 className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest opacity-30">
                      Subidas requeridas {isToday(modalDay) ? 'hoy' : `el ${modalDay} de ${MONTHS[selectedMonth]}`}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {Array.from(new Map(modalObligations.flatMap(o => o.matchingCompanies).map(c => [c.id, c])).values()).map(company => (
                      <div key={company.id} className="group flex items-center gap-3 sm:gap-5 p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] border transition-all hover:shadow-lg hover:border-blue-500/20" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-110" style={{ background: theme.surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
                          {company.logo_url ? <img src={company.logo_url} className="w-7 h-7 sm:w-8 sm:h-8 object-contain" /> : <Building2 size={20} className="opacity-20" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-bold truncate leading-tight" style={{ color: theme.text }}>{company.name}</p>
                          <p className="text-[9px] sm:text-[11px] font-bold text-blue-500/60 mt-1 uppercase tracking-wider">
                            Dig. {company.ruc[8]} • {isToday(modalDay) ? 'Pendiente hoy' : 'Programado'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Obligations List */}
              <div className="space-y-6 sm:space-y-10">
                {sortedModalObligations.map((ob) => (
                  <div key={ob.id} className="group relative p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border transition-all hover:shadow-xl" 
                    style={{ 
                      borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                      background: ob.matchingCompanies?.length > 0 ? (isDark ? 'rgba(59,130,246,0.03)' : 'rgba(59,130,246,0.01)') : 'transparent'
                    }}>
                    
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 sm:gap-8">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full" 
                            style={{ background: `${ob.color}20`, color: ob.color, border: `1px solid ${ob.color}30` }}>
                            {ob.frecuencia}
                          </span>
                          {ob.matchingCompanies?.length > 0 && (
                            <span className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black text-blue-500 uppercase tracking-widest">
                               <BadgeCheck size={12} className="sm:w-3.5 sm:h-3.5" /> 
                               {isToday(modalDay) ? 'Fecha de subida hoy' : `Subida para el ${modalDay} de ${MONTHS[selectedMonth]}`}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xl sm:text-2xl font-black mb-3 sm:mb-4 tracking-tight" style={{ color: theme.text }}>
                          {ob.obligacion}
                        </h4>
                        <div className="p-5 rounded-3xl bg-gray-50/50 dark:bg-white/5 border border-transparent italic">
                           <p className="text-sm leading-relaxed opacity-60" style={{ color: theme.text }}>
                             {ob.detalle}
                           </p>
                        </div>
                      </div>

                      <div className="flex-shrink-0 w-full md:w-64 space-y-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-blue-500/50">
                            <Users size={14} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Sujeto Pasivo</p>
                          </div>
                          <p className="text-sm font-bold leading-relaxed" style={{ color: theme.textSecondary }}>{ob.sujeto}</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-emerald-500/50">
                            <Clock size={14} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Plazo de subida</p>
                          </div>
                          <p className="text-sm font-bold leading-relaxed" style={{ color: theme.textSecondary }}>{ob.plazo}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
