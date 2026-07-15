const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function test(workerId) {
  let { data: allCompanies } = await supabase.from('companies').select('*, company_groups(name)').order('name');
  if (!allCompanies) return [];

  const mapped = allCompanies.map(c => ({ ...c, group_name: c.company_groups?.name || null }));

  const { data: worker } = await supabase.from('workers').select('access_level').eq('id', workerId).single();
  
  if (worker && worker.access_level === 'all') {
      console.log('Worker has access_level=all');
      return mapped;
  }

  const [groupsRes, companiesRes] = await Promise.all([
    supabase.from('worker_company_groups_access').select('group_id').eq('worker_id', workerId),
    supabase.from('worker_companies_access').select('company_id').eq('worker_id', workerId)
  ]);

  console.log('groupsRes', groupsRes.data);
  console.log('companiesRes', companiesRes.data);

  const allowedGroups = new Set(groupsRes.data ? groupsRes.data.map(g => g.group_id) : []);
  const allowedCompanies = new Set(companiesRes.data ? companiesRes.data.map(c => c.company_id) : []);

  return mapped.filter(c => allowedCompanies.has(c.id) || (c.company_group_id && allowedGroups.has(c.company_group_id)));
}

async function run() {
    const { data } = await supabase.from('workers').select('id, nombre_completo').limit(1);
    console.log('Testing for worker:', data[0]);
    const res = await test(data[0].id);
    console.log('Allowed companies count:', res.length);
}
run();
