const fs = require('fs');
let code = fs.readFileSync('app/trabajadores/page_temp.jsx', 'utf8');

// 1. Add imports
code = code.replace(
  "import { addRecord, deleteRecord, calculateHours, uploadFile, getWorkerRecords, getCompanies, saveWorkerSession, getWorkerSession, clearWorkerSession, clearUnifiedSession, startAttendance, stopAttendance, getActiveAttendance, getWorkerAttendanceRecords } from '../../lib/auth.js';",
  "import { addRecord, deleteRecord, calculateHours, uploadFile, getWorkerRecords, getCompanies, saveWorkerSession, getWorkerSession, clearWorkerSession, clearUnifiedSession, startAttendance, stopAttendance, getActiveAttendance, getWorkerAttendanceRecords, getBusinessUnits, getActivities, getSubactivities } from '../../lib/auth.js';"
);

code = code.replace(
  "const CourseViewer = dynamic(() => import('../../components/CourseViewer'), { ssr: false });",
  "const CourseViewer = dynamic(() => import('../../components/CourseViewer'), { ssr: false });\nconst WorkerTasks = dynamic(() => import('../../components/hr/WorkerTasks'), { ssr: false });"
);

// 2. Add 'perfil' tab to sidebar items and default to 'perfil'
code = code.replace(
  "const [activeTab, setActiveTab] = useState('dashboards'); // Changed default",
  "const [activeTab, setActiveTab] = useState('perfil'); // Changed default"
);

code = code.replace(
  "const sidebarItems = [\n    { id: 'dashboards', label: 'Dashboards y Actividades', icon: PieChart },\n    { id: 'empresas', label: 'Empresas', icon: Building2 },\n    { id: 'cursos', label: 'Pruebas', icon: Play }\n  ];",
  `const sidebarItems = [
    { id: 'perfil', label: 'Mi Perfil', icon: ClipboardList },
    { id: 'dashboards', label: 'Actividades', icon: PieChart },
    { id: 'empresas', label: 'Empresas', icon: Building2 },
    { id: 'cursos', label: 'Cursos', icon: Play }
  ];`
);

// 3. Add states for hierarchy
code = code.replace(
  "const [companies, setCompanies] = useState([]);",
  `const [companies, setCompanies] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [activities, setActivities] = useState([]);
  const [subactivities, setSubactivities] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [selectedSubactivity, setSelectedSubactivity] = useState('');`
);

// We need to load the hierarchy data
code = code.replace(
  "getCompanies().then(setCompanies);",
  "getCompanies().then(setCompanies);\n      getBusinessUnits().then(setBusinessUnits);\n      getActivities().then(setActivities);\n      getSubactivities().then(setSubactivities);"
);

// 5. Submit handler
code = code.replace(
  `    const result = await addRecord({
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
    });`,
  `    // Get names for hierarchy
    const selectedUnitObj = businessUnits.find(u => u.id === selectedUnit);
    const selectedActObj = activities.find(a => a.id === selectedActivity);
    const selectedSubObj = subactivities.find(s => s.id === selectedSubactivity);

    const result = await addRecord({
      workerId: currentWorker.id,
      workerName: currentWorker.full_name,
      companyName: formData.companyName,
      serviceType: selectedActObj ? selectedActObj.name : 'Actividad', // fallback
      businessUnitId: selectedUnit || null,
      activityId: selectedActivity || null,
      subactivityId: selectedSubactivity || null,
      startDateTime: formData.startDateTime,
      endDateTime: formData.endDateTime,
      description: formData.description,
      hoursWorked,
      filePath: fileData.filePath,
      fileUrl: fileData.fileUrl
    });`
);

code = code.replace(
  `      setFormData({
        companyName: '',
        serviceType: '',
        startDateTime: '',
        endDateTime: '',
        description: ''
      });
      setFile(null);`,
  `      setFormData({
        companyName: '',
        serviceType: '',
        startDateTime: '',
        endDateTime: '',
        description: ''
      });
      setSelectedUnit('');
      setSelectedActivity('');
      setSelectedSubactivity('');
      setFile(null);`
);

// 6. Update Form fields. Remove "Sistema / Actividad" and "Evidencia"
const formOld = `                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Sistema / Actividad</label>
                        <SearchableSelect
                          options={['Contífico', 'Perseo', 'SRI', 'IESS', 'Reunión', 'Otro']}
                          value={formData.serviceType}
                          onChange={(val) => setFormData({ ...formData, serviceType: val })}
                          placeholder="Seleccionar o escribir actividad..."
                          isDark={isDark}
                          theme={theme}
                        />
                      </div>`;

