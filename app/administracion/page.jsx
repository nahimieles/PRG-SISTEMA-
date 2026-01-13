'use client';

import { useState, useEffect } from 'react';
import { LogOut, Plus, Trash2, Eye, EyeOff, Download, Calendar, Users, Settings, BarChart3, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import LoginForm from '../../components/LoginForm';
import StatsCard from '../../components/StatsCard';
import { loginAdmin, getRecords, deleteRecord, exportToCSV, exportToExcel, getCompanies, addCompany, deleteCompany, saveAdminSession, getAdminSession, clearAdminSession, getWorkersWithoutReports, getQualityIssues, getRealTimeStats } from '../../lib/auth.js';
import { lightTheme, darkTheme } from '../../lib/colors';
import { supabase } from '../../lib/supabase';

export default function AdminPage() {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('actividades');
  const [loading, setLoading] = useState(false);
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
    }
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
    clearAdminSession();
    setIsAuthenticated(false);
  };

  const loadAlertsAndStats = async () => {
    const workersAlert = await getWorkersWithoutReports(3);
    setWorkersWithoutReports(workersAlert);

    const stats = await getRealTimeStats();
    setRealtimeStats(stats);
  };

  const loadAllData = async () => {
    setLoading(true);
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

    setLoading(false);
  };

  const handleAddWorker = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!newWorker.username || !newWorker.password || !newWorker.full_name) {
      setMessage('Completa todos los campos');
      return;
    }

    if (editingWorkerId) {
      // Actualizar trabajador existente
      const { error } = await supabase
        .from('workers')
        .update({
          username: newWorker.username,
          password: newWorker.password,
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
      // Crear nuevo trabajador
      const { data, error } = await supabase
        .from('workers')
        .insert([newWorker])
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
    }
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
      exportToCSV(reportData.records, 'reporte-actividades');
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

  if (!isAuthenticated) {
    return (
      <LoginForm
        title="Administración"
        subtitle="Sistema de gestión integral"
        onLogin={handleLogin}
        showUsername={true}
        usernamePlaceholder="Tu usuario"
        passwordPlaceholder="Tu contraseña"
      />
    );
  }

  return (
    <div
      className="min-h-screen transition-colors p-4"
      style={{ background: theme.background, color: theme.text }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div
          className="rounded-xl shadow-lg p-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ background: theme.surface, borderBottom: `3px solid ${theme.primary}` }}
        >
          <Link href="/" className="flex items-center gap-2 hover:underline text-sm md:text-base cursor-pointer" style={{ color: theme.primary }}>
            ← Volver
          </Link>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: theme.primary }}>
            Administración
          </h1>
          <div className="flex gap-2 md:gap-4 items-center">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="text-white px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 cursor-pointer text-sm md:text-base"
              style={{ background: '#e74c3c' }}
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2" style={{ borderBottom: `2px solid ${theme.border}` }}>
          {[
            { id: 'actividades', label: 'Actividades', icon: FileText },
            { id: 'funcionarios', label: 'Funcionarios', icon: Users },
            { id: 'empresas', label: 'Empresas', icon: BarChart3 },
            { id: 'reportes', label: 'Reportes', icon: Calendar }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 md:px-6 py-3 font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer text-sm md:text-base"
                style={{
                  color: activeTab === tab.id ? theme.primary : theme.textSecondary,
                  borderBottom: activeTab === tab.id ? `3px solid ${theme.primary}` : 'none'
                }}
              >
                <Icon className="w-4 h-4" /> <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
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

        {/* ESTADÍSTICAS EN TIEMPO REAL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div
            className="rounded-xl shadow-lg p-4"
            style={{ background: theme.surface }}
          >
            <p style={{ color: theme.textSecondary }} className="text-sm">Horas Hoy</p>
            <p className="text-2xl md:text-3xl font-bold mt-2" style={{ color: theme.primary }}>
              {realtimeStats?.totalHoursToday.toFixed(2) || '0.00'}h
            </p>
          </div>
          <div
            className="rounded-xl shadow-lg p-4"
            style={{ background: theme.surface }}
          >
            <p style={{ color: theme.textSecondary }} className="text-sm">Registros Totales</p>
            <p className="text-2xl md:text-3xl font-bold mt-2" style={{ color: theme.primary }}>
              {realtimeStats?.totalRecords || 0}
            </p>
          </div>
          <div
            className="rounded-xl shadow-lg p-4"
            style={{ background: theme.surface }}
          >
            <p style={{ color: theme.textSecondary }} className="text-sm">Problemas de Calidad</p>
            <p className="text-2xl md:text-3xl font-bold mt-2" style={{ color: '#e74c3c' }}>
              {qualityIssues.length}
            </p>
          </div>
        </div>

        {/* ALERTAS DE FALTA DE REPORTES */}
        {showAlertsWidget && workersWithoutReports.length > 0 && (
          <div
            className={`rounded-xl shadow-lg p-6 mb-6 ${closingAlerts ? 'widget-close' : ''}`}
            style={{ background: theme.surface, borderLeft: '4px solid #f39c12' }}
          >
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" style={{ color: '#f39c12' }} />
                <h2 className="text-lg font-bold">Funcionarios Sin Reportes Recientes</h2>
              </div>
              <button
                onClick={handleCloseAlertsWidget}
                className="text-sm px-3 py-1 rounded cursor-pointer hover:opacity-80 transition"
                style={{ background: '#f39c12', color: '#fff' }}
              >
                ✕
              </button>
            </div>
            <div className="grid gap-2">
              {workersWithoutReports.map(worker => (
                <div
                  key={worker.id}
                  className="p-3 rounded-lg flex justify-between items-center"
                  style={{ background: isDark ? '#0f1419' : '#f8f9fa' }}
                >
                  <div>
                    <p className="font-semibold">{worker.name}</p>
                    <p style={{ color: theme.textSecondary }} className="text-sm">
                      {worker.daysWithoutReport} días sin reportes {worker.lastReportDate && `(última: ${new Date(worker.lastReportDate).toLocaleDateString('es-ES')})`}
                    </p>
                  </div>
                  <button
                    className="text-white px-3 py-1 rounded text-xs cursor-pointer hover:opacity-90"
                    style={{ background: '#f39c12' }}
                  >
                    Recordar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROBLEMAS DE CALIDAD */}
        {showQualityWidget && qualityIssues.length > 0 && (
          <div
            className={`rounded-xl shadow-lg p-6 mb-6 ${closingQuality ? 'widget-close' : ''}`}
            style={{ background: theme.surface, borderLeft: '4px solid #e74c3c' }}
          >
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" style={{ color: '#e74c3c' }} />
                <h2 className="text-lg font-bold">Problemas de Calidad Detectados</h2>
              </div>
              <button
                onClick={handleCloseQualityWidget}
                className="text-sm px-3 py-1 rounded cursor-pointer hover:opacity-80 transition"
                style={{ background: '#e74c3c', color: '#fff' }}
              >
                ✕
              </button>
            </div>
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {qualityIssues.slice(0, 5).map(issue => (
                <div
                  key={`${issue.id}-${issue.type}`}
                  className="p-3 rounded-lg flex justify-between items-center"
                  style={{ background: isDark ? '#0f1419' : '#f8f9fa' }}
                >
                  <div>
                    <p className="font-semibold text-sm">{issue.message}</p>
                    <p style={{ color: theme.textSecondary }} className="text-xs">
                      {issue.record.worker_name} - {issue.record.company_name}
                    </p>
                  </div>
                  <span
                    className="px-2 py-1 rounded text-white text-xs font-semibold"
                    style={{ background: issue.severity === 'error' ? '#e74c3c' : '#f39c12' }}
                  >
                    {issue.severity}
                  </span>
                </div>
              ))}
              {qualityIssues.length > 5 && (
                <p style={{ color: theme.textSecondary }} className="text-sm text-center pt-2">
                  +{qualityIssues.length - 5} problemas más
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB: ACTIVIDADES */}
        {activeTab === 'actividades' && (
          <>
            <div
              className="rounded-xl shadow-lg p-6 mb-6 grid md:grid-cols-3 gap-4 auto-rows-fr"
              style={{ background: theme.surface }}
            >
              <StatsCard number={records.length} label="Actividades" bgColor={theme.primary} />
              <StatsCard number={workers.length} label="Funcionarios" bgColor={theme.primary} />
              <StatsCard number={totalHours.toFixed(2)} label="Horas Totales" bgColor={theme.primary} />
            </div>

            <div
              className="rounded-xl shadow-lg p-6 mb-6"
              style={{ background: theme.surface }}
            >
              <h3 className="font-semibold mb-4" style={{ color: theme.primary }}>Búsqueda Avanzada</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Buscar</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nombre, empresa o descripción..."
                    className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors"
                    style={{
                      borderColor: theme.border,
                      background: isDark ? '#0f1419' : '#fff',
                      color: theme.text,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Funcionario</label>
                  <select
                    value={selectedWorker}
                    onChange={(e) => setSelectedWorker(e.target.value)}
                    className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors cursor-pointer"
                    style={{
                      borderColor: theme.border,
                      background: isDark ? '#0f1419' : '#fff',
                      color: theme.text,
                    }}
                  >
                    <option value="">Todos los funcionarios</option>
                    {uniqueWorkers.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Empresa</label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors cursor-pointer"
                    style={{
                      borderColor: theme.border,
                      background: isDark ? '#0f1419' : '#fff',
                      color: theme.text,
                    }}
                  >
                    <option value="">Todas las empresas</option>
                    {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Desde</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors"
                    style={{
                      borderColor: theme.border,
                      background: isDark ? '#0f1419' : '#fff',
                      color: theme.text,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Hasta</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors"
                    style={{
                      borderColor: theme.border,
                      background: isDark ? '#0f1419' : '#fff',
                      color: theme.text,
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2 cursor-pointer border-2"
                    style={{ borderColor: theme.border, color: theme.text }}
                  >
                    Limpiar Filtros
                  </button>
                  <button
                    onClick={loadAllData}
                    disabled={loading}
                    className="text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    style={{ background: theme.primary }}
                  >
                    Actualizar
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-sm" style={{ color: theme.textSecondary }}>
                    {filteredRecords.length} resultados
                  </span>
                  <button
                    onClick={handleExport}
                    className="text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2 cursor-pointer"
                    style={{ background: '#27ae60' }}
                  >
                    <Download className="w-4 h-4" /> Exportar Excel
                  </button>
                </div>
              </div>
            </div>

            <div
              className="rounded-xl shadow-lg overflow-hidden"
              style={{ background: theme.surface }}
            >
              {filteredRecords.length === 0 ? (
                <div className="p-12 text-center" style={{ color: theme.textSecondary }}>
                  No hay actividades registradas
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
                        <th className="px-4 py-3 text-left">Archivo</th>
                        <th className="px-4 py-3 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map(record => (
                        <tr
                          key={record.id}
                          className="border-b hover:opacity-75 transition-opacity"
                          style={{
                            borderColor: theme.border,
                            background: isDark ? 'transparent' : '#f8f9fa'
                          }}
                        >
                          <td className="px-4 py-3 font-semibold">{record.worker_name}</td>
                          <td className="px-4 py-3">{record.company_name}</td>
                          <td className="px-4 py-3 text-xs">{new Date(record.start_datetime).toLocaleString('es-ES')}</td>
                          <td className="px-4 py-3 text-xs">{new Date(record.end_datetime).toLocaleString('es-ES')}</td>
                          <td className="px-4 py-3">
                            <span className="px-3 py-1 rounded-full font-semibold text-sm text-white" style={{ background: theme.primary }}>
                              {record.hours_worked}h
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate" title={record.description}>
                            {record.description}
                          </td>
                          <td className="px-4 py-3">
                            {record.file_url ? (
                              <a href={record.file_url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: theme.secondary }}>
                                Ver
                              </a>
                            ) : (
                              <span style={{ color: theme.textSecondary }}>-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
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
          </>
        )}

        {/* TAB: FUNCIONARIOS */}
        {activeTab === 'funcionarios' && (
          <>
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
                    className="px-4 py-2 border-2 rounded-lg focus:outline-none"
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
                    className="px-4 py-2 border-2 rounded-lg focus:outline-none"
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
                    className="px-4 py-2 border-2 rounded-lg focus:outline-none"
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
                    className="px-4 py-2 border-2 rounded-lg focus:outline-none"
                    style={{
                      borderColor: theme.border,
                      background: isDark ? '#0f1419' : '#fff',
                      color: theme.text,
                    }}
                  />
                  <button
                    type="submit"
                    className="md:col-span-2 text-white px-4 py-2 rounded-lg hover:opacity-90 font-semibold cursor-pointer"
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
                              className="text-white px-3 py-1 rounded hover:opacity-90 text-xs cursor-pointer"
                              style={{ background: '#3498db' }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteWorker(worker.id)}
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
          </>
        )}

        {/* TAB: EMPRESAS */}
        {activeTab === 'empresas' && (
          <>
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
                  className="text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2 cursor-pointer"
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
                    className="px-4 py-2 border-2 rounded-lg focus:outline-none"
                    style={{
                      borderColor: theme.border,
                      background: isDark ? '#0f1419' : '#fff',
                      color: theme.text,
                    }}
                  />
                  <select
                    value={newCompany.type}
                    onChange={(e) => setNewCompany({ ...newCompany, type: e.target.value })}
                    className="px-4 py-2 border-2 rounded-lg focus:outline-none"
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
                    className="md:col-span-2 text-white px-4 py-2 rounded-lg hover:opacity-90 font-semibold cursor-pointer"
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
          </>
        )}

        {/* TAB: REPORTES */}
        {activeTab === 'reportes' && (
          <>
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

          </>
        )}
      </div>
    </div>
  );
}
