import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

// ==========================================
// UTILIDADES DE SEGURIDAD
// ==========================================

// Hash de contraseña
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Verificar contraseña
export async function verifyPassword(password, hashedPassword) {
  // Si la contraseña almacenada no parece ser un hash bcrypt, comparar directamente
  // Esto permite compatibilidad con contraseñas existentes en texto plano
  if (!hashedPassword.startsWith('$2')) {
    return password === hashedPassword;
  }
  return bcrypt.compare(password, hashedPassword);
}

// ==========================================
// TRABAJADORES
// ==========================================

export async function loginWorker(username, password) {
  if (!supabase) {
    return { success: false, message: 'Error de configuración' };
  }

  // Primero buscar el usuario solo por username
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) {
    return { success: false, message: 'Usuario o contraseña incorrectos' };
  }

  // Verificar la contraseña (funciona con hash o texto plano)
  const isValid = await verifyPassword(password, data.password);
  if (!isValid) {
    return { success: false, message: 'Usuario o contraseña incorrectos' };
  }

  return { success: true, worker: data };
}

export async function getWorker(id) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function getAllWorkers() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('workers')
    .select('*');

  if (error) return [];
  return data;
}

// ==========================================
// ADMIN/SECRETARÍA
// ==========================================

export async function loginAdmin(username, password) {
  if (!supabase) {
    return { success: false, message: 'Error de configuración' };
  }

  // Primero buscar el admin solo por username
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) {
    return { success: false, message: 'Usuario o contraseña incorrectos' };
  }

  // Verificar la contraseña (funciona con hash o texto plano)
  const isValid = await verifyPassword(password, data.password);
  if (!isValid) {
    return { success: false, message: 'Usuario o contraseña incorrectos' };
  }

  return { success: true, admin: data };
}

// ==========================================
// EMPRESA (CLIENTE) - LOGIN
// ==========================================

export async function loginCompany(username, password) {
  if (!supabase) {
    return { success: false, message: 'Error de configuración' };
  }

  // Buscar empresa por username
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) {
    return { success: false, message: 'Usuario o contraseña incorrectos' };
  }

  // Verificar password (hash o texto plano)
  if (data.password) {
    const isValid = await verifyPassword(password, data.password);
    if (!isValid) {
      return { success: false, message: 'Usuario o contraseña incorrectos' };
    }
  } else {
    // Si no tiene password configurado aún (migración)
    return { success: false, message: 'Esta cuenta no tiene acceso habilitado. Contacte al administrador.' };
  }

  return { success: true, company: data };
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

