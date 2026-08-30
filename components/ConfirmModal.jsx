import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, theme, isDark }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div 
                className="w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in"
                style={{ background: theme.surface, borderColor: theme.border, borderWidth: '1px' }}
            >
                {}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-black/5 dark:bg-white/5" style={{ borderColor: theme.border }}>
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={20} className="text-red-500" />
                        <h3 className="font-black text-sm uppercase tracking-wider" style={{ color: theme.text }}>
                            {title || 'Confirmar Acción'}
                        </h3>
                    </div>
                    <button 
                        onClick={onCancel}
                        className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        style={{ color: theme.textSecondary }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {}
                <div className="px-6 py-6">
                    <p className="text-sm font-medium leading-relaxed" style={{ color: theme.textSecondary }}>
                        {message}
                    </p>
                </div>

                {}
                <div className="px-6 py-4 border-t flex justify-end gap-3 bg-black/5 dark:bg-white/5" style={{ borderColor: theme.border }}>
                    <button 
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-xs font-bold transition-colors border"
                        style={{ color: theme.text, borderColor: theme.border, background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff' }}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                    >
                        Sí, Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
}
