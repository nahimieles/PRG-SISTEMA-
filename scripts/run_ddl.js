const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {

  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});
async function main() {
    let res = await supabase.rpc('execute_sql', { sql_query: `
        ALTER TABLE notificaciones ALTER COLUMN worker_id DROP NOT NULL;
        ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES admin_users(id);
        ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;
    `});
    if (res.error && res.error.message.includes('function execute_sql does not exist')) {

    } else {

    }
}
main();
