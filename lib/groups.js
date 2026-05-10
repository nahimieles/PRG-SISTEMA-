import { supabase } from './supabase';
import { getAdminSession, getWorkerSession } from './auth';
import { pickAllowedFields, cleanText } from './security';

/**
 * Helper to check permissions
 */
const hasPermission = (group, user) => {
    // If no permissions array, default to admin only to be safe, or open to all if intended. 
    // Schema default is ["admin", "manager"].
    const perms = group.permissions || [];

    // Admin always has access
    if (user.role === 'admin') return true;

    // Check for "all" or specific role
    if (perms.includes('all')) return true;
    if (user.role && perms.includes(user.role)) return true;

    // Check for specific worker ID
    if (user.id && perms.includes(user.id)) return true;

    return false;
};

/**
 * Get current user (admin or worker)
 */
const getCurrentUser = () => {
    if (typeof window === 'undefined') return null;
    const admin = getAdminSession();
    if (admin) return { ...admin, role: 'admin' };

    const worker = getWorkerSession();
    if (worker) return { ...worker, role: 'worker' }; // Role 'worker' is generic, detailed check uses ID

    return null;
};

/**
 * Fetch all groups from the 'company_groups' table.
 * Returns a flat list; hierarchy construction should happen on the client if needed,
 * or we can use recursive queries if we get fancy later.
 * NOTE: For improved performance on large datasets, use getGroupsByParent instead.
 */
export const getGroups = async () => {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('company_groups')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Error fetching groups:', error);
        throw error;
    }

    const user = getCurrentUser();
    if (!user) return []; // No public access unless specifically handled? Or return empty.

    // Filter by permissions
    return (data || []).filter(group => hasPermission(group, user));
};

/**
 * Fetch groups by their parent ID. 
 * Use parentId = null for root groups.
 * @param {string|null} parentId - The parent group's UUID (or null for root)
 * @param {Object} options - Optional parameters
 * @param {Object} options.user - Optional user object (if not provided, uses session)
 * @param {string} options.role - Optional role string (if not provided, uses session)
 */
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
        console.error('Error fetching groups by parent:', error);
        throw error;
    }

    // Use provided user/role or fallback to session
    let user;
    if (options.user && options.role) {
        user = { ...options.user, role: options.role };
    } else {
        user = getCurrentUser();
    }

    if (!user) {
        // If no user info available, return all groups (allow access)
        // This prevents groups from disappearing when session times out
        console.warn('No user session found for group filtering, returning all groups');
        return data || [];
    }

    return (data || []).filter(group => hasPermission(group, user));
};

/**
 * Fetch a single group by ID.
 */
export const getGroupById = async (id) => {
    const { data, error } = await supabase
        .from('company_groups')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
};

/**
 * Create a new group/folder/link.
 * @param {Object} groupData - { name, type, icon, color, parent_id, resource_id, permissions }
 */
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

/**
 * Update an existing group.
 * @param {string} id - The UUID of the group to update.
 * @param {Object} updates - The fields to update.
 */
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

/**
 * Delete a group. The DB handles cascading due to 'on delete cascade' in schema.
 * @param {string} id - The UUID of the group to delete.
 */
export const deleteGroup = async (id) => {
    if (!supabase) {
        console.error('Supabase client not initialized');
        throw new Error('Database not initialized');
    }

    // Deleting group (no verbose logging to avoid exposing identifiers)

    const { data, error } = await supabase
        .from('company_groups')
        .delete()
        .eq('id', id)
        .select();

    if (error) {
        console.error('Error deleting group:', error.message, error.details, error.hint);
        throw error;
    }

    if (!data || data.length === 0) {
        console.warn('Delete operation returned no data. Verify permissions or existence.');
        throw new Error('No se pudo eliminar el grupo. Verifica permisos o si el grupo existe.');
    }

    return true;
};

/**
 * Move a group to a new parent.
 * @param {string} id - The group to move.
 * @param {string|null} newParentId - The new parent group UUID (or null for root).
 */
export const moveGroup = async (id, newParentId) => {
    return updateGroup(id, { parent_id: newParentId });
};

/**
 * Reorder groups (if we implement drag-to-reorder later).
 * This works by updating multiple rows.
 * @param {Array<{id: string, order_index: number}>} items 
 */
export const reorderGroups = async (items) => {
    // This is a naive implementation; for large lists, consider an RPC function.
    // loops through items and updates them.
    for (const item of items) {
        await supabase
            .from('company_groups')
            .update({ order_index: item.order_index })
            .eq('id', item.id);
    }
};
