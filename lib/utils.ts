export type Row = Record<string, any>;
export const tabs = ['대시보드','직원관리','휴무관리','근무인원','보건증','인센티브','공지사항','운영통계','시스템','연결확인'];
export function val(r: Row, keys: string[]) { for (const k of keys) { const v = r?.[k]; if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim(); } return ''; }
export function dateOnly(v: any) { const s = String(v || ''); const m = s.match(/(\d{4})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})/); if (m) return `${m[1]}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[3])).padStart(2,'0')}`; return s.slice(0,10); }
export function nameOf(r: Row) { return val(r, ['이름','직원명','성명','name']); }
export function isActive(r: Row) { const s = val(r, ['상태','재직상태','사용여부']); return !s.includes('퇴사') && !s.includes('제외') && !s.includes('비활성'); }
export function dday(dateValue: any) { const d = dateOnly(dateValue); if (!d) return null; const today = new Date(new Date().toISOString().slice(0,10) + 'T00:00:00'); const target = new Date(d + 'T00:00:00'); return Math.ceil((target.getTime() - today.getTime()) / 86400000); }
export function healthStatus(days: number | null) { if (days === null) return { text:'미등록', cls:'danger' }; if (days < 0) return { text:`만료 ${Math.abs(days)}일`, cls:'danger' }; if (days <= 30) return { text:`D-${days}`, cls:'danger' }; if (days <= 60) return { text:`D-${days}`, cls:'warn' }; return { text:`D-${days}`, cls:'ok' }; }
export async function apiGet(action = 'dashboard', params: Row = {}) { const url = new URL('/api/masterdb', location.origin); url.searchParams.set('action', action); Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, String(v ?? ''))); const res = await fetch(url.toString(), { cache:'no-store' }); return res.json(); }
export async function apiPost(body: Row) { const res = await fetch('/api/masterdb', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) }); return res.json(); }
export function leaveTypeOf(r?: Row) { return val(r || {}, ['구분','휴무구분','종류']) || ''; }
export function leaveCountOf(type: string) { if (type === '반차+V') return 0.5; if (type === 'V' || type === '휴무') return 1; return 0; }
export function badgeClass(type: string) { if (type === 'V') return 'badge v'; if (type === '반차+V') return 'badge half'; if (type === '휴무') return 'badge off'; return 'badge work'; }
