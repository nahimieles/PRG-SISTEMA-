'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { LogOut, Plus, Trash2, Eye, EyeOff, Download, Calendar, Users, Settings, BarChart3, FileText, AlertCircle, PieChart, Clock, Building2, TrendingUp, UserCheck, RefreshCw, X, LayoutGrid, Folder, MonitorPlay, Edit2, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import Sidebar from '../../components/Sidebar';
import LoginForm from '../../components/LoginForm';
import StatsCard from '../../components/StatsCard';
import { getRecords, deleteRecord, exportToCSV, exportToExcel, getCompanies, deleteCompany, saveAdminSession, getAdminSession, clearAdminSession, clearUnifiedSession, getWorkersWithoutReports, getQualityIssues, getRealTimeStats, getAllAttendanceRecords, getActiveAttendances, getAttendanceStats, deleteAttendanceRecord } from '../../lib/auth.js';
import { createWorkerAction, updateWorkerAction, createCompanyAction, updateCompanyAction, loginUnifiedAction, updateAdminAction } from '../../lib/actions.js';
import { lightTheme, darkTheme } from '../../lib/colors';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import AuditLogsTable from '../../components/AuditLogsTable';
import Toast from '../../components/Toast';

// Dynamic imports for MSAL-dependent components to avoid SSR issues
import { getAuditLogs } from '../../lib/audit'; // Added import

// Dynamic imports for MSAL-dependent components to avoid SSR issues
const OneDriveContainer = dynamic(() => import('../../components/OneDriveContainer'), { ssr: false });
const SmartReportGenerator = dynamic(() => import('../../components/SmartReportGenerator'), { ssr: false });
const RealTimeMonitor = dynamic(() => import('../../components/RealTimeMonitor'), { ssr: false });
const CourseEditor = dynamic(() => import('../../components/CourseEditor'), { ssr: false });
const CourseViewer = dynamic(() => import('../../components/CourseViewer'), { ssr: false });
const CompanyManager = dynamic(() => import('../../components/CompanyManager'), { ssr: false });
const RecruitmentManager = dynamic(() => import('../../components/recruitment/RecruitmentManager'), { ssr: false });

