'use server';

import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const getServiceSupabase = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
};

// ==========================================
// UTILIDADES DE SEGURIDAD (SERVER-SIDE)
// ==========================================

export async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

export async function verifyPassword(password, hashedPassword) {
    if (!hashedPassword.startsWith('$2')) {
        return password === hashedPassword;
    }
    return bcrypt.compare(password, hashedPassword);
}

// ==========================================
// AUTHENTICATION SERVER ACTIONS
// ==========================================

export async function loginUnifiedAction(username, password) {
    if (!supabase) {
        return { success: false, message: 'Error de configuración de BD' };
    }

    try {
        // 1. Check Admin
        const { data: adminData } = await supabase
            .from('admin_users')
            .select('*')
            .eq('username', username)
            .single();

        if (adminData) {
            const isValid = await verifyPassword(password, adminData.password);
            if (isValid) return { success: true, user: adminData, role: 'admin' };
        }

        // 2. Check Company
        const { data: companyData } = await supabase
            .from('companies')
            .select('*')
            .eq('username', username)
            .single();

        if (companyData) {
            if (!companyData.password) {
                return { success: false, message: 'Esta cuenta no tiene acceso habilitado. Contacte al administrador.' };
            }
            const isValid = await verifyPassword(password, companyData.password);
            if (isValid) return { success: true, user: companyData, role: 'company' };
        }

        // 3. Check Worker
        const { data: workerData } = await supabase
            .from('workers')
            .select('*')
            .eq('username', username)
            .single();

        if (workerData) {
            const isValid = await verifyPassword(password, workerData.password);
            if (isValid) return { success: true, user: workerData, role: 'worker' };
        }

        return { success: false, message: 'Usuario o contraseña incorrectos' };

    } catch (error) {
        console.error('Login action error:', error);
        return { success: false, message: 'Error en el servidor al intentar iniciar sesión' };
    }
}

// ==========================================
// USER MANAGEMENT SERVER ACTIONS
// ==========================================

export async function createCompanyAction(data) {
    try {
        const payload = {
            name: data.name,
            type: data.type
        };

        if (data.username) payload.username = data.username;
        if (data.groupId) payload.group_id = data.groupId;
        if (data.logo_url) {
            payload.logo_url = data.logo_url;
            payload.avatar_url = data.logo_url;
        }

        if (data.password) {
            payload.password = await hashPassword(data.password);
        }

        const { data: newCompany, error } = await supabase
            .from('companies')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        return { success: true, company: newCompany };

    } catch (error) {
        console.error('Create company action error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateCompanyAction(id, data) {
    try {
        const payload = { ...data };

        if (payload.password) {
            payload.password = await hashPassword(payload.password);
        }

        const { error } = await supabase
            .from('companies')
            .update(payload)
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Update company action error:', error);
        return { success: false, error: error.message };
    }
}

export async function createWorkerAction(data) {
    try {
        const payload = { ...data };

        if (payload.password) {
            payload.password = await hashPassword(payload.password);
        }

        const { data: newWorker, error } = await supabase
            .from('workers')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        return { success: true, worker: newWorker };

    } catch (error) {
        console.error('Create worker action error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateWorkerAction(id, data) {
    try {
        const payload = { ...data };

        if (payload.password) {
            payload.password = await hashPassword(payload.password);
        }

        const { error } = await supabase
            .from('workers')
            .update(payload)
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Update worker action error:', error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// GROUP MANAGEMENT SERVER ACTIONS
// ==========================================

export async function createCompanyGroupAction(data) {
    try {
        const payload = { ...data };

        if (payload.password) {
            payload.password = await hashPassword(payload.password);
        }

        const { data: newGroup, error } = await supabase
            .from('company_groups')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        return { success: true, group: newGroup };

    } catch (error) {
        console.error('Create group action error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateCompanyGroupAction(id, data) {
    try {
        const payload = { ...data };

        if (payload.password) {
            payload.password = await hashPassword(payload.password);
        }

        const { error } = await supabase
            .from('company_groups')
            .update(payload)
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Update group action error:', error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// RECRUITMENT SERVER ACTIONS (ADMIN ONLY)
// ==========================================

export async function createSurveyAction(payload) {
    try {
        const adminDb = getServiceSupabase();
        const { data, error } = await adminDb
            .from('recruitment_surveys')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Create survey error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateSurveyStatusAction(id, is_active) {
    try {
        const adminDb = getServiceSupabase();
        const { error } = await adminDb
            .from('recruitment_surveys')
            .update({ is_active })
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Update survey status error:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteSurveyAction(id) {
    try {
        const adminDb = getServiceSupabase();
        const { error } = await adminDb
            .from('recruitment_surveys')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Delete survey error:', error);
        return { success: false, error: error.message };
    }
}
