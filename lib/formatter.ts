export function todayString() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value || 0);
}

export function formatWon(value: number) {
  return `₩ ${formatMoney(value)}`;
}

export function previousDate(date: string) {
  const d = new Date(`${date}T00:00:00+09:00`);
  d.setDate(d.getDate() - 1);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(d);
}

export function nextDate(date: string) {
  const d = new Date(`${date}T00:00:00+09:00`);
  d.setDate(d.getDate() + 1);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(d);
}

export function getMonthString(date: string) {
  return date.slice(0, 7);
}
