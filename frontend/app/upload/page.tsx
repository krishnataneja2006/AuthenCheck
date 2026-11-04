
"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function authHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("authencheck_token") : null;
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

type AIAnalysis = {
  available?: boolean;
  summary?: string;
  findings?: string[];
  risk_level?: string;
  manual_review_recommended?: boolean;
};

type UploadResult = {
  message?: string;
  credential_id?: string;
  filename?: string;
  student_name?: string;
  issuer?: string;
  course?: string;
  status?: string;
  document_type?: string;
  document_type_reason?: string;
  extracted_text?: string;
  text_extracted?: boolean;
  detail_checks?: Record<string, boolean>;
  missing_details?: string[];
  additional_checks?: string[];
  detected_dates?: string[];
  detected_credential_ids?: string[];
  ai_analysis?: AIAnalysis;
  manual_review_required?: boolean;
  note?: string;
  detail?: string;
};

const inputClass =
  "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#315b78] focus:ring-2 focus:ring-[#315b78]/20";

const labelClass = "block text-sm font-semibold text-slate-700";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [studentName, setStudentName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [course, setCourse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!file) {
      setError("Please select a certificate file first.");
      return;
    }

    const allowedExtensions = [".pdf", ".png", ".jpg", ".jpeg"];
    const filename = file.name.toLowerCase();

    if (!allowedExtensions.some((ext) => filename.endsWith(ext))) {
      setError("Please upload a PDF, PNG, JPG, or JPEG file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be 10 MB or less.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("student_name", studentName.trim());
    formData.append("issuer", issuer.trim());
    formData.append("course", course.trim());

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/credentials/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });

      const data: UploadResult = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Upload failed. Please check the file and try again."
        );
      }

      setResult(data);
      setFile(null);
      setStudentName("");
      setIssuer("");
      setCourse("");

      const fileInput = document.getElementById(
        "certificate-file"
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = "";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the backend. Please check the server."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f5f7] text-slate-800">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 md:px-8">
          <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
            <span className="text-[#315b78]">A</span>uthenCheck
          </Link>

          <Link
            href="/history"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Verification History
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-14">
        <Link
          href="/"
          className="text-sm font-semibold text-[#315b78] hover:text-[#24465f]"
        >
          ← Back to Home
        </Link>

        <header className="mb-8 mt-7">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#315b78]">
            Document Submission
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Upload Certificate
          </h1>

          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Upload an academic or course certificate to extract text,
            check submitted details, and create a credential record.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-8"
        >
          <div>
            <label htmlFor="certificate-file" className={labelClass}>
              Certificate File
            </label>

            <p className="mt-1 text-sm text-slate-500">
              Accepted formats: PDF, PNG, JPG, JPEG. Maximum size: 10 MB.
            </p>

            <input
              id="certificate-file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              onChange={(event) =>
                setFile(event.target.files?.[0] ?? null)
              }
              className={`${inputClass} file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-[#315b78] file:px-4 file:py-2 file:font-semibold file:!text-white hover:file:bg-[#24465f]`}
            />

            {file && (
              <p className="mt-2 break-all text-sm text-slate-500">
                Selected: {file.name} (
                {(file.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div>
            <label htmlFor="student-name" className={labelClass}>
              Student Name
            </label>
            <input
              id="student-name"
              type="text"
              value={studentName}
              onChange={(event) => setStudentName(event.target.value)}
              placeholder="Name printed on certificate"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="issuer" className={labelClass}>
              Issuing Institution / Company
            </label>
            <input
              id="issuer"
              type="text"
              value={issuer}
              onChange={(event) => setIssuer(event.target.value)}
              placeholder="e.g. ABC University or XYZ Company"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="course" className={labelClass}>
              Course / Degree Name
            </label>
            <input
              id="course"
              type="text"
              value={course}
              onChange={(event) => setCourse(event.target.value)}
              placeholder="e.g. Bachelor of Computer Applications"
              className={inputClass}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#315b78] px-6 py-3 font-semibold !text-white shadow-sm transition hover:bg-[#24465f] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Uploading and Processing..." : "Upload Certificate"}
          </button>

          <p className="text-xs leading-5 text-slate-500">
            Submitted details are compared with extracted document text.
            Automated checks do not independently prove certificate authenticity.
          </p>
        </form>

        {result && (
          <section
            aria-live="polite"
            className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-8"
          >
            <div className="border-b border-slate-200 pb-4">
              <p className="text-sm font-semibold text-emerald-700">
                Upload completed
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">
                Credential Record Created
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {result.message || "The document was processed."}
              </p>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {[
                ["Student", result.student_name],
                ["Institution", result.issuer],
                ["Course", result.course],
                ["Status", result.status],
                ["Document Classification", result.document_type],
                ["Filename", result.filename],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  <p className="mt-1 break-words text-sm text-slate-800">
                    {value || "Not provided"}
                  </p>
                </div>
              ))}
            </div>

            {result.credential_id && (
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Credential ID
                </p>
                <p className="mt-2 break-all font-mono text-sm text-slate-800">
                  {result.credential_id}
                </p>
              </div>
            )}

            {result.document_type_reason && (
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {result.document_type_reason}
              </p>
            )}

            {result.ai_analysis && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Gemini AI Analysis
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Preliminary document screening based on the extracted text.
                    </p>
                  </div>
                  {result.ai_analysis.available && result.ai_analysis.risk_level && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        result.ai_analysis.risk_level.toUpperCase() === "HIGH"
                          ? "bg-red-100 text-red-800"
                          : result.ai_analysis.risk_level.toUpperCase() === "MEDIUM"
                            ? "bg-amber-100 text-amber-800"
                            : result.ai_analysis.risk_level.toUpperCase() === "LOW"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      Risk: {result.ai_analysis.risk_level.toUpperCase()}
                    </span>
                  )}
                </div>

                {!result.ai_analysis.available ? (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    AI analysis is currently unavailable. Please rely on the extracted
                    text checks and arrange manual review.
                    {result.ai_analysis.summary && (
                      <p className="mt-2">{result.ai_analysis.summary}</p>
                    )}
                  </div>
                ) : (
                  <>
                    {result.ai_analysis.summary && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-slate-800">AI Summary</h4>
                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          {result.ai_analysis.summary}
                        </p>
                      </div>
                    )}

                    {result.ai_analysis.findings && result.ai_analysis.findings.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-slate-800">AI Findings</h4>
                        <ul className="mt-2 list-inside list-disc space-y-2 text-sm leading-6 text-slate-700">
                          {result.ai_analysis.findings.map((finding, index) => (
                            <li key={`${finding}-${index}`}>{finding}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {result.ai_analysis.manual_review_recommended && (
                  <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium leading-6 text-amber-900">
                    Gemini recommends manual review. Check the document carefully
                    and contact the issuing institution when appropriate.
                  </p>
                )}

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  AI risk levels are screening indicators, not proof that a credential
                  is authentic or fraudulent.
                </p>
              </div>
            )}

            {result.detail_checks &&
              Object.keys(result.detail_checks).length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-slate-800">
                    Submitted Detail Checks
                  </h3>
                  <div className="mt-3 space-y-2">
                    {Object.entries(result.detail_checks).map(
                      ([name, matched]) => (
                        <div
                          key={name}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                        >
                          <span className="text-sm capitalize text-slate-700">
                            {name.replaceAll("_", " ")}
                          </span>
                          <span
                            className={
                              matched
                                ? "text-sm font-semibold text-emerald-700"
                                : "text-sm font-semibold text-amber-700"
                            }
                          >
                            {matched ? "Found in text" : "Not matched"}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {result.missing_details && result.missing_details.length > 0 && (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-semibold text-amber-900">
                  Details Not Matched
                </h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-800">
                  {result.missing_details.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.detected_dates && result.detected_dates.length > 0 && (
              <div className="mt-5">
                <h3 className="font-semibold text-slate-800">Detected Dates</h3>
                <p className="mt-2 break-words text-sm text-slate-600">
                  {result.detected_dates.join(", ")}
                </p>
              </div>
            )}

            {result.detected_credential_ids &&
              result.detected_credential_ids.length > 0 && (
                <div className="mt-5">
                  <h3 className="font-semibold text-slate-800">
                    Detected Credential Identifiers
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {result.detected_credential_ids.map((item, index) => (
                      <li key={`${item}-${index}`} className="break-all">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {result.additional_checks && result.additional_checks.length > 0 && (
              <div className="mt-5">
                <h3 className="font-semibold text-slate-800">Additional Checks</h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
                  {result.additional_checks.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.manual_review_required && (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <strong>Manual review required.</strong> Automated checks
                could not establish sufficient confidence. Review the document
                and, where appropriate, contact the issuing institution.
              </div>
            )}

            {result.note && (
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {result.note}
              </p>
            )}

            {result.extracted_text && (
              <details className="mt-6 rounded-lg border border-slate-200">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
                  View Extracted Text
                </summary>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words border-t border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700">
                  {result.extracted_text}
                </pre>
              </details>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {result.credential_id && (
                <Link
                  href={`/verify?credential_id=${encodeURIComponent(result.credential_id)}`}
                  className="inline-flex items-center justify-center rounded-lg bg-[#315b78] px-5 py-3 text-sm font-semibold !text-white transition hover:bg-[#24465f]"
                >
                  View Credential Details
                </Link>
              )}

              <Link
                href="/history"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Verification History
              </Link>
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-500">
              A successful upload, text match, or document classification is
              not proof of authenticity. Verification may require independent
              confirmation from the issuing institution.
            </p>
          </section>
        )}

        <footer className="mt-10 border-t border-slate-200 py-6 text-sm text-slate-500">
          AuthenCheck — Academic Credential Verification
        </footer>
      </div>
    </main>
  );
}
