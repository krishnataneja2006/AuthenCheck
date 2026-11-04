
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function authHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("authencheck_token") : null;
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

type Credential = {
  credential_id: string;
  filename?: string;
  student_name?: string;
  issuer?: string;
  course?: string;
  status?: string;
  document_type?: string;
  manual_review_required?: boolean;
  created_at?: string;
};

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const [credentialId, setCredentialId] = useState("");
  const [credential, setCredential] = useState<Credential | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const lookupCredential = useCallback(async (id: string) => {
    const cleanId = id.trim();

    if (!cleanId) {
      setError("Please enter a credential ID.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setCredential(null);

    try {
      const response = await fetch(
        `${API_URL}/api/credentials/${encodeURIComponent(cleanId)}`,
        { cache: "no-store", headers: authHeaders() }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Credential not found.");
      }

      setCredential(data);
      setCredentialId(cleanId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load credential."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = searchParams.get("credential_id");
    if (id) {
      setCredentialId(id);
      void lookupCredential(id);
    }
  }, [searchParams, lookupCredential]);

  async function updateStatus(status: "VERIFIED" | "REJECTED" | "PENDING_REVIEW") {
    if (!credential) return;

    const confirmation = window.confirm(
      `Are you sure you want to change this credential status to ${status.replaceAll("_", " ")}?`
    );

    if (!confirmation) return;

    setUpdating(true);
    setError("");
    setMessage("");

    try {
      const body = new URLSearchParams();
      body.set("status", status);

      const response = await fetch(
        `${API_URL}/api/credentials/${encodeURIComponent(credential.credential_id)}/status`,
        {
          method: "PUT",
          headers: authHeaders({
            "Content-Type": "application/x-www-form-urlencoded",
            accept: "application/json",
          }),
          body: body.toString(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not update credential status.");
      }

      setCredential(data.credential);
      setMessage(data.message || "Credential status updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update status."
      );
    } finally {
      setUpdating(false);
    }
  }

  const statusStyle =
    credential?.status === "VERIFIED"
      ? "bg-green-100 text-green-800 border-green-200"
      : credential?.status === "REJECTED"
      ? "bg-red-100 text-red-800 border-red-200"
      : "bg-amber-100 text-amber-800 border-amber-200";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-bold text-slate-800">
            <span className="text-blue-600">A</span>uthenCheck
          </Link>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
            Academic Verification
          </span>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href="/"
          className="text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          ← Back to Home
        </Link>

        <div className="mb-8 mt-6">
          <h1 className="text-3xl font-bold text-slate-900">
            Verify Certificate
          </h1>
          <p className="mt-2 text-slate-600">
            Search for a saved credential and review its recorded details.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label
            htmlFor="credentialId"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Credential ID
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="credentialId"
              value={credentialId}
              onChange={(event) => setCredentialId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void lookupCredential(credentialId);
                }
              }}
              placeholder="Enter the credential ID from History"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <button
              onClick={() => void lookupCredential(credentialId)}
              disabled={loading}
              className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Searching..." : "Find Credential"}
            </button>
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {message}
          </div>
        )}

        {credential && (
          <>
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Credential Details
                  </h2>
                  <p className="mt-2 break-all text-sm text-slate-500">
                    ID: {credential.credential_id}
                  </p>
                </div>

                <span
                  className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-bold ${statusStyle}`}
                >
                  {(credential.status || "PENDING_REVIEW").replaceAll("_", " ")}
                </span>
              </div>

              <div className="grid gap-x-10 gap-y-6 p-6 sm:grid-cols-2">
                {[
                  ["Student Name", credential.student_name],
                  ["Issuing Institution", credential.issuer],
                  ["Course / Qualification", credential.course],
                  ["Uploaded Filename", credential.filename],
                  ["Document Classification", credential.document_type],
                  ["Created At", credential.created_at],
                  [
                    "Manual Review",
                    credential.manual_review_required
                      ? "Required"
                      : "Not flagged by preliminary checks",
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-1 break-words font-medium text-slate-900">
                      {value || "Not available"}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Update Status
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review the credential before changing its status. Changes are
                saved to the database.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => void updateStatus("VERIFIED")}
                  disabled={updating || credential.status === "VERIFIED"}
                  className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {updating
                    ? "Updating..."
                    : credential.status === "VERIFIED"
                    ? "Already Verified"
                    : "Mark as Verified"}
                </button>

                <button
                  onClick={() => void updateStatus("REJECTED")}
                  disabled={updating || credential.status === "REJECTED"}
                  className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {credential.status === "REJECTED"
                    ? "Already Rejected"
                    : "Mark as Rejected"}
                </button>

                <button
                  onClick={() => void updateStatus("PENDING_REVIEW")}
                  disabled={updating || credential.status === "PENDING_REVIEW"}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Return to Pending Review
                </button>
              </div>
            </section>
          </>
        )}

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm leading-6 text-amber-900">
            <strong>Important:</strong> A status update records a review
            decision in this application. It does not independently prove
            that a certificate is authentic. Confirm with the issuing
            institution when necessary.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/history" className="text-blue-700 hover:text-blue-900">
            View History →
          </Link>
          <Link href="/upload" className="text-blue-700 hover:text-blue-900">
            Upload Another Certificate →
          </Link>
        </div>
      </section>
    </main>
  );
}
