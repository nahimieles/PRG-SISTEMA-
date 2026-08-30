'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Plus, Play, Square, X, Download, Trash2, Eye, FileText, ClipboardList, User, Building2, Folder, ChevronLeft, Layers, Search as SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import Sidebar from '../../components/Sidebar';
import LoginForm from '../../components/LoginForm';
import { lightTheme, darkTheme } from '../../lib/colors';
import { addRecord, calculateHours, uploadFile, getWorkerRecords, getCompaniesForWorker, saveWorkerSession, getWorkerSession, clearWorkerSession, clearUnifiedSession, getBusinessUnits, getActivities, getSubactivities } from '../../lib/auth.js';
import { loginUnifiedAction, deleteWorkerAuditRecordAction } from '../../lib/actions.js';
import OneDriveContainer from '../../components/OneDriveContainer';
import CustomSelect from '../../components/CustomSelect';
import CustomDateTimePicker from '../../components/CustomDateTimePicker';
import WorkerTasks from '../../components/hr/WorkerTasks';
import ConfirmModal from '../../components/ConfirmModal';
import CompanyOperationsCenter from '../../components/CompanyOperationsCenter';

export default function FuncionariosPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  const [activeTab, setActiveTab] = useState('actividades');

  const sidebarItems = [
    { id: 'actividades', label: 'Actividades', icon: ClipboardList },
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'empresas', label: 'Empresas', icon: Building2 }
  ];

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [currentWorker, setCurrentWorker] = useState(null);

  const [formData, setFormData] = useState({
    companyName: '',
    businessUnitId: '',
    activityId: '',
    subactivityId: '',
    startDateTime: '',
    endDateTime: '',
    description: ''
  });

  const [showSuccess, setShowSuccess] = useState('');
  const [file, setFile] = useState(null);
  const [myRecords, setMyRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [archivosLoading, setArchivosLoading] = useState(null);

  // Catalogos
  const [companies, setCompanies] = useState([]);
  const [searchCompanyTerm, setSearchCompanyTerm] = useState('');
  const [businessUnits, setBusinessUnits] = useState([]);
  const [activities, setActivities] = useState([]);
  const [subactivities, setSubactivities] = useState([]);

  const [selectedRecord, setSelectedRecord] = useState(null); // Estado para el modal de detalle
  const [selectedCompany, setSelectedCompany] = useState(null); // Estado para el modal de detalle de empresa
  const [expandedGroup, setExpandedGroup] = useState(null); // Estado para grupo expandido
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null });

  // Verificar sesión al montar el componente
  useEffect(() => {
    const savedSession = getWorkerSession();
    if (savedSession) {
      setCurrentWorker(savedSession);
      setIsAuthenticated(true);
      loadMyRecords(savedSession.id);
      loadInitialCatalogs(savedSession.id);
    } else {
      router.push('/');
    }
    setCheckingSession(false);
  }, []);

  const loadInitialCatalogs = async (workerId) => {
    const [comps, units] = await Promise.all([
      getCompaniesForWorker(workerId),
      getBusinessUnits()
    ]);
    setCompanies(comps);
    setBusinessUnits(units);
  };

  // Cargar actividades cuando cambia la Unidad de Negocio
  useEffect(() => {
    if (formData.businessUnitId) {
      getActivities(formData.businessUnitId).then(setActivities);
      setFormData(prev => ({ ...prev, activityId: '', subactivityId: '' }));
      setSubactivities([]);
    } else {
      setActivities([]);
      setSubactivities([]);
    }
  }, [formData.businessUnitId]);

  // Cargar subactividades cuando cambia la Actividad
  useEffect(() => {
    if (formData.activityId) {
      getSubactivities(formData.activityId).then(setSubactivities);
      setFormData(prev => ({ ...prev, subactivityId: '' }));
    } else {
      setSubactivities([]);
    }
  }, [formData.activityId]);

  const handleLogin = async (username, password) => {
    const result = await loginUnifiedAction(username, password);
    if (result.success && result.role === 'worker') {
      const worker = result.user;
      setCurrentWorker(worker);
      setIsAuthenticated(true);
      saveWorkerSession(worker); 
      loadMyRecords(worker.id);
      loadInitialCatalogs(worker.id);
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
  };

  const loadMyRecords = async (workerId) => {
    const records = await getWorkerRecords(workerId);
    setMyRecords(records);
  };

  const confirmDelete = async () => {
    const id = confirmModal.id;
    setConfirmModal({ show: false, id: null });

    const result = await deleteWorkerAuditRecordAction(id, currentWorker.id);

    if (result && result.success) {
      setShowSuccess('success-Registro eliminado correctamente');
      if (selectedRecord && selectedRecord.id === id) {
        setSelectedRecord(null);
      }
      loadMyRecords(currentWorker.id);
    } else {
      setShowSuccess('error-No se pudo eliminar el registro');
    }
    setTimeout(() => setShowSuccess(''), 3000);
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

    const subactivityName = subactivities.find(s => s.id === formData.subactivityId)?.name;
    const activityName = activities.find(a => a.id === formData.activityId)?.name;
    const businessUnitName = businessUnits.find(b => b.id === formData.businessUnitId)?.name;

    const result = await addRecord({
      workerId: currentWorker.id,
      workerName: currentWorker.full_name,
      companyName: formData.companyName,
      businessUnitId: formData.businessUnitId || null,
      activityId: formData.activityId || null,
      subactivityId: formData.subactivityId || null,
      businessUnitName: businessUnitName || null,
      activityName: activityName || null,
      subactivityName: subactivityName || null,
      startDateTime: formData.startDateTime,
      endDateTime: formData.endDateTime,
      description: formData.description,
      hoursWorked,
      filePath: null,
      fileUrl: null
    });

    setLoading(false);

    if (result.success) {
      setShowSuccess('success');
      setFormData({
        companyName: '',
        businessUnitId: '',
        activityId: '',
        subactivityId: '',
        startDateTime: '',
        endDateTime: '',
        description: ''
      });
      setFile(null);
      setTimeout(() => setShowSuccess(''), 3000);
      loadMyRecords(currentWorker.id);
    } else {
      setShowSuccess('error-Error al guardar el registro');
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.background }}>
        <div className="animate-pulse">
          <img src="/Sin título-1-08.png" alt="Cargando..." className="w-20 h-20 object-contain opacity-50" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="dashboard-layout" style={{ background: theme.background, minHeight: '100vh' }}>
      {}
      <Sidebar
        items={sidebarItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userName={currentWorker?.full_name}
        avatarUrl={currentWorker?.foto_url || currentWorker?.avatar_url}
        userRole="Funcionario"
        workerId={currentWorker?.id}
        onLogout={handleLogout}
        showBackButton={false}
        onHoverChange={setIsSidebarExpanded}
      />

      {}
      <main
        className="dashboard-content min-h-screen transition-all duration-300 ease-in-out p-4 lg:p-8 page-transition"
        style={{
          background: theme.background,
          color: theme.text,
          marginLeft: typeof window !== "undefined" && window.innerWidth > 1024 ? (isSidebarExpanded ? "256px" : "72px") : "0",
          paddingTop: typeof window !== "undefined" && window.innerWidth <= 1024 ? "80px" : "32px",
          minHeight: "100vh"
        }}
      >
        <div className="max-w-7xl mx-auto space-y-8">

          {}
          {activeTab === "actividades" && (
            <div className="animate-fade-in space-y-8">
              {}
              <div className="w-full">
                  <div 
                    className="relative z-50 rounded-3xl p-6 lg:p-8 backdrop-blur-xl border shadow-2xl transition-all duration-300 hover:shadow-3xl flex flex-col h-full" 
                    style={{ 
                        background: isDark ? "linear-gradient(145deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.9) 100%)" : "linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)", 
                        borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.5)" 
                    }}
                  >
                    {}
                    <div className="absolute inset-0 overflow-hidden rounded-3xl -z-10 pointer-events-none">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
                    </div>

                    <h3 className="text-2xl font-black tracking-tight mb-6 flex items-center gap-2" style={{ color: theme.text }}>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                            Registrar
                        </span> Actividad
                    </h3>

                    {showSuccess && (
                      <div className={`p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-2 animate-fade-in ${
                        showSuccess.startsWith("error")
                          ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20"
                          : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                      }`}>
                        {showSuccess.startsWith("error") ? (
                            <X className="w-5 h-5 shrink-0" />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                        {showSuccess.startsWith("error") ? showSuccess.split("-")[1] : "Actividad registrada exitosamente"}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col justify-between relative z-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>Cliente (Empresa)</label>
                            <CustomSelect 
                                value={formData.companyName}
                                onChange={val => setFormData({ ...formData, companyName: val })}
                                options={companies.map(c => ({ value: c.name, label: c.name }))}
                                placeholder="Seleccionar empresa"
                                theme={theme}
                                isDark={isDark}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>Unidad de Negocio</label>
                            <CustomSelect 
                                value={formData.businessUnitId}
                                onChange={val => setFormData({ ...formData, businessUnitId: val })}
                                options={businessUnits.map(b => ({ value: b.id, label: b.name }))}
                                placeholder="Seleccionar unidad"
                                theme={theme}
                                isDark={isDark}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>Actividad</label>
                            <CustomSelect 
                                value={formData.activityId}
                                onChange={val => setFormData({ ...formData, activityId: val })}
                                options={activities.map(a => ({ value: a.id, label: a.name }))}
                                placeholder="Seleccionar actividad"
                                theme={theme}
                                isDark={isDark}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>Subactividad</label>
                            <CustomSelect 
                                value={formData.subactivityId}
                                onChange={val => setFormData({ ...formData, subactivityId: val })}
                                options={subactivities.map(s => ({ value: s.id, label: s.name }))}
                                placeholder="Seleccionar subactividad"
                                theme={theme}
                                isDark={isDark}
                            />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>Fecha y Hora de Inicio</label>
                          <CustomDateTimePicker 
                              value={formData.startDateTime}
                              onChange={val => setFormData({ ...formData, startDateTime: val })}
                              theme={theme}
                              isDark={isDark}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>Fecha y Hora de Fin</label>
                          <CustomDateTimePicker 
                              value={formData.endDateTime}
                              onChange={val => setFormData({ ...formData, endDateTime: val })}
                              theme={theme}
                              isDark={isDark}
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>Descripción / Notas</label>
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-24"
                            style={{ 
                              background: isDark ? "rgba(0,0,0,0.2)" : "#f8f9fa", 
                              color: theme.text,
                              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                            }}
                            placeholder="Detalles de la actividad realizada..."
                          />
                        </div>

                      </div>
                      <div className="pt-4 mt-auto">
                        <button
                          type="submit"
                          disabled={
                            loading || 
                            !formData.companyName || 
                            !formData.businessUnitId || 
                            !formData.startDateTime || 
                            !formData.endDateTime ||
                            (activities.length > 0 && !formData.activityId) ||
                            (subactivities.length > 0 && !formData.subactivityId)
                          }
                          className="w-full text-white px-6 py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg flex items-center justify-center gap-2 group relative overflow-hidden"
                          style={{ background: theme.primary }}
                        >
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                          <span className="relative z-10 flex items-center gap-2">
                              {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                              )}
                              {loading ? "Guardando..." : "Registrar Actividad"}
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>
              </div>

              {}
              <div className="rounded-3xl shadow-xl p-6 md:p-8 backdrop-blur-xl border transition-all duration-300 hover:shadow-2xl" 
                   style={{ 
                       background: theme.surface, 
                       borderColor: theme.border 
                   }}>
                <h3 className="text-xl md:text-2xl font-black mb-1 tracking-tight flex items-center gap-2" style={{ color: theme.text }}>
                  <ClipboardList className="text-blue-500" size={24} />
                  Historial de Actividades
                </h3>
                <p className="text-sm mb-6 opacity-60" style={{ color: theme.textSecondary }}>
                  Actividades que has registrado recientemente.
                </p>
                {myRecords.length === 0 ? (
                  <div className="text-center py-12 rounded-2xl border border-dashed" style={{ borderColor: theme.border, background: isDark ? "rgba(0,0,0,0.1)" : "#f8f9fa" }}>
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: theme.text }} />
                    <p className="font-medium" style={{ color: theme.textSecondary }}>
                      Aún no tienes actividades registradas
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-white rounded-t-xl overflow-hidden" style={{ background: theme.primary }}>
                        <tr>
                          <th className="px-4 py-3 text-left font-bold first:rounded-tl-xl">Empresa</th>
                          <th className="px-4 py-3 text-left font-bold">Inicio</th>
                          <th className="px-4 py-3 text-left font-bold">Fin</th>
                          <th className="px-4 py-3 text-left font-bold last:rounded-tr-xl">Horas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myRecords.map(record => (
                          <tr
                            key={record.id}
                            className="border-b transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ borderColor: theme.border }}
                            onClick={() => setSelectedRecord(record)}
                          >
                            <td className="px-4 py-3 font-semibold">{record.company_name}</td>
                            <td className="px-4 py-3 text-xs opacity-80">{new Date(record.start_datetime).toLocaleString("es-ES")}</td>
                            <td className="px-4 py-3 text-xs opacity-80">{new Date(record.end_datetime).toLocaleString("es-ES")}</td>
                            <td className="px-4 py-3">
                              <span className="px-3 py-1 rounded-full font-bold text-white text-xs shadow-sm bg-gradient-to-r from-blue-500 to-indigo-600">
                                {record.hours_worked}h
                              </span>
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

          {}
          {activeTab === "perfil" && (
            <div className="animate-fade-in space-y-6">
                <div className="rounded-3xl shadow-xl border p-6 lg:p-8" style={{ background: theme.surface, borderColor: theme.border }}>
                  <div className="bg-white dark:bg-[#1a1f2e] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 mb-8">
                      <div className="flex items-center gap-5">
                          {currentWorker?.foto_url || currentWorker?.avatar_url ? (
                              <img 
                                src={currentWorker.foto_url || currentWorker.avatar_url} 
                                alt={currentWorker.full_name} 
                                className="w-16 h-16 rounded-full object-cover shadow-lg border-2 border-blue-500/20"
                              />
                          ) : (
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                  {currentWorker?.full_name?.charAt(0) || "U"}
                              </div>
                          )}
                          <div>
                              <h2 className="text-2xl font-black" style={{ color: theme.text }}>{currentWorker?.full_name}</h2>
                          </div>
                      </div>
                  </div>

                    <div className="border-t pt-8" style={{ borderColor: theme.border }}>
                        <WorkerTasks workerId={currentWorker.id} theme={theme} isDark={isDark} readOnly={true} />
                    </div>
                </div>
            </div>
          )}

          {}
          {activeTab === "empresas" && !selectedCompany && (() => {
            const filtered = companies.filter(c => c.name.toLowerCase().includes(searchCompanyTerm.toLowerCase()));

            const groupMap = {};
            const ungrouped = [];
            filtered.forEach(c => {
              if (c.group_name && c.group_id) {
                if (!groupMap[c.group_id]) groupMap[c.group_id] = { name: c.group_name, id: c.group_id, companies: [] };
                groupMap[c.group_id].companies.push(c);
              } else {
                ungrouped.push(c);
              }
            });
            const sortedGroups = Object.values(groupMap).sort((a, b) => a.name.localeCompare(b.name));

            return (
            <div className="animate-fade-in space-y-6">
                {}
                <div className="flex items-center justify-between gap-2 mb-3">
                    {expandedGroup ? (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setExpandedGroup(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-white">
                                <ChevronLeft size={20} />
                            </button>
                            <h3 className="text-lg font-bold" style={{ color: theme.text }}>{expandedGroup.name}</h3>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Layers className="text-blue-500" size={24} />
                            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: theme.text }}>Grupos de Trabajo</h2>
                        </div>
                    )}
                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Buscar empresa..."
                            value={searchCompanyTerm}
                            onChange={(e) => setSearchCompanyTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                            style={{ background: isDark ? '#1e293b' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', color: theme.text }}
                        />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500/50" size={16} />
                    </div>
                </div>

                {}
                {searchCompanyTerm.trim() && (
                    <div className="space-y-4">
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center rounded-[2rem] border-2 border-dashed" style={{ borderColor: theme.border, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                                <Building2 size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
                                <p className="text-lg font-bold" style={{ color: theme.text }}>No se encontraron empresas</p>
                                <p className="text-sm opacity-50 mt-1">Intenta con otro término de búsqueda.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filtered.sort((a, b) => a.name.localeCompare(b.name)).map(company => (
                                    <div key={company.id} onClick={() => setSelectedCompany(company)} className="group relative flex flex-col items-start p-4 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-lg text-left h-full cursor-pointer" style={{ background: theme.surface, borderColor: theme.border }}>
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm border overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', borderColor: theme.border }}>
                                            {company.logo_url || company.avatar_url ? (
                                                <img src={company.logo_url || company.avatar_url} alt={company.name} className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <Building2 size={20} className="text-blue-500" />
                                            )}
                                        </div>
                                        <h3 className="text-base font-bold mb-1" style={{ color: theme.text }}>{company.name}</h3>
                                        {company.type && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 uppercase tracking-tight">
                                                {company.type}
                                            </span>
                                        )}
                                        {company.group_name && (
                                            <div className="w-full mt-auto pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{company.group_name}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {}
                {!searchCompanyTerm.trim() && !expandedGroup && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedGroups.map((group, index) => {
                            const previewNames = group.companies.slice(0, 3).map(c => c.name).join(', ');
                            const moreCount = group.companies.length > 3 ? `+${group.companies.length - 3}` : '';

                            return (
                                <div
                                    key={group.id}
                                    onClick={() => setExpandedGroup(group)}
                                    className="group relative flex flex-col items-start p-4 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-lg text-left h-full cursor-pointer"
                                    style={{ background: theme.surface, borderColor: theme.border }}
                                >
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm border" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', borderColor: theme.border }}>
                                        <Folder size={20} className="text-blue-500" />
                                    </div>
                                    <h3 className="text-base font-bold mb-1" style={{ color: theme.text }}>{group.name}</h3>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 uppercase tracking-tight">
                                            {group.companies.length} {group.companies.length === 1 ? 'Empresa' : 'Empresas'}
                                        </span>
                                    </div>
                                    {group.companies.length > 0 ? (
                                        <div className="w-full mt-auto pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                                            <p className="text-xs text-gray-500 truncate dark:text-gray-400 font-medium">
                                                {previewNames} {moreCount && <span className="text-blue-500 font-bold">{moreCount}</span>}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="w-full mt-auto pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                                            <p className="text-xs text-gray-400 italic">Sin empresas</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {}
                        {ungrouped.sort((a, b) => a.name.localeCompare(b.name)).map(company => (
                            <div key={company.id} onClick={() => setSelectedCompany(company)} className="group relative flex flex-col items-start p-4 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-lg text-left h-full cursor-pointer" style={{ background: theme.surface, borderColor: theme.border }}>
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm border overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', borderColor: theme.border }}>
                                    {company.logo_url || company.avatar_url ? (
                                        <img src={company.logo_url || company.avatar_url} alt={company.name} className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <Building2 size={20} className="text-blue-500" />
                                    )}
                                </div>
                                <h3 className="text-base font-bold mb-1" style={{ color: theme.text }}>{company.name}</h3>
                                {company.type && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-100 dark:border-gray-700 uppercase tracking-tight">
                                        {company.type}
                                    </span>
                                )}
                            </div>
                        ))}

                        {sortedGroups.length === 0 && ungrouped.length === 0 && (
                            <div className="col-span-full text-center py-16 rounded-3xl border border-dashed" style={{ borderColor: theme.border, background: theme.surface }}>
                                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: theme.text }} />
                                <p className="font-medium" style={{ color: theme.textSecondary }}>No hay empresas disponibles.</p>
                            </div>
                        )}
                    </div>
                )}

                {}
                {!searchCompanyTerm.trim() && expandedGroup && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {expandedGroup.companies.sort((a, b) => a.name.localeCompare(b.name)).map(company => (
                            <div key={company.id} onClick={() => setSelectedCompany(company)} className="group relative flex flex-col items-start p-4 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-lg text-left h-full cursor-pointer" style={{ background: theme.surface, borderColor: theme.border }}>
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm border overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', borderColor: theme.border }}>
                                    {company.logo_url || company.avatar_url ? (
                                        <img src={company.logo_url || company.avatar_url} alt={company.name} className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <Building2 size={20} className="text-blue-500" />
                                    )}
                                </div>
                                <h3 className="text-base font-bold mb-1" style={{ color: theme.text }}>{company.name}</h3>
                                <div className="flex items-center gap-2 mb-3">
                                    {company.type && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 uppercase tracking-tight">
                                            {company.type}
                                        </span>
                                    )}
                                    {company.ruc && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                                            RUC {company.ruc}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {expandedGroup.companies.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                                <Building2 size={48} className="text-gray-300 mb-4" />
                                <p className="text-lg font-bold" style={{ color: theme.text }}>No hay empresas en este grupo</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            );
          })()}

          {activeTab === "empresas" && selectedCompany && (
            <div className="animate-fade-in pb-10">
                <CompanyOperationsCenter
                    company={selectedCompany}
                    onBack={() => setSelectedCompany(null)}
                    theme={theme}
                    isDark={isDark}
                    readOnly={true}
                    onOpenArchivos={async (company) => {
                        if (company.sharepoint_folder_url) {
                            window.open(company.sharepoint_folder_url, '_blank');
                            return;
                        }
                        setArchivosLoading(company.id);
                        try {
                            const type = (company.type || '').toLowerCase();
                            const res = await fetch(`/api/graph/find-folder?company=${encodeURIComponent(company.name)}&type=${type}&_t=${Date.now()}`);
                            const data = await res.json();
                            if (data.url) {
                                window.open(data.url, '_blank');
                            }
                            if (!data.found && data.message) {
                                alert(data.message);
                            }
                        } catch (err) {

                            alert('Error al buscar carpeta en SharePoint');
                        } finally {
                            setArchivosLoading(null);
                        }
                    }}
                />
            </div>
          )}

          {}
          {selectedRecord && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-animate" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setSelectedRecord(null)}>
              <div className="w-full max-w-4xl max-h-[90vh] overflow-auto rounded-xl shadow-lg modal-scroll" style={{ background: theme.surface }} onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 p-6 flex justify-between items-center border-b z-10" style={{ borderColor: theme.border, background: theme.surface }}>
                  <h2 className="text-xl font-bold" style={{ color: theme.primary }}>Detalle de Actividad</h2>
                  <button onClick={() => setSelectedRecord(null)} className="p-2 rounded-lg hover:opacity-70 cursor-pointer transition-colors" style={{ background: isDark ? "#333" : "#eee" }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg card-professional" style={{ background: isDark ? "#1a1a2e" : "#f8f9fa" }}>
                      <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>Empresa</p>
                      <p className="text-lg font-bold">{selectedRecord.company_name}</p>
                    </div>
                    <div className="p-4 rounded-lg card-professional" style={{ background: isDark ? "#1a1a2e" : "#f8f9fa" }}>
                      <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>Tipo de Servicio</p>
                      <p className="text-lg font-bold capitalize">{selectedRecord.service_type || "No especificado"}</p>
                    </div>
                    <div className="p-4 rounded-lg card-professional" style={{ background: isDark ? "#1a1a2e" : "#f8f9fa" }}>
                      <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>Fecha/Hora Inicio</p>
                      <p className="font-semibold">{new Date(selectedRecord.start_datetime).toLocaleString("es-ES")}</p>
                    </div>
                    <div className="p-4 rounded-lg card-professional" style={{ background: isDark ? "#1a1a2e" : "#f8f9fa" }}>
                      <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>Fecha/Hora Fin</p>
                      <p className="font-semibold">{new Date(selectedRecord.end_datetime).toLocaleString("es-ES")}</p>
                    </div>
                    <div className="p-4 rounded-lg card-professional shadow-lg" style={{ background: theme.primary }}>
                      <p className="text-sm font-medium text-white opacity-80">Horas Trabajadas</p>
                      <p className="text-2xl font-bold text-white">{selectedRecord.hours_worked}h</p>
                    </div>
                    <div className="p-4 rounded-lg card-professional" style={{ background: isDark ? "#1a1a2e" : "#f8f9fa" }}>
                      <p className="text-sm font-medium" style={{ color: theme.textSecondary }}>Registrado</p>
                      <p className="font-semibold">{new Date(selectedRecord.created_at).toLocaleString("es-ES")}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg card-professional" style={{ background: isDark ? "#1a1a2e" : "#f8f9fa" }}>
                    <p className="text-sm font-medium mb-2" style={{ color: theme.textSecondary }}>Descripción</p>
                    <p className="whitespace-pre-wrap">{selectedRecord.description || "Sin descripción"}</p>
                  </div>
                </div>
                <div className="sticky bottom-0 p-4 border-t flex justify-end gap-3 z-10" style={{ borderColor: theme.border, background: theme.surface }}>
                  <button onClick={() => setConfirmModal({ show: true, id: selectedRecord.id })} className="px-4 py-2 rounded-lg text-white flex items-center gap-2 hover:opacity-90 cursor-pointer shadow-professional" style={{ background: "#e74c3c" }}>
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                  <button onClick={() => setSelectedRecord(null)} className="px-6 py-2 rounded-lg font-semibold cursor-pointer shadow-professional" style={{ background: theme.primary, color: "white" }}>
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          <ConfirmModal 
              isOpen={confirmModal.show}
              title="Eliminar Registro"
              message="¿Estás seguro de que deseas eliminar este registro permanentemente? Esta acción no se puede deshacer."
              onConfirm={confirmDelete}
              onCancel={() => setConfirmModal({ show: false, id: null })}
              theme={theme}
              isDark={isDark}
          />
        </div>
      </main>
    </div>
  );
}
