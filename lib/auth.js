import { supabase } from './supabase';

// TRABAJADORES
export async function loginWorker(username, password) {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();

  if (error) return { success: false, message: 'Usuario o contraseña incorrectos' };
  return { success: true, worker: data };
}

export async function getWorker(id) {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function getAllWorkers() {
  const { data, error } = await supabase
    .from('workers')
    .select('*');

  if (error) return [];
  return data;
}

// ADMIN/SECRETARÍA
export async function loginAdmin(username, password) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();

  if (error) return { success: false, message: 'Usuario o contraseña incorrectos' };
  return { success: true, admin: data };
}

// REGISTROS DE AUDITORÍA
export async function getRecords() {
  const { data, error } = await supabase
    .from('audit_records')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching records:', error);
    return [];
  }
  return data || [];
}

export async function getWorkerRecords(workerId) {
  const { data, error } = await supabase
    .from('audit_records')
    .select('*')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function addRecord(record) {
  const { data, error } = await supabase
    .from('audit_records')
    .insert([{
      worker_id: record.workerId,
      worker_name: record.workerName,
      company_name: record.companyName,
      start_datetime: record.startDateTime,
      end_datetime: record.endDateTime,
      hours_worked: parseFloat(record.hoursWorked),
      description: record.description,
      file_path: record.filePath || null,
      file_url: record.fileUrl || null
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding record:', error);
    return { success: false, error };
  }
  return { success: true, record: data };
}

export async function deleteRecord(id) {
  const { error } = await supabase
    .from('audit_records')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting record:', error);
    return false;
  }
  return true;
}

export async function updateAdminPassword(adminId, newPassword) {
  const { error } = await supabase
    .from('admin_users')
    .update({ password: newPassword })
    .eq('id', adminId);

  if (error) return false;
  return true;
}

// CARGAR ARCHIVO
export async function uploadFile(file, recordId) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${recordId}-${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('audit-files')
    .upload(`uploads/${fileName}`, file);

  if (error) {
    console.error('Error uploading file:', error);
    return { success: false, error };
  }

  const { data: urlData } = supabase.storage
    .from('audit-files')
    .getPublicUrl(`uploads/${fileName}`);

  return { success: true, filePath: fileName, fileUrl: urlData.publicUrl };
}

// UTILIDADES
export function calculateHours(startDateTime, endDateTime) {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);
  return ((end - start) / (1000 * 60 * 60)).toFixed(2);
}

export function exportToCSV(records, filename = 'auditorias') {
  if (records.length === 0) {
    alert('No hay registros para exportar');
    return;
  }

  const headers = ['Trabajador', 'Empresa', 'Fecha Inicio', 'Fecha Fin', 'Horas', 'Descripción'];
  const rows = records.map(r => [
    r.worker_name,
    r.company_name,
    new Date(r.start_datetime).toLocaleString('es-ES'),
    new Date(r.end_datetime).toLocaleString('es-ES'),
    r.hours_worked,
    r.description
  ]);

  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

// EMPRESAS
export async function getCompanies() {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching companies:', error);
    return [];
  }
  
  // Agrupar empresas por nombre, eliminando duplicados
  const groupedMap = new Map();
  (data || []).forEach(company => {
    const key = company.name;
    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        ...company,
        types: [company.type]
      });
    } else {
      const existing = groupedMap.get(key);
      if (!existing.types.includes(company.type)) {
        existing.types.push(company.type);
      }
    }
  });
  
  return Array.from(groupedMap.values());
}

export async function addCompany(name, type) {
  const { data, error } = await supabase
    .from('companies')
    .insert([{ name, type }])
    .select()
    .single();

  if (error) {
    console.error('Error adding company:', error);
    return { success: false, error };
  }
  return { success: true, company: data };
}

export async function deleteCompany(id) {
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting company:', error);
    return false;
  }
  return true;
}

// ANÁLISIS Y DASHBOARDS
export function getProductivityByCompany(records) {
  const companyData = {};
  
  records.forEach(record => {
    const company = record.company_name;
    if (!companyData[company]) {
      companyData[company] = { name: company, hours: 0, activities: 0 };
    }
    companyData[company].hours += parseFloat(record.hours_worked || 0);
    companyData[company].activities += 1;
  });

  return Object.values(companyData)
    .sort((a, b) => b.hours - a.hours)
    .map(item => ({
      name: item.name,
      Horas: parseFloat(item.hours.toFixed(2)),
      Actividades: item.activities
    }));
}

export function getProductivityByWorker(records) {
  const workerData = {};
  
  records.forEach(record => {
    const worker = record.worker_name;
    if (!workerData[worker]) {
      workerData[worker] = { name: worker, hours: 0, activities: 0 };
    }
    workerData[worker].hours += parseFloat(record.hours_worked || 0);
    workerData[worker].activities += 1;
  });

  return Object.values(workerData)
    .sort((a, b) => b.hours - a.hours)
    .map(item => ({
      name: item.name,
      Horas: parseFloat(item.hours.toFixed(2)),
      Actividades: item.activities
    }));
}

export function getHoursByDay(records) {
  const dayData = {};
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'];

  records.forEach(record => {
    const date = new Date(record.start_datetime);
    const dayKey = date.toISOString().split('T')[0];
    const dayName = dayNames[date.getDay()];
    
    if (!dayData[dayKey]) {
      dayData[dayKey] = { date: dayKey, dia: dayName, horas: 0 };
    }
    dayData[dayKey].horas += parseFloat(record.hours_worked || 0);
  });

  return Object.values(dayData)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-30) // Últimos 30 días
    .map(item => ({
      ...item,
      horas: parseFloat(item.horas.toFixed(2))
    }));
}

