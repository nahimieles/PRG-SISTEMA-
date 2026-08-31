const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
    const file = process.argv[2];
    if (!file) {
      console.error("Please provide a SQL file to run.");
      process.exit(1);
    }
    
    const sql = fs.readFileSync(file, 'utf8');
    
    console.log("Running SQL...");
    let res = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (res.error) {
        console.error("Error:", res.error);
    } else {
        console.log("Success:", res.data);
    }
}

main();
