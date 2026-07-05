import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function callAppsScript(method: 'GET' | 'POST', payload: any = {}) {
  if (!API_URL) return NextResponse.json({ ok: false, error: 'NEXT_PUBLIC_API_URL 없음' }, { status: 500 });
  try {
    if (method === 'GET') {
      const url = new URL(API_URL);
      Object.entries(payload).forEach(([k, v]) => url.searchParams.set(k, String(v ?? '')));
      const res = await fetch(url.toString(), { cache: 'no-store' });
      const text = await res.text();
      try { return NextResponse.json(JSON.parse(text)); } catch { return NextResponse.json({ ok:false, error:'Apps Script JSON 파싱 실패', raw:text.slice(0,500) }, { status:500 }); }
    }
    const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), cache: 'no-store' });
    const text = await res.text();
    try { return NextResponse.json(JSON.parse(text)); } catch { return NextResponse.json({ ok:false, error:'Apps Script JSON 파싱 실패', raw:text.slice(0,500) }, { status:500 }); }
  } catch (e:any) { return NextResponse.json({ ok:false, error: String(e?.message || e) }, { status:500 }); }
}

export async function GET(req: NextRequest) {
  const params: any = {};
  req.nextUrl.searchParams.forEach((v, k) => params[k] = v);
  return callAppsScript('GET', params);
}
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return callAppsScript('POST', body);
}
