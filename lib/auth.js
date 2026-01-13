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