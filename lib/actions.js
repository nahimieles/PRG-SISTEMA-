'use server';
import { supabase, getServiceSupabase } from './supabase';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { cleanText, normalizeHttpUrl, normalizeRuc, pickAllowedFields } from './security';
import { headers } from 'next/headers';
import { accessPlatform, getUserPermissions, logAccess } from './platforms/platformAccess';
import { getPlatform, getAllPlatformSlugs } from './platforms/registry';
import { saveCredentials, deleteCredentials, hasCredentials, getCredentials } from './credentials/credentialService';
export async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}
export async function verifyPassword(password, hashedPassword) {
    if (!hashedPassword || !hashedPassword.startsWith('$2')) {
        return false;
    }
    return bcrypt.compare(password, hashedPassword);
}
function sanitizeUser(user) {
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
}
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
export async function loginUnifiedAction(username, password) {
    if (!supabase) {
        return { success: false, message: 'Error de configuración de BD' };
    }
    try {
        const adminDb = getServiceSupabase();
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
        return { success: false, message: 'Error en el servidor al intentar iniciar sesión' };
    }
}
export async function createCompanyAction(data, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        const adminDb = getServiceSupabase();
        const payload = {
            name: cleanText(data.name, 180),
            type: cleanText(data.type, 40) || 'auditoria'
        };
        if (!payload.name) {
            return { success: false, error: 'Nombre de empresa requerido' };
        }
        const ruc = normalizeRuc(data.ruc);
        if (data.ruc && !ruc) return { success: false, error: 'RUC inválido. Debe tener 13 dígitos.' };
        if (ruc) payload.ruc = ruc;
        if (data.username) payload.username = cleanText(data.username, 120);
        if (data.groupId) payload.group_id = data.groupId;
        const logoUrl = normalizeHttpUrl(data.logo_url);
        if (data.logo_url && !logoUrl) return { success: false, error: 'URL de imagen inválida' };
        if (logoUrl) {
            payload.logo_url = logoUrl;
            payload.avatar_url = logoUrl;
        }
        if (data.sistema_contable_slug !== undefined) {
            payload.sistema_contable_slug = data.sistema_contable_slug;
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
        return { success: false, error: error.message };
    }
}
export async function updateCompanyAction(id, data, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        const adminDb = getServiceSupabase();
        const payload = pickAllowedFields(data, [
            'name',
            'type',
            'username',
            'password',
            'group_id',
            'logo_url',
            'avatar_url',
            'sharepoint_folder_url',
            'financieros_url',
            'impuestos_url',
            'informes_url',
            'ruc',
            'sistema_contable_slug'
        ]);
        if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
            payload.name = cleanText(payload.name, 180);
            if (!payload.name) return { success: false, error: 'Nombre de empresa requerido' };
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'type')) {
            payload.type = cleanText(payload.type, 40) || 'auditoria';
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'username')) {
            payload.username = cleanText(payload.username, 120);
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'ruc')) {
            const ruc = normalizeRuc(payload.ruc);
            if (payload.ruc && !ruc) return { success: false, error: 'RUC inválido. Debe tener 13 dígitos.' };
            payload.ruc = ruc;
        }
        for (const key of ['logo_url', 'avatar_url', 'sharepoint_folder_url', 'financieros_url', 'impuestos_url', 'informes_url']) {
            if (Object.prototype.hasOwnProperty.call(payload, key)) {
                const url = normalizeHttpUrl(payload[key]);
                if (payload[key] && !url) return { success: false, error: `URL inválida en ${key}` };
                payload[key] = url;
            }
        }
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
        return { success: false, error: error.message };
    }
}
export async function createWorkerAction(data, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        const adminDb = getServiceSupabase();
        const payload = pickAllowedFields(data, [
            'username',
            'password',
            'full_name',
            'email',
            'cargo',
            'departamento',
            'fecha_ingreso',
            'telefono',
            'estado_civil',
            'genero',
            'sueldo',
            'tipo_contrato',
            'evaluacion_desempeno'
        ]);
        if (Object.prototype.hasOwnProperty.call(payload, 'full_name')) payload.full_name = cleanText(payload.full_name, 180);
        if (!payload.full_name) return { success: false, error: 'Nombre completo requerido' };
        if (Object.prototype.hasOwnProperty.call(payload, 'username')) payload.username = cleanText(payload.username, 120);
        if (!payload.username) return { success: false, error: 'Nombre de usuario requerido' };
        if (Object.prototype.hasOwnProperty.call(payload, 'email')) payload.email = cleanText(payload.email, 180);
        if (payload.password) {
            payload.password = await hashPassword(payload.password);
        }
        const { data: newWorker, error } = await adminDb
            .from('workers')
            .insert([payload])
            .select()
            .single();
        if (error) {
            if (error.code === '23505') {
                return { success: false, error: 'El nombre de usuario o email ya existe' };
            }
            return { success: false, error: error.message };
        }
        return { success: true, data: newWorker };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
export async function updateWorkerAction(id, data, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        const adminDb = getServiceSupabase();
        const payload = pickAllowedFields(data, [
            'username',
            'password',
            'full_name',
            'email',
            'cargo',
            'departamento',
            'fecha_ingreso',
            'telefono',
            'estado_civil',
            'genero',
            'sueldo',
            'tipo_contrato',
            'evaluacion_desempeno',
            'avatar_url'
        ]);
        if (Object.prototype.hasOwnProperty.call(payload, 'full_name')) {
            payload.full_name = cleanText(payload.full_name, 180);
            if (!payload.full_name) return { success: false, error: 'Nombre completo requerido' };
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'username')) payload.username = cleanText(payload.username, 120);
        if (Object.prototype.hasOwnProperty.call(payload, 'email')) payload.email = cleanText(payload.email, 180);
        if (payload.password) {
            payload.password = await hashPassword(payload.password);
        } else {
            delete payload.password; 
        }
        const { data: updatedWorker, error } = await adminDb
            .from('workers')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            if (error.code === '23505') {
                return { success: false, error: 'El nombre de usuario o email ya existe' };
            }
            return { success: false, error: error.message };
        }
        return { success: true, data: updatedWorker };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
