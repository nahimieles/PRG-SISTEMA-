import { supabase } from './supabase';
export const logAuditAction = async (logData) => {
    try {
        if (!supabase) {
            return { success: false, error: 'No supabase' };
        }
        const insertData = {
            ...logData,
            timestamp: new Date().toISOString()
        };
        const safeLog = {
            action_type: insertData.action_type,
            file_name: insertData.file_name ? String(insertData.file_name).slice(0, 120) : undefined,
            worker_name: insertData.worker_name ? String(insertData.worker_name).replace(/.(?=.{2})/g, '*') : undefined,
            timestamp: insertData.timestamp
        };
        console.debug('Audit action (safe):', safeLog);
        const { data, error } = await supabase.from('audit_logs').insert([insertData]).select();
        if (error) {
            return { success: false, error: error.message };
        }
        console.debug('Audit log saved (rows):', Array.isArray(data) ? data.length : 1);
        return { success: true, data };
    } catch (e) {
        return { success: false, error: e.message };
    }
};
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
export const deleteAuditLog = async (id) => {
    try {
        const { error } = await supabase.from('audit_logs').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};
export const deleteMultipleAuditLogs = async (ids) => {
    if (!ids || ids.length === 0) return { success: true };
    try {
        const { error } = await supabase.from('audit_logs').delete().in('id', ids);
        if (error) throw error;
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};
export const clearAllAuditLogs = async () => {
    try {
        const { error } = await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
};
