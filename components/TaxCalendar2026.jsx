'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Users, AlertCircle, Clock, FileText } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { lightTheme, darkTheme } from '@/lib/colors';

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
      ob.days.forEach(day => { if (day >= 1 && day <= total) map[day].push(ob); });
    });
    return map;
  }, [selectedMonth]);

  const totalDays = daysInMonth(selectedMonth);
  const offset = firstDayOffset(selectedMonth);
  const isToday = (day) => today.getFullYear() === 2026 && today.getMonth() === selectedMonth && today.getDate() === day;
  const modalObligations = modalDay ? (dayObligationsMap[modalDay] || []) : [];

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 8px rgba(0,0,0,0.05)',
      }}>
        {/* Header */}
        <div className="px-4 py-3 flex justify-between items-center" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
              background: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff',
            }}>
              <Calendar className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight" style={{ color: theme.text }}>
                Calendario Tributario 2026
              </h3>
              <p className="text-[10px]" style={{ color: theme.textSecondary }}>SRI Ecuador</p>
            </div>
          </div>
          {/* Month nav */}
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelectedMonth(m => (m - 1 + 12) % 12); }} className="w-6 h-6 flex items-center justify-center rounded-full transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.text }}>
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-bold min-w-[80px] text-center" style={{ color: theme.text }}>{MONTHS[selectedMonth]}</span>
            <button onClick={() => { setSelectedMonth(m => (m + 1) % 12); }} className="w-6 h-6 flex items-center justify-center rounded-full transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.text }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Month pills */}
        <div className="px-4 py-2 flex flex-wrap gap-1 justify-center" style={{ borderBottom: `1px solid ${theme.border}` }}>
          {MONTHS.map((m, idx) => {
            const isActive = idx === selectedMonth;
            const isCurrent = today.getMonth() === idx && today.getFullYear() === 2026;
            return (
              <button key={m} onClick={() => setSelectedMonth(idx)}
                className="px-2 py-0.5 text-[9px] font-bold rounded-full transition-all"
                style={{
                  background: isActive ? '#3b82f6' : isCurrent ? (isDark ? 'rgba(59,130,246,0.12)' : '#eff6ff') : 'transparent',
                  color: isActive ? '#fff' : isCurrent ? '#3b82f6' : theme.textSecondary,
                }}
              >{m.slice(0,3)}</button>
            );
          })}
        </div>

        {/* Calendar grid — compact */}
        <div className="px-3 py-2">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0 mb-0.5">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="text-center text-[9px] font-bold uppercase tracking-wider py-0.5" style={{ color: theme.textSecondary, opacity: 0.45 }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells — compact, no aspect-square */}
          <div className="grid grid-cols-7 gap-[3px]">
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`off-${i}`} className="h-9" />
            ))}

            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const obs = dayObligationsMap[day] || [];
              const hasOb = obs.length > 0;
              const isTodayCell = isToday(day);
              // Dominant frequency color for background tint
              const dominantColor = hasOb ? obs[0].color : null;

              return (
                <button
                  key={day}
                  onClick={() => hasOb && setModalDay(day)}
                  className={`h-9 relative flex flex-col items-center justify-center rounded-lg transition-all ${hasOb ? 'cursor-pointer hover:scale-105 hover:shadow-sm' : 'cursor-default'}`}
                  style={{
                    background: isTodayCell
                      ? '#3b82f6'
                      : hasOb
                        ? (isDark ? `${dominantColor}18` : `${dominantColor}10`)
                        : 'transparent',
                    color: isTodayCell ? '#fff' : theme.text,
                    border: hasOb && !isTodayCell
                      ? `1.5px solid ${isDark ? `${dominantColor}35` : `${dominantColor}30`}`
                      : '1.5px solid transparent',
                    fontWeight: hasOb || isTodayCell ? 700 : 400,
                  }}
                >
                  <span className="text-[12px] leading-none">{day}</span>
                  {hasOb && (
                    <div className="flex gap-[2px] mt-[2px]">
                      {[...new Set(obs.map(o => o.color))].slice(0, 4).map((c, ci) => (
                        <div key={ci} className="w-[4px] h-[4px] rounded-full" style={{
                          background: isTodayCell ? 'rgba(255,255,255,0.8)' : c,
                        }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 flex flex-wrap items-center gap-3 justify-center" style={{ borderTop: `1px solid ${theme.border}` }}>
          {Object.entries(FREQ_COLORS).map(([freq, colors]) => (
            <div key={freq} className="flex items-center gap-1 text-[9px] font-medium" style={{ color: theme.textSecondary }}>
              <div className="w-[6px] h-[6px] rounded-full" style={{ background: colors.bg }} />
              {freq}
            </div>
          ))}
          <span className="text-[9px] ml-1" style={{ color: theme.textSecondary, opacity: 0.35 }}>Fuente: SRI 2026</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: Day Obligations
      ══════════════════════════════════════════════════════════════ */}
      {modalDay && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setModalDay(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden animate-fade-in"
            style={{
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              maxHeight: '80vh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: theme.text }}>
                  {modalDay} de {MONTHS[selectedMonth]}, 2026
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: theme.textSecondary }}>
                  {modalObligations.length} obligación{modalObligations.length !== 1 ? 'es' : ''} tributaria{modalObligations.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setModalDay(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-110"
                style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: theme.textSecondary }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 80px)' }}>
              {modalObligations.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <p className="text-xs" style={{ color: theme.textSecondary, opacity: 0.5 }}>Sin obligaciones este día</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {modalObligations.map((ob) => (
                    <div key={ob.id} className="rounded-xl overflow-hidden transition-all" style={{
                      border: `1px solid ${isDark ? `${ob.color}25` : `${ob.color}20`}`,
                      background: isDark ? `${ob.color}08` : `${ob.color}06`,
                    }}>
                      {/* Obligation Header */}
                      <div className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ob.color }} />
                            <h4 className="font-bold text-[13px] leading-snug" style={{ color: theme.text }}>
                              {ob.obligacion}
                            </h4>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0"
                            style={{ background: `${ob.color}18`, color: ob.color }}
                          >{ob.frecuencia}</span>
                        </div>

                        {/* Info rows */}
                        <div className="space-y-1.5 ml-[18px]">
                          <div className="flex items-start gap-1.5 text-[11px]" style={{ color: theme.textSecondary }}>
                            <Users size={11} className="flex-shrink-0 mt-0.5 opacity-50" />
                            <span><strong style={{ color: theme.text }}>Sujeto:</strong> {ob.sujeto}</span>
                          </div>
                          <div className="flex items-start gap-1.5 text-[11px]" style={{ color: theme.textSecondary }}>
                            <Clock size={11} className="flex-shrink-0 mt-0.5 opacity-50" />
                            <span><strong style={{ color: theme.text }}>Plazo:</strong> {ob.plazo}</span>
                          </div>
                          <div className="flex items-start gap-1.5 text-[11px]" style={{ color: theme.textSecondary }}>
                            <FileText size={11} className="flex-shrink-0 mt-0.5 opacity-50" />
                            <span>{ob.detalle}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
