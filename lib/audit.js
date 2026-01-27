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

        console.log('Logging audit action:', insertData);

        const { data, error } = await supabase.from('audit_logs').insert([insertData]).select();

        if (error) {
            console.error('Error logging action (Supabase error):', error.message, error.details, error.hint);
            return { success: false, error: error.message };
        }

        console.log('Audit log saved:', data);
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
    let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

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
    return data;
};