export async function deleteWorkerAction(id, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        const adminDb = getServiceSupabase();
        await adminDb.from('audit_records').delete().eq('worker_id', id);
        const { error } = await adminDb
            .from('workers')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
export async function createCompanyGroupAction(data, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        const adminDb = getServiceSupabase();
        const payload = pickAllowedFields(data, [
            'name',
            'type',
            'icon',
            'color',
            'parent_id',
            'resource_id',
            'permissions',
            'order_index',
            'password'
        ]);
        if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
            payload.name = cleanText(payload.name, 180);
        }
        if (!payload.name) return { success: false, error: 'Nombre de grupo requerido' };
        if (payload.password) payload.password = await hashPassword(payload.password);
        const { data: newGroup, error } = await adminDb
            .from('company_groups')
            .insert([payload])
            .select()
            .single();
        if (error) throw error;
        return { success: true, group: sanitizeUser(newGroup) };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
export async function updateCompanyGroupAction(id, data, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        const adminDb = getServiceSupabase();
        const payload = pickAllowedFields(data, [
            'name',
            'type',
            'icon',
            'color',
            'parent_id',
            'resource_id',
            'permissions',
            'order_index',
            'password'
        ]);
        if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
            payload.name = cleanText(payload.name, 180);
            if (!payload.name) return { success: false, error: 'Nombre de grupo requerido' };
        }
        if (payload.password) payload.password = await hashPassword(payload.password);
        const { data: updatedData, error } = await adminDb
            .from('company_groups')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return { success: true, data: updatedData };
    } catch (error) {
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
        return { success: false, error: error.message };
    }
}
export async function createSurveyAction(payload, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        const adminDb = getServiceSupabase();
        const safe = pickAllowedFields(payload, ['title','version','parent_survey_id','description','is_active', 'is_graded']);
        if (!safe.title) return { success: false, error: 'Título de encuesta requerido' };
        safe.title = cleanText(safe.title, 300);
        if (safe.description) safe.description = cleanText(safe.description, 1000);
        
        // Auto-generar access_token y sanitizar booleanos
        safe.access_token = 'tkn_' + require('crypto').randomUUID().replace(/-/g, '');
        safe.is_graded = !!safe.is_graded;

        const { data, error } = await adminDb
            .from('recruitment_surveys')
            .insert([safe])
            .select()
            .single();
        if (error) throw error;
        return { success: true, data: sanitizeUser(data) };
    } catch (error) {
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
        return { success: false, error: error.message };
    }
}
export async function saveSurveyQuestionsAction(questions, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        const adminDb = getServiceSupabase();
        if (!Array.isArray(questions) || questions.length === 0) return { success: false, error: 'No hay preguntas para guardar' };
        const allowed = ['survey_id','text','order_index','type','options','required','parent_id'];
        const sanitized = questions.map(q => {
            const item = pickAllowedFields(q, allowed);
            if (item.text) item.text = cleanText(item.text, 1000);
            return item;
        });
        const { error } = await adminDb
            .from('recruitment_questions')
            .insert(sanitized);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
export async function getSurveyQuestionsAction(surveyId, parentId) {
    try {
        const adminDb = getServiceSupabase();
        let { data: questions, error } = await adminDb
            .from('recruitment_questions')
            .select('*')
            .eq('survey_id', surveyId)
            .order('order_index', { ascending: true });
        if (error) throw error;
        if ((!questions || questions.length === 0) && parentId) {
           const { data: allSurveys } = await adminDb
             .from('recruitment_surveys')
             .select('id, version')
             .eq('parent_survey_id', parentId)
             .order('version', { ascending: false });
           const surveyIds = [parentId, ...(allSurveys ? allSurveys.map(s => s.id) : [])];
           const { data: previousQs } = await adminDb
              .from('recruitment_questions')
              .select('*')
              .in('survey_id', surveyIds)
              .order('order_index', { ascending: true });
           if (previousQs && previousQs.length > 0) {
              let foundQuestions = [];
              for (const s of (allSurveys || [])) {
                 const qs = previousQs.filter(q => q.survey_id === s.id);
                 if (qs.length > 0) {
                    foundQuestions = qs;
                    break;
                 }
              }
              if (foundQuestions.length === 0) {
                 foundQuestions = previousQs.filter(q => q.survey_id === parentId);
              }
              if (foundQuestions.length > 0) {
                 questions = foundQuestions;
              }
           }
        }
        return { success: true, questions: questions || [] };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
export async function getQuestionsByIdsAction(ids, requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        const adminDb = getServiceSupabase();
        const { data, error } = await adminDb
            .from('recruitment_questions')
            .select('*')
            .in('id', ids);
        if (error) throw error;
        return { success: true, questions: data || [] };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
export async function getSurveysSummaryAction(requesterId) {
    if (!(await validateAdmin(requesterId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        const adminDb = getServiceSupabase();
        const { data: surveys, error: sErr } = await adminDb
            .from('recruitment_surveys')
            .select('*')
            .order('version', { ascending: false });
        if (sErr) throw sErr;
        const { data: candidates, error: cErr } = await adminDb
            .from('recruitment_candidates')
            .select('survey_id');
        if (cErr) throw cErr;
        const parentMap = {};
        (surveys || []).forEach(s => {
            parentMap[s.id] = s.parent_survey_id || s.id;
        });
        const parentCounts = {};
        (candidates || []).forEach(c => {
            const pId = parentMap[c.survey_id];
            if (pId) {
                parentCounts[pId] = (parentCounts[pId] || 0) + 1;
            }
        });
        const groupedMap = new Map();
        (surveys || []).forEach(survey => {
            const parentId = survey.parent_survey_id || survey.id;
            if (!groupedMap.has(parentId)) {
                groupedMap.set(parentId, { ...survey, total_candidates: parentCounts[parentId] || 0 });
            }
        });
        const groupedSurveys = Array.from(groupedMap.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return { success: true, surveys: groupedSurveys };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
export async function updateAdminAction(id, data, requesterId) {
    if (!(await validateAdmin(requesterId)) || (id !== requesterId)) {
        if (!(await validateAdmin(requesterId))) {
            return { success: false, error: 'Acceso no autorizado' };
        }
    }
    try {
        const adminDb = getServiceSupabase();
        const payload = {};
        if (data.username && data.username.trim()) {
            payload.username = data.username.trim();
        }
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
        return { success: false, error: error.message };
    }
}
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
        return { success: false, error: error.message };
    }
}
export async function deleteWorkerAuditRecordAction(id, workerId) {
    if (!workerId) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        const adminDb = getServiceSupabase();
        const { data: record, error: fetchErr } = await adminDb
            .from('audit_records')
            .select('worker_id')
            .eq('id', id)
            .single();
        if (fetchErr || !record) return { success: false, error: 'Registro no encontrado' };
        if (record.worker_id !== workerId) return { success: false, error: 'No tienes permiso para eliminar este registro' };
        const { error } = await adminDb
            .from('audit_records')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
export async function accessPlatformAction(userId, empresaId, plataformaSlug) {
    if (!(await validateAdmin(userId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    const validSlugs = getAllPlatformSlugs();
    if (!plataformaSlug || !validSlugs.includes(plataformaSlug)) {
        return { success: false, error: 'Plataforma no válida' };
    }
    try {
        const headersList = await headers();
        const ipAddress = headersList.get('x-forwarded-for')
            || headersList.get('x-real-ip')
            || 'unknown';
        const userAgent = headersList.get('user-agent') || 'unknown';
        const host = headersList.get('host') || '';
        const isDesktop = host.includes('localhost') || host.includes('127.0.0.1');
        const result = await accessPlatform(userId, empresaId, plataformaSlug, !isDesktop);
        await logAccess({
            userId,
            empresaId,
            plataformaSlug,
            accion: 'abrir_url',
            resultado: result.success ? 'exitoso' : 'fallido',
            ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : 'unknown',
            userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 500) : 'unknown',
            metadata: result.success ? {} : { error: result.error },
        });
        if (!result.success) {
            return { success: false, error: result.error };
        }
        return { success: true, url: result.url, method: result.method };
    } catch (error) {
        return { success: false, error: 'Error al acceder a la plataforma' };
    }
}
export async function getUserPlatformPermissionsAction(userId) {
    if (!(await validateAdmin(userId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        const permisos = await getUserPermissions(userId);
        return { success: true, permisos };
    } catch (error) {
        return { success: false, error: 'Error al obtener permisos' };
    }
}
export async function savePlatformCredentialAction(userId, empresaId, plataformaSlug, credentials) {
    if (!(await validateAdmin(userId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        await saveCredentials(empresaId, plataformaSlug, credentials);
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Error al guardar credencial' };
    }
}
export async function getPlatformCredentialsAction(userId, empresaId, plataformaSlug) {
    if (!(await validateAdmin(userId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        const credentials = await getCredentials(empresaId, plataformaSlug);
        if (credentials) {
            return { success: true, data: credentials };
        } else {
            return { success: false, error: 'No se encontraron credenciales' };
        }
    } catch (error) {
        return { success: false, error: 'Error al obtener credencial' };
    }
}
export async function deletePlatformCredentialAction(userId, empresaId, plataformaSlug) {
    if (!(await validateAdmin(userId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        await deleteCredentials(empresaId, plataformaSlug);
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Error al eliminar credencial' };
    }
}
export async function checkCompanyCredentialsAction(userId, empresaId) {
    if (!(await validateAdmin(userId))) {
        return { success: false, error: 'Acceso no autorizado' };
    }
    try {
        const slugs = getAllPlatformSlugs();
        const results = {};
        await Promise.all(slugs.map(async (slug) => {
            results[slug] = await hasCredentials(empresaId, slug);
        }));
        return { success: true, status: results };
    } catch (error) {
        return { success: false, error: 'Error al verificar credenciales' };
    }
}
export async function checkCompanyCredentialsPublicAction(empresaId) {
    try {
        const slugs = getAllPlatformSlugs();
        if (!slugs.includes("supercias")) slugs.push("supercias");
        if (!slugs.includes("ministerio_trabajo")) slugs.push("ministerio_trabajo");
        if (!slugs.includes("iess")) slugs.push("iess");
        const results = {};
        await Promise.all(slugs.map(async (slug) => {
            results[slug] = await hasCredentials(empresaId, slug);
        }));
        return { success: true, status: results };
    } catch (error) {
        return { success: false, error: 'Error al verificar credenciales' };
    }
}
