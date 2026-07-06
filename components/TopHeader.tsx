"use client";
import {Settings} from "lucide-react";
export default function TopHeader({onSettings}:{onSettings:()=>void}){return <div className="flex items-center justify-between"><div className="text-2xl font-black">🎬 드라마 LIVE</div><button onClick={onSettings} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#111A2E] text-slate-200 shadow-lg active:scale-95"><Settings size={23}/></button></div>}
