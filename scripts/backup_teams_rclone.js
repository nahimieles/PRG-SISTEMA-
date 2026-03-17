const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ==============================================================================
// CONFIGURACIÓN PRINCIPAL
// ==============================================================================

// 1. Nombre del "remote" configurado en Rclone previamente.
// (Debe ser un remote de tipo 'onedrive' / Microsoft 365)
const RCLONE_REMOTE = "m365"; 

// 2. Ruta raíz donde se guardarán los respaldos (Puede ser C:\, D:\, etc.)
const BACKUP_ROOT = "C:\\Respaldo_Teams_SharePoint";

// Credenciales (usamos el Client ID existente de tu aplicación MSAL)
const CLIENT_ID = '0995406b-b8ad-4853-98c7-73fe8aea7e04'; 
const TENANT = 'common'; 

// ==============================================================================

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
    console.log("\n======================================================");
    console.log(" INICIO DE SESIÓN DEL SCRIPT (Microsoft Graph)");
    console.log("======================================================");
    const res = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/devicecode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: CLIENT_ID, scope: SCOPES })
    });
    const deviceData = await res.json();
    
    console.log(`⚠️  ACCIÓN REQUERIDA:\n`);
    console.log(` 1. Ve a tu navegador e ingresa a: ${deviceData.verification_uri}`);
    console.log(` 2. Escribe este código EXACTAMENTE: ${deviceData.user_code}`);
    console.log(`------------------------------------------------------\n`);
    
    console.log("Esperando tu autorización en la web...");
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
            console.log("✅ ¡Autenticación de Graph exitosa!\n");
            return tokenData.access_token;
        }
        if (tokenData.error !== 'authorization_pending') {
            throw new Error(`Auth Error: ${tokenData.error_description || tokenData.error}`);
        }
        await sleep(deviceData.interval * 1000); // Polling interval
    }
}

async function checkRcloneInstallation() {
    try {
        const result = spawnSync('rclone', ['version'], { encoding: 'utf8' });
        if (result.error) throw result.error;
        console.log(`✅ Rclone detectado: ${result.stdout.split('\\n')[0]}`);
    } catch (e) {
        console.error("\n❌ ERROR CRÍTICO: 'rclone' no está instalado o no está en el PATH del sistema.");
        console.log("Este script actúa como envoltorio (wrapper) de Rclone.");
        console.log("\nPor favor:");
        console.log(" 1. Descarga rclone (windows-amd64) desde: https://rclone.org/downloads/");
        console.log(" 2. Descomprímelo y agrega rclone.exe a tus variables de entorno PATH.");
        console.log(" 3. Abre una terminal y corre 'rclone config'.");
        console.log(` 4. Crea un nuevo remote de tipo onedrive llamado "${RCLONE_REMOTE}".`);
        process.exit(1);
    }
}

async function runBackup() {
    try {
        console.log("Iniciando Módulo de Backups Masivo...\n");
        await checkRcloneInstallation();

        if (!fs.existsSync(BACKUP_ROOT)) {
            fs.mkdirSync(BACKUP_ROOT, { recursive: true });
        }

        const token = await authenticate();
        
        console.log("\nBuscando tus grupos de Teams (Unified Groups)...");
        let groups = [];
        // memberOf obtiene grupos de M365 a los que pertenece el usuario (Teams y sitios unificados)
        let url = 'https://graph.microsoft.com/v1.0/me/memberOf?$select=id,displayName,groupTypes';
        
        while (url) {
            const data = await fetchGraph(url, token);
            if (data.value) {
                // Filtrar solo M365 Groups (Teams) y no Security Groups
                const teams = data.value.filter(g => g['@odata.type'] === '#microsoft.graph.group' && g.groupTypes?.includes('Unified'));
                groups = groups.concat(teams);
            }
            url = data['@odata.nextLink'];
        }
        
        console.log(`Se encontraron ${groups.length} grupo(s) de Teams.\n`);
        
        for (const group of groups) {
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(` Analizando equipo: "${group.displayName}"`);
            
            try {
                // Obtiene la biblioteca principal asociada a este grupo (la que almacena sus archivos)
                const driveData = await fetchGraph(`https://graph.microsoft.com/v1.0/groups/${group.id}/drive?$select=id,name,webUrl`, token);
                const driveId = driveData.id;
                
                console.log(` ✅ Document Library hallada.`);
                
                const safeName = group.displayName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[<>:"/\\|?*]/g, '_');
                const destPath = path.join(BACKUP_ROOT, safeName);
                
                console.log(` 📂 Destino local: ${destPath}`);
                console.log(` ⏳ Sincronizando (Espejo Unidireccional)...`);
                
                // NOTA TÉCNICA CLAVE (Múltiple Drives de Rclone):
                // En lugar de configurar cada sitio como un remote distinto, forzamos la bandera
                // onedrive-drive-id (drive_id) al vuelo en el remote base.
                const rcloneCmd = 'rclone';
                const rcloneArgs = [
                    'sync', 
                    // Remote configurado + Override en línea
                    `${RCLONE_REMOTE},drive_id="${driveId}",drive_type="documentLibrary":/`, 
                    destPath,
                    // Banderas Opcionales para Mejor Estabilidad & Rendimiento:
                    '--create-empty-src-dirs', // Requisito explícito: estructura recursiva completa
                    '--progress',
                    '--transfers', '8', 
                    '--checkers', '16',
                    '--ignore-errors',      
                    '--tpslimit', '10',        // Respeta el limite de tasa de Graph API (Throttling) p/ no saturar Rclone
                    '--tpslimit-burst', '10',  
                    '--onedrive-chunk-size', '10M' 
                ];
                
                const rcloneProc = spawnSync(rcloneCmd, rcloneArgs, { stdio: 'inherit' });
                
                if (rcloneProc.status === 0) {
                    console.log(` ✅ Backup sincronizado exitosamente.`);
                } else {
                    console.error(` ⚠️ Rclone reportó algunos errores o detenciones. (Si falló, reanudará inteligentemente la próxima vez).`);
                }
            } catch (err) {
                console.error(` ❌ No hay almacenamiento asociado para el equipo "${group.displayName}": (Error ${err.message})`);
            }
        }
        
        console.log(`\n======================================================`);
        console.log(`🎉 BACKUP MASIVO COMPLETADO EN: ${BACKUP_ROOT}`);
        console.log(`======================================================\n`);
        
    } catch (error) {
        console.error("Error fatal en el flujo de ejecución principal:", error);
    }
}

runBackup();
