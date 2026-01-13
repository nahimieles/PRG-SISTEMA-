'use client';

import { useState, useEffect } from 'react';
import { LogOut, Plus } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import LoginForm from '../../components/LoginForm';
import { lightTheme, darkTheme } from '../../lib/colors';
import { loginWorker, addRecord, calculateHours, uploadFile, getWorkerRecords, getCompanies } from '../../lib/auth.js';

export default function FuncionariosPage() {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

  const handleLogin = async (username, password) => {
    const result = await loginWorker(username, password);
    if (result.success) {
      setCurrentWorker(result.worker);
      setIsAuthenticated(true);
      loadMyRecords(result.worker.id);
      const companiesData = await getCompanies();
      setCompanies(companiesData);
      return { success: true };
    }
    return result;
  };

  const loadMyRecords = async (workerId) => {
    const records = await getWorkerRecords(workerId);
    setMyRecords(records);
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

  if (!isAuthenticated) {
    return (
      <LoginForm
        title="Funcionarios"
        subtitle="Ingresa tus credenciales"
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div
          className="rounded-xl shadow-lg p-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ background: theme.surface, borderBottom: `3px solid ${theme.primary}` }}
        >
          <Link href="/" className="flex items-center gap-2 hover:underline text-sm md:text-base cursor-pointer" style={{ color: theme.primary }}>
            ← Volver
          </Link>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: theme.primary }}>
            
          </h1>
          <div className="flex gap-2 md:gap-4 items-center justify-center flex-wrap">
            <div className="text-right">
              <p className="text-xs md:text-sm" style={{ color: theme.textSecondary }}>Hola,</p>
              <p className="font-semibold text-sm md:text-base">{currentWorker?.full_name}</p>
            </div>
            <ThemeToggle />
            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-white px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 cursor-pointer text-sm md:text-base"
              style={{ background: '#e74c3c' }}
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Formulario */}
        <div
          className="rounded-2xl shadow-2xl p-4 md:p-8 mb-6"
          style={{ background: theme.surface }}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ color: theme.primary }}>
            Registrar Nueva Actividad
          </h2>
          
          {showSuccess === 'success' && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 dark:bg-green-900 dark:text-green-200">
              Actividad registrada exitosamente
            </div>
          )}
          {showSuccess.startsWith('error-') && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 dark:bg-red-900 dark:text-red-200">
              {showSuccess.replace('error-', '')}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-2 text-sm md:text-base">
                  Empresa *
                </label>
                <select
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors cursor-pointer text-sm md:text-base"
                  style={{
                    borderColor: theme.border,
                    background: isDark ? '#0f1419' : '#fff',
                    color: theme.text,
                  }}
                >
                  <option value="">Selecciona una empresa</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.name}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-2 text-sm md:text-base">
                  Tipo de Servicio *
                </label>
                <select
                  required
                  value={formData.serviceType}
                  onChange={(e) => setFormData({...formData, serviceType: e.target.value})}
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors cursor-pointer text-sm md:text-base"
                  style={{
                    borderColor: theme.border,
                    background: isDark ? '#0f1419' : '#fff',
                    color: theme.text,
                  }}
                >
                  <option value="">Selecciona tipo de servicio</option>
                  <option value="auditoria">Auditoría</option>
                  <option value="contabilidad">Contabilidad</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-2 text-sm md:text-base">
                  Fecha y Hora de Inicio *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startDateTime}
                  onChange={(e) => setFormData({...formData, startDateTime: e.target.value})}
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors text-sm md:text-base"
                  style={{
                    borderColor: theme.border,
                    background: isDark ? '#0f1419' : '#fff',
                    color: theme.text,
                  }}
                />
              </div>

              <div>
                <label className="block font-semibold mb-2 text-sm md:text-base">
                  Fecha y Hora de Fin *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.endDateTime}
                  onChange={(e) => setFormData({...formData, endDateTime: e.target.value})}
                  className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors text-sm md:text-base"
                  style={{
                    borderColor: theme.border,
                    background: isDark ? '#0f1419' : '#fff',
                    color: theme.text,
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-2 text-sm md:text-base">
                Descripción del Trabajo *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows="4"
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors text-sm md:text-base"
                style={{
                  borderColor: theme.border,
                  background: isDark ? '#0f1419' : '#fff',
                  color: theme.text,
                }}
                placeholder="Describe las actividades realizadas..."
              />
            </div>

            <div>
              <label className="block font-semibold mb-2 text-sm md:text-base">
                Adjunta archivo (Opcional)
              </label>
              <input
                id="fileInput"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors text-sm md:text-base"
                style={{
                  borderColor: theme.border,
                  background: isDark ? '#0f1419' : '#fff',
                  color: theme.text,
                }}
                accept=".pdf,.doc,.docx,.xlsx,.xls,.txt,.jpg,.png"
              />
              {file && <p className="text-xs md:text-sm text-green-600 mt-2 dark:text-green-400">{file.name}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 cursor-pointer text-sm md:text-base"
              style={{ background: theme.primary }}
            >
              <Plus className="w-5 h-5 inline mr-2" /> {loading ? 'Guardando...' : 'Guardar Actividad'}
            </button>
          </form>
        </div>

        {/* Mis Actividades */}
        <div
          className="rounded-2xl shadow-2xl p-4 md:p-8"
          style={{ background: theme.surface }}
        >
          <h3 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: theme.primary }}>
            Mis Actividades Registradas
          </h3>
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
                      className="border-b hover:opacity-75 transition-opacity"
                      style={{
                        borderColor: theme.border,
                        background: isDark ? 'transparent' : '#f8f9fa'
                      }}
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
                          <a href={record.file_url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: theme.secondary }}>
                            📥 Ver
                          </a>
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
  );
}
