import { supabase } from './supabase';

/**
 * Logs a file action to the database.
 * @param {Object} logData - The log data
 * @param {string} logData.action_type - UPLOAD, EDIT, DELETE, CREATE_FOLDER, RENAME
 * @param {string} logData.file_name
 * @param {string} logData.file_path
 * @param {string} logData.worker_id - Optional
 * @param {string} logData.worker_name - Optional
 * @param {Object} logData.metadata - Optional extra data
 */
export const logAuditAction = async (logData) => {
    try {
        if (!supabase) {
            console.warn('Supabase not initialized, skipping audit log');
            return { success: false, error: 'No supabase' };
        }

        const insertData = {
            ...logData,
            timestamp: new Date().toISOString()
        };

        // Avoid logging full payloads (may contain PII). Log a minimal safe summary.
        const safeLog = {
            action_type: insertData.action_type,
            file_name: insertData.file_name ? String(insertData.file_name).slice(0, 120) : undefined,
            worker_name: insertData.worker_name ? String(insertData.worker_name).replace(/.(?=.{2})/g, '*') : undefined,
            timestamp: insertData.timestamp
        };
        console.debug('Audit action (safe):', safeLog);

        const { data, error } = await supabase.from('audit_logs').insert([insertData]).select();

        if (error) {
            console.error('Error logging action (Supabase error):', error.message);
            return { success: false, error: error.message };
        }

        console.debug('Audit log saved (rows):', Array.isArray(data) ? data.length : 1);
        return { success: true, data };
    } catch (e) {
        console.error('Exception logging action:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Fetches audit logs with optional filters.
 */
export const getAuditLogs = async ({ startDate, endDate, worker, limit = 50 }) => {
    let allData = [];
    let currentLimit = limit;
    let offset = 0;

    while (currentLimit > 0) {
        const fetchLimit = Math.min(currentLimit, 1000);
        let query = supabase
            .from('audit_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .range(offset, offset + fetchLimit - 1);

        if (startDate) {
            query = query.gte('timestamp', startDate);
        }
        if (endDate) {
            query = query.lte('timestamp', endDate);
        }
        if (worker) {
            query = query.ilike('worker_name', `%${worker}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;

        allData = [...allData, ...data];
        currentLimit -= data.length;
        offset += data.length;
        if (data.length < fetchLimit) break;
    }

    return allData;
};

/**
 * Deletes a single audit log by its ID.
 */
export const deleteAuditLog = async (id) => {
    try {
        const { error } = await supabase.from('audit_logs').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (e) {
        console.error('Error deleting audit log:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Deletes multiple audit logs by an array of IDs.
 */
export const deleteMultipleAuditLogs = async (ids) => {
    if (!ids || ids.length === 0) return { success: true };
    try {
        const { error } = await supabase.from('audit_logs').delete().in('id', ids);
        if (error) throw error;
        return { success: true };
    } catch (e) {
        console.error('Error deleting multiple audit logs:', e);
        return { success: false, error: e.message };
    }
};

/**
 * Deletes all audit logs currently in the database.
 */
export const clearAllAuditLogs = async () => {
    try {
        // Warning: This deletes everything in the table. 
        // In a real production app, make sure this has strong authorization.
        const { error } = await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        return { success: true };
    } catch (e) {
        console.error('Error clearing audit logs:', e);
        return { success: false, error: e.message };
    }
};
