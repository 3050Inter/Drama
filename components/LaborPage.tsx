"use client";
import {useEffect,useState} from "react";
import {Trash2} from "lucide-react";
import {addLabor,deleteLabor,getEmployees,getLabor} from "@/lib/api";
import {money} from "@/lib/formatter";
import type {Employee,LaborEntry,LaborSummaryByEmployee} from "@/lib/types";

const TABLE_OPTIONS=["1T","2T","3T","5T","6T","7T","8T","9T","없음"];

export default function LaborPage({date,onChanged}:{date:string;onChanged:()=>Promise<void>}){
  const [employees,setEmployees]=useState<Employee[]>([]);
  const [employee,setEmployee]=useState("");
  const [tableNo,setTableNo]=useState("없음");
  const [tc,setTc]=useState("");
  const [dailyPay,setDailyPay]=useState("");
  const [memo,setMemo]=useState("");
  const [rows,setRows]=useState<LaborEntry[]>([]);
  const [summary,setSummary]=useState({totalTc:0,totalAmount:0,byEmployee:[] as LaborSummaryByEmployee[]});
  const [saving,setSaving]=useState(false);

  const load=async()=>{
    const [e,l]=await Promise.all([getEmployees(),getLabor(date)]);
    if(e.ok){
      const a=e.rows||[];
      setEmployees(a);
      if(a.length&&!employee)setEmployee(a[0].name);
    }
    if(l.ok){setRows(l.rows||[]);setSummary(l.summary)}
  };
  useEffect(()=>{load().catch(()=>{})},[date]);

  const save=async()=>{
    const t=Number((tc||"0").replace(/,/g,""));
    const d=Number((dailyPay||"0").replace(/,/g,""));
    if(!employee){alert("직원을 선택해주세요.");return}
    if(tc===""){alert("TC를 입력해주세요. 0도 입력 가능합니다.");return}
    if(dailyPay===""){alert("일비를 입력해주세요. 0도 입력 가능합니다.");return}
    try{
      setSaving(true);
      await addLabor({date,employee,tableNo,tc:t,dailyPay:d,memo});
      setTableNo("없음");setTc("");setDailyPay("");setMemo("");
      await load();await onChanged();
    }finally{setSaving(false)}
  };
  const remove=async(id:string)=>{if(!confirm("인건비 내역을 삭제할까요?"))return;await deleteLabor(id);await load();await onChanged()};

  return <div className="space-y-4">
    <div className="rounded-[24px] bg-pink-500 p-5"><div className="text-sm font-bold opacity-90">오늘 TC 인건비</div><div className="mt-1 text-3xl font-black">TC {summary.totalTc}</div></div>
    <div className="grid grid-cols-2 gap-3">{summary.byEmployee.map(i=><div key={i.employee} className="rounded-[22px] bg-[#111A2E] p-4"><div className="font-black">{i.employee}</div><div className="mt-1 text-sm text-slate-300">TC {i.tc}</div></div>)}</div>
    <div className="rounded-[24px] bg-[#111A2E] p-4">
      <div className="mb-3 text-lg font-black">인건비 입력</div>
      <select value={employee} onChange={e=>setEmployee(e.target.value)} className="h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none">{employees.map(emp=><option key={emp.id} value={emp.name}>{emp.name}</option>)}</select>
      <select value={tableNo} onChange={e=>setTableNo(e.target.value)} className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none">{TABLE_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}</select>
      <input inputMode="numeric" value={tc} onChange={e=>setTc(e.target.value.replace(/[^0-9]/g,""))} placeholder="TC (0 입력 가능)" className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none"/>
      <input inputMode="numeric" value={dailyPay} onChange={e=>setDailyPay(e.target.value.replace(/[^0-9]/g,""))} placeholder="일비 (0 입력 가능)" className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none"/>
      <input value={memo} onChange={e=>setMemo(e.target.value)} placeholder="메모" className="mt-3 h-12 w-full rounded-2xl bg-slate-800 px-4 text-white outline-none"/>
      <button disabled={saving} onClick={save} className="mt-4 h-14 w-full rounded-2xl bg-pink-500 text-lg font-black text-white disabled:opacity-60">{saving?"저장 중...":"인건비 저장"}</button>
    </div>
    <div><div className="mb-2 text-lg font-black">오늘 인건비 내역</div>{!rows.length&&<div className="rounded-[24px] bg-[#111A2E] p-6 text-center text-sm text-slate-400">인건비 내역이 없습니다.</div>}<div className="space-y-3">{rows.map(item=><div key={item.id} className="rounded-[24px] bg-[#111A2E] p-4"><div className="flex items-start justify-between gap-4"><div><div className="font-black">{item.employee}</div><div className="mt-1 text-sm text-slate-300">테이블 {item.tableNo||"-"} / TC {item.tc} / 일비 {money(item.dailyPay??item.amount??0)}</div>{item.memo&&<div className="mt-1 text-sm text-slate-400">📝 {item.memo}</div>}</div><div className="text-right"><button onClick={()=>remove(item.id)} className="inline-flex items-center gap-1 text-xs text-red-400"><Trash2 size={14}/>삭제</button></div></div></div>)}</div></div>
  </div>;
}
