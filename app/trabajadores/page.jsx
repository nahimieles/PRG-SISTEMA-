'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Plus, Clock, Play, Square, X, Download, Trash2, Eye, FileText, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import Sidebar from '../../components/Sidebar';
import LoginForm from '../../components/LoginForm';
import { lightTheme, darkTheme } from '../../lib/colors';
import { addRecord, calculateHours, uploadFile, getWorkerRecords, getCompanies, saveWorkerSession, getWorkerSession, clearWorkerSession, clearUnifiedSession, startAttendance, stopAttendance, getActiveAttendance, getWorkerAttendanceRecords } from '../../lib/auth.js';
import { loginUnifiedAction } from '../../lib/actions.js';
import OneDriveContainer from '../../components/OneDriveContainer';

export default function FuncionariosPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  const [activeTab, setActiveTab] = useState('asistencia'); // Changed default

  // Menú del sidebar para trabajadores
  const sidebarItems = [
    { id: 'asistencia', label: 'Asistencia', icon: Clock },
    // { id: 'registrar', label: 'Registrar Actividad', icon: Plus }, // Removed
    { id: 'historial', label: 'Mis Actividades', icon: ClipboardList },
    { id: 'archivos', label: 'Mis Archivos', icon: FileText }
  ];
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [currentWorker, setCurrentWorker] = useState(null);
  const [formData, setFormData] = useState({
    companyName: '',
    serviceType: '',
    startDateTime: '',
    endDateTime: '',
    description: ''
  });
  const [showSuccess, setShowSuccess] = useState('');
  const [file, setFile] = useState(null);
  const [myRecords, setMyRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null); // Estado para el modal


  // Estado para asistencia
  const [activeAttendance, setActiveAttendance] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Verificar sesión al montar el componente
  useEffect(() => {
    const savedSession = getWorkerSession();
    if (savedSession) {
      setCurrentWorker(savedSession);
      setIsAuthenticated(true);
      loadMyRecords(savedSession.id);
      loadAttendanceData(savedSession.id);
      getCompanies().then(setCompanies);
    } else {
      router.push('/');
    }
    setCheckingSession(false);
  }, []);

  // Cronómetro para asistencia activa
  useEffect(() => {
    let interval;
    if (activeAttendance) {
      const updateElapsed = () => {
        const checkIn = new Date(activeAttendance.check_in_time);
        const now = new Date();
        const diff = Math.floor((now - checkIn) / 1000);
        const hours = String(Math.floor(diff / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const seconds = String(diff % 60).padStart(2, '0');
        setElapsedTime(`${hours}:${minutes}:${seconds}`);
      };
      updateElapsed();
      interval = setInterval(updateElapsed, 1000);
    }
    return () => clearInterval(interval);
  }, [activeAttendance]);

  const loadAttendanceData = async (workerId) => {
    const active = await getActiveAttendance(workerId);
    setActiveAttendance(active);
    const records = await getWorkerAttendanceRecords(workerId);
    setAttendanceRecords(records);
  };

  const handleLogin = async (username, password) => {
    const result = await loginUnifiedAction(username, password);
    if (result.success && result.role === 'worker') {
      const worker = result.user;
      setCurrentWorker(worker);
      setIsAuthenticated(true);
      saveWorkerSession(worker); // Guardar sesión
      loadMyRecords(worker.id);
      loadAttendanceData(worker.id); // Cargar asistencia al login
      const companiesData = await getCompanies();
      setCompanies(companiesData);
      return { success: true };
    }
    return result;
  };

  const handleLogout = () => {
    router.push('/');
    clearWorkerSession();
    clearUnifiedSession();
    setIsAuthenticated(false);
    setCurrentWorker(null);
    setActiveAttendance(null);
    setAttendanceRecords([]);
  };

  const loadMyRecords = async (workerId) => {
    const records = await getWorkerRecords(workerId);
    setMyRecords(records);
  };

  // Handlers de asistencia
  const handleStartAttendance = async () => {
    setAttendanceLoading(true);
    const result = await startAttendance(currentWorker.id, currentWorker.full_name);
    if (result.success) {
      setActiveAttendance(result.attendance);
      loadAttendanceData(currentWorker.id);
    }
    setAttendanceLoading(false);
  };

  const handleStopAttendance = async () => {
    if (!activeAttendance) return;
    setAttendanceLoading(true);
    const result = await stopAttendance(activeAttendance.id);
    if (result.success) {
      setActiveAttendance(null);
      setElapsedTime('00:00:00');
      loadAttendanceData(currentWorker.id);
    }
    setAttendanceLoading(false);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const hoursWorked = calculateHours(formData.startDateTime, formData.endDateTime);

    if (hoursWorked < 0) {
      setShowSuccess('error-La fecha de fin debe ser posterior al inicio');
      setLoading(false);
      return;
    }

    let fileData = { filePath: null, fileUrl: null };
    if (file) {
      fileData = await uploadFile(file, `${currentWorker.id}-${Date.now()}`);
      if (!fileData.success) {
        setShowSuccess('error-Error al cargar el archivo');
        setLoading(false);
        return;
      }
    }

    const result = await addRecord({
      workerId: currentWorker.id,
      workerName: currentWorker.full_name,
      companyName: formData.companyName,
      serviceType: formData.serviceType,
      startDateTime: formData.startDateTime,
      endDateTime: formData.endDateTime,
      description: formData.description,
      hoursWorked,
      filePath: fileData.filePath,
      fileUrl: fileData.fileUrl
    });

    setLoading(false);

    if (result.success) {
      setShowSuccess('success');
      setFormData({
        companyName: '',
        serviceType: '',
        startDateTime: '',
        endDateTime: '',
        description: ''
      });
      setFile(null);
      document.getElementById('fileInput')?.reset?.();
      setTimeout(() => setShowSuccess(''), 3000);
      loadMyRecords(currentWorker.id);
    } else {
      setShowSuccess('error-Error al guardar el registro');
    }
  };

  // Mostrar loading mientras verifica sesión
  if (checkingSession) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: theme.background }}
      >
        <div className="animate-pulse">
          <img
            src="/Sin título-1-08.png"
            alt="Cargando..."
            className="w-20 h-20 object-contain opacity-50"
          />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="dashboard-layout" style={{ background: theme.background, minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sidebar
        items={sidebarItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userName={currentWorker?.full_name}
        onLogout={handleLogout}
        showBackButton={false}
        onHoverChange={setIsSidebarExpanded}
      />

      {/* Contenido Principal */}
      <main
        className="dashboard-content min-h-screen transition-all duration-300 ease-in-out p-4 lg:p-8 page-transition"
        style={{
          background: theme.background,
          color: theme.text,
          marginLeft: typeof window !== 'undefined' && window.innerWidth > 1024 ? (isSidebarExpanded ? '256px' : '72px') : '0',
          paddingTop: typeof window !== 'undefined' && window.innerWidth <= 1024 ? '80px' : '32px',
          minHeight: '100vh'
        }}
      >

        <div className="max-w-7xl mx-auto">

          {/* Sección de Asistencia */}
          {activeTab === 'asistencia' && (
            <div
              className="rounded-xl shadow-lg p-4 md:p-8 mb-6"
              style={{ background: theme.surface, borderLeft: `4px solid ${activeAttendance ? '#27ae60' : theme.primary}` }}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2" style={{ color: theme.primary }}>
                    <Clock className="w-6 h-6" /> Control de Asistencia
                  </h2>
                  <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                    {activeAttendance
                      ? `Entrada registrada: ${new Date(activeAttendance.check_in_time).toLocaleString('es-ES')}`
                      : 'Marca tu entrada al llegar a la oficina'
                    }
                  </p>
                </div>

                {activeAttendance ? (
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="text-3xl md:text-4xl font-mono font-bold px-6 py-3 rounded-xl"
                      style={{
                        background: isDark ? '#0f1419' : '#f8f9fa',
                        color: '#27ae60',
                        border: '2px solid #27ae60'
                      }}
                    >
                      {elapsedTime}
                    </div>
                    <button
                      onClick={handleStopAttendance}
                      disabled={attendanceLoading}
                      className="w-full text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      style={{ background: '#e74c3c' }}
                    >
                      <Square className="w-5 h-5" /> {attendanceLoading ? 'Procesando...' : 'Detener Asistencia'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleStartAttendance}
                    disabled={attendanceLoading}
                    className="text-white px-8 py-4 rounded-xl font-semibold hover:opacity-90 transition flex items-center gap-3 cursor-pointer disabled:opacity-50 text-lg"
                    style={{ background: '#27ae60' }}
                  >
                    <Play className="w-6 h-6" /> {attendanceLoading ? 'Procesando...' : 'Iniciar Asistencia'}
                  </button>
                )}
              </div>

              {/* Historial reciente de asistencias */}
              {attendanceRecords.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3" style={{ color: theme.textSecondary }}>Mis asistencias recientes</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead style={{ background: isDark ? '#0f1419' : '#f8f9fa' }}>
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.textSecondary }}>Fecha</th>
                          <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.textSecondary }}>Entrada</th>
                          <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.textSecondary }}>Salida</th>
                          <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.textSecondary }}>Total</th>
                          <th className="px-3 py-2 text-left font-semibold" style={{ color: theme.textSecondary }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceRecords.slice(0, 5).map(record => (
                          <tr key={record.id} className="border-b" style={{ borderColor: theme.border }}>
                            <td className="px-3 py-2 text-xs">
                              {new Date(record.check_in_time).toLocaleDateString('es-ES')}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {new Date(record.check_in_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {record.check_out_time
                                ? new Date(record.check_out_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                                : '-'
                              }
                            </td>
                            <td className="px-3 py-2">
                              {record.total_hours ? (
                                <span className="px-2 py-1 rounded-full text-white text-xs font-semibold" style={{ background: theme.primary }}>
                                  {record.total_hours}h
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className="px-2 py-1 rounded-full text-white text-xs font-semibold"
                                style={{ background: record.status === 'active' ? '#27ae60' : '#6c757d' }}
                              >
                                {record.status === 'active' ? 'Activo' : 'Completado'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}



          {/* Mis Actividades */}
          {activeTab === 'historial' && (
            <div
              className="rounded-xl shadow-lg p-4 md:p-8"
              style={{ background: theme.surface }}
            >
              <h3 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: theme.primary }}>
                Mis Actividades Registradas
              </h3>
              <p className="text-sm mb-6 opacity-60" style={{ color: theme.textSecondary }}>
                Historial de reportes y horas que has registrado manualmente en el sistema.
              </p>
              {myRecords.length === 0 ? (
                <p className="text-center py-8" style={{ color: theme.textSecondary }}>
                  Aún no tienes actividades registradas
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-white" style={{ background: theme.primary }}>
                      <tr>
                        <th className="px-4 py-3 text-left">Empresa</th>
                        <th className="px-4 py-3 text-left">Inicio</th>
                        <th className="px-4 py-3 text-left">Fin</th>
                        <th className="px-4 py-3 text-left">Horas</th>
                        <th className="px-4 py-3 text-left">Archivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myRecords.map(record => (
                        <tr
                          key={record.id}
                          className="border-b transition-colors cursor-pointer"
                          style={{
                            borderColor: theme.border,
                            background: isDark ? 'transparent' : '#f8f9fa'
                          }}
                          onClick={() => setSelectedRecord(record)}
                          onMouseEnter={(e) => e.currentTarget.style.background = isDark ? '#1a2f5a' : '#f1f5f9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = isDark ? 'transparent' : '#f8f9fa'}
                        >
                          <td className="px-4 py-3 font-semibold">{record.company_name}</td>
                          <td className="px-4 py-3 text-xs">{new Date(record.start_datetime).toLocaleString('es-ES')}</td>
                          <td className="px-4 py-3 text-xs">{new Date(record.end_datetime).toLocaleString('es-ES')}</td>
                          <td className="px-4 py-3">
                            <span
                              className="px-3 py-1 rounded-full font-semibold text-white text-sm"
                              style={{ background: theme.primary }}
                            >
                              {record.hours_worked}h
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {record.file_url ? (
                              <span className="flex items-center gap-1" style={{ color: theme.secondary }}>
                                <FileText className="w-3 h-3" /> Archivo
                              </span>
                            ) : (
                              <span style={{ color: theme.textSecondary }}>-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Archivos OneDrive */}
          <div style={{ display: activeTab === 'archivos' ? 'block' : 'none' }}>
            <div className="animate-fade-in space-y-6">
              <div className="rounded-[2.5rem] shadow-xl overflow-hidden border transition-all duration-500 hover:shadow-2xl" 
                   style={{ background: theme.surface, borderColor: theme.border }}>
                <OneDriveContainer />
              </div>
            </div>
          </div>

          {/* Modal de detalle de registro */}
          {selectedRecord && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-animate"
              style={{ background: 'rgba(0,0,0,0.7)' }}
              onClick={() => setSelectedRecord(null)}
            >
              <div
                className="w-full max-w-4xl max-h-[90vh] overflow-auto rounded-xl shadow-lg modal-scroll"
                style={{ background: theme.surface }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header del modal */}
                <div className="sticky top-0 p-6 flex justify-between items-center border-b z-10" style={{ borderColor: theme.border, background: theme.surface }}>
                  <h2 className="text-xl font-bold" style={{ color: theme.primary }}>
                    Detalle de Actividad
                  </h2>
                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="p-2 rounded-lg hover:opacity-70 cursor-pointer transition-colors"
                    style={{ background: isDark ? '#333' : '#eee' }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Contenido del modal */}
                <div className="p-6 space-y-6">
                  {/* Información del registro */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg card-professional" style={{ background: isDark ? '#1a1a2e' : '#f8f9fa' }}>
                      <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>Empresa</p>
                      <p className="text-lg font-bold">{selectedRecord.company_name}</p>
                    </div>
                    <div className="p-4 rounded-lg card-professional" style={{ background: isDark ? '#1a1a2e' : '#f8f9fa' }}>
                      <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>Tipo de Servicio</p>
                      <p className="text-lg font-bold capitalize">{selectedRecord.service_type || 'No especificado'}</p>
                    </div>
                    <div className="p-4 rounded-lg card-professional" style={{ background: isDark ? '#1a1a2e' : '#f8f9fa' }}>
                      <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>Fecha/Hora Inicio</p>
                      <p className="font-semibold">{new Date(selectedRecord.start_datetime).toLocaleString('es-ES')}</p>
                    </div>
                    <div className="p-4 rounded-lg card-professional" style={{ background: isDark ? '#1a1a2e' : '#f8f9fa' }}>
                      <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>Fecha/Hora Fin</p>
                      <p className="font-semibold">{new Date(selectedRecord.end_datetime).toLocaleString('es-ES')}</p>
                    </div>
                    <div className="p-4 rounded-lg card-professional shadow-lg" style={{ background: theme.primary }}>
                      <p className="text-sm font-medium text-white opacity-80">Horas Trabajadas</p>
                      <p className="text-2xl font-bold text-white">{selectedRecord.hours_worked}h</p>
                    </div>
                    <div className="p-4 rounded-lg card-professional" style={{ background: isDark ? '#1a1a2e' : '#f8f9fa' }}>
                      <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>Registrado</p>
                      <p className="font-semibold">{new Date(selectedRecord.created_at).toLocaleString('es-ES')}</p>
                    </div>
                  </div>

                  {/* Descripción */}
                  <div className="p-4 rounded-lg card-professional" style={{ background: isDark ? '#1a1a2e' : '#f8f9fa' }}>
                    <p className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Descripción</p>
                    <p className="whitespace-pre-wrap">{selectedRecord.description || 'Sin descripción'}</p>
                  </div>

                  {/* Visor de archivo */}
                  {selectedRecord.file_url ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>Archivo Adjunto</p>
                        <a
                          href={selectedRecord.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-lg text-white text-sm flex items-center gap-2 hover:opacity-90 shadow-professional"
                          style={{ background: theme.primary }}
                        >
                          <Download className="w-4 h-4" /> Descargar
                        </a>
                      </div>
                      <div className="border rounded-lg overflow-hidden shadow-professional" style={{ borderColor: theme.border }}>
                        {/* Visor según tipo de archivo */}
                        {selectedRecord.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img
                            src={selectedRecord.file_url}
                            alt="Archivo adjunto"
                            className="w-full max-h-96 object-contain"
                          />
                        ) : selectedRecord.file_url.match(/\.pdf$/i) ? (
                          <iframe
                            src={selectedRecord.file_url}
                            className="w-full h-96"
                            title="Vista previa PDF"
                          />
                        ) : (
                          /* Para .doc, .docx, .xlsx, .xls usar Google Docs Viewer */
                          <iframe
                            src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedRecord.file_url)}&embedded=true`}
                            className="w-full h-96"
                            title="Vista previa documento"
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center rounded-lg card-professional" style={{ background: isDark ? '#1a1a2e' : '#f8f9fa' }}>
                      <p style={{ color: theme.textSecondary }}>No hay archivo adjunto</p>
                    </div>
                  )}
                </div>

                {/* Footer del modal */}
                <div className="sticky bottom-0 p-4 border-t flex justify-end gap-3 z-10" style={{ borderColor: theme.border, background: theme.surface }}>
                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="px-6 py-2 rounded-lg font-semibold cursor-pointer shadow-professional"
                    style={{ background: theme.primary, color: 'white' }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