export default function AdminPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  // Menú de navegación del sidebar
  const sidebarItems = [
    { id: 'dashboards', label: 'Dashboards', icon: PieChart },
    { id: 'reportes', label: 'Reportes', icon: Calendar },
    { id: 'funcionarios', label: 'Funcionarios', icon: Users },
    { id: 'empresas', label: 'Empresas', icon: Building2 },
    { id: 'archivos', label: 'Archivos', icon: FileText },
    { id: 'cursos', label: 'Cursos', icon: MonitorPlay },
    { id: 'entrevistas', label: 'Entrevistas', icon: ClipboardList }

  ];
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);

  // Initialize activeTab from URL hash or default to 'dashboards'
  const [activeTab, setActiveTab] = useState('dashboards');

  useEffect(() => {
    // Check hash on mount
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['dashboards', 'reportes', 'funcionarios', 'empresas', 'archivos', 'cursos', 'entrevistas'].includes(hash)) {
        setActiveTab(hash);
      }
    }
  }, []);

  // Update hash when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      window.location.hash = tabId;
    }
  };
  const [message, setMessage] = useState(null); // { text, type }

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // Estado para actividades
  const [records, setRecords] = useState([]);
  const [fileLogs, setFileLogs] = useState([]); // State for file logs
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Estado para filtros de empresas
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [companyTypeFilter, setCompanyTypeFilter] = useState('');

  // Estado para funcionarios
  const [workers, setWorkers] = useState([]);
  const [showPasswordsSet, setShowPasswordsSet] = useState({});
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState(null);
  const [newWorker, setNewWorker] = useState({
    username: '',
    password: '',
    full_name: '',
    email: ''
  });

  // Estado para empresas
  const [companies, setCompanies] = useState([]);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [newCompany, setNewCompany] = useState({
    name: '',
    type: 'auditoria'
  });

  // Estado para reportes
  const [reportFilters, setReportFilters] = useState({
    startDate: '',
    endDate: '',
    worker: ''
  });
  const [reportData, setReportData] = useState(null);

  // Estado para alertas y estadísticas
  const [workersWithoutReports, setWorkersWithoutReports] = useState([]);
  const [qualityIssues, setQualityIssues] = useState([]);
  const [realtimeStats, setRealtimeStats] = useState(null);
  const [showAlertsWidget, setShowAlertsWidget] = useState(true);
  const [showQualityWidget, setShowQualityWidget] = useState(true);
  const [closingAlerts, setClosingAlerts] = useState(false);
  const [closingQuality, setClosingQuality] = useState(false);
  const [showAlertDetails, setShowAlertDetails] = useState(false);

  // Estado para asistencia
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [activeAttendances, setActiveAttendances] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState('');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('');
  const [attendanceDateFrom, setAttendanceDateFrom] = useState('');
  const [attendanceDateTo, setAttendanceDateTo] = useState('');

  // Estado para selección múltiple (borrado en lote)
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [deleteMode, setDeleteMode] = useState(false);

  // Estado para modal de detalle de registro
  // Estado para modal de detalle de registro
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isViewerMode, setIsViewerMode] = useState(false);


  // Estado para controlar la expansión del sidebar
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', onConfirm: null });

  // Admin Profile Modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', password: '', confirmPassword: '' });
  const [profileSaving, setProfileSaving] = useState(false);

  const openConfirm = (title, action) => {
    setConfirmModal({
      show: true,
      title,
      onConfirm: async () => {
        await action();
        setConfirmModal({ show: false, title: '', onConfirm: null });
      }
    });
  };


  const handleCloseAlertsWidget = () => {
    setClosingAlerts(true);
    setTimeout(() => setShowAlertsWidget(false), 400);
  };

  const handleCloseQualityWidget = () => {
    setClosingQuality(true);
    setTimeout(() => setShowQualityWidget(false), 400);
  };

  // Auto-dismiss alerts after 5 seconds
  useEffect(() => {
    if (showAlertsWidget && workersWithoutReports.length > 0 && !closingAlerts) {
      const timer = setTimeout(() => {
        handleCloseAlertsWidget();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showAlertsWidget, workersWithoutReports.length, closingAlerts]);

  // Verificar sesión al montar
  useEffect(() => {
    const savedSession = getAdminSession();
    if (savedSession) {
      setIsAuthenticated(true);
    } else {
      router.push('/');
    }
    setCheckingSession(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
      loadAlertsAndStats();

      // Actualizar estadísticas cada 60 segundos
      const interval = setInterval(loadAlertsAndStats, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = async (username, password) => {
    const result = await loginUnifiedAction(username, password);
    if (result.success && result.role === 'admin') {
      setIsAuthenticated(true);
      saveAdminSession(result.user); // Guardar sesión
      return { success: true };
    } else if (result.success && result.role !== 'admin') {
      return { success: false, message: 'No tienes permisos de administrador.' };
    }
    return result;
  };

  const handleLogout = () => {
    router.push('/');
    clearAdminSession();
    clearUnifiedSession();
    setIsAuthenticated(false);
  };

  const loadAlertsAndStats = async () => {
    const workersAlert = await getWorkersWithoutReports(3);
    setWorkersWithoutReports(workersAlert);

    const stats = await getRealTimeStats();
    setRealtimeStats(stats);

    // Refresh file audit logs for dashboards
    const fileActivityLogs = await getAuditLogs({ limit: 200 });
    setFileLogs(fileActivityLogs);

    // Cargar estadísticas de asistencia
    const attStats = await getAttendanceStats();
    setAttendanceStats(attStats);

    // Cargar asistencias activas
    const activeAtt = await getActiveAttendances();
    setActiveAttendances(activeAtt);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const recordsData = await getRecords();
      const workersData = await supabase.from('workers').select('*').order('created_at', { ascending: false });
      const companiesData = await getCompanies();

      console.log('Registros cargados:', recordsData);

      setRecords(recordsData);

      if (!workersData.error) setWorkers(workersData.data || []);
      setCompanies(companiesData);

      // Detectar problemas de calidad
      const issues = await getQualityIssues(recordsData);
      setQualityIssues(issues);

      // Cargar datos de asistencia
      const attRecords = await getAllAttendanceRecords();
      setAttendanceRecords(attRecords);
    } catch (error) {
      console.error("Error cargando datos:", error);
      setMessage("Error al cargar los datos. Por favor recarga la página.");
    } finally {
      setLoading(false);
    }
  };



  const handleAddWorker = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!newWorker.username || !newWorker.full_name) {
      setMessage('Completa los campos obligatorios');
      return;
    }

    if (editingWorkerId) {
      // Actualizar trabajador existente
      if (!newWorker.password) {
        setMessage('Debe ingresar una contraseña');
        return;
      }

      const { success, error } = await updateWorkerAction(editingWorkerId, newWorker);

      if (!success) {
        setMessage('Error al actualizar usuario: ' + error);
        return;
      }

      setMessage('Usuario actualizado correctamente');
      setEditingWorkerId(null);
    } else {
      if (!newWorker.password) {
        setMessage('Debe ingresar una contraseña');
        return;
      }

      const { success, error } = await createWorkerAction(newWorker);

      if (!success) {
        setMessage('Error al crear usuario: ' + error);
        return;
      }

      setMessage('Usuario creado correctamente');
    }

    setNewWorker({ username: '', password: '', full_name: '', email: '' });
    loadAllData();
    setTimeout(() => setShowUserForm(false), 1500);
  };

  const handleDeleteWorker = (id) => {
    openConfirm('¿Eliminar este usuario y todas sus actividades?', async () => {
      await supabase.from('audit_records').delete().eq('worker_id', id);
      await supabase.from('workers').delete().eq('id', id);
      loadAllData();
    });
  };

  const handleEditWorker = (worker) => {
    setEditingWorkerId(worker.id);
    setNewWorker({
      username: worker.username,
      password: '',
      full_name: worker.full_name,
      email: worker.email || ''
    });
    setShowUserForm(true);
  };

  const handleDeleteRecord = (id) => {
    openConfirm('¿Eliminar este registro?', async () => {
      const success = await deleteRecord(id);
      if (success) {
        loadAllData();
        setSelectedRecords(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    });
  };

  // Funciones para selección múltiple
  const toggleRecordSelection = (id) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = (filteredRecords) => {
    if (selectedRecords.size === filteredRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(filteredRecords.map(r => r.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedRecords.size === 0) return;
    openConfirm(`¿Eliminar ${selectedRecords.size} registros seleccionados?`, async () => {
      setLoading(true);
      for (const id of selectedRecords) {
        await deleteRecord(id);
      }
      setSelectedRecords(new Set());
      setDeleteMode(false);
      loadAllData();
      setLoading(false);
    });
  };

  const cancelDeleteMode = () => {
    setDeleteMode(false);
    setSelectedRecords(new Set());
  };

  // Función para refrescar datos de asistencia
  const refreshAttendanceData = async () => {
    setLoading(true);
    const attRecords = await getAllAttendanceRecords();
    setAttendanceRecords(attRecords);
    const activeAtt = await getActiveAttendances();
    setActiveAttendances(activeAtt);
    const attStats = await getAttendanceStats();
    setAttendanceStats(attStats);
    setLoading(false);
  };


  const handleAddCompany = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!newCompany.name) {
      setMessage('Ingresa el nombre de la empresa');
      return;
    }

    if (editingCompanyId) {
      // Actualizar empresa existente
      const result = await updateCompanyAction(editingCompanyId, {
        name: newCompany.name,
        type: newCompany.type
      });

      if (!result.success) {
        setMessage('Error al actualizar empresa: ' + result.error);
        showToast('Error al actualizar empresa: ' + result.error, 'error');
        return;
      }

      showToast('Empresa actualizada correctamente');
      setEditingCompanyId(null);
    } else {
      // Crear nueva empresa
      const result = await createCompanyAction({ name: newCompany.name, type: newCompany.type });

      if (result.success) {
        showToast('Empresa creada correctamente');
      } else {
        showToast('Error al crear empresa: ' + result.error, 'error');
        return;
      }
    }

    setNewCompany({ name: '', type: 'auditoria' });
    loadAllData();
    setTimeout(() => setShowCompanyForm(false), 1500);
  };

  const handleDeleteCompany = (id) => {
    openConfirm('¿Eliminar esta empresa?', async () => {
      const success = await deleteCompany(id);
      if (success) {
        loadAllData();
        showToast('Empresa eliminada correctamente');
      } else {
        showToast('Error al eliminar empresa', 'error');
      }
    });
  };

  const handleEditCompany = (company) => {
    setEditingCompanyId(company.id);
    setNewCompany({
      name: company.name,
      type: company.type
    });
    setShowCompanyForm(true);
  };

  const generateReport = () => {
    if (!reportFilters.startDate || !reportFilters.endDate) {
      showToast('Selecciona rango de fechas', 'error');
      return;
    }

    const startDate = new Date(reportFilters.startDate);
    const endDate = new Date(reportFilters.endDate);

    const filtered = records.filter(r => {
      const recordDate = new Date(r.start_datetime);
      const matchesDate = recordDate >= startDate && recordDate <= endDate;
      const matchesWorker = !reportFilters.worker || r.worker_name === reportFilters.worker;
      return matchesDate && matchesWorker;
    });

    setReportData({
      records: filtered,
      summary: {
        total: filtered.length,
        hours: filtered.reduce((sum, r) => sum + parseFloat(r.hours_worked || 0), 0).toFixed(2),
        workers: [...new Set(filtered.map(r => r.worker_name))].length
      }
    });
    showToast('Reporte generado');
  };

  const exportReport = () => {
    if (reportData && reportData.records.length > 0) {
      exportToExcel(reportData.records, 'reporte-actividades');
      showToast('Reporte exportado a Excel');
    } else {
      showToast('No hay datos para exportar', 'error');
    }
  };

  const handleExport = () => {
    exportToExcel(filteredRecords, 'actividades-completo');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedWorker('');
    setSelectedCompany('');
    setDateFrom('');
    setDateTo('');
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = !searchTerm ||
      r.worker_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesWorker = !selectedWorker || r.worker_name === selectedWorker;
    const matchesCompany = !selectedCompany || r.company_name === selectedCompany;

    // Filtro por fecha
    let matchesDateFrom = true;
    let matchesDateTo = true;
    if (dateFrom) {
      const recordDate = new Date(r.start_datetime);
      const fromDate = new Date(dateFrom);
      matchesDateFrom = recordDate >= fromDate;
    }
    if (dateTo) {
      const recordDate = new Date(r.start_datetime);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      matchesDateTo = recordDate <= toDate;
    }

    return matchesSearch && matchesWorker && matchesCompany && matchesDateFrom && matchesDateTo;
  });

  const uniqueWorkers = [...new Set(records.map(r => r.worker_name))];
  const uniqueCompanies = [...new Set(records.map(r => r.company_name))];
  const totalHours = records.reduce((sum, r) => sum + parseFloat(r.hours_worked || 0), 0);
  const workersList = [...new Set(records.map(r => r.worker_name))];

  // Filtro para empresas
  const filteredCompanies = companies.filter(c => {
    const matchesSearch = !companySearchTerm ||
      c.name.toLowerCase().includes(companySearchTerm.toLowerCase());
    const matchesType = !companyTypeFilter || c.type === companyTypeFilter;
    return matchesSearch && matchesType;
  });

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

  // MODO VISTA ESPECTADOR (FULLSCREEN)
  if (isViewerMode) {
    // isViewerMode can be boolean true (generic) or a company ID string
    const previewCompanyId = typeof isViewerMode === 'string' ? isViewerMode : null;
    return <CourseViewer adminPreview={true} companyId={previewCompanyId} onBack={() => setIsViewerMode(false)} />;
  }

  // Obtener el nombre del admin
  const adminSession = getAdminSession();
  const adminName = adminSession?.full_name || adminSession?.username || 'Administrador';

  // Admin Profile Modal handlers
  const handleOpenProfile = () => {
    setProfileForm({ full_name: adminSession?.full_name || '', password: '', confirmPassword: '' });
    setShowProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }
    if (profileForm.password && profileForm.password.length < 4) {
      showToast('La contraseña debe tener al menos 4 caracteres', 'error');
      return;
    }

    setProfileSaving(true);
    try {
      const payload = {};
      if (profileForm.full_name && profileForm.full_name !== adminSession?.full_name) {
        payload.full_name = profileForm.full_name;
      }
      if (profileForm.password) {
        payload.password = profileForm.password;
      }

      if (Object.keys(payload).length === 0) {
        showToast('No hay cambios para guardar', 'error');
        setProfileSaving(false);
        return;
      }

      const result = await updateAdminAction(adminSession.id, payload);
      if (result.success) {
        // Update local session
        const newSession = { ...adminSession };
        if (payload.full_name) newSession.full_name = payload.full_name;
        saveAdminSession(newSession);
        showToast('Perfil actualizado correctamente');
        setShowProfileModal(false);
      } else {
        showToast('Error: ' + result.error, 'error');
      }
    } catch (err) {
      showToast('Error al guardar', 'error');
    } finally {
      setProfileSaving(false);
    }
  };


  return (
    <div className="dashboard-layout" style={{ background: theme.background, minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sidebar
        items={sidebarItems}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        userName={adminName}
        onLogout={handleLogout}
        showBackButton={false}
        onHoverChange={setIsSidebarExpanded}
      />

      {/* Contenido Principal con margen dinámico */}
      <main
        className="dashboard-content min-h-screen transition-all duration-300 ease-in-out p-4 lg:p-8 page-transition"
        style={{
          background: theme.background,
          color: theme.text,
          marginLeft: typeof window !== 'undefined' && window.innerWidth > 1024 ? (isSidebarExpanded ? '256px' : '72px') : '0',
          paddingTop: typeof window !== 'undefined' && window.innerWidth <= 1024 ? '80px' : '32px'
        }}
      >

        <div className="max-w-7xl mx-auto">

          {/* Professional Header Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
            {/* Title Section */}
            <div className={activeTab === 'entrevistas' ? 'hidden' : 'block'}>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: theme.text }}>
                {activeTab === 'dashboards' && 'Panel de Control'}
                {activeTab === 'reportes' && 'Actividad Reciente'}
                {activeTab === 'funcionarios' && 'Gestión de Funcionarios'}
                {activeTab === 'empresas' && 'Gestión de Empresas'}
                {activeTab === 'archivos' && 'Archivos y Respaldos'}
                {activeTab === 'cursos' && 'Gestión de Cursos'}
              </h1>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: theme.textSecondary }}>
                {activeTab === 'dashboards' && 'Estadísticas y métricas en tiempo real'}
                {activeTab === 'reportes' && 'Últimos movimientos y acciones registradas'}
                {activeTab === 'funcionarios' && 'Administra usuarios y permisos'}
                {activeTab === 'empresas' && 'Administra empresas y personal asociado'}
                {activeTab === 'archivos' && 'Gestiona archivos de SharePoint'}
                {activeTab === 'cursos' && 'Gestión de material y presentaciones'}
              </p>
            </div>
            {activeTab === 'entrevistas' && <div id="interview-header-portal" className="flex-1 w-full" />}

            {/* Right Section - User Profile */}
            <div className="flex flex-row items-center gap-2 flex-shrink-0">
              {/* User Profile - Clickable */}
              <button
                onClick={handleOpenProfile}
                className="flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl transition-all cursor-pointer"
                style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
                title="Editar perfil"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                  {adminName?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs sm:text-sm font-medium leading-tight" style={{ color: theme.text }}>{adminName}</p>
                  <p className="text-[10px] sm:text-xs leading-tight" style={{ color: theme.textSecondary }}>Admin</p>
                </div>
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {message && (
            <Toast
              message={message.text}
              type={message.type}
              onClose={() => setMessage(null)}
            />
          )}



          {/* TOAST NOTIFICATION - Fixed position top-right */}
          {showAlertsWidget && workersWithoutReports.length > 0 && (
            <div
              className={`fixed top-4 right-4 z-50 max-w-sm ${closingAlerts ? 'toast-exit' : 'toast-enter'}`}
              style={{ marginRight: isSidebarExpanded ? '0' : '0' }}
            >
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{workersWithoutReports.length} Funcionarios sin reportes recientes</p>
                  <button
                    onClick={() => {
                      handleCloseAlertsWidget();
                      handleTabChange('funcionarios');
                    }}
                    className="text-xs text-white/80 hover:text-white underline mt-0.5 transition-colors"
                  >
                    Ver detalles
                  </button>
                </div>
                <button
                  onClick={handleCloseAlertsWidget}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* WIDGETS COMPACTOS (Quality Issues) */}
          <div className="flex flex-col gap-2 mb-6">
            {/* CALIDAD COMPACTA */}
            {showQualityWidget && qualityIssues.length > 0 && (
              <details className="group">
                <summary
                  className="list-none cursor-pointer p-3 rounded-lg flex items-center justify-between text-sm font-medium shadow-sm border transition-all hover:opacity-90"
                  style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#b91c1c' }}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{qualityIssues.length} Problemas de calidad detectados</span>
                  </div>
                  <span className="text-xs underline group-open:no-underline">Ver detalles</span>
                </summary>
                <div className="mt-2 p-3 bg-white rounded-lg border border-red-100 shadow-inner grid gap-2 max-h-60 overflow-y-auto">
                  {qualityIssues.map((issue, idx) => (
                    <div key={idx} className="flex justify-between items-start text-xs p-2 rounded bg-red-50">
                      <div className="flex flex-col">
                        <span className="font-semibold">{issue.message}</span>
                        <span className="opacity-75">{issue.record.worker_name}</span>
                      </div>
                      <span className="text-red-700 font-bold">{issue.severity}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/**************************************************************
           * TAB: REPORTES (MONITOR DE ARCHIVOS)
           **************************************************************/}
          {activeTab === 'reportes' && (
            <div className="animate-fade-in">
              <RealTimeMonitor onLogsChanged={loadAlertsAndStats} />
            </div>
          )}


          {/* TAB: CURSOS */}
          {activeTab === 'cursos' && (
            <div className="animate-fade-in">
              <CourseEditor onPreview={(companyId) => setIsViewerMode(companyId || true)} />
            </div>
          )}

          {/* TAB: EMPRESAS */}
          {activeTab === 'empresas' && (
            <div className="animate-fade-in">
              <CompanyManager />
            </div>
          )}

          {/* TAB: ENTREVISTAS */}
          {activeTab === 'entrevistas' && (
            <div className="animate-fade-in">
              <RecruitmentManager />
            </div>
          )}

          {/* TAB: FUNCIONARIOS */}
          {activeTab === 'funcionarios' && (
            <div className="animate-fade-in">
              <div
                className="rounded-xl shadow-lg p-6 mb-6"
                style={{ background: theme.surface }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">{editingWorkerId ? 'Editar Funcionario' : 'Crear Funcionario'}</h2>
                  <button
                    onClick={() => {
                      setShowUserForm(!showUserForm);
                      if (!showUserForm) {
                        setEditingWorkerId(null);
                        setNewWorker({ username: '', password: '', full_name: '', email: '' });
                      }
                    }}
                    className="text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2 cursor-pointer"
                    style={{ background: theme.primary }}
                  >
                    <Plus className="w-4 h-4" /> {showUserForm ? 'Cancelar' : 'Nuevo'}
                  </button>
                </div>

                {showUserForm && (
                  <form onSubmit={handleAddWorker} className="grid md:grid-cols-2 gap-4 mt-4">
                    <input
                      type="text"
                      placeholder="Nombre de usuario"
                      value={newWorker.username}
                      onChange={(e) => setNewWorker({ ...newWorker, username: e.target.value })}
                      className="input-professional focus:outline-none"
                      style={{
                        borderColor: theme.border,
                        background: isDark ? '#0f1419' : '#fff',
                        color: theme.text,
                      }}
                    />
                    <input
                      type="password"
                      placeholder="Contraseña"
                      value={newWorker.password}
                      onChange={(e) => setNewWorker({ ...newWorker, password: e.target.value })}
                      className="input-professional focus:outline-none"
                      style={{
                        borderColor: theme.border,
                        background: isDark ? '#0f1419' : '#fff',
                        color: theme.text,
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={newWorker.full_name}
                      onChange={(e) => setNewWorker({ ...newWorker, full_name: e.target.value })}
                      className="input-professional focus:outline-none"
                      style={{
                        borderColor: theme.border,
                        background: isDark ? '#0f1419' : '#fff',
                        color: theme.text,
                      }}
                    />
                    <input
                      type="email"
                      placeholder="Email (opcional)"
                      value={newWorker.email}
                      onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
                      className="input-professional focus:outline-none"
                      style={{
                        borderColor: theme.border,
                        background: isDark ? '#0f1419' : '#fff',
                        color: theme.text,
                      }}
                    />
                    <button
                      type="submit"
                      className="md:col-span-2 text-white px-4 py-2 rounded-lg hover:opacity-90 font-semibold cursor-pointer shadow-professional"
                      style={{ background: '#27ae60' }}
                    >
                      {editingWorkerId ? 'Actualizar Funcionario' : 'Crear Funcionario'}
                    </button>
                  </form>
                )}
              </div>

              <div
                className="rounded-xl shadow-lg overflow-hidden"
                style={{ background: theme.surface }}
              >
                {workers.length === 0 ? (
                  <div className="p-12 text-center" style={{ color: theme.textSecondary }}>
                    No hay funcionarios registrados
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-white" style={{ background: theme.primary }}>
                          <tr>
                            <th className="px-4 py-3 text-left">Usuario</th>
                            <th className="px-4 py-3 text-left">Nombre</th>
                            <th className="px-4 py-3 text-left">Email</th>
                            <th className="px-4 py-3 text-left">Contraseña</th>
                            <th className="px-4 py-3 text-left">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workers.map(worker => (
                            <tr
                              key={worker.id}
                              className="border-b hover:opacity-75 transition-opacity"
                              style={{
                                borderColor: theme.border,
                                background: isDark ? 'transparent' : '#f8f9fa'
                              }}
                            >
                              <td className="px-4 py-3 font-semibold">{worker.username}</td>
                              <td className="px-4 py-3">{worker.full_name}</td>
                              <td className="px-4 py-3 text-sm">{worker.email || '-'}</td>
                              <td className="px-4 py-3 flex items-center gap-2">
                                <span className="font-mono text-xs">{showPasswordsSet[worker.id] ? worker.password : '••••••••'}</span>
                                <button
                                  onClick={() => setShowPasswordsSet({ ...showPasswordsSet, [worker.id]: !showPasswordsSet[worker.id] })}
                                  className="hover:opacity-70"
                                  style={{ color: theme.primary }}
                                >
                                  {showPasswordsSet[worker.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </td>
                              <td className="px-4 py-3 flex gap-2">
                                <button
                                  onClick={() => handleEditWorker(worker)}
                                  className="text-white px-3 py-1 rounded hover:opacity-90 text-xs cursor-pointer shadow-professional"
                                  style={{ background: '#3498db' }}
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteWorker(worker.id)}
                                  className="text-white px-3 py-1 rounded hover:opacity-90 text-xs cursor-pointer shadow-professional"
                                  style={{ background: '#e74c3c' }}
                                >
                                  <Trash2 className="w-3 h-3 inline" /> Eliminar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden divide-y" style={{ borderColor: theme.border }}>
                      {workers.map(worker => (
                        <div
                          key={worker.id}
                          className="p-4 space-y-3"
                          style={{ background: isDark ? 'transparent' : '#f8f9fa' }}
                        >
                          {/* Header with Avatar and Name */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {worker.full_name?.charAt(0)?.toUpperCase() || worker.username?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold truncate" style={{ color: theme.text }}>{worker.full_name || worker.username}</p>
                              <p className="text-xs opacity-60 truncate">@{worker.username}</p>
                            </div>
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                              <p className="opacity-50 text-[10px] uppercase font-bold mb-0.5">Email</p>
                              <p className="truncate" style={{ color: theme.text }}>{worker.email || '-'}</p>
                            </div>
                            <div className="p-2 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                              <p className="opacity-50 text-[10px] uppercase font-bold mb-0.5">Contraseña</p>
                              <div className="flex items-center gap-1">
                                <span className="font-mono truncate">{showPasswordsSet[worker.id] ? worker.password : '••••••'}</span>
                                <button
                                  onClick={() => setShowPasswordsSet({ ...showPasswordsSet, [worker.id]: !showPasswordsSet[worker.id] })}
                                  className="hover:opacity-70 flex-shrink-0"
                                  style={{ color: theme.primary }}
                                >
                                  {showPasswordsSet[worker.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => handleEditWorker(worker)}
                              className="flex-1 text-white py-2 rounded-lg hover:opacity-90 text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                              style={{ background: '#3498db' }}
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Editar
                            </button>
                            <button
                              onClick={() => handleDeleteWorker(worker.id)}
                              className="flex-1 text-white py-2 rounded-lg hover:opacity-90 text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                              style={{ background: '#e74c3c' }}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'dashboards' && (
            <div className="animate-fade-in space-y-8">
              {(() => {
                const COLORS = ['#3498db', '#27ae60', '#e74c3c', '#d4af37', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];

                // Get Recent Activities (Database Reports)
                const recentActivities = [...records]
                  .sort((a, b) => new Date(b.created_at || b.start_datetime) - new Date(a.created_at || a.start_datetime))
                  .slice(0, 5);

                // Get Recent File Logs (Real-time pulses)
                const recentFilePulses = [...fileLogs]
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .slice(0, 10);

                return (
                  <div className="grid grid-cols-1 gap-8">
                    {/* Actividades Recientes (Real-time pulses) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
                          <TrendingUp size={14} /> Actividades Recientes
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(() => {
                          const activeUsers = {};
                          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                          
                          fileLogs.forEach(log => {
                            const date = new Date(log.timestamp);
                            if (date > oneHourAgo) {
                              if (!activeUsers[log.worker_name] || new Date(activeUsers[log.worker_name].timestamp) < date) {
                                activeUsers[log.worker_name] = log;
                              }
                            }
                          });

                          const activeList = Object.values(activeUsers);

                          return activeList.length === 0 ? (
                            <div className="col-span-full p-8 text-center rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                              <p className="text-xs opacity-40">Sin actividad reciente en la última hora</p>
                            </div>
                          ) : (
                            activeList.map((pulse, idx) => (
                              <div key={idx} className="p-4 rounded-2xl transition-all hover:scale-[1.02] shadow-sm border" style={{ background: theme.surface, borderColor: theme.border }}>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm" style={{ background: COLORS[idx % COLORS.length] }}>
                                    {pulse.worker_name?.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{pulse.worker_name}</p>
                                    <p className="text-[10px] opacity-50 truncate flex items-center gap-1">
                                      <FileText size={10} /> {pulse.file_name}
                                    </p>
                                  </div>
                                  <span className="text-[10px] font-medium opacity-40">
                                    {Math.floor((Date.now() - new Date(pulse.timestamp)) / 60000)}m ago
                                  </span>
                                </div>
                              </div>
                            ))
                          );
                        })()}
                      </div>
                    </div>

                    {/* Quick Snapshot Metrics */}
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-2xl border shadow-sm" style={{ background: theme.surface, borderColor: theme.border }}>
                        <p className="text-[10px] font-bold uppercase opacity-40 mb-1">Total Horas hoy</p>
                        <p className="text-xl font-black">{records.filter(r => new Date(r.start_datetime).toDateString() === new Date().toDateString()).reduce((acc, r) => acc + parseFloat(r.hours_worked), 0).toFixed(1)}h</p>
                      </div>
                      <div className="p-4 rounded-2xl border shadow-sm" style={{ background: theme.surface, borderColor: theme.border }}>
                        <p className="text-[10px] font-bold uppercase opacity-40 mb-1">Empresas Activas</p>
                        <p className="text-xl font-black">{new Set(records.map(r => r.company_name)).size}</p>
                      </div>
                      <div className="p-4 rounded-2xl border shadow-sm" style={{ background: theme.surface, borderColor: theme.border }}>
                        <p className="text-[10px] font-bold uppercase opacity-40 mb-1">Funcionarios</p>
                        <p className="text-xl font-black">{workers.length}</p>
                      </div>
                      <div className="p-4 rounded-2xl border shadow-sm" style={{ background: theme.surface, borderColor: theme.border }}>
                        <p className="text-[10px] font-bold uppercase opacity-40 mb-1">Archivos Hoy</p>
                        <p className="text-xl font-black">{fileLogs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}


          {/* TAB: REPORTES */}
          {
            activeTab === 'reportes' && (
              <div className="animate-fade-in">


              </div>
            )
          }

          {/* TAB: ARCHIVOS ONEDRIVE */}
          {/* TAB: ARCHIVOS ONEDRIVE */}
          {/* Usamos display style para mantener el componente montado y no perder el progreso del respaldo */}
          <div style={{ display: activeTab === 'archivos' ? 'block' : 'none' }}>
            <div className="animate-fade-in space-y-6">
              {/* OneDrive Container */}
              <OneDriveContainer />
            </div>
          </div>
        </div >

        {/* Modal de detalle de registro */}
        {
          selectedRecord && (
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
                      <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>Funcionario</p>
                      <p className="text-lg font-bold">{selectedRecord.worker_name}</p>
                    </div>
                    <div className="p-4 rounded-lg card-professional" style={{ background: isDark ? '#1a1a2e' : '#f8f9fa' }}>
                      <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>Empresa</p>
                      <p className="text-lg font-bold">{selectedRecord.company_name}</p>
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
                    onClick={() => {
                      handleDeleteRecord(selectedRecord.id);
                      setSelectedRecord(null);
                    }}
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
          )
        }
        {/* Custom Confirmation Modal */}
        {confirmModal.show && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" style={{ zIndex: 110 }}>
            <div className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-lg w-full max-w-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-bold mb-3" style={{ color: theme.text }}>Confirmación</h3>
              <p className="mb-6" style={{ color: theme.textSecondary }}>{confirmModal.title}</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                  className="px-4 py-2 rounded-lg transition-colors hover:opacity-80"
                  style={{ color: theme.textSecondary, background: theme.surface }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-md"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </main >

      {/* Admin Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowProfileModal(false)}>
          <div
            className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 text-center" style={{ borderBottom: `1px solid ${theme.border}` }}>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
                {adminName?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <h3 className="text-lg font-bold" style={{ color: theme.text, letterSpacing: '-0.02em' }}>Mi Perfil</h3>
              <p className="text-xs mt-0.5" style={{ color: theme.textSecondary }}>{adminSession?.username}</p>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: theme.textSecondary }}>Nombre completo</label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-xl border-none outline-none"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: theme.text,
                  }}
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: theme.textSecondary }}>
                  Nueva contraseña <span className="font-normal opacity-60">(dejar vacío para mantener)</span>
                </label>
                <input
                  type="password"
                  value={profileForm.password}
                  onChange={(e) => setProfileForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-xl border-none outline-none"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: theme.text,
                  }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>

              {profileForm.password && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: theme.textSecondary }}>Confirmar contraseña</label>
                  <input
                    type="password"
                    value={profileForm.confirmPassword}
                    onChange={(e) => setProfileForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl border-none outline-none"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      color: theme.text,
                    }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 flex items-center justify-between gap-3" style={{ borderTop: `1px solid ${theme.border}` }}>
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-xl transition-all"
                style={{ color: theme.textSecondary }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="px-5 py-2 text-sm font-semibold rounded-xl text-white transition-all"
                style={{
                  background: profileSaving ? '#93c5fd' : '#3b82f6',
                  opacity: profileSaving ? 0.7 : 1,
                }}
              >
                {profileSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}
