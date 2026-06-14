"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LeanCanvasSubmission, PdfStatus, SubmissionStatus } from "@/lib/types";
import { deleteSubmission, loadSubmissions } from "@/lib/storage";

const ADMIN_SESSION_KEY = "lean-canvas-admin-authorized";
const ADMIN_PASSWORD_KEY = "lean-canvas-admin-password";
type AdminFilter = "all" | "submitted" | "pdfSuccess" | "pdfFailed" | "hasFeedback";

const ADMIN_FILTER_LABELS: Record<AdminFilter, string> = {
  all: "전체",
  submitted: "제출 완료",
  pdfSuccess: "PDF 정상",
  pdfFailed: "PDF 오류",
  hasFeedback: "피드백 있음"
};

function getAdminSubmissionStatus(submission: LeanCanvasSubmission): SubmissionStatus {
  return submission.submissionStatus ?? "submitted";
}

function getAdminPdfStatus(submission: LeanCanvasSubmission): PdfStatus {
  return submission.pdfStatus ?? "success";
}

function formatSubmissionStatus(status: SubmissionStatus) {
  const labels: Record<SubmissionStatus, string> = {
    draft: "작성 중",
    submitted: "제출 완료",
    reviewed: "검토 완료",
    returned: "수정 요청"
  };
  return labels[status];
}

function formatPdfStatus(status: PdfStatus) {
  const labels: Record<PdfStatus, string> = {
    idle: "PDF 대기",
    generating: "PDF 생성 중",
    success: "PDF 정상",
    failed: "PDF 오류"
  };
  return labels[status];
}

function hasMentorFeedback(submission: LeanCanvasSubmission) {
  return Boolean(submission.canvas.mentorComment?.some((item) => item.trim()));
}

function filterByAdminStatus(submissions: LeanCanvasSubmission[], filter: AdminFilter) {
  switch (filter) {
    case "submitted":
      return submissions.filter((submission) => getAdminSubmissionStatus(submission) === "submitted");
    case "pdfSuccess":
      return submissions.filter((submission) => getAdminPdfStatus(submission) === "success");
    case "pdfFailed":
      return submissions.filter((submission) => getAdminPdfStatus(submission) === "failed");
    case "hasFeedback":
      return submissions.filter(hasMentorFeedback);
    case "all":
    default:
      return submissions;
  }
}

function calculateAdminMetrics(submissions: LeanCanvasSubmission[]) {
  return {
    total: submissions.length,
    submitted: submissions.filter((submission) => getAdminSubmissionStatus(submission) === "submitted").length,
    pdfSuccess: submissions.filter((submission) => getAdminPdfStatus(submission) === "success").length,
    pdfFailed: submissions.filter((submission) => getAdminPdfStatus(submission) === "failed").length,
    feedback: submissions.filter(hasMentorFeedback).length
  };
}

