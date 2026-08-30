import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const createSupabaseClient = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
        return null;
    }
    return createClient(supabaseUrl, supabaseAnonKey);
};
export const supabase = createSupabaseClient();
export const getServiceSupabase = () => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || (!serviceKey && !supabaseAnonKey)) {
        return null;
    }
    return createClient(
        supabaseUrl,
        serviceKey || supabaseAnonKey
    );
};