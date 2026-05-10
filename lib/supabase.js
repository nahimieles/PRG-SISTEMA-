import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a dummy client for build time, real client for runtime
const createSupabaseClient = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
        // Return a mock object during build to prevent errors
        // This will be replaced with real client at runtime
        return null;
    }
    return createClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = createSupabaseClient();

// Cliente con privilegios de administrador (solo para uso interno del servidor/API)
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