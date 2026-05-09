import { NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/audit';

export async function GET() {
    const fileActivityLogs = await getAuditLogs({ limit: 2000 });
    const counts = {};
    for (const row of fileActivityLogs) {
      counts[row.worker_name] = (counts[row.worker_name] || 0) + 1;
    }
    return NextResponse.json({ total: fileActivityLogs.length, counts });
}
