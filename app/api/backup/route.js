import { spawn } from 'child_process';
import path from 'path';

export async function POST(req) {
    try {
        const body = await req.json();
        const { targets } = body; 

        if (!targets || !Array.isArray(targets) || targets.length === 0) {
            return new Response(JSON.stringify({ error: "No targets provided" }), { status: 400 });
        }

        const encoder = new TextEncoder();
        let currentProcess = null;

        const readableStream = new ReadableStream({
            start(controller) {
                const sendUpdate = (text) => {
                    const lines = text.split('\n');
                    for (const line of lines) {
                        if (line.trim()) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ log: line })}\n\n`));
                        }
                    }
                };

                const BACKUP_ROOT = "C:\\Respaldo_Teams_SharePoint";
                const RCLONE_REMOTE = "m365";

                sendUpdate(`INICIO DE RESPALDO MASIVO\nDestino base: ${BACKUP_ROOT}\nRclone Remote: ${RCLONE_REMOTE}`);

                let targetIndex = 0;

                const runNext = () => {
                    if (targetIndex >= targets.length) {
                        sendUpdate("======================\nRESPALDO FINALIZADO EXITOSAMENTE\n======================");
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
                        controller.close();
                        return;
                    }

                    const target = targets[targetIndex];
                    sendUpdate(`\n[${targetIndex + 1}/${targets.length}] Sincronizando: ${target.name}...`);

                    const safeName = target.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[<>:"/\\|?*]/g, '_');
                    const destPath = path.join(BACKUP_ROOT, safeName);

                    const rcloneArgs = [
                        'sync', 
                        `${RCLONE_REMOTE},drive_id="${target.driveId}",drive_type="documentLibrary":/`, 
                        destPath,
                        '--create-empty-src-dirs', 
                        '--transfers', '8', 
                        '--checkers', '16',
                        '--ignore-errors',      
                        '--tpslimit', '10',
                        '--tpslimit-burst', '10',  
                        '--onedrive-chunk-size', '10M',
                        '-v' 
                    ];

                    try {
                        currentProcess = spawn('rclone', rcloneArgs);

                        currentProcess.stdout.on('data', (data) => {
                            sendUpdate(data.toString());
                        });

                        currentProcess.stderr.on('data', (data) => {
                            sendUpdate(data.toString());
                        });

                        currentProcess.on('close', (code) => {
                            if (code !== 0) {
                                sendUpdate(`⚠️ Rclone finalizó con código ${code} para ${target.name}`);
                            } else {
                                sendUpdate(`✅ ${target.name} completado.`);
                            }
                            targetIndex++;
                            runNext();
                        });

                        currentProcess.on('error', (err) => {
                            sendUpdate(`❌ ERROR ejecutando Rclone: ${err.message}. Asegúrate de tener Rclone instalado.`);
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, error: err.message })}\n\n`));
                            controller.close();
                        });

                    } catch (err) {
                        sendUpdate(`❌ ERROR: ${err.message}`);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, error: err.message })}\n\n`));
                        controller.close();
                    }
                };

                runNext();
            },
            cancel() {
                if (currentProcess) {
                    currentProcess.kill();
                }
            }
        });

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