const formNew = `                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Unidad de Negocio</label>
                          <select
                            value={selectedUnit}
                            onChange={(e) => {
                              setSelectedUnit(e.target.value);
                              setSelectedActivity('');
                              setSelectedSubactivity('');
                            }}
                            className="w-full px-4 py-2 rounded-lg border outline-none text-sm"
                            style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
                            required
                          >
                            <option value="">Seleccionar Unidad...</option>
                            {businessUnits.map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Actividad</label>
                          <select
                            value={selectedActivity}
                            onChange={(e) => {
                              setSelectedActivity(e.target.value);
                              setSelectedSubactivity('');
                            }}
                            className="w-full px-4 py-2 rounded-lg border outline-none text-sm"
                            style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
                            required
                            disabled={!selectedUnit}
                          >
                            <option value="">Seleccionar Actividad...</option>
                            {activities.filter(a => a.business_unit_id === selectedUnit).map(a => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Subactividad</label>
                          <select
                            value={selectedSubactivity}
                            onChange={(e) => setSelectedSubactivity(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border outline-none text-sm"
                            style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', borderColor: theme.border, color: theme.text }}
                            disabled={!selectedActivity}
                          >
                            <option value="">Seleccionar Subactividad...</option>
                            {subactivities.filter(s => s.activity_id === selectedActivity).map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>`;

code = code.replace(formOld, formNew);

// Remove "Evidencia"
const evidenciaBlock = `                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: theme.textSecondary }}>Evidencia (Opcional)</label>
                        <input
                          id="fileInput"
                          type="file"
                          onChange={(e) => setFile(e.target.files[0])}
                          className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
                          style={{ color: theme.textSecondary }}
                        />
                      </div>`;

code = code.replace(evidenciaBlock, "");

// Replace the table headers and rendering
const tableHeadersOld = `<th className="px-4 py-3 text-left first:rounded-tl-lg">Empresa</th>
                              <th className="px-4 py-3 text-left">Actividad</th>
                              <th className="px-4 py-3 text-left">Inicio</th>
                              <th className="px-4 py-3 text-left">Fin</th>
                              <th className="px-4 py-3 text-left">Horas</th>
                              <th className="px-4 py-3 text-left last:rounded-tr-lg">Archivo</th>`;

const tableHeadersNew = `<th className="px-4 py-3 text-left first:rounded-tl-lg">Empresa</th>
                              <th className="px-4 py-3 text-left">Actividad</th>
                              <th className="px-4 py-3 text-left">Subactividad</th>
                              <th className="px-4 py-3 text-left">Inicio</th>
                              <th className="px-4 py-3 text-left">Fin</th>
                              <th className="px-4 py-3 text-left last:rounded-tr-lg">Horas</th>`;

code = code.replace(tableHeadersOld, tableHeadersNew);

const tableRowOld = `<td className="px-4 py-3 font-semibold">{record.company_name}</td>
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
                                </td>`;

const tableRowNew = `<td className="px-4 py-3 font-semibold">{record.company_name}</td>
                                <td className="px-4 py-3 text-xs capitalize font-medium">{record.activity_name || record.service_type || 'No especificado'}</td>
                                <td className="px-4 py-3 text-xs capitalize font-medium">{record.subactivity_name || '-'}</td>
                                <td className="px-4 py-3 text-xs">{new Date(record.start_datetime).toLocaleString('es-ES')}</td>
                                <td className="px-4 py-3 text-xs">{new Date(record.end_datetime).toLocaleString('es-ES')}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className="px-3 py-1 rounded-full font-semibold text-white text-sm"
                                    style={{ background: theme.primary }}
                                  >
                                    {record.hours_worked}h
                                  </span>
                                </td>`;
code = code.replace(tableRowOld, tableRowNew);

// Add "perfil" tab logic
const activeTabDashboards = `{activeTab === 'dashboards' && (`;
const activeTabPerfil = `
          {activeTab === 'perfil' && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border" style={{ borderColor: theme.border, background: theme.surface }}>
                <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primary }}>Mi Perfil</h2>
                <WorkerTasks workerId={currentWorker?.id} theme={theme} isDark={isDark} readOnly={true} />
              </div>
            </div>
          )}

          {activeTab === 'dashboards' && (`;
code = code.replace(activeTabDashboards, activeTabPerfil);

fs.writeFileSync('app/trabajadores/page.jsx', code, 'utf8');
console.log("Rewrite complete");
