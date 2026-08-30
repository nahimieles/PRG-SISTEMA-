import { getAppToken } from '../../../../lib/graphServerService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const SP_HOST = 'prgauditorescltda.sharepoint.com';
const ALL_SITES = ['CONTABILIDAD1', 'CONTABILIDAD2', 'CONTABILIDAD3', 'PRGAUDITORESCLTDA.onmicrosoft.com'];

async function getAllFoldersForSite(siteName, token) {
    const siteUrl = `https://graph.microsoft.com/v1.0/sites/${SP_HOST}:/sites/${siteName}?$select=id&_t=${Date.now()}`;
    const siteRes = await fetch(siteUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!siteRes.ok) return { site: siteName, error: 'siteRes fail: ' + siteRes.status, folders: [] };
    const siteId = (await siteRes.json()).id;

    const drivesUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives?$select=id,name,driveType&$top=5&_t=${Date.now()}`;
    const drivesRes = await fetch(drivesUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!drivesRes.ok) return { site: siteName, error: 'drivesRes fail: ' + drivesRes.status, folders: [] };
    const drivesData = await drivesRes.json();

    let docDrive = (drivesData.value || []).find(d => d.name === 'Documentos' || d.name === 'Documents' || d.name === 'Documentos compartidos');
    if (!docDrive) docDrive = (drivesData.value || []).find(d => d.driveType === 'documentLibrary' && !d.name.toLowerCase().includes('wiki'));
    if (!docDrive) return { site: siteName, error: 'no docDrive', drivesData: drivesData, folders: [] };

    const childrenUrl = `https://graph.microsoft.com/v1.0/drives/${docDrive.id}/root/children?$select=id,name,webUrl,folder&$top=999&_t=${Date.now()}`;
    const childrenRes = await fetch(childrenUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!childrenRes.ok) return { site: siteName, error: 'childrenRes fail: ' + childrenRes.status, folders: [] };

    let folders = (await childrenRes.json()).value.filter(item => item.folder);

    if (siteName === 'PRGAUDITORESCLTDA.onmicrosoft.com') {
        const mtFolder = folders.find(f => f.name.toUpperCase().includes('MARIA TERESA'));
        if (mtFolder) {
            const mtChildrenUrl = `https://graph.microsoft.com/v1.0/drives/${docDrive.id}/items/${mtFolder.id}/children?_t=${Date.now()}`;
            const mtRes = await fetch(mtChildrenUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
            if (mtRes.ok) {
                const mtData = await mtRes.json();
                const contaFolder = (mtData.value || []).find(f => f.name.toUpperCase().includes('CONTABILIDAD'));
                if (contaFolder) {
                    const contaChildrenUrl = `https://graph.microsoft.com/v1.0/drives/${docDrive.id}/items/${contaFolder.id}/children?$select=id,name,webUrl,folder&$top=999&_t=${Date.now()}`;
                    const contaRes = await fetch(contaChildrenUrl, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
                    if (contaRes.ok) folders = folders.concat((await contaRes.json()).value.filter(item => item.folder));
                }
            }
        }
    }
    return { site: siteName, error: null, folders: folders.map(f => ({ name: f.name, site: siteName })) };
}

export async function GET(request) {
    const token = await getAppToken();
    let results = [];
    for (const site of ALL_SITES) {
        results.push(await getAllFoldersForSite(site, token));
    }
    return NextResponse.json({ debug: results });
}