function escapeCsv(value: unknown) {
  const text = value == null ? "" : String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

function downloadAdminCsv(submissions: LeanCanvasSubmission[]) {
  const headers = ["제출일", "교육명", "팀명", "참가자명", "아이디어명", "제출상태", "PDF상태", "미리보기경로"];
  const rows = submissions.map((submission) => [
    new Date(submission.createdAt).toLocaleString("ko-KR"),
    submission.participant.educationName || "",
    submission.participant.teamName || "",
    submission.participant.participantName || "",
    submission.participant.ideaName || "",
    formatSubmissionStatus(getAdminSubmissionStatus(submission)),
    formatPdfStatus(getAdminPdfStatus(submission)),
    `/preview/${submission.id}`
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `highviewlab-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function readSessionValue(key: string) {
  try {
    return window.sessionStorage?.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeSessionValue(key: string, value: string) {
  try {
    window.sessionStorage?.setItem(key, value);
  } catch {
    // Session storage can be blocked in embedded browser contexts.
  }
}

function removeSessionValue(key: string) {
  try {
    window.sessionStorage?.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

const loadServerSubmissions = async (adminPassword: string) => {
  const response = await fetch("/api/submissions", {
    headers: {
      "x-admin-password": adminPassword
    }
  });
  const data = (await response.json()) as {
    submissions?: LeanCanvasSubmission[];
    code?: string;
    error?: string;
  };

  if (response.status === 503 && (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY")) {
    return { submissions: loadSubmissions(), fallback: true };
  }

  if (!response.ok || !data.submissions) {
    throw new Error(data.error || "제출 목록을 불러오지 못했습니다.");
  }

  return { submissions: data.submissions, fallback: false };
};

export default function AdminList() {
  const [submissions, setSubmissions] = useState<LeanCanvasSubmission[]>([]);
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AdminFilter>("all");
  const [fallbackMode, setFallbackMode] = useState(false);

  async function refreshList(adminPassword = readSessionValue(ADMIN_PASSWORD_KEY)) {
    setRefreshing(true);
    setError("");
    setNotice("");
    try {
      const result = await loadServerSubmissions(adminPassword);
      setSubmissions(result.submissions);
      setFallbackMode(result.fallback);
      if (result.fallback) {
        setNotice("Supabase 중앙 저장소가 아직 설정되지 않아 이 브라우저의 임시 제출 목록을 표시합니다.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "목록을 불러오지 못했습니다.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const storedPassword = readSessionValue(ADMIN_PASSWORD_KEY);
    if (readSessionValue(ADMIN_SESSION_KEY) === "true" && storedPassword) {
      setAuthorized(true);
      refreshList(storedPassword);
    }
  }, []);

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = (await response.json()) as { ok?: boolean };
      if (!response.ok || !data.ok) {
        throw new Error("암호가 올바르지 않습니다.");
      }
      // TODO: 운영 배포에서는 sessionStorage 대신 httpOnly cookie 기반 관리자 세션으로 교체하세요.
      writeSessionValue(ADMIN_SESSION_KEY, "true");
      writeSessionValue(ADMIN_PASSWORD_KEY, password);
      setAuthorized(true);
      await refreshList(password);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeSessionValue(ADMIN_SESSION_KEY);
    removeSessionValue(ADMIN_PASSWORD_KEY);
    setAuthorized(false);
    setSubmissions([]);
    setQuery("");
    setFilter("all");
  };

  const removeSubmission = async (submission: LeanCanvasSubmission) => {
    const label = submission.participant.teamName || submission.participant.ideaName || "선택한 제출물";
    if (!window.confirm(`${label} 제출물을 삭제할까요?`)) return;
    const adminPassword = readSessionValue(ADMIN_PASSWORD_KEY);

    if (fallbackMode) {
      setSubmissions(deleteSubmission(submission.id));
      return;
    }

    const response = await fetch(`/api/submissions/${submission.id}/delete`, {
      method: "POST",
      headers: {
        "x-admin-password": adminPassword
      }
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };

    if (!response.ok || !data.ok) {
      alert(data.error || "삭제에 실패했습니다.");
      return;
    }

    setSubmissions((current) => current.filter((item) => item.id !== submission.id));
  };

  const normalizedQuery = query.trim().toLowerCase();
  const searchedSubmissions = normalizedQuery
    ? submissions.filter((submission) =>
        [
          submission.participant.educationName,
          submission.participant.teamName,
          submission.participant.participantName,
          submission.participant.ideaName
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : submissions;
  const filteredSubmissions = filterByAdminStatus(searchedSubmissions, filter);
  const metrics = calculateAdminMetrics(submissions);

  if (!authorized) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
        <main className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">관리자</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">제출 목록 로그인</h1>
          <form className="mt-6 space-y-4" onSubmit={login}>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">암호</span>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            <button
              className="w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-800 active:bg-blue-900 disabled:bg-gray-400"
              disabled={loading}
              type="submit"
            >
              {loading ? "확인 중..." : "로그인"}
            </button>
          </form>
          <Link className="mt-4 inline-block text-sm font-semibold text-gray-700 underline" href="/">
            메인으로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">관리자</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">참가자 제출 목록</h1>
          <p className="mt-1 text-sm text-gray-600">총 {submissions.length}건 제출</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold disabled:bg-gray-100"
            disabled={refreshing}
            onClick={() => refreshList()}
          >
            {refreshing ? "새로고침 중..." : "목록 새로고침"}
          </button>
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={logout}>
            로그아웃
          </button>
          <Link className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" href="/">
            메인
          </Link>
        </div>
      </header>

      <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">총 제출</p>
          <p className="mt-1 text-2xl font-bold text-gray-950">{metrics.total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">제출 완료</p>
          <p className="mt-1 text-2xl font-bold text-gray-950">{metrics.submitted}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">PDF 정상</p>
          <p className="mt-1 text-2xl font-bold text-gray-950">{metrics.pdfSuccess}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-semibold text-red-700">PDF 오류</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{metrics.pdfFailed}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">피드백 있음</p>
          <p className="mt-1 text-2xl font-bold text-gray-950">{metrics.feedback}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-semibold text-blue-700">현재 표시</p>
          <p className="mt-1 text-2xl font-bold text-blue-800">{filteredSubmissions.length}</p>
        </div>
      </section>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          placeholder="교육명, 팀명, 참가자명, 아이디어명으로 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="self-center text-sm text-gray-600">표시 {filteredSubmissions.length}건</div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(ADMIN_FILTER_LABELS) as AdminFilter[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
              filter === item
                ? "border-blue-700 bg-blue-700 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {ADMIN_FILTER_LABELS[item]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => downloadAdminCsv(filteredSubmissions)}
          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          CSV 다운로드
        </button>
      </div>
      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {notice ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</div>
      ) : null}

      <main className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {filteredSubmissions.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-600">아직 제출된 린캔버스가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3">제출일</th>
                  <th className="px-4 py-3">교육명</th>
                  <th className="px-4 py-3">팀명</th>
                  <th className="px-4 py-3">참가자</th>
                  <th className="px-4 py-3">아이디어명</th>
                  <th className="px-4 py-3">제출상태</th>
                  <th className="px-4 py-3">PDF상태</th>
                  <th className="px-4 py-3">열람</th>
                  <th className="px-4 py-3">PDF</th>
                  <th className="px-4 py-3">삭제</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((submission) => (
                  <tr key={submission.id} className="border-t border-gray-200">
                    <td className="px-4 py-3">{new Date(submission.createdAt).toLocaleString("ko-KR")}</td>
                    <td className="px-4 py-3">{submission.participant.educationName || "-"}</td>
                    <td className="px-4 py-3 font-semibold">{submission.participant.teamName || "-"}</td>
                    <td className="px-4 py-3">{submission.participant.participantName || "-"}</td>
                    <td className="px-4 py-3">{submission.participant.ideaName || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                        {formatSubmissionStatus(getAdminSubmissionStatus(submission))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${
                          getAdminPdfStatus(submission) === "failed" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                        }`}
                      >
                        {formatPdfStatus(getAdminPdfStatus(submission))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link className="font-semibold text-blue-700 underline" href={`/preview/${submission.id}`}>
                        미리보기
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link className="font-semibold text-gray-800 underline" href={`/preview/${submission.id}`}>
                        PDF
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded-md border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
                        onClick={() => removeSubmission(submission)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
