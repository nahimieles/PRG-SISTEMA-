"use client";
import React from 'react';
import { Loader2 } from 'lucide-react';
export default function AuthCallback() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">Autenticando con Microsoft...</p>
            <p className="text-sm text-gray-400 mt-2">Esta ventana se cerrará automáticamente.</p>
        </div>
    );
}
