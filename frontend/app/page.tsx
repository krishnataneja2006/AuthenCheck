 
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
function authHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("authencheck_token") : null;
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
type Stats = { total_records: number; pending_review: number; verified: number; rejected: number };
type Credential = { credential_id: string; filename: string; student_name: string | null; issuer: string | null; status: string; created_at: string };
const statusTone: Record<string,string> = { VERIFIED:"bg-emerald-50 text-emerald-700 ring-emerald-200", PENDING_REVIEW:"bg-amber-50 text-amber-800 ring-amber-200", REJECTED:"bg-rose-50 text-rose-700 ring-rose-200" };
const modules = [
 {icon:"↑",title:"Upload credential",desc:"Add a degree, marksheet, or certificate for screening.",href:"/upload",tone:"bg-blue-50 text-blue-700"},
 {icon:"⌕",title:"Review a credential",desc:"Look up a saved credential and review its current status.",href:"/verify",tone:"bg-violet-50 text-violet-700"},
 {icon:"≡",title:"Verification history",desc:"Search submissions and download PDF verification reports.",href:"/history",tone:"bg-emerald-50 text-emerald-700"}
];
export default function Home() {
 const [stats,setStats]=useState<Stats|null>(null); const [recent,setRecent]=useState<Credential[]>([]); const [error,setError]=useState("");
 useEffect(()=>{let active=true; async function load(){try{
  const [a,b]=await Promise.all([fetch(`${API_URL}/api/dashboard/stats`,{cache:"no-store",headers:authHeaders()}),fetch(`${API_URL}/api/credentials?limit=5&offset=0`,{cache:"no-store",headers:authHeaders()})]);
  if(!a.ok||!b.ok) throw new Error("load"); const s=await a.json(); const r=await b.json();
  if(active){setStats(s);setRecent(Array.isArray(r)?r:(r.records??[]));setError("");}
 }catch{if(active)setError("Could not load dashboard data. Check the backend server and your login session.");}} void load();return()=>{active=false};},[]);
 const cards=[{label:"Total records",value:stats?.total_records,icon:"▤",tone:"text-slate-900 bg-slate-100"},{label:"Verified",value:stats?.verified,icon:"✓",tone:"text-emerald-700 bg-emerald-50"},{label:"Pending review",value:stats?.pending_review,icon:"◷",tone:"text-amber-700 bg-amber-50"},{label:"Rejected",value:stats?.rejected,icon:"!",tone:"text-rose-700 bg-rose-50"}];
 return <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
  <nav className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
   <Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#315b78] text-lg font-bold text-white">A</span><span><b className="block text-lg">AuthenCheck</b><small className="text-slate-500">Credential assurance portal</small></span></Link>
   <div className="flex items-center gap-3"><span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:inline-flex">● Institution session active</span><Link href="/history" className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">History</Link><button onClick={()=>{localStorage.removeItem("authencheck_token");window.location.href="/login"}} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Log out</button></div>
  </div></nav>
  <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
   <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#18364d] via-[#315b78] to-[#497b98] px-6 py-8 text-white shadow-lg md:px-10 md:py-10">
    <div className="pointer-events-none absolute -right-12 -top-20 h-72 w-72 rounded-full border-[40px] border-white/5"/><div className="relative max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-100">Academic credential management</p><h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Your verification workspace.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-blue-50 md:text-base">Review academic documents, track screening outcomes, and keep credential records organized in one place.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/upload" className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#24465f] hover:bg-blue-50">＋ Upload a credential →</Link><Link href="/history" className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold hover:bg-white/15">View history</Link></div></div>
   </section>
   <section className="mt-8"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">At a glance</p><h2 className="mt-1 text-xl font-bold">Credential overview</h2></div><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${error?"bg-rose-50 text-rose-700":"bg-white text-slate-500 ring-1 ring-slate-200"}`}>{error?"Connection issue":stats?"Live database summary":"Loading summary…"}</span></div>
    {error&&<p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(c=><div key={c.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{c.label}</span><span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold ${c.tone}`}>{c.icon}</span></div><p className="mt-5 text-3xl font-bold tracking-tight">{stats?(c.value??0):"—"}</p><p className="mt-1 text-xs text-slate-400">Saved credential records</p></div>)}</div>
   </section>
   <section className="mt-9"><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Workspace tools</p><h2 className="mt-1 text-xl font-bold">Manage your credentials</h2></div><div className="grid gap-4 md:grid-cols-3">{modules.map(m=><Link key={m.title} href={m.href} className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"><div className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl font-semibold ${m.tone}`}>{m.icon}</div><h3 className="mt-4 font-bold">{m.title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{m.desc}</p><div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-[#315b78]"><span>Open module</span><span className="transition group-hover:translate-x-1">→</span></div></Link>)}</div></section>
   <section className="mt-9 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 md:px-6"><div><h2 className="font-bold">Recent submissions</h2><p className="mt-1 text-xs text-slate-500">Latest saved credential records</p></div><Link href="/history" className="text-sm font-semibold text-[#315b78] hover:underline">View all records →</Link></div>
   {!recent.length?<div className="px-6 py-9 text-center text-sm text-slate-500">Recent records will appear here after credentials are uploaded.</div>:<div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Student / Record</th><th className="px-5 py-3">Institution</th><th className="px-5 py-3">Date added</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{recent.map(r=><tr key={r.credential_id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><b>{r.student_name||r.filename}</b><small className="mt-1 block text-slate-400">{r.credential_id}</small></td><td className="px-5 py-4 text-slate-600">{r.issuer||"Not extracted"}</td><td className="px-5 py-4 text-slate-600">{r.created_at?new Date(r.created_at).toLocaleDateString():"—"}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusTone[r.status]||"bg-slate-50 text-slate-600 ring-slate-200"}`}>{(r.status||"UNKNOWN").replaceAll("_"," ")}</span></td></tr>)}</tbody></table></div>}</section>
   <section className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><span className="text-lg">ⓘ</span><p><b>Important:</b> OCR and AI screening provide preliminary indicators only. “Verified” is not issuer-confirmed proof of authenticity; contact the issuing institution when needed.</p></section>
   <footer className="py-8 text-center text-xs text-slate-400">AuthenCheck · Academic Credential Verification</footer>
  </div>
 </main>;
}
