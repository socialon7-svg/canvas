"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ModuStartupSubmission } from "@/lib/types";
import { deleteModuStartupSubmission, loadModuStartupSubmissions } from "@/lib/storage";

const ADMIN_SESSION_KEY = "lean-canvas-admin-authorized";
const ADMIN_PASSWORD_KEY = "lean-canvas-admin-password";

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

function escapeCsv(value: unknown) {
  const text = value == null ? "" : String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

function downloadCsv(submissions: ModuStartupSubmission[]) {
  const headers = [
    "제출일",
    "교육명",
    "팀명",
    "참가자명",
    "아이디어",
    "분야",
    "정책키워드",
    "증거문장",
    "미리보기경로"
  ];
  const rows = submissions.map((submission) => [
    new Date(submission.createdAt).toLocaleString("ko-KR"),
    submission.input.programName || "",
    submission.input.teamName || "",
    submission.input.participantName || "",
    submission.input.ideaTitle || submission.input.ideaOneLine || "",
    submission.input.category || "",
    submission.draft.policyKeywords.join(" / "),
    submission.draft.evidenceLines.join(" / "),
    `/modu-startup/preview/${submission.id}`
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `modu-startup-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function loadServerSubmissions(adminPassword: string) {
  const response = await fetch("/api/modu-startup-submissions", {
    headers: { "x-admin-password": adminPassword }
  });
  const data = (await response.json()) as {
    submissions?: ModuStartupSubmission[];
    code?: string;
    error?: string;
  };

  if (response.status === 503 && (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY")) {
    return { submissions: loadModuStartupSubmissions(), fallback: true };
  }

  if (!response.ok || !data.submissions) {
    throw new Error(data.error || "모두의창업 제출 목록을 불러오지 못했습니다.");
  }

  return { submissions: data.submissions, fallback: false };
}

export default function ModuStartupAdminList() {
  const [submissions, setSubmissions] = useState<ModuStartupSubmission[]>([]);
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refreshList(adminPassword = readSessionValue(ADMIN_PASSWORD_KEY)) {
    setRefreshing(true);
    setError("");
    setNotice("");
    try {
      const result = await loadServerSubmissions(adminPassword);
      setSubmissions(result.submissions);
      setFallbackMode(result.fallback);
      if (result.fallback) {
        setNotice("Supabase 모두의창업 테이블이 아직 준비되지 않아 이 브라우저의 임시 제출 목록을 표시합니다.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "목록을 불러오지 못했습니다.");
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
      writeSessionValue(ADMIN_SESSION_KEY, "true");
      writeSessionValue(ADMIN_PASSWORD_KEY, password);
      setAuthorized(true);
      await refreshList(password);
      setPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeSessionValue(ADMIN_SESSION_KEY);
    removeSessionValue(ADMIN_PASSWORD_KEY);
    setAuthorized(false);
    setSubmissions([]);
  };

  const removeSubmission = async (submission: ModuStartupSubmission) => {
    const label = submission.input.teamName || submission.input.ideaTitle || "선택한 제출물";
    if (!window.confirm(`${label} 모두의창업 제출물을 삭제할까요?\n삭제 후에는 목록에서 바로 사라집니다.`)) return;

    const adminPassword = readSessionValue(ADMIN_PASSWORD_KEY);
    if (fallbackMode) {
      setSubmissions(deleteModuStartupSubmission(submission.id));
      return;
    }

    const response = await fetch(`/api/modu-startup-submissions/${submission.id}/delete`, {
      method: "POST",
      headers: { "x-admin-password": adminPassword }
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };

    if (!response.ok || !data.ok) {
      alert(data.error || "삭제에 실패했습니다.");
      return;
    }

    setSubmissions((current) => current.filter((item) => item.id !== submission.id));
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredSubmissions = useMemo(
    () =>
      normalizedQuery
        ? submissions.filter((submission) =>
            [
              submission.input.programName,
              submission.input.teamName,
              submission.input.participantName,
              submission.input.ideaTitle,
              submission.input.ideaOneLine,
              submission.input.category,
              submission.draft.policyKeywords.join(" ")
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery)
          )
        : submissions,
    [normalizedQuery, submissions]
  );

  const metrics = {
    total: submissions.length,
    withEvidence: submissions.filter((submission) => submission.draft.evidenceLines.length >= 2).length,
    withVideo: submissions.filter((submission) => submission.input.videoUrl.trim()).length,
    withPolicy: submissions.filter((submission) => submission.draft.policyKeywords.length >= 2).length
  };

  if (!authorized) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
        <main className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">관리자</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">모두의창업 제출 목록 로그인</h1>
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
          <Link className="mt-4 inline-block text-sm font-semibold text-gray-700 underline" href="/admin">
            린캔버스 관리자 목록
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">관리자 · 모두의창업</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">모두의창업 제출 목록</h1>
          <p className="mt-1 text-sm text-gray-600">신청서 초안, 증거 문장, 정책 키워드, 영상 제출 여부를 빠르게 확인합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold disabled:bg-gray-100"
            disabled={refreshing}
            onClick={() => refreshList()}
            type="button"
          >
            {refreshing ? "새로고침 중..." : "목록 새로고침"}
          </button>
          <Link className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" href="/admin">
            린캔버스 목록
          </Link>
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={logout} type="button">
            로그아웃
          </button>
        </div>
      </header>

      <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">전체 제출</p>
          <p className="mt-1 text-2xl font-bold text-gray-950">{metrics.total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">증거 2개 이상</p>
          <p className="mt-1 text-2xl font-bold text-gray-950">{metrics.withEvidence}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">영상 링크 있음</p>
          <p className="mt-1 text-2xl font-bold text-gray-950">{metrics.withVideo}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-semibold text-blue-700">정책키워드 2개 이상</p>
          <p className="mt-1 text-2xl font-bold text-blue-800">{metrics.withPolicy}</p>
        </div>
      </section>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          placeholder="교육명, 팀명, 참가자명, 아이디어, 분야, 키워드로 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          onClick={() => downloadCsv(filteredSubmissions)}
          type="button"
        >
          CSV 다운로드
        </button>
      </div>

      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</div> : null}

      <main className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {filteredSubmissions.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-600">
            <p className="font-semibold text-gray-800">표시할 모두의창업 제출물이 없습니다.</p>
            <p className="mt-2">참여자가 모두의창업 초안을 운영 시스템에 제출하면 이 목록에 표시됩니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3">제출일</th>
                  <th className="px-4 py-3">교육명</th>
                  <th className="px-4 py-3">팀/참가자</th>
                  <th className="px-4 py-3">아이디어</th>
                  <th className="px-4 py-3">분야</th>
                  <th className="px-4 py-3">증거</th>
                  <th className="px-4 py-3">정책키워드</th>
                  <th className="px-4 py-3">영상</th>
                  <th className="px-4 py-3">열람</th>
                  <th className="px-4 py-3">삭제</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((submission) => (
                  <tr key={submission.id} className="border-t border-gray-200">
                    <td className="px-4 py-3">{new Date(submission.createdAt).toLocaleString("ko-KR")}</td>
                    <td className="px-4 py-3">{submission.input.programName || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{submission.input.teamName || "-"}</span>
                      <br />
                      <span className="text-xs text-gray-500">{submission.input.participantName || "-"}</span>
                    </td>
                    <td className="px-4 py-3">{submission.input.ideaTitle || submission.input.ideaOneLine || "-"}</td>
                    <td className="px-4 py-3">{submission.input.category || "-"}</td>
                    <td className="px-4 py-3">{submission.draft.evidenceLines.length}개</td>
                    <td className="px-4 py-3">{submission.draft.policyKeywords.join(", ") || "-"}</td>
                    <td className="px-4 py-3">{submission.input.videoUrl ? "있음" : "없음"}</td>
                    <td className="px-4 py-3">
                      <Link className="font-semibold text-blue-700 underline" href={`/modu-startup/preview/${submission.id}`}>
                        미리보기
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="rounded-md border border-red-200 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
                        onClick={() => removeSubmission(submission)}
                        type="button"
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
