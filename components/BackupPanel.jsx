"use client";

import React, { useState } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getFollowedSites, getSiteDefaultDrive } from "@/lib/onedriveService";
import { createFullBackup, downloadBackup, logBackupAction } from "@/lib/backupService";
import { useTheme } from '@/contexts/ThemeContext';
import { lightTheme, darkTheme } from '@/lib/colors';
import { Download, Server, HardDrive, Loader2, CheckCircle2, AlertCircle, FolderArchive } from 'lucide-react';

const BackupPanel = ({ currentUser }) => {
    const { instance, accounts } = useMsal();
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [isBackingUp, setIsBackingUp] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, file: '' });
    const [status, setStatus] = useState('idle'); // 'idle', 'scanning', 'downloading', 'compressing', 'done', 'error'
    const [error, setError] = useState(null);
    const [lastBackup, setLastBackup] = useState(null);

    const handleBackup = async () => {
        if (accounts.length === 0) {
            alert('Por favor, conecta tu cuenta de Microsoft primero');
            return;
        }

        setIsBackingUp(true);
        setError(null);
        setStatus('scanning');
        setProgress({ current: 0, total: 0, file: 'Preparando...' });

        let totalFilesCount = 0;

        try {
            // Get access token
            const request = { ...loginRequest, account: accounts[0] };
            const response = await instance.acquireTokenSilent(request);
            const accessToken = response.accessToken;
            initializeGraphClient(accessToken);

            // Get all sites
            setProgress({ current: 0, total: 0, file: 'Obteniendo lista de sitios...' });
            const sites = await getFollowedSites();

            // Get drive IDs for each site
            const sitesWithDrives = [];
            for (const site of sites) {
                try {
                    setProgress({ current: 0, total: 0, file: `Escaneando ${site.displayName}...` });
                    const driveId = await getSiteDefaultDrive(site.id);
                    if (driveId) {
                        sitesWithDrives.push({
                            ...site,
                            driveId
                        });
                    }
                } catch (e) {
                    console.warn(`Could not get drive for ${site.displayName}`);
                }
            }

            if (sitesWithDrives.length === 0) {
                throw new Error('No se encontraron sitios con drives accesibles');
            }

            setStatus('downloading');

            // Create backup - pass access token
            const zipBlob = await createFullBackup(
                accessToken,
                sitesWithDrives,
                (current, total, file) => {
                    totalFilesCount = total;
                    setProgress({ current, total, file });
                    if (file.includes('Comprimiendo')) {
                        setStatus('compressing');
                    }
                }
            );

            // Download the file
            const filename = `Backup_SharePoint_${new Date().toISOString().split('T')[0]}.zip`;
            downloadBackup(zipBlob, filename);

            // Log the action
            await logBackupAction(
                currentUser?.full_name || 'Admin',
                totalFilesCount,
                zipBlob.size
            );

            setLastBackup({
                date: new Date(),
                fileCount: totalFilesCount,
                size: zipBlob.size
            });

            setStatus('done');
        } catch (err) {
            console.error('Backup error:', err);
            setError(err.message);
            setStatus('error');
        } finally {
            setIsBackingUp(false);
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'scanning':
            case 'downloading':
            case 'compressing':
                return <Loader2 className="w-6 h-6 animate-spin" style={{ color: theme.primary }} />;
            case 'done':
                return <CheckCircle2 className="w-6 h-6 text-green-500" />;
            case 'error':
                return <AlertCircle className="w-6 h-6 text-red-500" />;
            default:
                return <FolderArchive className="w-6 h-6" style={{ color: theme.primary }} />;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'scanning':
                return 'Escaneando sitios...';
            case 'downloading':
                return `Descargando archivos (${progress.current}/${progress.total})`;
            case 'compressing':
                return 'Comprimiendo respaldo...';
            case 'done':
                return '¡Respaldo completado!';
            case 'error':
                return 'Error en el respaldo';
            default:
                return 'Listo para respaldar';
        }
    };

    return (
        <div
            className="rounded-2xl p-6 border"
            style={{ background: theme.surface, borderColor: theme.border }}
        >
            <div className="flex items-center gap-4 mb-6">
                <div
                    className="p-3 rounded-xl"
                    style={{ background: `${theme.primary}20` }}
                >
                    <HardDrive size={24} style={{ color: theme.primary }} />
                </div>
                <div>
                    <h3 className="text-lg font-bold" style={{ color: theme.text }}>
                        Respaldo de SharePoint
                    </h3>
                    <p className="text-sm" style={{ color: theme.textSecondary }}>
                        Descarga una copia completa de todos los archivos
                    </p>
                </div>
            </div>

            {/* Status Card */}
            <div
                className="rounded-xl p-4 mb-6"
                style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
            >
                <div className="flex items-center gap-3 mb-3">
                    {getStatusIcon()}
                    <span className="font-medium" style={{ color: theme.text }}>
                        {getStatusText()}
                    </span>
                </div>

                {isBackingUp && (
                    <>
                        <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 mb-2">
                            <div
                                className="h-2 rounded-full transition-all duration-300"
                                style={{
                                    width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%',
                                    background: theme.primary
                                }}
                            />
                        </div>
                        <p className="text-xs truncate" style={{ color: theme.textSecondary }}>
                            {progress.file}
                        </p>
                    </>
                )}

                {error && (
                    <p className="text-sm text-red-500 mt-2">{error}</p>
                )}

                {lastBackup && status === 'done' && (
                    <div className="mt-3 text-sm" style={{ color: theme.textSecondary }}>
                        <p>✓ {lastBackup.fileCount} archivos respaldados</p>
                        <p>✓ Tamaño: {formatBytes(lastBackup.size)}</p>
                        <p>✓ Fecha: {lastBackup.date.toLocaleString()}</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    onClick={handleBackup}
                    disabled={isBackingUp}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: theme.primary }}
                >
                    {isBackingUp ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Respaldando...
                        </>
                    ) : (
                        <>
                            <Download className="w-5 h-5" />
                            Hacer Respaldo Completo
                        </>
                    )}
                </button>
            </div>

            <p className="text-xs mt-4 text-center" style={{ color: theme.textSecondary }}>
                El respaldo incluye todos los sitios de SharePoint accesibles.
                <br />
                Dependiendo del tamaño, puede tardar varios minutos.
            </p>
        </div>
    );
};

export default BackupPanel;