export function getTopActivities(records) {
  const activityData = {};
  
  records.forEach(record => {
    const company = record.company_name;
    if (!activityData[company]) {
      activityData[company] = { name: company, hours: 0 };
    }
    activityData[company].hours += parseFloat(record.hours_worked || 0);
  });

  return Object.values(activityData)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5)
    .map(item => ({
      name: item.name,
      value: parseFloat(item.hours.toFixed(2))
    }));
}

// SESSION MANAGEMENT
export function saveWorkerSession(worker, expirationMinutes = 10) {
  const sessionData = {
    worker,
    timestamp: Date.now(),
    expiration: Date.now() + (expirationMinutes * 60 * 1000)
  };
  localStorage.setItem('workerSession', JSON.stringify(sessionData));
}

export function saveAdminSession(admin, expirationMinutes = 10) {
  const sessionData = {
    admin,
    timestamp: Date.now(),
    expiration: Date.now() + (expirationMinutes * 60 * 1000)
  };
  localStorage.setItem('adminSession', JSON.stringify(sessionData));
}

export function getWorkerSession() {
  const session = localStorage.getItem('workerSession');
  if (!session) return null;
  
  const data = JSON.parse(session);
  if (Date.now() > data.expiration) {
    localStorage.removeItem('workerSession');
    return null;
  }
  return data.worker;
}

export function getAdminSession() {
  const session = localStorage.getItem('adminSession');
  if (!session) return null;
  
  const data = JSON.parse(session);
  if (Date.now() > data.expiration) {
    localStorage.removeItem('adminSession');
    return null;
  }
  return data.admin;
}

export function clearWorkerSession() {
  localStorage.removeItem('workerSession');
}

export function clearAdminSession() {
  localStorage.removeItem('adminSession');
}

// ALERTAS DE FALTA DE REPORTES
export async function getWorkersWithoutReports(daysThreshold = 3) {
  const { data: workers, error: workersError } = await supabase
    .from('workers')
    .select('*')
    .order('full_name');

  if (workersError) return [];

  const { data: records, error: recordsError } = await supabase
    .from('audit_records')
    .select('worker_id, created_at')
    .order('created_at', { ascending: false });

  if (recordsError) return [];

  const now = new Date();
  const thresholdDate = new Date(now.getTime() - daysThreshold * 24 * 60 * 60 * 1000);

  return workers.map(worker => {
    const lastRecord = records.find(r => r.worker_id === worker.id);
    const lastReportDate = lastRecord ? new Date(lastRecord.created_at) : null;
    const daysWithoutReport = lastReportDate ? Math.floor((now - lastReportDate) / (1000 * 60 * 60 * 24)) : null;
    const isAlert = !lastReportDate || lastReportDate < thresholdDate;

    return {
      id: worker.id,
      name: worker.full_name,
      lastReportDate,
      daysWithoutReport,
      isAlert
    };
  }).filter(w => w.isAlert);
}

// CONTROL DE CALIDAD
export async function getQualityIssues(records) {
  const issues = [];

  // Detectar descripciones vacías o muy cortas
  records.forEach(record => {
    if (!record.description || record.description.trim().length < 10) {
      issues.push({
        id: record.id,
        type: 'short_description',
        severity: 'warning',
        message: 'Descripción muy corta o vacía',
        record
      });
    }
  });

  // Detectar registros duplicados (mismo worker, empresa, fecha similar, horas similares)
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const r1 = records[i];
      const r2 = records[j];

      const sameWorker = r1.worker_id === r2.worker_id;
      const sameCompany = r1.company_name === r2.company_name;
      const sameDayStart = new Date(r1.start_datetime).toDateString() === new Date(r2.start_datetime).toDateString();
      const similarHours = Math.abs(parseFloat(r1.hours_worked) - parseFloat(r2.hours_worked)) < 0.5;

      if (sameWorker && sameCompany && sameDayStart && similarHours) {
        issues.push({
          id: r1.id,
          type: 'duplicate',
          severity: 'error',
          message: `Posible duplicado con registro ${r2.id}`,
          relatedId: r2.id,
          record: r1
        });
      }
    }
  }

  return issues;
}

// ESTADÍSTICAS EN TIEMPO REAL
export async function getRealTimeStats() {
  const { data: records, error } = await supabase
    .from('audit_records')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return null;

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Activos AHORA: registros que están en progreso (start <= ahora <= end) hoy
  const activeNow = (records || []).filter(r => {
    const startDate = new Date(r.start_datetime);
    const endDate = new Date(r.end_datetime);
    return startDate <= now && now <= endDate;
  });

  // Registros de hoy
  const todaysRecords = (records || []).filter(r => {
    const recordDate = new Date(r.start_datetime);
    recordDate.setHours(0, 0, 0, 0);
    return recordDate.getTime() === today.getTime();
  });

  const uniqueWorkersToday = [...new Set(todaysRecords.map(r => r.worker_id))].length;
  const totalHoursToday = todaysRecords.reduce((sum, r) => sum + parseFloat(r.hours_worked || 0), 0).toFixed(2);
  const lastActivity = records && records.length > 0 ? records[0] : null;

  return {
    activeNow: [...new Set(activeNow.map(r => r.worker_id))].length,
    activeWorkersToday: uniqueWorkersToday,
    totalHoursToday: parseFloat(totalHoursToday),
    lastActivity,
    totalRecords: records?.length || 0
  };
}