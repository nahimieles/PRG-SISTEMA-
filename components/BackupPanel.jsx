"use client";

import React, { useState, useEffect } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/authConfig";
import { initializeGraphClient, getFollowedSites, getSiteDefaultDrive } from "@/lib/onedriveService";
import { createFullBackup, uploadBackupToOneDrive, getBackupsList, logBackupAction, downloadBackup } from "@/lib/backupService";
import { useTheme } from '@/contexts/ThemeContext';
import { lightTheme, darkTheme } from '@/lib/colors';
import { Download, HardDrive, Loader2, CheckCircle2, AlertCircle, FolderArchive, Cloud, History, ExternalLink, Calendar } from 'lucide-react';

const BackupPanel = ({ currentUser }) => {
    const { instance, accounts } = useMsal();
    const { isDark } = useTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const [isBackingUp, setIsBackingUp] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, file: '' });
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState(null);
    const [lastBackup, setLastBackup] = useState(null);
    const [backupsList, setBackupsList] = useState([]);
    const [loadingBackups, setLoadingBackups] = useState(false);

    // Load existing backups on mount
    useEffect(() => {
        loadBackupsList();
    }, [accounts]);

    const loadBackupsList = async () => {
        if (accounts.length === 0) return;

        setLoadingBackups(true);
        try {
            const request = { ...loginRequest, account: accounts[0] };
            const response = await instance.acquireTokenSilent(request);
            const backups = await getBackupsList(response.accessToken);
            setBackupsList(backups);
        } catch (err) {
            console.error('Error loading backups:', err);
        } finally {
            setLoadingBackups(false);
        }
    };

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
        let accessToken = '';

        try {
            const request = { ...loginRequest, account: accounts[0] };
            const response = await instance.acquireTokenSilent(request);
            accessToken = response.accessToken;
            initializeGraphClient(accessToken);

            setProgress({ current: 0, total: 0, file: 'Obteniendo lista de sitios...' });
            const sites = await getFollowedSites();

            const sitesWithDrives = [];
            for (const site of sites) {
                try {
                    setProgress({ current: 0, total: 0, file: `Escaneando ${site.displayName}...` });
                    const driveId = await getSiteDefaultDrive(site.id);
                    if (driveId) {
                        sitesWithDrives.push({ ...site, driveId });
                    }
                } catch (e) {
                    console.warn(`Could not get drive for ${site.displayName}`);
                }
            }

            if (sitesWithDrives.length === 0) {
                throw new Error('No se encontraron sitios con drives accesibles');
            }

            setStatus('downloading');

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

            // Upload to OneDrive
            setStatus('uploading');
            const filename = `Backup_SharePoint_${new Date().toISOString().split('T')[0]}_${Date.now()}.zip`;

            const uploadResult = await uploadBackupToOneDrive(
                accessToken,
                zipBlob,
                filename,
                (msg) => setProgress({ current: 0, total: 0, file: msg })
            );

            // Log the action
            await logBackupAction(
                currentUser?.full_name || 'Admin',
                totalFilesCount,
                zipBlob.size,
                'onedrive'
            );

            setLastBackup({
                date: new Date(),
                fileCount: totalFilesCount,
                size: zipBlob.size,
                webUrl: uploadResult?.webUrl
            });

            // Reload backups list
            await loadBackupsList();

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

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'scanning':
            case 'downloading':
            case 'compressing':
            case 'uploading':
                return <Loader2 className="w-6 h-6 animate-spin" style={{ color: theme.primary }} />;
            case 'done':
                return <CheckCircle2 className="w-6 h-6 text-green-500" />;
            case 'error':
                return <AlertCircle className="w-6 h-6 text-red-500" />;
            default:
                return <Cloud className="w-6 h-6" style={{ color: theme.primary }} />;
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
            case 'uploading':
                return 'Subiendo a OneDrive...';
            case 'done':
                return '¡Respaldo completado y guardado en OneDrive!';
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
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <div
                    className="p-3 rounded-xl"
                    style={{ background: `${theme.primary}20` }}
                >
                    <HardDrive size={24} style={{ color: theme.primary }} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold" style={{ color: theme.text }}>
                        Respaldo de SharePoint
                    </h3>
                    <p className="text-sm" style={{ color: theme.textSecondary }}>
                        Los respaldos se guardan en tu OneDrive personal
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
                                    width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '5%',
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
                    <div className="mt-3 text-sm space-y-1" style={{ color: theme.textSecondary }}>
                        <p>✓ {lastBackup.fileCount} archivos respaldados</p>
                        <p>✓ Tamaño: {formatBytes(lastBackup.size)}</p>
                        <p>✓ Guardado en OneDrive/Backups_PRG</p>
                        {lastBackup.webUrl && (
                            <a
                                href={lastBackup.webUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-500 hover:underline mt-2"
                            >
                                <ExternalLink size={14} /> Ver en OneDrive
                            </a>
                        )}
                    </div>
                )}
            </div>

            {/* Backup Button */}
            <button
                onClick={handleBackup}
                disabled={isBackingUp}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: theme.primary }}
            >
                {isBackingUp ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Respaldando...
                    </>
                ) : (
                    <>
                        <Cloud className="w-5 h-5" />
                        Hacer Respaldo a OneDrive
                    </>
                )}
            </button>

            {/* Previous Backups */}
            {backupsList.length > 0 && (
                <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                        <History size={16} style={{ color: theme.textSecondary }} />
                        <span className="text-sm font-medium" style={{ color: theme.text }}>
                            Respaldos anteriores
                        </span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {backupsList.slice(0, 5).map((backup) => (
                            <div
                                key={backup.id}
                                className="flex items-center justify-between p-3 rounded-lg"
                                style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <FolderArchive size={18} className="flex-shrink-0 text-blue-500" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: theme.text }}>
                                            {backup.name}
                                        </p>
                                        <p className="text-xs" style={{ color: theme.textSecondary }}>
                                            {formatDate(backup.createdDateTime)} • {formatBytes(backup.size)}
                                        </p>
                                    </div>
                                </div>
                                {backup['@microsoft.graph.downloadUrl'] && (
                                    <a
                                        href={backup['@microsoft.graph.downloadUrl']}
                                        download
                                        className="p-2 rounded-lg hover:bg-blue-500/10 transition-colors"
                                        title="Descargar"
                                    >
                                        <Download size={16} className="text-blue-500" />
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <p className="text-xs mt-4 text-center" style={{ color: theme.textSecondary }}>
                Los respaldos se guardan en OneDrive/Backups_PRG
                <br />
                Solo administradores pueden crear respaldos
            </p>
        </div>
    );
};

export default BackupPanel;
