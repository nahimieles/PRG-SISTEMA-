'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Settings, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../lib/colors';
import { supabase } from '../lib/supabase';
import { getAdminSession, getWorkersWithoutReports } from '../lib/auth';

export default function NotificationBell({ workerId = null }) {
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        let channel = null;

        const fetchAll = async () => {
            const session = getAdminSession();
            const isWorker = Boolean(workerId);
            const isAdmin = Boolean(session?.id) && !isWorker;

            if (isWorker) {

                const { data, error } = await supabase
                    .from('notificaciones')
                    .select('*')
                    .eq('worker_id', workerId)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (error) {

                } else if (data && isMounted) {
                    setNotifications(data);
                    setUnreadCount(data.filter(n => !n.leida).length);
                }

                channel = supabase.channel('notificaciones_changes')
                    .on('postgres_changes', { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'notificaciones',
                        filter: `worker_id=eq.${workerId}`
                    }, (payload) => {
                        setNotifications(prev => [payload.new, ...prev]);
                        setUnreadCount(prev => prev + 1);
                    })
                    .subscribe();
            } else if (isAdmin) {

                const workersWithout = await getWorkersWithoutReports(3);
                if (workersWithout && workersWithout.length > 0 && isMounted) {
                    const readNotifs = JSON.parse(localStorage.getItem('adminReadNotifs') || '[]');
                    const deletedNotifs = JSON.parse(localStorage.getItem('adminDeletedNotifs') || '[]');

                    const adminNotifs = workersWithout
                        .filter(w => !deletedNotifs.includes(`admin-notif-${w.id}`))
                        .map((w) => ({
                            id: `admin-notif-${w.id}`,
                            titulo: 'Inactividad Detectada',
                            mensaje: `${w.name} lleva más de 3 días sin registrar reportes.`,
                            tipo: 'alerta',
                            created_at: new Date().toISOString(),
                            leida: readNotifs.includes(`admin-notif-${w.id}`),
                            isAdminLocal: true
                        }));
                    setNotifications(adminNotifs);
                    setUnreadCount(adminNotifs.filter(n => !n.leida).length);
                } else {
                    setNotifications([]);
                    setUnreadCount(0);
                }
            }
        };

        fetchAll();

        return () => {
            isMounted = false;
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [workerId]); 

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id, isAdminLocal) => {
        if (isAdminLocal) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            const readNotifs = JSON.parse(localStorage.getItem('adminReadNotifs') || '[]');
            if (!readNotifs.includes(id)) {
                localStorage.setItem('adminReadNotifs', JSON.stringify([...readNotifs, id]));
            }
            return;
        }

        const { error } = await supabase
            .from('notificaciones')
            .update({ leida: true })
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    };

    const markAllAsRead = async () => {
        if (unreadCount === 0) return;

        const unreadIds = notifications.filter(n => !n.leida && !n.isAdminLocal).map(n => n.id);

        if (unreadIds.length > 0) {
            await supabase
                .from('notificaciones')
                .update({ leida: true })
                .in('id', unreadIds);
        }

        const localUnreadIds = notifications.filter(n => !n.leida && n.isAdminLocal).map(n => n.id);
        if (localUnreadIds.length > 0) {
            const readNotifs = JSON.parse(localStorage.getItem('adminReadNotifs') || '[]');
            localStorage.setItem('adminReadNotifs', JSON.stringify([...new Set([...readNotifs, ...localUnreadIds])]));
        }

        setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
        setUnreadCount(0);
    };

    const deleteNotification = async (id, isAdminLocal) => {
        if (isAdminLocal) {
            const wasUnread = notifications.find(n => n.id === id)?.leida === false;
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
            const deletedNotifs = JSON.parse(localStorage.getItem('adminDeletedNotifs') || '[]');
            if (!deletedNotifs.includes(id)) {
                localStorage.setItem('adminDeletedNotifs', JSON.stringify([...deletedNotifs, id]));
            }
            return;
        }

        const { error } = await supabase
            .from('notificaciones')
            .delete()
            .eq('id', id);

        if (!error) {
            const wasUnread = notifications.find(n => n.id === id)?.leida === false;
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'tarea': return <Check size={16} style={{ color: theme.primary }} />;
            case 'evento': return <Bell size={16} className="text-purple-500" />;
            case 'sistema': return <Settings size={16} style={{ color: theme.textSecondary }} />;
            case 'alerta': return <AlertCircle size={16} className="text-orange-500" />;
            default: return <Bell size={16} style={{ color: theme.primary }} />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full transition-colors"
                style={{ color: theme.textSecondary, background: isOpen ? (isDark ? '#333' : '#f0f0f0') : 'transparent' }}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm" style={{ background: '#ef4444' }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div 
                    className="absolute right-0 bottom-full lg:right-auto lg:left-full lg:-bottom-2 lg:ml-2 mb-2 lg:mb-0 w-80 sm:w-96 rounded-xl shadow-xl border overflow-hidden z-[9999] animate-in fade-in"
                    style={{ background: theme.surface, borderColor: theme.border }}
                >
                    <div className="p-3 border-b flex justify-between items-center" style={{ borderColor: theme.border }}>
                        <h3 className="font-bold text-sm" style={{ color: theme.text }}>Notificaciones</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllAsRead}
                                className="text-xs hover:underline transition-opacity"
                                style={{ color: theme.primary }}
                            >
                                Marcar todas como leídas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-sm" style={{ color: theme.textSecondary }}>
                                No tienes notificaciones recientes
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div 
                                    key={notif.id} 
                                    className={`p-3 border-b flex gap-3 group transition-colors cursor-pointer ${notif.leida ? 'opacity-70' : 'bg-black/5 dark:bg-white/5'}`}
                                    style={{ borderColor: theme.border }}
                                    onClick={() => !notif.leida && markAsRead(notif.id, notif.isAdminLocal)}
                                >
                                    <div className="mt-1 flex-shrink-0">
                                        {getIcon(notif.tipo)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>
                                            {notif.titulo}
                                        </p>
                                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: theme.textSecondary }}>
                                            {notif.mensaje}
                                        </p>
                                        <p className="text-[10px] mt-1 opacity-70" style={{ color: theme.textSecondary }}>
                                            {new Date(notif.created_at).toLocaleString('es-ES')}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id, notif.isAdminLocal); }}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 hover:text-red-600 rounded text-gray-400 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
