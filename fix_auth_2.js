const fs = require('fs');
const file = 'c:\\Users\\nahim\\Documents\\Sistema Registro de Trabajo\\my-app\\lib\\auth.js';
let content = fs.readFileSync(file, 'utf8');

// The faulty getCompaniesForWorker to remove
const faultyCode = `export async function getCompaniesForWorker(workerId) {
  let { data: allCompanies } = await supabase.from('companies').select('*, company_groups(name)').order('name');
  if (!allCompanies) return [];

  let { data: worker } = await supabase.from('workers').select('company_id').eq('id', workerId).single();
  if (!worker) return allCompanies;
  
  let allowed = allCompanies;
  if (worker.company_id) {
     allowed = allCompanies.filter(c => c.id === worker.company_id);
  }
  return allowed;
}`;

// The correct code to insert
const correctCode = `export async function getCompaniesForWorker(workerId) {
  let { data: allCompanies } = await supabase.from('companies').select('*, company_groups(name)').order('name');
  if (!allCompanies) return [];

  const mapped = allCompanies.map(c => ({ ...c, group_name: c.company_groups?.name || null }));

  const [groupsRes, companiesRes] = await Promise.all([
    supabase.from('worker_company_groups_access').select('group_id').eq('worker_id', workerId),
    supabase.from('worker_companies_access').select('company_id').eq('worker_id', workerId)
  ]);

  const allowedGroups = new Set(groupsRes.data ? groupsRes.data.map(g => g.group_id) : []);
  const allowedCompanies = new Set(companiesRes.data ? companiesRes.data.map(c => c.company_id) : []);

  return mapped.filter(c => allowedCompanies.has(c.id) || (c.group_id && allowedGroups.has(c.group_id)));
}

export async function getWorkerCompanyAccess(workerId) {
  const [groupsRes, companiesRes] = await Promise.all([
    supabase.from('worker_company_groups_access').select('group_id').eq('worker_id', workerId),
    supabase.from('worker_companies_access').select('company_id').eq('worker_id', workerId)
  ]);

  return {
    groupIds: groupsRes.data ? groupsRes.data.map(g => g.group_id) : [],
    companyIds: companiesRes.data ? companiesRes.data.map(c => c.company_id) : []
  };
}

export async function setWorkerCompanyAccess(workerId, groupIds = [], companyIds = []) {
  try {
    await Promise.all([
      supabase.from('worker_company_groups_access').delete().eq('worker_id', workerId),
      supabase.from('worker_companies_access').delete().eq('worker_id', workerId)
    ]);

    if (groupIds.length > 0) {
      await supabase.from('worker_company_groups_access').insert(
        groupIds.map(id => ({ worker_id: workerId, group_id: id }))
      );
    }
    if (companyIds.length > 0) {
      await supabase.from('worker_companies_access').insert(
        companyIds.map(id => ({ worker_id: workerId, company_id: id }))
      );
    }
    return { success: true };
  } catch (error) {
    console.error('Error setting access', error);
    return { success: false, error };
  }
}`;

if (content.includes(faultyCode)) {
  content = content.replace(faultyCode, correctCode);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully replaced getCompaniesForWorker and added access functions.');
} else {
  console.log('Faulty code not found!');
}
