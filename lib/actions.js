'use server';

import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Cliente con privilegios de administrador (solo para uso interno del servidor)
const getServiceSupabase = () => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
        console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing');
    }
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
    // OWASP A04: Eliminamos el soporte para contraseñas en texto plano por seguridad
    if (!hashedPassword || !hashedPassword.startsWith('$2')) {
        return false;
    }
    return bcrypt.compare(password, hashedPassword);
}

/**
 * Sanitiza un objeto de usuario para no enviar el hash de la contraseña al cliente.
 * OWASP A04: Sensitive Data Exposure
 */
function sanitizeUser(user) {
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
}

/**
 * Valida si el ID proporcionado corresponde a un administrador activo.
 * OWASP A01: Broken Access Control
 */
async function validateAdmin(adminId) {
    if (!adminId) return false;
    const adminDb = getServiceSupabase();
    const { data, error } = await adminDb
        .from('admin_users')
        .select('id')
        .eq('id', adminId)
        .single();
    return !!data && !error;
}

// ==========================================
// AUTHENTICATION SERVER ACTIONS
// ==========================================

export async function loginUnifiedAction(username, password) {
    if (!supabase) {
        return { success: false, message: 'Error de configuración de BD' };
    }

    try {
        const adminDb = getServiceSupabase();

        // 1. Check Admin
        const { data: adminData } = await adminDb
            .from('admin_users')
            .select('*')
            .eq('username', username)
            .single();

        if (adminData) {
            const isValid = await verifyPassword(password, adminData.password);
            if (isValid) return { 
                success: true, 
                user: sanitizeUser(adminData), 
                role: 'admin' 
            };
        }

        // 2. Check Company
        const { data: companyData } = await adminDb
            .from('companies')
            .select('*')
            .eq('username', username)
            .single();

        if (companyData) {
            if (!companyData.password) {
                return { success: false, message: 'Esta cuenta no tiene acceso habilitado. Contacte al administrador.' };
            }
            const isValid = await verifyPassword(password, companyData.password);
            if (isValid) return { 
                success: true, 
                user: sanitizeUser(companyData), 
                role: 'company' 
            };
        }

        // 3. Check Worker
        const { data: workerData } = await adminDb
            .from('workers')
            .select('*')
            .eq('username', username)
            .single();

        if (workerData) {
            const isValid = await verifyPassword(password, workerData.password);
            if (isValid) return { 
                success: true, 
                user: sanitizeUser(workerData), 
                role: 'worker' 
            };
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

export async function createCompanyAction(data, requesterId) {
    // OWASP A01: Validación de identidad del solicitante
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }

    try {
        const adminDb = getServiceSupabase();
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

        const { data: newCompany, error } = await adminDb
            .from('companies')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        return { success: true, company: sanitizeUser(newCompany) };

    } catch (error) {
        console.error('Create company action error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateCompanyAction(id, data, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }

    try {
        const adminDb = getServiceSupabase();
        const payload = { ...data };

        if (payload.password) {
            payload.password = await hashPassword(payload.password);
        }

        const { error } = await adminDb
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

export async function deleteCompanyAction(id, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }

    try {
        const adminDb = getServiceSupabase();
        const { error } = await adminDb
            .from('companies')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Delete company action error:', error);
        return { success: false, error: error.message };
    }
}

export async function createWorkerAction(data, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }

    try {
        const adminDb = getServiceSupabase();
        const payload = { ...data };

        if (payload.password) {
            payload.password = await hashPassword(payload.password);
        }

        const { data: newWorker, error } = await adminDb
            .from('workers')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        return { success: true, worker: sanitizeUser(newWorker) };

    } catch (error) {
        console.error('Create worker action error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateWorkerAction(id, data, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }

    try {
        const adminDb = getServiceSupabase();
        const payload = { ...data };

        if (payload.password) {
            payload.password = await hashPassword(payload.password);
        }

        const { error } = await adminDb
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

export async function deleteWorkerAction(id, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }

    try {
        const adminDb = getServiceSupabase();
        
        // Eliminar registros primero (por integridad referencial si no hay cascade)
        await adminDb.from('audit_records').delete().eq('worker_id', id);
        
        const { error } = await adminDb
            .from('workers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Delete worker action error:', error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// GROUP MANAGEMENT SERVER ACTIONS
// ==========================================

export async function createCompanyGroupAction(data, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }

    try {
        const adminDb = getServiceSupabase();
        const payload = { ...data };

        if (payload.password) {
            payload.password = await hashPassword(payload.password);
        }

        const { data: newGroup, error } = await adminDb
            .from('company_groups')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        return { success: true, group: sanitizeUser(newGroup) };

    } catch (error) {
        console.error('Create group action error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateCompanyGroupAction(id, data, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }

    try {
        const adminDb = getServiceSupabase();
        const payload = { ...data };

        if (payload.password) {
            payload.password = await hashPassword(payload.password);
        }

        const { error } = await adminDb
        const { data, error } = await adminDb
            .from('company_groups')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Update group action error:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteCompanyGroupAction(id, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }

    try {
        const adminDb = getServiceSupabase();
        const { error } = await adminDb
            .from('company_groups')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Delete group action error:', error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// RECRUITMENT SERVER ACTIONS (ADMIN ONLY)
// ==========================================

export async function createSurveyAction(payload, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }

    try {
        const adminDb = getServiceSupabase();
        const { data, error } = await adminDb
            .from('recruitment_surveys')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: sanitizeUser(data) };
    } catch (error) {
        console.error('Create survey error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateSurveyStatusAction(id, is_active, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }

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

export async function deleteSurveyAction(id, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }

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

// ==========================================
// ADMIN PROFILE SERVER ACTIONS
// ==========================================

export async function updateAdminAction(id, data, requesterId) {
    // Un admin solo puede actualizarse a sí mismo, o ser actualizado por otro admin verificado
    if (!(await validateAdmin(requesterId)) || (id !== requesterId)) {
        // Permitimos que un admin actualice a otro si es necesario, 
        // pero aquí reforzamos que al menos el que lo pide sea admin.
        if (!(await validateAdmin(requesterId))) {
            return { success: false, error: 'Acceso no autorizado' };
        }
    }

    try {
        const adminDb = getServiceSupabase();
        const payload = {};

        if (data.full_name && data.full_name.trim()) {
            payload.full_name = data.full_name.trim();
        }

        if (data.password && data.password.trim()) {
            payload.password = await hashPassword(data.password.trim());
        }

        if (Object.keys(payload).length === 0) {
            return { success: false, error: 'No hay cambios para guardar' };
        }

        const { error } = await adminDb
            .from('admin_users')
            .update(payload)
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Update admin error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * OWASP A01:2021-Broken Access Control
 * Permite eliminar un registro de auditoría, validando privilegios de administrador.
 */
export async function deleteAuditRecordAction(id, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }

    try {
        const adminDb = getServiceSupabase();
        const { error } = await adminDb
            .from('audit_records')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Delete record error:', error);
        return { success: false, error: error.message };
    }
}

