const fs = require('fs'); 
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => { 
  const [key, ...val] = line.split('='); 
  if (key && val.length) acc[key.trim()] = val.join('=').trim().replace(/['"]/g, ''); 
  return acc; 
}, {}); 
const { createClient } = require('@supabase/supabase-js'); 
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY); 
async function test() { 
  const { data, error } = await supabase.from('audit_records').select('*').limit(5); 
  console.log(error ? error : JSON.stringify(data, null, 2)); 
} 
test();
