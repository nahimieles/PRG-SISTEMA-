'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { LogOut, Plus, Trash2, Eye, EyeOff, Download, Calendar, Users, Settings, BarChart3, FileText, AlertCircle, PieChart, Clock, Building2, TrendingUp, UserCheck, RefreshCw, X, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import Sidebar from '../../components/Sidebar';
import LoginForm from '../../components/LoginForm';
import StatsCard from '../../components/StatsCard';
import { loginAdmin, getRecords, deleteRecord, exportToCSV, exportToExcel, getCompanies, addCompany, deleteCompany, saveAdminSession, getAdminSession, clearAdminSession, clearUnifiedSession, getWorkersWithoutReports, getQualityIssues, getRealTimeStats, getAllAttendanceRecords, getActiveAttendances, getAttendanceStats, deleteAttendanceRecord, hashPassword } from '../../lib/auth.js';
import { lightTheme, darkTheme } from '../../lib/colors';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend } from 'recharts';
import AuditLogsTable from '../../components/AuditLogsTable';

// Dynamic imports for MSAL-dependent components to avoid SSR issues
const OneDriveContainer = dynamic(() => import('../../components/OneDriveContainer'), { ssr: false });
const SmartReportGenerator = dynamic(() => import('../../components/SmartReportGenerator'), { ssr: false });
const BackupPanel = dynamic(() => import('../../components/BackupPanel'), { ssr: false });

