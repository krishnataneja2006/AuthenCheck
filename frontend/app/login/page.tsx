"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function LoginPage() {
  const router = useRouter();
  const [institutionId, setInstitutionId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institution_id: institutionId.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Login failed.");
      localStorage.setItem("authencheck_token", data.access_token);
      localStorage.setItem("authencheck_institution_id", data.institution_id);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to AuthenCheck backend.");
    } finally { setLoading(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-5 py-12 text-slate-800">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#315b78] text-2xl font-bold text-white">A</div>
          <h1 className="text-2xl font-bold tracking-tight">Institution Login</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Sign in to access the AuthenCheck academic credential portal.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div><label htmlFor="institution-id" className="mb-2 block text-sm font-medium">Institution ID</label><input id="institution-id" autoComplete="username" required value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-[#315b78] focus:ring-2 focus:ring-[#315b78]/15" placeholder="Enter institution ID" /></div>
          <div><label htmlFor="password" className="mb-2 block text-sm font-medium">Password</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-[#315b78] focus:ring-2 focus:ring-[#315b78]/15" placeholder="Enter password" /></div>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#315b78] px-4 py-3 font-semibold text-white transition hover:bg-[#24465f] disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Signing in..." : "Sign In"}</button>
        </form>
        <p className="mt-6 text-center text-xs leading-5 text-slate-500">Authorized institution access only. Login details are configured by the administrator.</p>
      </section>
    </main>
  );
}
