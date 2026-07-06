export function todayString(){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul"}).format(new Date())}
export function money(v:number){return new Intl.NumberFormat("ko-KR").format(Number(v||0))}
export function addDays(date:string,days:number){const d=new Date(`${date}T00:00:00+09:00`);d.setDate(d.getDate()+days);return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul"}).format(d)}
export function currentMonth(){return todayString().slice(0,7)}
export function addMonths(month:string, diff:number){const d=new Date(`${month}-01T00:00:00+09:00`);d.setMonth(d.getMonth()+diff);return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul"}).format(d).slice(0,7)}
export function monthLabel(month:string){const [y,m]=month.split("-");return `${y}년 ${Number(m)}월`}
