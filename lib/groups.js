import { supabase } from './supabase';

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
    return data || [];
};

/**
 * Fetch groups by their parent ID. 
 * Use parentId = null for root groups.
 */
export const getGroupsByParent = async (parentId) => {
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
    return data || [];
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
    const { data, error } = await supabase
        .from('company_groups')
        .insert([groupData])
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
    const { data, error } = await supabase
        .from('company_groups')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
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
    const { error } = await supabase
        .from('company_groups')
        .delete()
        .eq('id', id);

    if (error) throw error;
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
