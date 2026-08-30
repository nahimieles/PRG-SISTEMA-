import { supabase } from './supabase';
import { getAdminSession, getWorkerSession } from './auth';
import { pickAllowedFields, cleanText } from './security';
const hasPermission = (group, user) => {
    const perms = group.permissions || [];
    if (user.role === 'admin') return true;
    if (perms.includes('all')) return true;
    if (user.role && perms.includes(user.role)) return true;
    if (user.id && perms.includes(user.id)) return true;
    return false;
};
const getCurrentUser = () => {
    if (typeof window === 'undefined') return null;
    const admin = getAdminSession();
    if (admin) return { ...admin, role: 'admin' };
    const worker = getWorkerSession();
    if (worker) return { ...worker, role: 'worker' }; 
    return null;
};
export const getGroups = async () => {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('company_groups')
        .select('*')
        .order('order_index', { ascending: true });
    if (error) {
        throw error;
    }
    const user = getCurrentUser();
    if (!user) return []; 
    return (data || []).filter(group => hasPermission(group, user));
};
export const getGroupsByParent = async (parentId, options = {}) => {
    if (!supabase) return [];
    let query = supabase
        .from('company_groups')
        .select('*')
        .order('order_index', { ascending: true });
    if (parentId === null) {
        query = query.is('parent_id', null);
    } else {
        query = query.eq('parent_id', parentId);
    }
    const { data, error } = await query;
    if (error) {
        throw error;
    }
    let user;
    if (options.user && options.role) {
        user = { ...options.user, role: options.role };
    } else {
        user = getCurrentUser();
    }
    if (!user) {
        return data || [];
    }
    return (data || []).filter(group => hasPermission(group, user));
};
export const getGroupById = async (id) => {
    const { data, error } = await supabase
        .from('company_groups')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
};
export const createGroup = async (groupData) => {
    const payload = pickAllowedFields(groupData, ['name','type','icon','color','parent_id','resource_id','permissions','order_index']);
    if (payload.name) payload.name = cleanText(payload.name, 180);
    const { data, error } = await supabase
        .from('company_groups')
        .insert([payload])
        .select()
        .single();
    if (error) throw error;
    return data;
};
export const updateGroup = async (id, updates) => {
    const payload = pickAllowedFields(updates, ['name','type','icon','color','parent_id','resource_id','permissions','order_index']);
    if (Object.prototype.hasOwnProperty.call(payload, 'name')) payload.name = cleanText(payload.name, 180);
    payload.updated_at = new Date().toISOString();
    const { data, error } = await supabase
        .from('company_groups')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};
export const deleteGroup = async (id) => {
    if (!supabase) {
        throw new Error('Database not initialized');
    }
    const { data, error } = await supabase
        .from('company_groups')
        .delete()
        .eq('id', id)
        .select();
    if (error) {
        throw error;
    }
    if (!data || data.length === 0) {
        throw new Error('No se pudo eliminar el grupo. Verifica permisos o si el grupo existe.');
    }
    return true;
};
export const moveGroup = async (id, newParentId) => {
    return updateGroup(id, { parent_id: newParentId });
};
export const reorderGroups = async (items) => {
    for (const item of items) {
        await supabase
            .from('company_groups')
            .update({ order_index: item.order_index })
            .eq('id', item.id);
    }
};
