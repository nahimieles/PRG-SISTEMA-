/**
 * /api/graph/find-folder/route.js
 *
 * Searches for a company folder across CONTABILIDAD1, CONTABILIDAD2, CONTABILIDAD3
 * (or AUDITORIA) SharePoint sites and returns the direct URL.
 *
 * Query params:
 *   company  — company name (e.g. "DISMEDIC")
 *   type     — "contabilidad" | "auditoria"
 */

import { getAppToken } from '../../../../lib/graphServerService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SP_HOST = 'prgauditorescltda.sharepoint.com';
const ALL_SITES = [
    'CONTABILIDAD1', 
    'CONTABILIDAD2', 
    'CONTABILIDAD3', 
    'AUDITORIA', 
    'PRGAUDITORESCLTDA.onmicrosoft.com'
];

async function getSiteId(siteName, token) {
    const url = `https://graph.microsoft.com/v1.0/sites/${SP_HOST}:/sites/${siteName}?$select=id&_t=${Date.now()}`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
    });

    if (!res.ok) {
        console.warn(`[FindFolder] Could not resolve site "${siteName}": ${res.status}`);
        return null;
    }

    const data = await res.json();
    return data.id;
}

async function getAllFoldersForSite(siteName, type, companyName, token) {
    const siteId = await getSiteId(siteName, token);
    if (!siteId) return [];

    const drivesUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives?$select=id,name,driveType&$top=999&_t=${Date.now()}`;
    const drivesRes = await fetch(drivesUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!drivesRes.ok) return [];
    const drivesData = await drivesRes.json();

    let docDrive = (drivesData.value || []).find(d => d.name === 'Documentos' || d.name === 'Documents' || d.name === 'Documentos compartidos');
    if (!docDrive) {
        docDrive = (drivesData.value || []).find(d => d.driveType === 'documentLibrary' && !d.name.toLowerCase().includes('wiki'));
    }
    if (!docDrive) return [];

    const childrenUrl = `https://graph.microsoft.com/v1.0/drives/${docDrive.id}/root/children?$select=id,name,webUrl,folder&$top=999&_t=${Date.now()}`;
    const childrenRes = await fetch(childrenUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    let folders = [];
    if (childrenRes.ok) {
        const data = await childrenRes.json();
        folders = (data.value || []).filter(item => item.folder);
    }

    // Special case for AUDITORIA: perform a deep search because companies are nested
    if (siteName === 'AUDITORIA') {
        const ignoredWords = new Set(['grupo', 's.a.', 's.a', 'cia', 'ltda', 'company', 'inc', 'el', 'la', 'los', 'las', 'de', 'y', 'group', 'group.']);
        const words = companyName.split(/\s+/).filter(w => w.length > 2 && !ignoredWords.has(w.toLowerCase()));
        const searchTerm = words.length > 0 ? words[0] : companyName;
        
        const searchUrl = `https://graph.microsoft.com/v1.0/drives/${docDrive.id}/root/search(q='${encodeURIComponent(searchTerm)}')?$select=id,name,webUrl,folder&$top=200&_t=${Date.now()}`;
        const searchRes = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (searchRes.ok) {
            const searchData = await searchRes.json();
            const searchFolders = (searchData.value || []).filter(item => item.folder);
            folders = folders.concat(searchFolders);
        }
    }

    // Special case for PRG AUDITORES site: also fetch MARIA TERESA/Contabilidad
    if (siteName === 'PRGAUDITORESCLTDA.onmicrosoft.com') {
        const mtFolder = folders.find(f => f.name.toUpperCase().includes('MARIA TERESA'));
        if (mtFolder) {
            const mtChildrenUrl = `https://graph.microsoft.com/v1.0/drives/${docDrive.id}/items/${mtFolder.id}/children?_t=${Date.now()}`;
            const mtRes = await fetch(mtChildrenUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
            if (mtRes.ok) {
                const mtData = await mtRes.json();
                const mtChildren = mtData.value || [];

                if (type.includes('audi')) {
                    // Buscar '02 Auditoria' o 'Auditoria'
                    const audiFolder = mtChildren.find(f => f.name.toUpperCase().includes('AUDITORIA') || f.name.toUpperCase().includes('02 AUDITORIA'));
                    if (audiFolder) {
                        const audiChildrenUrl = `https://graph.microsoft.com/v1.0/drives/${docDrive.id}/items/${audiFolder.id}/children?$select=id,name,webUrl,folder&$top=999&_t=${Date.now()}`;
                        const audiRes = await fetch(audiChildrenUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
                        if (audiRes.ok) {
                            const audiData = await audiRes.json();
                            const audiFolders = (audiData.value || []).filter(item => item.folder);
                            folders = folders.concat(audiFolders);
                        }
                    }
                } else {
                    // Buscar 'Contabilidad'
                    const contaFolder = mtChildren.find(f => f.name.toUpperCase().includes('CONTABILIDAD'));
                    if (contaFolder) {
                        const contaChildrenUrl = `https://graph.microsoft.com/v1.0/drives/${docDrive.id}/items/${contaFolder.id}/children?$select=id,name,webUrl,folder&$top=999&_t=${Date.now()}`;
                        const contaRes = await fetch(contaChildrenUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
                        if (contaRes.ok) {
                            const contaData = await contaRes.json();
                            const contaFolders = (contaData.value || []).filter(item => item.folder);
                            folders = folders.concat(contaFolders);
                        }
                    }
                }
            }
        }
    }

    // Special case for CONTABILIDAD1: ENRIQUE PALMA (Grupo Palma sub-companies)
    if (siteName === 'CONTABILIDAD1' && !type.includes('audi')) {
        const palmaFolder = folders.find(f => f.name.toUpperCase().includes('ENRIQUE PALMA'));
        if (palmaFolder) {
            const pUrl = `https://graph.microsoft.com/v1.0/drives/${docDrive.id}/items/${palmaFolder.id}/children?$select=id,name,webUrl,folder&$top=999&_t=${Date.now()}`;
            const pRes = await fetch(pUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
            if (pRes.ok) folders = folders.concat((await pRes.json()).value.filter(i => i.folder));
        }
    }

    // Special case for CONTABILIDAD2: SCHAFFRY (Grupo Schaffry sub-companies) and '09 OTRAS EMPRESAS'
    if (siteName === 'CONTABILIDAD2' && !type.includes('audi')) {
        const schaffryFolder = folders.find(f => f.name.toUpperCase().includes('SCHAFFRY'));
        if (schaffryFolder) {
            const sUrl = `https://graph.microsoft.com/v1.0/drives/${docDrive.id}/items/${schaffryFolder.id}/children?$select=id,name,webUrl,folder&$top=999&_t=${Date.now()}`;
            const sRes = await fetch(sUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
            if (sRes.ok) {
                const sChildren = (await sRes.json()).value.filter(i => i.folder);
                folders = folders.concat(sChildren);
                
                const otrasFolder = sChildren.find(f => f.name.toUpperCase().includes('09 OTRAS EMPRESAS'));
                if (otrasFolder) {
                    const oUrl = `https://graph.microsoft.com/v1.0/drives/${docDrive.id}/items/${otrasFolder.id}/children?$select=id,name,webUrl,folder&$top=999&_t=${Date.now()}`;
                    const oRes = await fetch(oUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
                    if (oRes.ok) folders = folders.concat((await oRes.json()).value.filter(i => i.folder));
                }
            }
        }
    }

    // Attach siteName to each folder for tracking
    return folders.map(f => ({ ...f, site: siteName }));
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const companyName = searchParams.get('company');
        const type = (searchParams.get('type') || '').toLowerCase();

        if (!companyName) {
            return NextResponse.json({ error: 'Missing "company" parameter' }, { status: 400 });
        }

        const token = await getAppToken();
        
        // Determinar en qué sitios buscar según el tipo
        let sitesToSearch = [];
        if (type.includes('audi')) {
            sitesToSearch = ['AUDITORIA', 'PRGAUDITORESCLTDA.onmicrosoft.com'];
        } else {
            sitesToSearch = [
                'CONTABILIDAD1', 
                'CONTABILIDAD2', 
                'CONTABILIDAD3', 
                'PRGAUDITORESCLTDA.onmicrosoft.com'
            ];
        }

        // 1. Fetch folders from the relevant sites in parallel
        const nestedResults = await Promise.all(sitesToSearch.map(site => getAllFoldersForSite(site, type, companyName, token)));
        const allFolders = nestedResults.flat();
        
        console.log(`[FindFolder] companyName: "${companyName}", type: "${type}", sites: ${sitesToSearch.length}, allFolders: ${allFolders.length}`);

        if (allFolders.length === 0) {
            const fallbackSite = type.includes('audi') ? 'AUDITORIA' : 'CONTABILIDAD1';
            return NextResponse.json({
                found: false,
                url: `https://${SP_HOST}/sites/${fallbackSite}/Documentos%20compartidos/Forms/AllItems.aspx`,
                message: 'No se encontraron carpetas en los sitios.'
            });
        }

        // 2. Exact match
        let bestMatch = allFolders.find(f => f.name.toLowerCase() === companyName.toLowerCase());
        
        // 3. Substring match
        if (!bestMatch) {
            bestMatch = allFolders.find(f => {
                const folderName = f.name.toLowerCase();
                const compName = companyName.toLowerCase();
                return folderName.includes(compName) || compName.includes(folderName);
            });
        }

        // 4. Significant word fallback match
        if (!bestMatch) {
            const ignoredWords = new Set(['grupo', 's.a.', 's.a', 'cia', 'ltda', 'company', 'inc', 'el', 'la', 'los', 'las', 'de', 'y', 'group', 'group.']);
            const words = companyName.split(/\s+/).filter(w => w.length > 2 && !ignoredWords.has(w.toLowerCase()));
            
            if (words.length > 0) {
                bestMatch = allFolders.find(f => f.name.toLowerCase().includes(words[0].toLowerCase()));
            }
        }

        if (bestMatch) {
            return NextResponse.json({ found: true, site: bestMatch.site, url: bestMatch.webUrl });
        }

        // Fallback if truly not found
        const fallbackSite = type.includes('audi') ? 'AUDITORIA' : 'CONTABILIDAD1';
        return NextResponse.json({
            found: false,
            url: `https://${SP_HOST}/sites/${fallbackSite}/Documentos%20compartidos/Forms/AllItems.aspx`,
            message: `No se encontró la carpeta "${companyName}" en ningún sitio.`
        });

    } catch (err) {
        console.error('[FindFolder] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
