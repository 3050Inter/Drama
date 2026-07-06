export function todayString() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
  }).format(new Date());
}

export function money(value: number) {
  return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00+09:00`);
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
  }).format(d);
}
