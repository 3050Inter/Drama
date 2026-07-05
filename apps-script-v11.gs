// 안다미로 직원관리 홈페이지 API - V11 Fast Full
// 탭별 API 분리 + openById 1회 캐싱 + 인센티브 합산 반영

const MASTER_DB_ID = '1O-v-26uvnmj9B2n1pB98DMl1IV9mB3s-y9w0elcIMqU';
const VERSION = 'v11-fast-full-20260704';
const SHEETS = {
  dashboard:'00_Dashboard', employees:'직원관리', newEmployee:'신규입사_입력', retire:'퇴사자_입력',
  leave:'휴무입력', holiday:'공휴일입력', incentiveBase:'인센티브기초값', incentiveRaw:'기존인센티브현황_원본',
  manualAdjust:'수기조정', incentiveLog:'인센티브로그', incentiveSummary:'인센티브요약', staffing:'근무인원',
  health:'보건증현황', homepageLog:'홈페이지로그', notices:'공지사항', closeLog:'월마감로그'
};
let __SS = null; let __SHEET_CACHE = {};
function doGet(e){ const p=(e&&e.parameter)||{}; return json(handle(p.action||'dashboard', p)); }
function doPost(e){ let b={}; try{b=JSON.parse((e&&e.postData&&e.postData.contents)||'{}')}catch(err){} return json(handle(b.action||'dashboard', b)); }
function json(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ss(){ if(!__SS) __SS = SpreadsheetApp.openById(MASTER_DB_ID); return __SS; }
function sh(name){ if(!__SHEET_CACHE[name]) __SHEET_CACHE[name]=ss().getSheetByName(name); return __SHEET_CACHE[name]; }
function clean(v){ return String(v==null?'':v).trim(); }
function fmt(v){ if(Object.prototype.toString.call(v)==='[object Date]') return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd'); return v==null?'':v; }
function today(){ return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function base(){ return {ok:true, version:VERSION, spreadsheet:ss().getName()}; }
function handle(action, body){ try{
  if(action==='ping') return base();
  if(action==='dashboard') return dashboard(body);
  if(action==='employees') return employeesPayload(body);
  if(action==='leave') return leavePayload(body);
  if(action==='health') return healthPayload(body);
  if(action==='incentives') return incentivesPayload(body);
  if(action==='notices') return noticesPayload(body);
  if(action==='staffing') return staffingPayload(body);
  if(action==='operations') return operationsPayload(body);
  if(action==='system') return systemPayload(body);
  if(action==='all') return allPayload(body);
  if(action==='saveLeave') return saveLeave(body);
  if(action==='deleteLeave') return deleteLeave(body);
  if(action==='saveEmployee') return saveEmployee(body);
  if(action==='saveHealth') return saveHealth(body);
  if(action==='manualAdjust') return manualAdjust(body);
  if(action==='saveNotice') return saveNotice(body);
  if(action==='deleteNotice') return deleteNotice(body);
  if(action==='backupMaster') return backupMaster(body);
  if(action==='closeMonth') return closeMonth(body);
  if(action==='syncWorkIncentives') return syncWorkIncentives(clean(body.month)||today().slice(0,7));
  return dashboard(body);
}catch(err){ return {ok:false,error:String(err&&err.message?err.message:err),stack:String(err&&err.stack?err.stack:'')}; }}
function findHeaderRow(values, required){ const limit=Math.min(values.length,30); required=required||[]; for(let r=0;r<limit;r++){ const row=values[r].map(clean), joined=row.join('|'); const hit=required.filter(h=>row.indexOf(h)!==-1||joined.indexOf(h)!==-1).length; if(hit>=Math.min(required.length,2)) return r; } let best=-1,score=-1; for(let r=0;r<limit;r++){ const joined=values[r].map(clean).join('|'); let s=0; ['이름','직원명','날짜','일자','구분','상태','직급','부서','현재누적','보건증','만료','잔여','시간','제목','내용'].forEach(k=>{if(joined.indexOf(k)!==-1)s++;}); if(s>score){score=s;best=r;} } return score>0?best:-1; }
function rows(sheetName, required){ const s=sh(sheetName); if(!s) return []; const values=s.getDataRange().getValues(); if(!values.length) return []; const hrow=findHeaderRow(values, required||[]); if(hrow<0)return[]; const headers=values[hrow].map((h,i)=>clean(h)||('col'+(i+1))); const out=[]; for(let r=hrow+1;r<values.length;r++){ const obj={_row:r+1,_sheet:sheetName}; let has=false; headers.forEach((h,i)=>{ const v=fmt(values[r][i]); obj[h]=v; if(v!==''&&v!==null&&v!==undefined)has=true; }); if(has)out.push(obj); } return out; }
function nameOf(r){ return clean(r['이름']||r['직원명']||r['성명']||r['name']); }
function active(r){ const s=clean(r['상태']||r['재직상태']||r['사용여부']); return s.indexOf('퇴사')===-1&&s.indexOf('제외')===-1&&s.indexOf('비활성')===-1; }
function toDateKey(v){ const s=clean(fmt(v)); const m=s.match(/(\d{4})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})/); if(m)return m[1]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[3]).slice(-2); return s.slice(0,10); }
function employees(){ return rows(SHEETS.employees, ['이름','현재누적','상태','직급','부서']).filter(r=>nameOf(r)); }
function leaveRows(){ return rows(SHEETS.leave,['날짜','이름','구분']).concat(rows(SHEETS.holiday,['날짜','공휴일','이름','구분'])); }
function healthRows(){ return rows(SHEETS.health,['이름','보건증','만료일','상태']); }
function noticeRows(){ return rows(SHEETS.notices,['작성일','제목','내용']).sort((a,b)=>Number(b._row||0)-Number(a._row||0)); }
function staffingRows(){ return rows(SHEETS.staffing,['날짜','이름','구분','근무인원']); }
function logRows(){ return rows(SHEETS.homepageLog,['시간','액션','내용']).sort((a,b)=>Number(b._row||0)-Number(a._row||0)).slice(0,200); }
function dashboardPairs(){ const s=sh(SHEETS.dashboard); if(!s)return{}; const vals=s.getDataRange().getValues(); const out={}; vals.forEach(row=>{ for(let i=0;i<row.length-1;i++){ const k=clean(row[i]); const v=fmt(row[i+1]); if(k&&v!=='')out[k]=v; }}); return out; }
function rawIncentiveRows(){ return rows(SHEETS.incentiveSummary,['이름','현재누적','누적','잔여']).concat(rows(SHEETS.incentiveLog,['날짜','이름','구분','시간'])).concat(rows(SHEETS.manualAdjust,['날짜','이름','구분','시간'])); }
function num(v){ const n=Number(clean(v)); return isNaN(n)?0:n; }
function incentiveRows(){ const emp=employees(); const map={}; emp.forEach(e=>{ const n=nameOf(e); if(n) map[n]=num(e['현재누적']||e['누적']||e['인센티브']); }); const raw=rawIncentiveRows(); raw.forEach(r=>{ const n=nameOf(r); if(!n)return; if(map[n]==null) map[n]=0; const current=clean(r['현재누적']||r['누적']||r['인센티브']||r['잔여']); if(current!=='' && !isNaN(Number(current)) && !clean(r['날짜']||r['일자'])) map[n]=Number(current); }); raw.forEach(r=>{ const n=nameOf(r); if(!n)return; const h=num(r['시간']||r['인센티브변동']); if(h) map[n]=(map[n]||0)+h; }); const summary=Object.keys(map).map(n=>({이름:n, 현재누적:map[n], 사용가능:Math.floor(map[n]/12), 잔여:map[n]%12, _kind:'summary'})); return summary.concat(raw); }
function statsFrom(emp){ const act=emp.filter(active); const total=emp.reduce((s,r)=>s+num(r['현재누적']||r['누적']||r['인센티브']),0); return {totalEmployees:emp.length,activeEmployees:act.length,incentiveTarget:emp.filter(r=>clean(r['직급'])!=='사장'&&clean(r['상태'])!=='제외').length,twelvePlus:emp.filter(r=>num(r['현재누적']||r['누적']||r['인센티브'])>=12).length,totalHours:total,dashboard:dashboardPairs()}; }
function dashboard(body){ const emp=employees(); const lv=leaveRows(); const h=healthRows(); const nt=noticeRows(); const out=base(); out.stats=statsFrom(emp); out.employees=emp; out.leave=lv; out.holidays=lv; out.health=h; out.notices=nt; out.dashboard=dashboardPairs(); out.workIncentiveSync={ok:true,skipped:true}; return out; }
function employeesPayload(){ const emp=employees(); const out=base(); out.employees=emp; out.stats=statsFrom(emp); return out; }
function leavePayload(){ const out=base(); out.employees=employees(); out.leave=leaveRows(); out.holidays=out.leave; return out; }
function healthPayload(){ const out=base(); out.employees=employees(); out.health=healthRows(); return out; }
function incentivesPayload(){ const out=base(); out.employees=employees(); out.incentives=incentiveRows(); return out; }
function noticesPayload(){ const out=base(); out.notices=noticeRows(); return out; }
function staffingPayload(){ const out=base(); out.staffing=staffingRows(); out.employees=employees(); out.leave=leaveRows(); return out; }
function operationsPayload(){ const out=base(); out.employees=employees(); out.leave=leaveRows(); out.health=healthRows(); out.incentives=incentiveRows(); out.logs=logRows(); return out; }
function systemPayload(){ const out=base(); out.sheets=Object.keys(SHEETS).reduce((a,k)=>{a[k]=!!sh(SHEETS[k]);return a;},{}); out.logs=logRows(); return out; }
function allPayload(){ const out=operationsPayload(); const sys=systemPayload(); out.sheets=sys.sheets; out.notices=noticeRows(); out.staffing=staffingRows(); out.dashboard=dashboardPairs(); out.stats=statsFrom(out.employees); return out; }
function ensureSheet(name, headers){ let s=sh(name); if(!s){s=ss().insertSheet(name); __SHEET_CACHE[name]=s;} if(s.getLastRow()===0)s.appendRow(headers); ensureColumns(s,headers); return s; }
function ensureColumns(s, headers){ const last=Math.max(s.getLastColumn(),1); const cur=s.getRange(1,1,1,last).getValues()[0].map(clean); headers.forEach(h=>{ if(cur.indexOf(h)===-1){ s.getRange(1,s.getLastColumn()+1).setValue(h); cur.push(h); } }); }
function appendByHeader(s,obj){ const headers=s.getRange(1,1,1,Math.max(s.getLastColumn(),1)).getValues()[0].map(clean); s.appendRow(headers.map(h=>Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:'')); }
function leaveCount(t){ t=clean(t); if(t==='반차+V')return .5; if(t==='V'||t==='휴무')return 1; return 0; }
function leaveDelta(t){ t=clean(t); if(t==='반차+V')return -6; if(t==='V')return -12; return 0; }
function saveLeave(b){ const name=clean(b.name), date=clean(b.date), type=clean(b.type||'휴무'), memo=clean(b.memo), inputMonth=clean(b.inputMonth)||date.slice(0,7); if(!name)return{ok:false,error:'이름을 선택하세요.'}; if(!date)return{ok:false,error:'날짜를 선택하세요.'}; if(['휴무','반차+V','V'].indexOf(type)===-1)return{ok:false,error:'구분은 휴무/반차+V/V만 가능합니다.'}; const existing=rows(SHEETS.leave,['날짜','이름','구분']); for(let i=0;i<existing.length;i++){ const r=existing[i]; if(toDateKey(r['날짜']||r['일자']||r['휴무일'])===date && nameOf(r)===name)return{ok:false,error:name+' / '+date+' 은 이미 휴무가 등록되어 있습니다. 삭제 후 다시 입력하세요.'}; } const count=leaveCount(type), delta=leaveDelta(type); const s=ensureSheet(SHEETS.leave,['입력월','날짜','이름','구분','휴무갯수','인센티브변동','메모','입력자','입력시간']); appendByHeader(s,{'입력월':inputMonth,'날짜':date,'이름':name,'구분':type,'휴무갯수':count,'인센티브변동':delta,'메모':memo,'입력자':'홈페이지','입력시간':new Date()}); if(delta!==0){ const a=ensureSheet(SHEETS.manualAdjust,['날짜','이름','구분','휴무갯수','시간','메모','입력자','입력시간']); appendByHeader(a,{'날짜':date,'이름':name,'구분':type,'휴무갯수':count,'시간':delta,'메모':memo||(type+' 자동 차감'),'입력자':'홈페이지','입력시간':new Date()}); } logHomepage('saveLeave', name+' / '+date+' / '+type+' / delta '+delta); return{ok:true,message:'휴무 입력 완료',count:count,delta:delta}; }
function deleteLeave(b){ const row=Number(b.row||0), sheetName=clean(b.sheetName), date=clean(b.date), name=clean(b.name), type=clean(b.type||'휴무'); if(!row||row<2)return{ok:false,error:'삭제할 행 정보가 없습니다.'}; if(sheetName!==SHEETS.leave)return{ok:false,error:'휴무입력 시트 자료만 삭제할 수 있습니다.'}; const s=sh(SHEETS.leave); if(!s)return{ok:false,error:'휴무입력 시트를 찾을 수 없습니다.'}; if(row>s.getLastRow())return{ok:false,error:'삭제할 행이 시트 범위를 벗어났습니다.'}; const delta=leaveDelta(type); let restore=0; if(delta!==0&&name&&date){ restore=-delta; const a=ensureSheet(SHEETS.manualAdjust,['날짜','이름','구분','휴무갯수','시간','메모','입력자','입력시간']); appendByHeader(a,{'날짜':date,'이름':name,'구분':type+' 삭제복구','휴무갯수':leaveCount(type),'시간':restore,'메모':'홈페이지 휴무 삭제로 자동 복구','입력자':'홈페이지','입력시간':new Date()}); } s.deleteRow(row); logHomepage('deleteLeave', name+' / '+date+' / '+type+' / restore '+restore); return{ok:true,message:'휴무 삭제 완료',restoreDelta:restore}; }
function saveEmployee(b){ const name=clean(b.name); if(!name)return{ok:false,error:'이름을 입력하세요.'}; const s=ensureSheet(SHEETS.newEmployee,['입력일','이름','직급','부서','상태','메모']); s.appendRow([new Date(),name,b.position||'',b.dept||'',b.status||'사용가능','홈페이지 입력']); logHomepage('saveEmployee',name); return{ok:true,message:'직원 입력 완료'}; }
function saveHealth(b){ const name=clean(b.name), expire=clean(b.expire||b.expireDate||b.date), memo=clean(b.memo); if(!name)return{ok:false,error:'직원을 선택하세요.'}; if(!expire)return{ok:false,error:'보건증 만료일을 입력하세요.'}; const s=ensureSheet(SHEETS.health,['이름','만료일','상태','메모','입력자','입력시간']); const headers=s.getRange(1,1,1,Math.max(s.getLastColumn(),1)).getValues()[0].map(clean); const nc=headers.indexOf('이름')+1, ec=headers.indexOf('만료일')+1, sc=headers.indexOf('상태')+1, mc=headers.indexOf('메모')+1, ic=headers.indexOf('입력자')+1, tc=headers.indexOf('입력시간')+1; for(let r=2;r<=s.getLastRow();r++){ if(clean(s.getRange(r,nc).getValue())===name){ if(ec)s.getRange(r,ec).setValue(expire); if(sc)s.getRange(r,sc).setValue(healthText(expire)); if(mc)s.getRange(r,mc).setValue(memo); if(ic)s.getRange(r,ic).setValue('홈페이지'); if(tc)s.getRange(r,tc).setValue(new Date()); logHomepage('saveHealth',name+' / '+expire+' 갱신'); return{ok:true,message:'보건증 갱신 완료'}; } } appendByHeader(s,{'이름':name,'만료일':expire,'상태':healthText(expire),'메모':memo,'입력자':'홈페이지','입력시간':new Date()}); logHomepage('saveHealth',name+' / '+expire+' 신규'); return{ok:true,message:'보건증 저장 완료'}; }
function healthText(expire){ const d=new Date(clean(expire)+'T00:00:00'); if(isNaN(d.getTime()))return'날짜확인'; const diff=Math.ceil((d.getTime()-new Date(today()+'T00:00:00').getTime())/86400000); if(diff<0)return'만료'; if(diff<=30)return'30일이내'; if(diff<=60)return'60일이내'; return'정상'; }
function manualAdjust(b){ const name=clean(b.name), hours=Number(b.hours||b.time||0), memo=clean(b.memo), date=clean(b.date)||today(); if(!name)return{ok:false,error:'직원을 선택하세요.'}; if(!hours)return{ok:false,error:'조정 시간을 입력하세요.'}; const s=ensureSheet(SHEETS.manualAdjust,['날짜','이름','구분','휴무갯수','시간','메모','입력자','입력시간']); appendByHeader(s,{'날짜':date,'이름':name,'구분':hours>0?'수기적립':'수기차감','휴무갯수':'','시간':hours,'메모':memo||'홈페이지 수기조정','입력자':'홈페이지','입력시간':new Date()}); logHomepage('manualAdjust',name+' / '+hours+'시간 / '+memo); return{ok:true,message:'인센티브 수기조정 완료',hours:hours}; }
function saveNotice(b){ const title=clean(b.title), content=clean(b.content), author=clean(b.author||'관리자'); if(!title)return{ok:false,error:'제목을 입력하세요.'}; if(!content)return{ok:false,error:'내용을 입력하세요.'}; const s=ensureSheet(SHEETS.notices,['작성일','제목','내용','작성자','입력시간']); appendByHeader(s,{'작성일':today(),'제목':title,'내용':content,'작성자':author,'입력시간':new Date()}); logHomepage('saveNotice',title); return{ok:true,message:'공지 저장 완료'}; }
function deleteNotice(b){ const row=Number(b.row||0), sheetName=clean(b.sheetName); if(sheetName!==SHEETS.notices)return{ok:false,error:'공지사항 시트 자료만 삭제할 수 있습니다.'}; if(!row||row<2)return{ok:false,error:'삭제할 행 정보가 없습니다.'}; const s=sh(SHEETS.notices); if(!s)return{ok:false,error:'공지사항 시트를 찾을 수 없습니다.'}; if(row>s.getLastRow())return{ok:false,error:'삭제할 행이 시트 범위를 벗어났습니다.'}; s.deleteRow(row); logHomepage('deleteNotice','row '+row); return{ok:true,message:'공지 삭제 완료'}; }
function backupMaster(){ const stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss'); const file=DriveApp.getFileById(MASTER_DB_ID); const copy=file.makeCopy('MASTER_DB_BACKUP_'+stamp); logHomepage('backupMaster','백업 생성: '+copy.getName()); return{ok:true,message:'MASTER_DB 백업 생성 완료',backupName:copy.getName(),backupId:copy.getId()}; }
function closeMonth(b){ const month=clean(b.month)||today().slice(0,7); const s=ensureSheet(SHEETS.closeLog,['마감월','마감일시','재직직원','휴무건수','인센티브총시간','보건증건수','공지건수','입력자']); const emp=employees().filter(active); const leaves=rows(SHEETS.leave,['날짜','이름','구분']).filter(r=>toDateKey(r['날짜']||r['일자']||r['휴무일']).slice(0,7)===month); const incTotal=incentiveRows().filter(r=>r._kind==='summary').reduce((sum,r)=>sum+num(r['현재누적']),0); s.appendRow([month,new Date(),emp.length,leaves.length,incTotal,healthRows().length,noticeRows().length,'홈페이지']); logHomepage('closeMonth',month+' 월마감 / 재직 '+emp.length+' / 휴무 '+leaves.length+' / 인센티브 '+incTotal); return{ok:true,message:month+' 월마감 완료',month:month,employees:emp.length,leaves:leaves.length,incentiveTotal:incTotal}; }
function dateRangeOfMonth(month){ const y=Number(month.slice(0,4)), m=Number(month.slice(5,7)), out=[]; if(!y||!m)return out; const last=new Date(y,m,0).getDate(); for(let d=1;d<=last;d++)out.push(new Date(y,m-1,d)); return out; }
function getHolidayMap(){ const rs=rows(SHEETS.holiday,['날짜','공휴일']); const map={}; rs.forEach(r=>{ const d=toDateKey(r['날짜']||r['일자']||r['공휴일일자']); if(d)map[d]=clean(r['공휴일']||r['명칭']||r['이름']||r['구분']||'공휴일'); }); return map; }
function getLeaveOffMap(month){ const rs=rows(SHEETS.leave,['날짜','이름','구분']); const map={}; rs.forEach(r=>{ const d=toDateKey(r['날짜']||r['일자']||r['휴무일']); if(d.slice(0,7)!==month)return; const n=nameOf(r), t=clean(r['구분']||r['휴무구분']||'휴무'); if(d&&n&&['휴무','V','반차+V'].indexOf(t)!==-1)map[d+'|'+n]=t; }); return map; }
function existingAutoKeys(){ const rs=rows(SHEETS.incentiveLog,['날짜','이름','구분','시간']); const map={}; rs.forEach(r=>{ const d=toDateKey(r['날짜']||r['일자']), n=nameOf(r), t=clean(r['구분']||r['사유']||r['내용']), memo=clean(r['메모']||r['비고']||r['내용']); const m=memo.match(/AUTO_WORK_INC:([^\s]+)/); if(m)map[m[1]]=true; if(d&&n&&(t==='토요일근무'||t==='일요일근무'||t==='공휴일근무'))map[d+'|'+n]=true; }); return map; }
function syncWorkIncentives(month){ const lock=LockService.getScriptLock(); try{lock.waitLock(5000)}catch(e){} try{ const holidays=getHolidayMap(), offMap=getLeaveOffMap(month), existing=existingAutoKeys(), emp=employees().filter(active).map(nameOf).filter(Boolean); const s=ensureSheet(SHEETS.incentiveLog,['날짜','이름','구분','시간','메모','입력자','입력시간']); let added=0; const preview=[]; dateRangeOfMonth(month).forEach(dt=>{ const date=Utilities.formatDate(dt,Session.getScriptTimeZone(),'yyyy-MM-dd'); const day=dt.getDay(), isHoliday=!!holidays[date]; if(day!==6&&day!==0&&!isHoliday)return; const reason=isHoliday?'공휴일근무':(day===6?'토요일근무':'일요일근무'); emp.forEach(n=>{ if(offMap[date+'|'+n])return; const key=date+'|'+n; preview.push({날짜:date,이름:n,구분:reason,시간:1,공휴일:holidays[date]||''}); if(existing[key])return; s.appendRow([date,n,reason,1,'AUTO_WORK_INC:'+key+' 토/일/공휴일 근무 자동 적립','홈페이지',new Date()]); existing[key]=true; added++; }); }); return{ok:true,month:month,added:added,previewCount:preview.length,preview:preview.slice(0,200),rule:'토요일/일요일/공휴일 근무 +1시간'}; }finally{try{lock.releaseLock()}catch(e){}} }
function logHomepage(action,detail){ try{ const s=ensureSheet(SHEETS.homepageLog,['시간','액션','내용']); s.appendRow([new Date(),action,detail]); }catch(e){} }
