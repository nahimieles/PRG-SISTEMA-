const fs = require('fs');
const file = 'c:\\Users\\nahim\\Documents\\Sistema Registro de Trabajo\\my-app\\lib\\auth.js';
let content = fs.readFileSync(file, 'utf8');

const append = `

// ==========================================
// CATÁLOGOS JERÁRQUICOS (UNIDADES DE NEGOCIO, ACTIVIDADES, SUBACTIVIDADES)
// ==========================================

export async function getBusinessUnits() {
  const { data, error } = await supabase.from('business_units').select('*').eq('is_active', true).order('name');
  if (error) { console.error('Error', error); return []; }
  return data || [];
}

export async function getActivities(businessUnitId = null) {
  let query = supabase.from('activities').select('*').eq('is_active', true).order('name');
  if (businessUnitId) query = query.eq('business_unit_id', businessUnitId);
  const { data, error } = await query;
  if (error) { console.error('Error', error); return []; }
  return data || [];
}

export async function getSubactivities(activityId = null) {
  let query = supabase.from('subactivities').select('*').eq('is_active', true).order('name');
  if (activityId) query = query.eq('activity_id', activityId);
  const { data, error } = await query;
  if (error) { console.error('Error', error); return []; }
  return data || [];
}

// ==========================================
// CONTROL DE ACCESO (EMPRESAS POR TRABAJADOR)
// ==========================================

export async function getCompaniesForWorker(workerId) {
  let { data: allCompanies } = await supabase.from('companies').select('*, company_groups(name)').order('name');
  if (!allCompanies) return [];

  let { data: worker } = await supabase.from('workers').select('company_id').eq('id', workerId).single();
  if (!worker) return allCompanies;
  
  let allowed = allCompanies;
  if (worker.company_id) {
     allowed = allCompanies.filter(c => c.id === worker.company_id);
  }
  return allowed;
}

`;

fs.writeFileSync(file, content + append, 'utf8');
