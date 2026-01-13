'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import StatsCard from '../../components/StatsCard';
import { getRecords, getCompanies } from '../../lib/auth';
import { lightTheme, darkTheme } from '../../lib/colors';

export default function ClientesPage() {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;
  const [records, setRecords] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companyRecords, setCompanyRecords] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const recordsData = await getRecords();
    const companiesData = await getCompanies();
    setRecords(recordsData);
    setCompanies(companiesData);
    setLoading(false);
  };

  const handleSelectCompany = (companyName) => {
    if (!companyName) {
      setCompanyRecords(null);
      return;
    }

    const filtered = records.filter(r => r.company_name === companyName);
    setCompanyRecords({
      name: companyName,
      records: filtered,
      summary: {
        total: filtered.length,
        hours: filtered.reduce((sum, r) => sum + parseFloat(r.hours_worked || 0), 0).toFixed(2),
        workers: [...new Set(filtered.map(r => r.worker_name))].length
      }
    });
  };

  return (
    <div
      className="min-h-screen transition-colors p-4"
      style={{ background: theme.background, color: theme.text }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="flex items-center gap-2 hover:underline" style={{ color: theme.primary }}>
            ← Volver al inicio
          </Link>
          <ThemeToggle />
        </div>

        {/* Hero */}
        <div
          className="rounded-2xl shadow-2xl p-8 mb-6 text-center"
          style={{ background: theme.surface }}
        >
          <h1 className="text-4xl font-bold mb-4" style={{ color: theme.primary }}>
            Consulta de Actividades
          </h1>
          <p className="text-lg" style={{ color: theme.textSecondary }}>
            Portal de Clientes - Visualice las actividades realizadas
          </p>
        </div>

        {/* Búsqueda */}
        <div
          className="rounded-2xl shadow-lg p-6 mb-6"
          style={{ background: theme.surface }}
        >
          <h2 className="text-2xl font-bold mb-4" style={{ color: theme.primary }}>
            Seleccione su Empresa
          </h2>
          <div className="flex gap-4 flex-wrap items-center">
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                handleSelectCompany(e.target.value);
              }}
              disabled={loading}
              className="flex-1 min-w-[250px] px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors"
              style={{
                borderColor: theme.border,
                background: isDark ? '#0f1419' : '#fff',
                color: theme.text,
              }}
            >
              <option value="">-- Seleccione su empresa --</option>
              {companies.map(company => (
                <option key={company.id} value={company.name}>
                  {company.name} ({company.type === 'auditoria' ? 'Auditoría' : 'Contabilidad'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resultados */}
        {companyRecords && (
          <div className="rounded-2xl shadow-lg p-6 mb-6" style={{ background: theme.surface }}>
            <h3 className="text-2xl font-bold mb-4" style={{ color: theme.primary }}>
              {companyRecords.name}
            </h3>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <StatsCard 
                number={companyRecords.summary.total} 
                label="Actividades"
                bgColor={theme.primary}
              />
              <StatsCard 
                number={companyRecords.summary.hours} 
                label="Horas Totales"
                bgColor={theme.primary}
              />
              <StatsCard 
                number={companyRecords.summary.workers} 
                label="Funcionarios"
                bgColor={theme.primary}
              />
            </div>
            
            {companyRecords.records.length === 0 ? (
              <div
                className="rounded-lg p-12 text-center"
                style={{ background: isDark ? '#0f1419' : '#f8f9fa', color: theme.textSecondary }}
              >
                No hay actividades registradas para esta empresa
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-white" style={{ background: theme.primary }}>
                    <tr>
                      <th className="px-4 py-3 text-left">Funcionario</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Hora Inicio</th>
                      <th className="px-4 py-3 text-left">Hora Fin</th>
                      <th className="px-4 py-3 text-left">Horas</th>
                      <th className="px-4 py-3 text-left">Descripción</th>
                      <th className="px-4 py-3 text-left">Archivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyRecords.records.map(record => (
                      <tr
                        key={record.id}
                        className="border-b hover:opacity-75 transition-opacity"
                        style={{
                          borderColor: theme.border,
                          background: isDark ? 'transparent' : '#f8f9fa'
                        }}
                      >
                        <td className="px-4 py-3 font-semibold">{record.worker_name}</td>
                        <td className="px-4 py-3 text-xs">{new Date(record.start_datetime).toLocaleDateString('es-ES')}</td>
                        <td className="px-4 py-3 text-xs">{new Date(record.start_datetime).toLocaleTimeString('es-ES')}</td>
                        <td className="px-4 py-3 text-xs">{new Date(record.end_datetime).toLocaleTimeString('es-ES')}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded text-white text-xs font-semibold" style={{ background: theme.primary }}>
                            {record.hours_worked}h
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate">{record.description}</td>
                        <td className="px-4 py-3">
                          {record.file_url ? (
                            <a href={record.file_url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: theme.secondary }}>
                              Ver
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
        )}
      </div>
    </div>
  );
}
