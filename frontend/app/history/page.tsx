
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function authHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("authencheck_token") : null;
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

type Credential = {
  credential_id: string;
  filename: string;
  student_name: string | null;
  issuer: string | null;
  course: string | null;
  status: string;
  document_type: string | null;
  manual_review_required: boolean | number;
  created_at: string;
};

const statusStyles: Record<string, string> = {
  VERIFIED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  PENDING_REVIEW: "bg-amber-100 text-amber-800 border-amber-200",
};

export default function HistoryPage() {
  const [records, setRecords] = useState<Credential[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (status) {
        params.set("status", status);
      }

      const response = await fetch(
        `${API_URL}/api/credentials?${params.toString()}`,
        { cache: "no-store", headers: authHeaders() }
      );

      if (!response.ok) {
        throw new Error("Unable to load credential records.");
      }

      const data = await response.json();

      setRecords(Array.isArray(data) ? data : data.records ?? []);
    } catch {
      setError(
        "Could not connect to the backend. Please check that the backend server is running."
      );
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const downloadReport = async (credentialId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/credentials/${encodeURIComponent(credentialId)}/report`,
        { headers: authHeaders() }
      );
      if (!response.ok) throw new Error("Could not generate report.");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `AuthenCheck_Report_${credentialId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Could not download the PDF report. Please check the backend and try again.");
    }
  };

  const countStatus = (value: string) =>
    records.filter((record) => record.status === value).length;

  return (
    <main className="min-h-screen bg-gray-50 text-slate-800">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-bold tracking-tight text-slate-800">
            <span className="text-blue-600">A</span>uthenCheck
          </Link>

          <Link
            href="/"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-gray-100"
          >
            Back to Home
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-600">
              Credential Management
            </p>

            <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
              Verification History
            </h1>

            <p className="mt-3 text-slate-600">
              Search, filter, and review saved credential records.
            </p>
          </div>

          <button
            onClick={() => void loadRecords()}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh Records"}
          </button>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Matching Records</p>
            <p className="mt-3 text-3xl font-bold text-blue-600">
              {records.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pending Review</p>
            <p className="mt-3 text-3xl font-bold text-amber-600">
              {countStatus("PENDING_REVIEW")}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Verified</p>
            <p className="mt-3 text-3xl font-bold text-green-600">
              {countStatus("VERIFIED")}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Rejected</p>
            <p className="mt-3 text-3xl font-bold text-red-600">
              {countStatus("REJECTED")}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Manual Review</p>
            <p className="mt-3 text-3xl font-bold text-orange-600">
              {records.filter(
                (record) =>
                  record.manual_review_required === true ||
                  record.manual_review_required === 1
              ).length}
            </p>
          </div>
        </div>

        <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 md:grid-cols-[1fr_280px]">
            <div>
              <label
                htmlFor="credential-search"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Search Credentials
              </label>

              <input
                id="credential-search"
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student, issuer, course, filename, or ID..."
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="status-filter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Filter by Status
              </label>

              <select
                id="status-filter"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All Statuses</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <p className="text-sm text-slate-500">
              {records.length} matching record{records.length === 1 ? "" : "s"}
            </p>

            {(search || status) && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatus("");
                }}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                Clear Filters
              </button>
            )}
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="text-slate-600">Loading credential records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mb-3 text-4xl">📄</div>
            <h2 className="text-xl font-semibold text-slate-800">
              No credentials found
            </h2>
            <p className="mt-2 text-slate-500">
              Try changing your search or upload a new credential.
            </p>

            <Link
              href="/upload"
              className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Upload Certificate
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {records.map((record) => {
              const manualReview =
                record.manual_review_required === true ||
                record.manual_review_required === 1;

              return (
                <article
                  key={record.credential_id}
                  className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-300 hover:shadow-md"
                >
                  <div className="flex flex-col justify-between gap-5 lg:flex-row">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="break-words text-xl font-bold text-slate-900">
                          {record.student_name || "Name not available"}
                        </h2>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${
                            statusStyles[record.status] ||
                            "border-gray-200 bg-gray-100 text-gray-700"
                          }`}
                        >
                          {record.status.replaceAll("_", " ")}
                        </span>
                      </div>

                      <p className="mt-2 text-slate-600">
                        {record.course || "Course not specified"}
                      </p>

                      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <p className="text-sm text-slate-500">
                            Issuing Institution
                          </p>
                          <p className="mt-1 break-words font-medium text-slate-800">
                            {record.issuer || "Not specified"}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-slate-500">Filename</p>
                          <p className="mt-1 break-words font-medium text-slate-800">
                            {record.filename}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-slate-500">
                            Document Classification
                          </p>
                          <p className="mt-1 break-words font-medium text-slate-800">
                            {record.document_type || "Not classified"}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-slate-500">Created At</p>
                          <p className="mt-1 font-medium text-slate-800">
                            {record.created_at || "Not available"}
                          </p>
                        </div>

                        <div className="sm:col-span-2">
                          <p className="text-sm text-slate-500">Credential ID</p>
                          <p className="mt-1 break-all font-mono text-sm text-slate-700">
                            {record.credential_id}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <span
                          className={`inline-flex rounded-md px-3 py-2 text-sm ${
                            manualReview
                              ? "bg-amber-50 text-amber-800"
                              : "bg-green-50 text-green-800"
                          }`}
                        >
                          {manualReview
                            ? "Manual review recommended"
                            : "Not flagged by preliminary checks"}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                      <Link
                        href={`/verify?credential_id=${encodeURIComponent(
                          record.credential_id
                        )}`}
                        className="inline-flex justify-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                      >
                        View Details
                      </Link>
                      <button
                        type="button"
                        onClick={() => void downloadReport(record.credential_id)}
                        className="inline-flex justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        ↓ Download PDF report
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <strong>Important:</strong> A saved record or automated document
          classification does not independently prove that a credential is
          authentic. Verification may require confirmation from the issuing
          institution.
        </div>

        <footer className="mt-12 border-t border-gray-200 py-6 text-center text-sm text-slate-500">
          © 2026 AuthenCheck. Academic Credential Verification.
        </footer>
      </section>
    </main>
  );
}
