'use client';

import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-6 right-6 z-[100] animate-toast-in">
            <div className={`px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 border ${type === 'success'
                ? 'bg-[#151a25] border-blue-500/50 text-white'
                : 'bg-red-900/90 border-red-500 text-white'}`}>
                {type === 'success' ? (
                    <CheckCircle className="text-blue-400" size={24} />
                ) : (
                    <X className="text-red-400" size={24} />
                )}
                <div>
                    <p className="font-bold text-sm">{type === 'success' ? 'Éxito' : 'Error'}</p>
                    <p className="text-xs text-gray-400">{message}</p>
                </div>
            </div>
            <style jsx global>{`
                @keyframes toast-in {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-toast-in {
                    animation: toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
        </div>
    );
}