export default function AdminPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  // Menú de navegación del sidebar
  const sidebarItems = [
    { id: 'dashboards', label: 'Dashboards', icon: PieChart },
    { id: 'reportes', label: 'Reportes', icon: Calendar },
    { id: 'funcionarios', label: 'Funcionarios', icon: Users },
    { id: 'archivos', label: 'Archivos', icon: FileText }

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
      if (hash && ['dashboards', 'reportes', 'funcionarios', 'archivos', 'empresas'].includes(hash)) {
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
  const [message, setMessage] = useState('');

  // Estado para actividades
  const [records, setRecords] = useState([]);
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
  const [selectedRecord, setSelectedRecord] = useState(null);


  const handleCloseAlertsWidget = () => {
    setClosingAlerts(true);
    setTimeout(() => setShowAlertsWidget(false), 400);
  };

  const handleCloseQualityWidget = () => {
    setClosingQuality(true);
    setTimeout(() => setShowQualityWidget(false), 400);
  };

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

      // Actualizar estadísticas cada 30 segundos
      const interval = setInterval(loadAlertsAndStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = async (username, password) => {
    const result = await loginAdmin(username, password);
    if (result.success) {
      setIsAuthenticated(true);
      saveAdminSession(result.admin); // Guardar sesión
      return { success: true };
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
      console.log('Primer registro:', recordsData[0]);

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
      setMessage("Error al cargar los datos. Por favor recalga la página.");
    } finally {
      setLoading(false);
    }
  };



  const handleAddWorker = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!newWorker.username || !newWorker.password || !newWorker.full_name) {
      setMessage('Completa todos los campos');
      return;
    }

    // Hash de la contraseña antes de guardar
    const hashedPassword = await hashPassword(newWorker.password);

    if (editingWorkerId) {
      // Actualizar trabajador existente
      const { error } = await supabase
        .from('workers')
        .update({
          username: newWorker.username,
          password: hashedPassword,
          full_name: newWorker.full_name,
          email: newWorker.email
        })
        .eq('id', editingWorkerId);

      if (error) {
        setMessage('Error al actualizar usuario: ' + error.message);
        return;
      }

      setMessage('Usuario actualizado correctamente');
      setEditingWorkerId(null);
    } else {
      // Crear nuevo trabajador con contraseña hasheada
      const { data, error } = await supabase
        .from('workers')
        .insert([{
          username: newWorker.username,
          password: hashedPassword,
          full_name: newWorker.full_name,
          email: newWorker.email
        }])
        .select()
        .single();

      if (error) {
        setMessage('Error al crear usuario: ' + error.message);
        return;
      }

      setMessage('Usuario creado correctamente');
    }

    setNewWorker({ username: '', password: '', full_name: '', email: '' });
    loadAllData();
    setTimeout(() => setShowUserForm(false), 1500);
  };

  const handleDeleteWorker = async (id) => {
    if (!confirm('¿Eliminar este usuario y todas sus actividades?')) return;
    await supabase.from('audit_records').delete().eq('worker_id', id);
    await supabase.from('workers').delete().eq('id', id);
    loadAllData();
  };

  const handleEditWorker = (worker) => {
    setEditingWorkerId(worker.id);
    setNewWorker({
      username: worker.username,
      password: worker.password,
      full_name: worker.full_name,
      email: worker.email || ''
    });
    setShowUserForm(true);
  };

  const handleDeleteRecord = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    const success = await deleteRecord(id);
    if (success) {
      loadAllData();
      setSelectedRecords(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
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

  const handleBulkDelete = async () => {
    if (selectedRecords.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedRecords.size} registros seleccionados?`)) return;

    setLoading(true);
    for (const id of selectedRecords) {
      await deleteRecord(id);
    }
    setSelectedRecords(new Set());
    setDeleteMode(false);
    loadAllData();
    setLoading(false);
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
      const { error } = await supabase
        .from('companies')
        .update({
          name: newCompany.name,
          type: newCompany.type
        })
        .eq('id', editingCompanyId);

      if (error) {
        setMessage('Error al actualizar empresa: ' + error.message);
        return;
      }

      setMessage('Empresa actualizada correctamente');
      setEditingCompanyId(null);
    } else {
      // Crear nueva empresa
      const result = await addCompany(newCompany.name, newCompany.type);

      if (result.success) {
        setMessage('Empresa creada correctamente');
      } else {
        setMessage('Error al crear empresa');
        return;
      }
    }

    setNewCompany({ name: '', type: 'auditoria' });
    loadAllData();
    setTimeout(() => setShowCompanyForm(false), 1500);
  };

  const handleDeleteCompany = async (id) => {
    if (!confirm('¿Eliminar esta empresa?')) return;
    const success = await deleteCompany(id);
    if (success) {
      loadAllData();
    }
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
      alert('Selecciona rango de fechas');
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
  };

  const exportReport = () => {
    if (reportData && reportData.records.length > 0) {
      exportToExcel(reportData.records, 'reporte-actividades');
    } else {
      alert('No hay datos para exportar');
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

  // Obtener el nombre del admin
  const adminSession = getAdminSession();
  const adminName = adminSession?.full_name || adminSession?.username || 'Administrador';

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <Sidebar
        items={sidebarItems}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        userName={adminName}
        onLogout={handleLogout}
        showBackButton={false}
      />

      {/* Contenido Principal */}
      <main
        className="dashboard-content min-h-screen transition-colors p-4 lg:p-6 page-transition"
        style={{ background: theme.background, color: theme.text }}
      >
        <div className="max-w-7xl mx-auto">

          {/* Professional Header Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            {/* Title Section */}
            <div>
              <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
                {activeTab === 'dashboards' && 'Panel de Control'}
                {activeTab === 'reportes' && 'Actividad Reciente'}
                {activeTab === 'funcionarios' && 'Gestión de Funcionarios'}
                {activeTab === 'archivos' && 'Archivos y Respaldos'}
              </h1>
              <p className="text-sm mt-1" style={{ color: theme.textSecondary }}>
                {activeTab === 'dashboards' && 'Estadísticas y métricas en tiempo real'}
                {activeTab === 'reportes' && 'Últimos movimientos y acciones registradas'}
                {activeTab === 'funcionarios' && 'Administra usuarios y permisos'}
                {activeTab === 'archivos' && 'Gestiona archivos de SharePoint'}
              </p>
            </div>

            {/* Right Section - Search & User */}
            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="relative hidden md:block">
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-64 px-4 py-2.5 pl-10 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2"
                  style={{
                    background: theme.surface,
                    borderColor: theme.border,
                    color: theme.text
                  }}
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: theme.textSecondary }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* User Profile */}
              <div
                className="flex items-center gap-3 px-4 py-2 rounded-xl"
                style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  {adminName?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium" style={{ color: theme.text }}>{adminName}</p>
                  <p className="text-xs" style={{ color: theme.textSecondary }}>Administrador</p>
                </div>
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="mb-6 p-4 rounded-lg text-center" style={{
              background: message.includes('correctamente') ? '#d4edda' : '#f8d7da',
              color: message.includes('correctamente') ? '#155724' : '#721c24'
            }}>
              {message}
            </div>
          )}



          {/* WIDGETS COMPACTOS (Notificaciones) */}
          <div className="flex flex-col gap-2 mb-6">

            {/* ALERTAS COMPACTAS */}
            {showAlertsWidget && workersWithoutReports.length > 0 && !closingAlerts && (
              <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-4 mb-6 rounded shadow-sm flex flex-col gap-2 relative animate-fade-in">
                <button
                  onClick={() => setClosingAlerts(true)}
                  className="absolute top-2 right-2 text-amber-400 hover:text-amber-600"
                >
                  <X size={16} />
                </button>
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="text-amber-900">{workersWithoutReports.length} Funcionarios sin reportes recientes</span>
                  <button onClick={() => setShowAlertDetails(!showAlertDetails)} className="text-sm underline text-amber-700 hover:text-amber-900 ml-auto">
                    {showAlertDetails ? 'Ocultar detalles' : 'Ver detalles'}
                  </button>
                </div>

                {showAlertDetails && (
                  <div className="mt-2 space-y-2 pl-7">
                    {workersWithoutReports.map((worker, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-white/50 p-2 rounded">
                        <span className="text-gray-800 font-medium">{worker.name} ({worker.days} días)</span>
                        <button className="text-amber-700 hover:text-amber-900 font-medium text-xs border border-amber-200 px-2 py-1 rounded hover:bg-amber-100 transition-colors">
                          Recordar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
           * TAB: REPORTES (NUEVO SISTEMA AUTOMATIZADO)
           **************************************************************/}
          {activeTab === 'reportes' && (
            <div className="animate-fade-in">
              <AuditLogsTable />
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
                  <div className="overflow-x-auto">
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
                )}
              </div>
            </div>
          )}

          {/* TAB: EMPRESAS */}
          {activeTab === 'empresas' && (
            <div className="animate-fade-in">
              <div
                className="rounded-xl shadow-lg p-6 mb-6"
                style={{ background: theme.surface }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">{editingCompanyId ? 'Editar Empresa' : 'Crear Empresa'}</h2>
                  <button
                    onClick={() => {
                      setShowCompanyForm(!showCompanyForm);
                      if (!showCompanyForm) {
                        setEditingCompanyId(null);
                        setNewCompany({ name: '', type: 'auditoria' });
                      }
                    }}
                    className="text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2 cursor-pointer shadow-professional"
                    style={{ background: theme.primary }}
                  >
                    <Plus className="w-4 h-4" /> {showCompanyForm ? 'Cancelar' : 'Nueva'}
                  </button>
                </div>

                {showCompanyForm && (
                  <form onSubmit={handleAddCompany} className="grid md:grid-cols-2 gap-4 mt-4">
                    <input
                      type="text"
                      placeholder="Nombre de la empresa"
                      value={newCompany.name}
                      onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                      className="input-professional focus:outline-none"
                      style={{
                        borderColor: theme.border,
                        background: isDark ? '#0f1419' : '#fff',
                        color: theme.text,
                      }}
                    />
                    <select
                      value={newCompany.type}
                      onChange={(e) => setNewCompany({ ...newCompany, type: e.target.value })}
                      className="input-professional focus:outline-none cursor-pointer"
                      style={{
                        borderColor: theme.border,
                        background: isDark ? '#0f1419' : '#fff',
                        color: theme.text,
                      }}
                    >
                      <option value="auditoria">Auditoría</option>
                      <option value="contabilidad">Contabilidad</option>
                    </select>
                    <button
                      type="submit"
                      className="md:col-span-2 text-white px-4 py-2 rounded-lg hover:opacity-90 font-semibold cursor-pointer shadow-professional"
                      style={{ background: '#27ae60' }}
                    >
                      {editingCompanyId ? 'Actualizar Empresa' : 'Crear Empresa'}
                    </button>
                  </form>
                )}
              </div>

              {/* Búsqueda de Empresas */}
              <div
                className="rounded-xl shadow-lg p-4 mb-6"
                style={{ background: theme.surface }}
              >
                <div className="flex gap-4 flex-wrap items-center">
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={companySearchTerm}
                      onChange={(e) => setCompanySearchTerm(e.target.value)}
                      placeholder="Buscar empresa por nombre..."
                      className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors"
                      style={{
                        borderColor: theme.border,
                        background: isDark ? '#0f1419' : '#fff',
                        color: theme.text,
                      }}
                    />
                  </div>
                  <select
                    value={companyTypeFilter}
                    onChange={(e) => setCompanyTypeFilter(e.target.value)}
                    className="px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors cursor-pointer"
                    style={{
                      borderColor: theme.border,
                      background: isDark ? '#0f1419' : '#fff',
                      color: theme.text,
                    }}
                  >
                    <option value="">Todos los tipos</option>
                    <option value="auditoria">Auditoría</option>
                    <option value="contabilidad">Contabilidad</option>
                  </select>
                  <span className="text-sm" style={{ color: theme.textSecondary }}>
                    {filteredCompanies.length} empresas
                  </span>
                </div>
              </div>

              <div
                className="rounded-xl shadow-lg overflow-hidden"
                style={{ background: theme.surface }}
              >
                {filteredCompanies.length === 0 ? (
                  <div className="p-12 text-center" style={{ color: theme.textSecondary }}>
                    No hay empresas registradas
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-white" style={{ background: theme.primary }}>
                        <tr>
                          <th className="px-4 py-3 text-left">Nombre</th>
                          <th className="px-4 py-3 text-left">Tipo</th>
                          <th className="px-4 py-3 text-left">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCompanies.map(company => (
                          <tr
                            key={company.id}
                            className="border-b hover:opacity-75 transition-opacity"
                            style={{
                              borderColor: theme.border,
                              background: isDark ? 'transparent' : '#f8f9fa'
                            }}
                          >
                            <td className="px-4 py-3 font-semibold">{company.name}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2 flex-wrap">
                                {(company.types || [company.type]).map(type => (
                                  <span
                                    key={type}
                                    className="px-3 py-1 rounded-full text-white text-xs font-semibold"
                                    style={{
                                      background: type === 'auditoria' ? '#3498db' : '#27ae60'
                                    }}
                                  >
                                    {type === 'auditoria' ? 'Auditoría' : 'Contabilidad'}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 flex gap-2">
                              <button
                                onClick={() => handleEditCompany(company)}
                                className="text-white px-3 py-1 rounded hover:opacity-90 text-xs cursor-pointer"
                                style={{ background: '#3498db' }}
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteCompany(company.id)}
                                className="text-white px-3 py-1 rounded hover:opacity-90 text-xs cursor-pointer"
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
                )}
              </div>
            </div>
          )}
          {/* TAB: DASHBOARDS */}
          {activeTab === 'dashboards' && (
            <div className="animate-fade-in">
              {/* Colores para gráficos */}
              {(() => {
                const COLORS = ['#3498db', '#27ae60', '#e74c3c', '#d4af37', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];

                // Calcular datos para gráficos
                const hoursByCompany = {};
                const hoursByWorker = {};
                const hoursByType = { auditoria: 0, contabilidad: 0 };

                records.forEach(r => {
                  const hours = parseFloat(r.hours_worked || 0);

                  // Por empresa
                  if (!hoursByCompany[r.company_name]) hoursByCompany[r.company_name] = 0;
                  hoursByCompany[r.company_name] += hours;

                  // Por funcionario
                  if (!hoursByWorker[r.worker_name]) hoursByWorker[r.worker_name] = 0;
                  hoursByWorker[r.worker_name] += hours;
                });

                // Determinar tipo de empresa
                companies.forEach(c => {
                  const companyHours = hoursByCompany[c.name] || 0;
                  if (c.type === 'auditoria') {
                    hoursByType.auditoria += companyHours;
                  } else {
                    hoursByType.contabilidad += companyHours;
                  }
                });

                const topCompanies = Object.entries(hoursByCompany)
                  .map(([name, hours]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, horas: parseFloat(hours.toFixed(2)), fullName: name }))
                  .sort((a, b) => b.horas - a.horas)
                  .slice(0, 8);

                const workerData = Object.entries(hoursByWorker)
                  .map(([name, hours]) => ({ name, horas: parseFloat(hours.toFixed(2)) }))
                  .sort((a, b) => b.horas - a.horas)
                  .slice(0, 8);

                const pieData = [
                  { name: 'Auditoría', value: parseFloat(hoursByType.auditoria.toFixed(2)) },
                  { name: 'Contabilidad', value: parseFloat(hoursByType.contabilidad.toFixed(2)) }
                ];

                const recentActivities = [...records]
                  .sort((a, b) => new Date(b.created_at || b.start_datetime) - new Date(a.created_at || a.start_datetime))
                  .slice(0, 8);

                return (
                  <div className="space-y-6">
                    {/* Top Empresas y Productividad por Funcionario */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Top Empresas */}
                      <div
                        className="rounded-xl shadow-lg p-6"
                        style={{ background: theme.surface }}
                      >
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.primary }}>
                          <Building2 className="w-5 h-5" /> Top Empresas por Horas
                        </h3>
                        {topCompanies.length === 0 ? (
                          <p style={{ color: theme.textSecondary }}>No hay datos disponibles</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topCompanies} layout="vertical" margin={{ left: 20, right: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                              <XAxis type="number" stroke={theme.textSecondary} />
                              <YAxis dataKey="name" type="category" width={100} stroke={theme.textSecondary} tick={{ fontSize: 12 }} />
                              <Tooltip
                                contentStyle={{ background: theme.surface, border: `1px solid ${theme.border}` }}
                                formatter={(value) => [`${value}h`, 'Horas']}
                              />
                              <Bar dataKey="horas" fill="#3498db" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>

                      {/* Productividad por Funcionario */}
                      <div
                        className="rounded-xl shadow-lg p-6"
                        style={{ background: theme.surface }}
                      >
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.primary }}>
                          <TrendingUp className="w-5 h-5" /> Productividad por Funcionario
                        </h3>
                        {workerData.length === 0 ? (
                          <p style={{ color: theme.textSecondary }}>No hay datos disponibles</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={workerData} layout="vertical" margin={{ left: 20, right: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                              <XAxis type="number" stroke={theme.textSecondary} />
                              <YAxis dataKey="name" type="category" width={100} stroke={theme.textSecondary} tick={{ fontSize: 12 }} />
                              <Tooltip
                                contentStyle={{ background: theme.surface, border: `1px solid ${theme.border}` }}
                                formatter={(value) => [`${value}h`, 'Horas']}
                              />
                              <Bar dataKey="horas" fill="#27ae60" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* Distribución y Actividades Recientes */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Distribución por Tipo */}
                      <div
                        className="rounded-xl shadow-lg p-6"
                        style={{ background: theme.surface }}
                      >
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.primary }}>
                          <BarChart3 className="w-5 h-5" /> Distribución por Tipo
                        </h3>
                        {pieData.every(d => d.value === 0) ? (
                          <p style={{ color: theme.textSecondary }}>No hay datos disponibles</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={300}>
                            <RechartsPie>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              >
                                {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value}h`, 'Horas']} />
                              <Legend />
                            </RechartsPie>
                          </ResponsiveContainer>
                        )}
                      </div>

                      {/* Actividades Recientes */}
                      <div
                        className="rounded-xl shadow-lg p-6"
                        style={{ background: theme.surface }}
                      >
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.primary }}>
                          <Clock className="w-5 h-5" /> Actividades Recientes
                        </h3>
                        {recentActivities.length === 0 ? (
                          <p style={{ color: theme.textSecondary }}>No hay actividades recientes</p>
                        ) : (
                          <div className="space-y-3 max-h-[300px] overflow-y-auto">
                            {recentActivities.map((activity, index) => (
                              <div
                                key={activity.id}
                                className="flex items-start gap-3 p-3 rounded-lg"
                                style={{ background: isDark ? '#0f1419' : '#f8f9fa' }}
                              >
                                <div
                                  className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                                  style={{ background: COLORS[index % COLORS.length] }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start gap-2">
                                    <p className="font-semibold text-sm truncate">{activity.worker_name}</p>
                                    <span
                                      className="text-xs px-2 py-1 rounded-full text-white flex-shrink-0"
                                      style={{ background: theme.primary }}
                                    >
                                      {activity.hours_worked}h
                                    </span>
                                  </div>
                                  <p className="text-xs truncate" style={{ color: theme.textSecondary }}>
                                    {activity.company_name}
                                  </p>
                                  <p className="text-xs" style={{ color: theme.textSecondary }}>
                                    {new Date(activity.start_datetime).toLocaleDateString('es-ES')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB: REPORTES */}
          {activeTab === 'reportes' && (
            <div className="animate-fade-in">
              <div
                className="rounded-xl shadow-lg p-4 md:p-6 mb-6 overflow-x-auto"
                style={{ background: theme.surface }}
              >
                <h2 className="text-lg md:text-xl font-bold mb-4">Generar Reporte</h2>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block font-semibold mb-2 text-sm md:text-base">Desde</label>
                    <input
                      type="datetime-local"
                      value={reportFilters.startDate}
                      onChange={(e) => setReportFilters({ ...reportFilters, startDate: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none text-sm md:text-base"
                      style={{
                        borderColor: theme.border,
                        background: isDark ? '#0f1419' : '#fff',
                        color: theme.text
                      }}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-2 text-sm md:text-base">Hasta</label>
                    <input
                      type="datetime-local"
                      value={reportFilters.endDate}
                      onChange={(e) => setReportFilters({ ...reportFilters, endDate: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none text-sm md:text-base"
                      style={{
                        borderColor: theme.border,
                        background: isDark ? '#0f1419' : '#fff',
                        color: theme.text
                      }}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-2 text-sm md:text-base">Funcionario</label>
                    <select
                      value={reportFilters.worker}
                      onChange={(e) => setReportFilters({ ...reportFilters, worker: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none cursor-pointer text-sm md:text-base"
                      style={{
                        borderColor: theme.border,
                        background: isDark ? '#0f1419' : '#fff',
                        color: theme.text
                      }}
                    >
                      <option value="">Todos</option>
                      {workersList.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={generateReport}
                      className="w-full text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center justify-center gap-2 font-semibold cursor-pointer text-sm md:text-base"
                      style={{ background: theme.primary }}
                    >
                      <Calendar className="w-4 h-4" /> <span className="hidden sm:inline">Generar</span>
                    </button>
                  </div>
                </div>
              </div>

              {reportData && (
                <div
                  className="rounded-xl shadow-lg p-6"
                  style={{ background: theme.surface }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Resultados</h2>
                    <button
                      onClick={exportReport}
                      className="text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2 cursor-pointer"
                      style={{ background: '#27ae60' }}
                    >
                      <Download className="w-4 h-4" /> Exportar CSV
                    </button>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <StatsCard number={reportData.summary.total} label="Actividades" bgColor={theme.primary} />
                    <StatsCard number={reportData.summary.hours} label="Horas" bgColor={theme.primary} />
                    <StatsCard number={reportData.summary.workers} label="Funcionarios" bgColor={theme.primary} />
                  </div>

                  {reportData.records.length === 0 ? (
                    <div className="p-12 text-center" style={{ color: theme.textSecondary }}>
                      No hay actividades en ese período
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-white" style={{ background: theme.primary }}>
                          <tr>
                            <th className="px-4 py-3 text-left">Funcionario</th>
                            <th className="px-4 py-3 text-left">Empresa</th>
                            <th className="px-4 py-3 text-left">Inicio</th>
                            <th className="px-4 py-3 text-left">Fin</th>
                            <th className="px-4 py-3 text-left">Horas</th>
                            <th className="px-4 py-3 text-left">Descripción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.records.map(record => (
                            <tr key={record.id} className="border-b" style={{ borderColor: theme.border }}>
                              <td className="px-4 py-3 font-semibold">{record.worker_name}</td>
                              <td className="px-4 py-3">{record.company_name}</td>
                              <td className="px-4 py-3 text-xs">{new Date(record.start_datetime).toLocaleString('es-ES')}</td>
                              <td className="px-4 py-3 text-xs">{new Date(record.end_datetime).toLocaleString('es-ES')}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 rounded text-white text-xs font-semibold" style={{ background: theme.primary }}>
                                  {record.hours_worked}h
                                </span>
                              </td>
                              <td className="px-4 py-3 max-w-xs truncate">{record.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB: ARCHIVOS ONEDRIVE */}
          {activeTab === 'archivos' && (
            <div className="animate-fade-in space-y-6">
              {/* Backup Panel */}
              <BackupPanel currentUser={{ full_name: adminName }} />

              {/* OneDrive Container */}
              <OneDriveContainer />
            </div>
          )}
        </div>

        {/* Modal de detalle de registro */}
        {selectedRecord && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-animate"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setSelectedRecord(null)}
          >
            <div
              className="w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl shadow-2xl modal-scroll"
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
        )}
      </main>
    </div>
  );
}

