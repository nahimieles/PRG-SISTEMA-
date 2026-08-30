"use client";
import RealTimeMonitor from "@/components/RealTimeMonitor";
import ActiveDocumentViewer from "@/components/ActiveDocumentViewer";
import { Shield } from "lucide-react";
export default function AdminMonitorPage() {
    return (
        <div className="min-h-screen p-6 space-y-6">
            {}
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                    <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Monitor de Actividad</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Panel de auditoría en tiempo real — SharePoint / OneDrive
                    </p>
                </div>
            </div>
            {}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                        📡 Documentos en edición (últimos 5 min)
                    </h2>
                    <ActiveDocumentViewer />
                </div>
                <div className="flex flex-col gap-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                        ⚡ Todos los eventos en tiempo real
                    </h2>
                    <RealTimeMonitor />
                </div>
            </div>
        </div>
    );
}
