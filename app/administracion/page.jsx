'use client';

import { useState, useEffect } from 'react';
import { LogOut, Plus, Trash2, Eye, EyeOff, Download, Calendar, Users, Settings, BarChart3, FileText } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import LoginForm from '../../components/LoginForm';
import StatsCard from '../../components/StatsCard';
import { loginAdmin, getRecords, deleteRecord, exportToCSV, getCompanies, addCompany, deleteCompany } from '../../lib/auth.js';
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

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);

  const handleLogin = async (username, password) => {
    const result = await loginAdmin(username, password);
    if (result.success) {
      setIsAuthenticated(true);
      return { success: true };
    }
    return result;
  };

  const loadAllData = async () => {
    setLoading(true);
    const recordsData = await getRecords();
    const workersData = await supabase.from('workers').select('*').order('created_at', { ascending: false });
    const companiesData = await getCompanies();
    setRecords(recordsData);
    if (!workersData.error) setWorkers(workersData.data || []);
    setCompanies(companiesData);
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
    exportToCSV(filteredRecords, 'actividades-completo');
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = !searchTerm || 
      r.worker_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWorker = !selectedWorker || r.worker_name === selectedWorker;
    return matchesSearch && matchesWorker;
  });

  const uniqueWorkers = [...new Set(records.map(r => r.worker_name))];
  const totalHours = records.reduce((sum, r) => sum + parseFloat(r.hours_worked || 0), 0);
  const workersList = [...new Set(records.map(r => r.worker_name))];

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
          className="rounded-xl shadow-lg p-4 mb-6 flex justify-between items-center"
          style={{ background: theme.surface, borderBottom: `3px solid ${theme.primary}` }}
        >
          <Link href="/" className="flex items-center gap-2 hover:underline" style={{ color: theme.primary }}>
            ← Volver
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: theme.primary }}>
            Administración
          </h1>
          <div className="flex gap-4 items-center">
            <ThemeToggle />
            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90"
              style={{ background: '#e74c3c' }}
            >
              <LogOut className="w-4 h-4" /> Salir
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
                className="px-6 py-3 font-semibold transition-all flex items-center gap-2 whitespace-nowrap"
                style={{
                  color: activeTab === tab.id ? theme.primary : theme.textSecondary,
                  borderBottom: activeTab === tab.id ? `3px solid ${theme.primary}` : 'none'
                }}
              >
                <Icon className="w-4 h-4" /> {tab.label}
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
              <div className="flex gap-4 flex-wrap items-center">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar funcionario o empresa..."
                    className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors"
                    style={{
                      borderColor: theme.border,
                      background: isDark ? '#0f1419' : '#fff',
                      color: theme.text,
                    }}
                  />
                </div>
                <select
                  value={selectedWorker}
                  onChange={(e) => setSelectedWorker(e.target.value)}
                  className="px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors"
                  style={{
                    borderColor: theme.border,
                    background: isDark ? '#0f1419' : '#fff',
                    color: theme.text,
                  }}
                >
                  <option value="">Todos los funcionarios</option>
                  {uniqueWorkers.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
                <button
                  onClick={handleExport}
                  className="text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2"
                  style={{ background: '#27ae60' }}
                >
                  <Download className="w-4 h-4" /> Exportar
                </button>
                <button
                  onClick={loadAllData}
                  disabled={loading}
                  className="text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
                  style={{ background: theme.primary }}
                >
                  Actualizar
                </button>
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
                              className="text-white px-3 py-1 rounded hover:opacity-90 text-xs"
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
                  className="text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2"
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
                    onChange={(e) => setNewWorker({...newWorker, username: e.target.value})}
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
                    onChange={(e) => setNewWorker({...newWorker, password: e.target.value})}
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
                    onChange={(e) => setNewWorker({...newWorker, full_name: e.target.value})}
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
                    onChange={(e) => setNewWorker({...newWorker, email: e.target.value})}
                    className="px-4 py-2 border-2 rounded-lg focus:outline-none"
                    style={{
                      borderColor: theme.border,
                      background: isDark ? '#0f1419' : '#fff',
                      color: theme.text,
                    }}
                  />
                  <button
                    type="submit"
                    className="md:col-span-2 text-white px-4 py-2 rounded-lg hover:opacity-90 font-semibold"
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
                              onClick={() => setShowPasswordsSet({...showPasswordsSet, [worker.id]: !showPasswordsSet[worker.id]})}
                              className="hover:opacity-70"
                              style={{ color: theme.primary }}
                            >
                              {showPasswordsSet[worker.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="px-4 py-3 flex gap-2">
                            <button
                              onClick={() => handleEditWorker(worker)}
                              className="text-white px-3 py-1 rounded hover:opacity-90 text-xs"
                              style={{ background: '#3498db' }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteWorker(worker.id)}
                              className="text-white px-3 py-1 rounded hover:opacity-90 text-xs"
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
                  className="text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2"
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
                    onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                    className="px-4 py-2 border-2 rounded-lg focus:outline-none"
                    style={{
                      borderColor: theme.border,
                      background: isDark ? '#0f1419' : '#fff',
                      color: theme.text,
                    }}
                  />
                  <select
                    value={newCompany.type}
                    onChange={(e) => setNewCompany({...newCompany, type: e.target.value})}
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
                    className="md:col-span-2 text-white px-4 py-2 rounded-lg hover:opacity-90 font-semibold"
                    style={{ background: '#27ae60' }}
                  >
                    {editingCompanyId ? 'Actualizar Empresa' : 'Crear Empresa'}
                  </button>
                </form>
              )}
            </div>

            <div
              className="rounded-xl shadow-lg overflow-hidden"
              style={{ background: theme.surface }}
            >
              {companies.length === 0 ? (
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
                      {companies.map(company => (
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
                            <span
                              className="px-3 py-1 rounded-full text-white text-xs font-semibold"
                              style={{
                                background: company.type === 'auditoria' ? '#3498db' : '#27ae60'
                              }}
                            >
                              {company.type === 'auditoria' ? 'Auditoría' : 'Contabilidad'}
                            </span>
                          </td>
                          <td className="px-4 py-3 flex gap-2">
                            <button
                              onClick={() => handleEditCompany(company)}
                              className="text-white px-3 py-1 rounded hover:opacity-90 text-xs"
                              style={{ background: '#3498db' }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteCompany(company.id)}
                              className="text-white px-3 py-1 rounded hover:opacity-90 text-xs"
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
              className="rounded-xl shadow-lg p-6 mb-6"
              style={{ background: theme.surface }}
            >
              <h2 className="text-xl font-bold mb-4">Generar Reporte</h2>
              
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block font-semibold mb-2">Desde</label>
                  <input
                    type="datetime-local"
                    value={reportFilters.startDate}
                    onChange={(e) => setReportFilters({...reportFilters, startDate: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none"
                    style={{
                      borderColor: theme.border,
                      background: isDark ? '#0f1419' : '#fff',
                      color: theme.text
                    }}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">Hasta</label>
                  <input
                    type="datetime-local"
                    value={reportFilters.endDate}
                    onChange={(e) => setReportFilters({...reportFilters, endDate: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none"
                    style={{
                      borderColor: theme.border,
                      background: isDark ? '#0f1419' : '#fff',
                      color: theme.text
                    }}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">Funcionario</label>
                  <select
                    value={reportFilters.worker}
                    onChange={(e) => setReportFilters({...reportFilters, worker: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none"
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
                    className="w-full text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center justify-center gap-2 font-semibold"
                    style={{ background: theme.primary }}
                  >
                    <Calendar className="w-4 h-4" /> Generar
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
                    className="text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2"
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
                              <span className="px-2 py-1 rounded text-white text-xs font-semibold" style={{background: theme.primary}}>
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
