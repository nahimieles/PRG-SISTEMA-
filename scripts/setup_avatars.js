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
    console.log("Setting up admin profile images feature...");
    
    // 1. Create storage bucket if it doesn't exist
    try {
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        if (listError) throw listError;
        
        const avatarBucket = buckets.find(b => b.name === 'avatars');
        if (!avatarBucket) {
            console.log("Creating 'avatars' bucket...");
            const { data, error } = await supabase.storage.createBucket('avatars', {
                public: true,
                fileSizeLimit: 10485760, // 10MB
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
            });
            if (error) console.error("Error creating bucket:", error.message);
            else console.log("Bucket created successfully.");
        } else {
            console.log("Bucket 'avatars' already exists.");
        }
    } catch (e) {
        console.error("Storage error:", e.message);
    }

    // 2. Add profile_image_url column to admin_users via execute_sql
    try {
        let res = await supabase.rpc('execute_sql', { sql_query: `
            ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
        `});
        if (res.error) {
            console.error("Error running SQL:", res.error.message);
        } else {
            console.log("SQL executed successfully. Column added.");
        }
    } catch (e) {
        console.error("SQL execution error:", e.message);
    }
}
main();
