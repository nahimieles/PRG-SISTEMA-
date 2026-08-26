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
        // Agregamos headers CORS para permitir que la extensión (chrome-extension://...) lea la respuesta
        return NextResponse.json({ 
            success: true, 
            credentials 
        }, {
            headers: {
                'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });

    } catch (error) {
        console.error('Error fetching credentials for extension:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function OPTIONS(request) {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
