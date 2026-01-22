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
        const { error } = await supabase.from('audit_logs').insert([{
            ...logData,
            timestamp: new Date().toISOString()
        }]);

        if (error) {
            console.error('Error logging action:', error);
        }
    } catch (e) {
        console.error('Exception logging action:', e);
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
