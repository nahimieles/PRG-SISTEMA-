const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const RCLONE_REMOTE = "m365"; 
const BACKUP_ROOT = "C:\\Respaldo_Teams_SharePoint";
const CLIENT_ID = '0995406b-b8ad-4853-98c7-73fe8aea7e04'; 
const TENANT = 'common'; 
const SCOPES = 'offline_access Group.Read.All Sites.Read.All';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function fetchGraph(url, token) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
        throw new Error(`Graph API error: ${res.status} - ${res.statusText}`);
    }
    return res.json();
}
async function authenticate() {

    const res = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/devicecode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: CLIENT_ID, scope: SCOPES })
    });
    const deviceData = await res.json();

    while (true) {
        const tokenRes = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
                client_id: CLIENT_ID,
                device_code: deviceData.device_code
            })
        });
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {

            return tokenData.access_token;
        }
        if (tokenData.error !== 'authorization_pending') {
            throw new Error(`Auth Error: ${tokenData.error_description || tokenData.error}`);
        }
        await sleep(deviceData.interval * 1000); 
    }
}
async function checkRcloneInstallation() {
    try {
        const result = spawnSync('rclone', ['version'], { encoding: 'utf8' });
        if (result.error) throw result.error;

    } catch (e) {

        process.exit(1);
    }
}
async function runBackup() {
    try {

        await checkRcloneInstallation();
        if (!fs.existsSync(BACKUP_ROOT)) {
            fs.mkdirSync(BACKUP_ROOT, { recursive: true });
        }
        const token = await authenticate();

        let groups = [];
        let url = 'https://graph.microsoft.com/v1.0/me/memberOf?$select=id,displayName,groupTypes';
        while (url) {
            const data = await fetchGraph(url, token);
            if (data.value) {
                const teams = data.value.filter(g => g['@odata.type'] === '#microsoft.graph.group' && g.groupTypes?.includes('Unified'));
                groups = groups.concat(teams);
            }
            url = data['@odata.nextLink'];
        }

        for (const group of groups) {

            try {
                const driveData = await fetchGraph(`https://graph.microsoft.com/v1.0/groups/${group.id}/drive?$select=id,name,webUrl`, token);
                const driveId = driveData.id;

                const safeName = group.displayName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[<>:"/\\|?*]/g, '_');
                const destPath = path.join(BACKUP_ROOT, safeName);

                const rcloneCmd = 'rclone';
                const rcloneArgs = [
                    'sync', 
                    `${RCLONE_REMOTE},drive_id="${driveId}",drive_type="documentLibrary":/`, 
                    destPath,
                    '--create-empty-src-dirs', 
                    '--progress',
                    '--transfers', '8', 
                    '--checkers', '16',
                    '--ignore-errors',      
                    '--tpslimit', '10',        
                    '--tpslimit-burst', '10',  
                    '--onedrive-chunk-size', '10M' 
                ];
                const rcloneProc = spawnSync(rcloneCmd, rcloneArgs, { stdio: 'inherit' });
                if (rcloneProc.status === 0) {

                } else {

                }
            } catch (err) {

            }
        }

    } catch (error) {

    }
}
runBackup();
