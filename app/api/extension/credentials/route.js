import { NextResponse } from 'next/server';
import { getCredentials } from '@/lib/credentials/credentialService';
import { getAdminSession } from '@/lib/auth';

export async function GET(request) {
    try {
        // 1. Verificamos que exista una sesión válida
        // Las cookies de Next.js se envían automáticamente desde la extensión al usar credentials: 'include'
        const session = await getAdminSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Extraer parámetros
        const url = new URL(request.url);
        const companyId = url.searchParams.get('companyId');
        const platform = url.searchParams.get('platform');

        if (!companyId || !platform) {
            return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
        }

        // 3. Obtener credenciales desencriptadas usando el servicio existente (AES/KeyVault)
        const credentials = await getCredentials(companyId, platform);

        if (!credentials) {
            return NextResponse.json({ success: false, error: 'No credentials found' }, { status: 404 });
        }

        // 4. Retornar las credenciales
        // Esta respuesta solo será visible para el Service Worker (background.js) de la extensión
        return NextResponse.json({ 
            success: true, 
            credentials 
        });

    } catch (error) {
        console.error('Error fetching credentials for extension:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
