import { NextResponse } from 'next/server';
import { getCredentials } from '@/lib/credentials/credentialService';
import { getAdminSession } from '@/lib/auth';
export async function GET(request) {
    try {
        const session = await getAdminSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const url = new URL(request.url);
        const companyId = url.searchParams.get('companyId');
        const platform = url.searchParams.get('platform');
        if (!companyId || !platform) {
            return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
        }
        const credentials = await getCredentials(companyId, platform);
        if (!credentials) {
            return NextResponse.json({ success: false, error: 'No credentials found' }, { status: 404 });
        }
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
