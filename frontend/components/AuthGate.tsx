"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export default function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isLogin = pathname === "/login";

  useEffect(() => {
    const token = localStorage.getItem("authencheck_token");
    if (isLogin && token) { router.replace("/"); return; }
    if (!isLogin && !token) { router.replace("/login"); return; }
    setReady(true);
  }, [isLogin, pathname, router]);

  function logout() {
    localStorage.removeItem("authencheck_token");
    localStorage.removeItem("authencheck_institution_id");
    router.replace("/login");
  }

  if (!ready) return <div className="flex min-h-screen items-center justify-center bg-stone-100 text-sm text-slate-500">Loading AuthenCheck...</div>;
  if (isLogin) return <>{children}</>;
  return <><div className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-5 py-2 text-sm text-slate-600"><span>Institution: {typeof window !== "undefined" ? localStorage.getItem("authencheck_institution_id") || "Signed in" : "Signed in"}</span><button onClick={logout} className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50">Log out</button></div>{children}</>;
}