// CARGAR ARCHIVO CON VALIDACIÓN Y MEJOR MANEJO DE ERRORES
export async function uploadFile(file, recordId) {
  // Validaciones
  if (!file) {
    return { success: false, error: 'No se proporcionó archivo' };
  }

  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  if (file.size > MAX_SIZE) {
    return {
      success: false,
      error: `El archivo es demasiado grande (máximo 50MB). Tamaño: ${(file.size / 1024 / 1024).toFixed(2)}MB`
    };
  }

  if (file.size === 0) {
    return { success: false, error: 'El archivo está vacío' };
  }

  const fileExt = file.name.split('.').pop();
  if (!fileExt) {
    return { success: false, error: 'El archivo no tiene extensión válida' };
  }

  const fileName = `${recordId}-${Date.now()}.${fileExt}`;

  try {
    // Intentar subir archivo
    const { data, error } = await supabase.storage
      .from('audit-files')
      .upload(`uploads/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);

      // Mensajes de error más descriptivos
      if (error.message?.includes('Bucket not found')) {
        return {
          success: false,
          error: 'El bucket de almacenamiento no existe. Contacta al administrador.'
        };
      }

      if (error.message?.includes('Payload too large')) {
        return {
          success: false,
          error: 'El archivo es demasiado grande para el servidor'
        };
      }

      return {
        success: false,
        error: error.message || 'Error desconocido al subir archivo'
      };
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('audit-files')
      .getPublicUrl(`uploads/${fileName}`);

    return {
      success: true,
      filePath: fileName,
      fileUrl: urlData.publicUrl
    };
  } catch (error) {
    console.error('Exception in uploadFile:', error);
    return {
      success: false,
      error: error.message || 'Error inesperado al subir archivo'
    };
  }
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

// EXPORTACIÓN A EXCEL CON FORMATO PROFESIONAL
export async function exportToExcel(records, filename = 'reporte-actividades') {
  if (records.length === 0) {
    alert('No hay registros para exportar');
    return;
  }

  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();

  // Metadatos del workbook
  workbook.creator = 'Sistema de Registro de Trabajo';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Actividades', {
    properties: { tabColor: { argb: '3498db' } }
  });

  // Definir columnas con anchos
  worksheet.columns = [
    { header: 'Funcionario', key: 'worker', width: 25 },
    { header: 'Empresa', key: 'company', width: 30 },
    { header: 'Fecha Inicio', key: 'start', width: 20 },
    { header: 'Fecha Fin', key: 'end', width: 20 },
    { header: 'Horas', key: 'hours', width: 10 },
    { header: 'Descripción', key: 'description', width: 50 }
  ];

  // Estilo del encabezado
  const headerRow = worksheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2c3e50' }
    };
    cell.font = {
      color: { argb: 'FFFFFF' },
      bold: true,
      size: 12
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'thin', color: { argb: '000000' } },
      right: { style: 'thin', color: { argb: '000000' } }
    };
  });

  // Añadir datos
  let totalHours = 0;
  records.forEach((record, index) => {
    const hours = parseFloat(record.hours_worked || 0);
    totalHours += hours;

    const row = worksheet.addRow({
      worker: record.worker_name,
      company: record.company_name,
      start: new Date(record.start_datetime).toLocaleString('es-ES'),
      end: new Date(record.end_datetime).toLocaleString('es-ES'),
      hours: hours,
      description: record.description || ''
    });

    // Estilo alternado para filas
    const bgColor = index % 2 === 0 ? 'f8f9fa' : 'ffffff';
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'dee2e6' } },
        left: { style: 'thin', color: { argb: 'dee2e6' } },
        bottom: { style: 'thin', color: { argb: 'dee2e6' } },
        right: { style: 'thin', color: { argb: 'dee2e6' } }
      };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });

    // Centrar columna de horas
    row.getCell('hours').alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Fila de totales
  const totalRow = worksheet.addRow({
    worker: '',
    company: '',
    start: '',
    end: 'TOTAL:',
    hours: totalHours.toFixed(2),
    description: `${records.length} registros`
  });

  totalRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '27ae60' }
    };
    cell.font = {
      color: { argb: 'FFFFFF' },
      bold: true,
      size: 11
    };
    cell.border = {
      top: { style: 'medium', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'medium', color: { argb: '000000' } },
      right: { style: 'thin', color: { argb: '000000' } }
    };
    cell.alignment = { vertical: 'middle', horizontal: colNumber >= 4 ? 'center' : 'left' };
  });

  // Generar y descargar archivo
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
}

// EMPRESAS
// EMPRESAS Y GRUPOS
export async function getCompanyGroups() {
  const { data, error } = await supabase
    .from('company_groups')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching company groups:', error);
    return [];
  }
  return data || [];
}

export async function createCompanyGroup(name, type = 'group') {
  const { data, error } = await supabase
    .from('company_groups')
    .insert([{ name, type }])
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, group: data };
}

export async function updateCompanyGroup(id, name) {
  const { error } = await supabase
    .from('company_groups')
    .update({ name })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteCompanyGroup(id) {
  // Primero desvincular empresas (set group_id = null) o la DB lo hará si hay cascade,
  // pero por seguridad lo hacemos manual o dejamos que falle si hay constraint.
  // Asumiremos que el usuario quiere limpiar.

  await supabase
    .from('companies')
    .update({ group_id: null })
    .eq('group_id', id);

  const { error } = await supabase
    .from('company_groups')
    .delete()
    .eq('id', id);

  return !error;
}

export async function getCompanies() {
  // Intentar traer con relación de grupos
  let { data, error } = await supabase
    .from('companies')
    .select('*, company_groups(name)')
    .order('name');

  if (error) {
    console.warn('Error fetching companies with groups, trying fallback:', error.message || error);
    // Fallback: traer sin la relación (por si no se ha ejecutado la migración SQL)
    const fallback = await supabase
      .from('companies')
      .select('*')
      .order('name');

    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('Error fetching companies (fallback failed):', error);
    return [];
  }

  // Mapear para aplanar grupo
  const companies = (data || []).map(c => ({
    ...c,
    group_name: c.company_groups?.name || null
  }));

  // No agrupamos por nombre para evitar perder IDs y causar errores de claves duplicadas en la edición.
  // Cada registro de la DB ahora tendrá su propia representación en el UI.
  return companies;
}

export async function addCompany(name, type, username, password, groupId = null, avatarUrl = null) {
  const payload = { name, type };
  if (username) payload.username = username;
  if (password) payload.password = password; // Se debería hashear idealmente si es login
  if (groupId) payload.group_id = groupId;
  if (avatarUrl) payload.avatar_url = avatarUrl;

  const { data, error } = await supabase
    .from('companies')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error adding company:', error);
    return { success: false, error: error.message };
  }
  return { success: true, company: data };
}

export async function updateCompany(id, updates) {
  const { error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
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

export function saveCompanySession(company, expirationMinutes = 60) {
  const sessionData = {
    company,
    timestamp: Date.now(),
    expiration: Date.now() + (expirationMinutes * 60 * 1000)
  };
  localStorage.setItem('companySession', JSON.stringify(sessionData));
}

export function getCompanySession() {
  const session = localStorage.getItem('companySession');
  if (!session) return null;

  const data = JSON.parse(session);
  if (Date.now() > data.expiration) {
    localStorage.removeItem('companySession');
    return null;
  }
  return data.company;
}

export function clearCompanySession() {
  localStorage.removeItem('companySession');
}



// ==========================================
// GESTIÓN DE CURSOS
// ==========================================

export async function getCourses() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting courses:', error);
    return [];
  }

  // Obtener asignaciones para cada curso
  const coursesWithAssignments = await Promise.all(data.map(async (course) => {
    const { data: assignments } = await supabase
      .from('course_assignments')
      .select('company_id')
      .eq('course_id', course.id);

    return {
      ...course,
      assigned_company_ids: assignments ? assignments.map(a => a.company_id) : []
    };
  }));

  return coursesWithAssignments;
}

export async function createCourse(courseData) {
  // 1. Crear el curso
  const { data: course, error } = await supabase
    .from('courses')
    .insert([{
      title: courseData.title,
      description: courseData.description,
      file_url: courseData.file_url,
      cover_image: courseData.cover_image,
      icon_name: courseData.icon_name
    }])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // 2. Crear asignaciones si existen
  if (courseData.assigned_company_ids && courseData.assigned_company_ids.length > 0) {
    const assignments = courseData.assigned_company_ids.map(companyId => ({
      course_id: course.id,
      company_id: companyId
    }));

    const { error: assignError } = await supabase
      .from('course_assignments')
      .insert(assignments);

    if (assignError) {
      console.error('Error assigning course:', assignError);
    }
  }

  return { success: true, course };
}

export async function updateCourse(id, courseData) {
  // 1. Actualizar datos básicos
  const { error } = await supabase
    .from('courses')
    .update({
      title: courseData.title,
      description: courseData.description,
      file_url: courseData.file_url,
      cover_image: courseData.cover_image,
      icon_name: courseData.icon_name
    })
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  // 2. Actualizar asignaciones
  // Estrategia: Borrar todas las existentes y recrear (simple)
  await supabase.from('course_assignments').delete().eq('course_id', id);

  if (courseData.assigned_company_ids && courseData.assigned_company_ids.length > 0) {
    const assignments = courseData.assigned_company_ids.map(companyId => ({
      course_id: id,
      company_id: companyId
    }));

    await supabase.from('course_assignments').insert(assignments);
  }

  return { success: true };
}

export const updateCoursePosition = async (id, position) => {
  if (supabase) {
    const { error } = await supabase
      .from('courses')
      .update({ position })
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } else {
    // Mock Implementation
    const courses = JSON.parse(localStorage.getItem('courses') || '[]');
    const index = courses.findIndex(c => c.id === id);
    if (index !== -1) {
      courses[index].position = position;
      localStorage.setItem('courses', JSON.stringify(courses));
      return { success: true };
    }
    return { success: false, error: 'Course not found' };
  }
};

export async function deleteCourse(id) {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id);

  return !error;
}

export async function getCompanyCourses(companyId) {
  // Obtener cursos asignados con su posición
  // Hacemos un join manual porque la query anidada compleja es difícil con cliente simple

  const { data: assignments, error: assignError } = await supabase
    .from('course_assignments')
    .select('course_id, position')
    .eq('company_id', companyId)
    .order('position', { ascending: true });

  if (assignError || !assignments || assignments.length === 0) return [];

  const courseIds = assignments.map(a => a.course_id);
  const positionMap = {};
  assignments.forEach(a => {
    positionMap[a.course_id] = a.position || 0;
  });

  // Obtener detalles de los cursos (sin orden específico aún)
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('*')
    .in('id', courseIds);

  if (coursesError) return [];

  // Mapear y ordenar por la posición obtenida de assignments
  const coursesWithFullAssignments = await Promise.all(courses.map(async (course) => {
    const { data: assignmentsData } = await supabase
      .from('course_assignments')
      .select('company_id')
      .eq('course_id', course.id);

    return {
      ...course,
      position: positionMap[course.id],
      assigned_company_ids: assignmentsData ? assignmentsData.map(a => a.company_id) : []
    };
  }));

  return coursesWithFullAssignments.sort((a, b) => a.position - b.position);
}

export async function updateCourseOrder(companyId, courses) {
  // courses es un array de objetos { id, ... } en el nuevo orden
  if (!courses || courses.length === 0) return { success: true };

  const updates = courses.map((course, index) => ({
    company_id: companyId,
    course_id: course.id,
    position: index
  }));

  // Actualizar uno por uno (o upsert si configuramos constraints)
  // Para simplicidad y seguridad, hacemos update where match

  for (const update of updates) {
    await supabase
      .from('course_assignments')
      .update({ position: update.position })
      .eq('company_id', update.company_id)
      .eq('course_id', update.course_id);
  }

  return { success: true };
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

// ==========================================
// SISTEMA DE ASISTENCIA (ATTENDANCE)
// ==========================================

// Iniciar asistencia (check-in)
export async function startAttendance(workerId, workerName) {
  if (!supabase) {
    console.error('Supabase not configured');
    return { success: false, message: 'Error de configuración' };
  }

  try {
    // Verificar si ya hay una asistencia activa
    const active = await getActiveAttendance(workerId);
    if (active) {
      return { success: false, message: 'Ya tienes una asistencia activa' };
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .insert([{
        worker_id: workerId,
        worker_name: workerName,
        status: 'active'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error starting attendance:', error);
      return { success: false, error, message: error.message };
    }
    return { success: true, attendance: data };
  } catch (err) {
    console.error('Exception in startAttendance:', err);
    return { success: false, message: err.message };
  }
}

// Detener asistencia (check-out)
export async function stopAttendance(attendanceId) {
  const checkOutTime = new Date().toISOString();

  // Obtener el registro para calcular las horas
  const { data: record } = await supabase
    .from('attendance_records')
    .select('check_in_time')
    .eq('id', attendanceId)
    .single();

  if (!record) {
    return { success: false, message: 'Registro no encontrado' };
  }

  const checkIn = new Date(record.check_in_time);
  const checkOut = new Date(checkOutTime);
  const totalHours = ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2);

  const { data, error } = await supabase
    .from('attendance_records')
    .update({
      check_out_time: checkOutTime,
      total_hours: parseFloat(totalHours),
      status: 'completed'
    })
    .eq('id', attendanceId)
    .select()
    .single();

  if (error) {
    console.error('Error stopping attendance:', error);
    return { success: false, error };
  }
  return { success: true, attendance: data };
}

// Obtener asistencia activa de un trabajador
export async function getActiveAttendance(workerId) {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('worker_id', workerId)
      .eq('status', 'active')
      .single();

    if (error) return null;
    return data;
  } catch (err) {
    console.error('Error in getActiveAttendance:', err);
    return null;
  }
}

// Obtener historial de asistencia de un trabajador
export async function getWorkerAttendanceRecords(workerId) {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('worker_id', workerId)
      .order('check_in_time', { ascending: false });

    if (error) return [];
    return data || [];
  } catch (err) {
    console.error('Error in getWorkerAttendanceRecords:', err);
    return [];
  }
}

// Obtener todos los registros de asistencia (admin)
export async function getAllAttendanceRecords() {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .order('check_in_time', { ascending: false });

  if (error) {
    console.error('Error fetching attendance records:', error);
    return [];
  }
  return data || [];
}

// Obtener asistencias activas (admin - tiempo real)
export async function getActiveAttendances() {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('status', 'active')
    .order('check_in_time', { ascending: false });

  if (error) return [];
  return data || [];
}

// Estadísticas de asistencia
export async function getAttendanceStats() {
  const { data: records, error } = await supabase
    .from('attendance_records')
    .select('*')
    .order('check_in_time', { ascending: false });

  if (error) return null;

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeNow = (records || []).filter(r => r.status === 'active').length;

  const todaysRecords = (records || []).filter(r => {
    const recordDate = new Date(r.check_in_time);
    recordDate.setHours(0, 0, 0, 0);
    return recordDate.getTime() === today.getTime();
  });

  const completedToday = todaysRecords.filter(r => r.status === 'completed');
  const totalHoursToday = completedToday
    .reduce((sum, r) => sum + parseFloat(r.total_hours || 0), 0);

  return {
    activeNow,
    todayCheckIns: todaysRecords.length,
    totalHoursToday: totalHoursToday.toFixed(2),
    totalRecords: records?.length || 0
  };
}

// Eliminar registro de asistencia (admin)
export async function deleteAttendanceRecord(id) {
  const { error } = await supabase
    .from('attendance_records')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting attendance record:', error);
    return false;
  }
  return true;
}

// ==========================================
// LOGIN UNIFICADO CON DETECCIÓN DE ROL
// ==========================================

export async function loginUnified(username, password) {
  if (!supabase) {
    return { success: false, message: 'Error de configuración' };
  }

  // Intentar primero como admin
  const adminResult = await loginAdmin(username, password);
  if (adminResult.success) {
    return {
      success: true,
      role: 'admin',
      user: adminResult.admin
    };
  }

  // Intentar como trabajador
  const workerResult = await loginWorker(username, password);
  if (workerResult.success) {
    return {
      success: true,
      role: 'worker',
      user: workerResult.worker
    };
  }

  // Intentar como empresa (cliente)
  const companyResult = await loginCompany(username, password);
  if (companyResult.success) {
    return {
      success: true,
      role: 'company',
      user: companyResult.company
    };
  }

  return { success: false, message: 'Usuario o contraseña incorrectos' };
}

// Guardar sesión unificada
export function saveUnifiedSession(user, role, expirationMinutes = 30) {
  const sessionData = {
    user,
    role,
    timestamp: Date.now(),
    expiration: Date.now() + (expirationMinutes * 60 * 1000)
  };
  localStorage.setItem('unifiedSession', JSON.stringify(sessionData));

  // También guardar en la sesión específica para compatibilidad
  if (role === 'admin') {
    saveAdminSession(user, expirationMinutes);
  } else if (role === 'worker') {
    saveWorkerSession(user, expirationMinutes);
  } else if (role === 'company') {
    saveCompanySession(user, expirationMinutes);
  }
}

// Obtener sesión unificada
export function getUnifiedSession() {
  const session = localStorage.getItem('unifiedSession');
  if (!session) return null;

  const data = JSON.parse(session);
  if (Date.now() > data.expiration) {
    localStorage.removeItem('unifiedSession');
    return null;
  }
  return { user: data.user, role: data.role };
}

// Limpiar sesión unificada
export function clearUnifiedSession() {
  localStorage.removeItem('unifiedSession');
  clearAdminSession();
  clearWorkerSession();
  clearCompanySession();
}