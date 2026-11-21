import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    ok: true,
    status: 'ok',
    service: 'webthuongmaidientu-web',
    timestamp: new Date().toISOString(),
  });
}
