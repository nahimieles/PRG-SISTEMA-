'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Plus, Clock, Play, Square, X, Download, Trash2, Eye, FileText, ClipboardList, PieChart, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import Sidebar from '../../components/Sidebar';
import LoginForm from '../../components/LoginForm';
import { lightTheme, darkTheme } from '../../lib/colors';
import { addRecord, deleteRecord, calculateHours, uploadFile, getWorkerRecords, getCompanies, saveWorkerSession, getWorkerSession, clearWorkerSession, clearUnifiedSession, startAttendance, stopAttendance, getActiveAttendance, getWorkerAttendanceRecords } from '../../lib/auth.js';
import { loginUnifiedAction } from '../../lib/actions.js';
import OneDriveContainer from '../../components/OneDriveContainer';
import dynamic from 'next/dynamic';

const RealTimeMonitor = dynamic(() => import('../../components/RealTimeMonitor'), { ssr: false });
const CompanyManager = dynamic(() => import('../../components/CompanyManager'), { ssr: false });
const CourseViewer = dynamic(() => import('../../components/CourseViewer'), { ssr: false });

const SearchableSelect = ({ options, value, onChange, placeholder, isDark, theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearch(value);
    }
  }, [value, isOpen]);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        required
        value={isOpen ? search : value}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          setSearch(value);
          setIsOpen(true);
        }}
        placeholder={placeholder}
        className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
        style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
      />
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 max-h-48 overflow-auto rounded-lg border shadow-2xl" style={{ background: theme.surface, borderColor: theme.border }}>
          {filteredOptions.length > 0 ? filteredOptions.map((opt, i) => (
            <div
              key={i}
              onClick={() => {
                onChange(opt);
                setSearch(opt);
                setIsOpen(false);
              }}
              className="px-4 py-2 cursor-pointer text-sm font-medium transition-colors border-b last:border-b-0"
              style={{ color: theme.text, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {opt}
            </div>
          )) : (
            <div className="px-4 py-3 text-sm opacity-60 italic flex flex-col gap-1" style={{ color: theme.text }}>
              <span>No se encontraron coincidencias.</span>
              <span className="opacity-70 text-xs">Se usará "{search}" como un nuevo valor.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function FuncionariosPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  const [activeTab, setActiveTab] = useState('dashboards'); // Changed default

  // Menú del sidebar para trabajadores
  const sidebarItems = [
    { id: 'dashboards', label: 'Dashboards y Actividades', icon: PieChart },
    { id: 'empresas', label: 'Empresas', icon: Building2 },
    { id: 'cursos', label: 'Pruebas', icon: Play }
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

  const handleDeleteRecord = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
      const success = await deleteRecord(id);
      if (success) {
        setShowSuccess('success-Registro eliminado correctamente');
        setSelectedRecord(null);
        loadMyRecords(currentWorker.id);
      } else {
        setShowSuccess('error-Error al eliminar el registro');
      }
      setTimeout(() => setShowSuccess(''), 3000);
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

          {activeTab === 'dashboards' && (
            <div className="animate-fade-in space-y-8">
              <RealTimeMonitor isWorker={true} />
              
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Formulario Registrar Actividad */}
                <div className="xl:col-span-1">
                  <div className="rounded-xl shadow-lg p-6 h-full border" style={{ background: theme.surface, borderColor: theme.border }}>
                    <h3 className="text-xl font-bold mb-4" style={{ color: theme.primary }}>Registrar Actividad Manual</h3>
                    {showSuccess && (
                      <div className={`p-4 rounded-lg mb-6 flex items-center justify-between ${showSuccess.startsWith('error') ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'}`}>
                        <div className="flex items-center gap-3">
                          {showSuccess.startsWith('error') ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                          <span className="font-medium text-sm">{showSuccess.startsWith('error') ? showSuccess.split('-')[1] : 'Registro guardado exitosamente.'}</span>
                        </div>
                      </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Empresa</label>
                        <SearchableSelect
                          options={companies.map(c => c.name)}
                          value={formData.companyName}
                          onChange={(val) => setFormData({ ...formData, companyName: val })}
                          placeholder="Buscar o escribir empresa..."
                          isDark={isDark}
                          theme={theme}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Sistema / Actividad</label>
                        <SearchableSelect
                          options={['Contífico', 'Perseo', 'SRI', 'IESS', 'Reunión', 'Otro']}
                          value={formData.serviceType}
                          onChange={(val) => setFormData({ ...formData, serviceType: val })}
                          placeholder="Seleccionar o escribir actividad..."
                          isDark={isDark}
                          theme={theme}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Fecha Inicio</label>
                          <input
                            type="datetime-local" required
                            value={formData.startDateTime}
                            onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border outline-none text-xs"
                            style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Fecha Fin</label>
                          <input
                            type="datetime-local" required
                            value={formData.endDateTime}
                            onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border outline-none text-xs"
                            style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Descripción (opcional)</label>
                        <textarea
                          rows="2"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border outline-none resize-none text-sm"
                          style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
                        ></textarea>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Evidencia (Opcional)</label>
                        <input
                          id="fileInput"
                          type="file"
                          onChange={(e) => setFile(e.target.files[0])}
                          className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
                          style={{ color: theme.textSecondary }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md flex justify-center items-center gap-2"
                      >
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Plus size={18} /> Guardar Actividad</>}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Tabla Mis Actividades */}
                <div className="xl:col-span-2">
                  <div
                    className="rounded-xl shadow-lg p-4 md:p-6 h-full border flex flex-col"
                    style={{ background: theme.surface, borderColor: theme.border }}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-xl font-bold" style={{ color: theme.primary }}>
                          Mis Actividades Registradas
                        </h3>
                        <p className="text-sm opacity-60" style={{ color: theme.textSecondary }}>
                          Historial de reportes registrados manualmente.
                        </p>
                      </div>
                    </div>
                    {myRecords.length === 0 ? (
                      <p className="text-center py-8 flex-1 flex items-center justify-center" style={{ color: theme.textSecondary }}>
                        Aún no tienes actividades registradas
                      </p>
                    ) : (
                      <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm">
                          <thead className="text-white rounded-t-lg" style={{ background: theme.primary }}>
                            <tr>
                              <th className="px-4 py-3 text-left first:rounded-tl-lg">Empresa</th>
                              <th className="px-4 py-3 text-left">Actividad</th>
                              <th className="px-4 py-3 text-left">Inicio</th>
                              <th className="px-4 py-3 text-left">Fin</th>
                              <th className="px-4 py-3 text-left">Horas</th>
                              <th className="px-4 py-3 text-left last:rounded-tr-lg">Archivo</th>
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
                                <td className="px-4 py-3 text-xs capitalize font-medium">{record.service_type || 'No especificado'}</td>
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
                </div>
              </div>
            </div>
          )}

          {activeTab === 'empresas' && (
            <div className="animate-fade-in space-y-6">
              <CompanyManager isWorker={true} />
            </div>
          )}

          {activeTab === 'cursos' && (
            <div className="animate-fade-in">
              <CourseViewer adminPreview={true} />
            </div>
          )}



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
                    onClick={() => handleDeleteRecord(selectedRecord.id)}
                    className="px-4 py-2 rounded-lg text-white flex items-center gap-2 hover:opacity-90 cursor-pointer shadow-professional"
                    style={{ background: '#e74c3c' }}
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
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
