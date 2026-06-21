"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ModuStartupSubmission, PdfStatus } from "@/lib/types";
import { deleteModuStartupSubmission, loadModuStartupSubmissions } from "@/lib/storage";

type ModuReviewFilter = "all" | "needsEvidence" | "needsPolicy" | "noVideo";

const REVIEW_FILTER_LABELS: Record<ModuReviewFilter, string> = {
  all: "전체",
  needsEvidence: "증거 보완",
  needsPolicy: "키워드 보완",
  noVideo: "영상 없음"
};

function isModuReviewFilter(value: string | null): value is ModuReviewFilter {
  return Boolean(value && value in REVIEW_FILTER_LABELS);
}

function escapeCsv(value: unknown) {
  const text = value == null ? "" : String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

function getPdfStatus(submission: ModuStartupSubmission): PdfStatus {
  return submission.pdfStatus ?? "idle";
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

function getPdfStatusClassName(status: PdfStatus) {
  const base = "inline-flex rounded-full px-2.5 py-1 text-xs font-bold";
  if (status === "success") return `${base} bg-green-50 text-green-700 ring-1 ring-green-200`;
  if (status === "failed") return `${base} bg-red-50 text-red-700 ring-1 ring-red-200`;
  if (status === "generating") return `${base} bg-amber-50 text-amber-800 ring-1 ring-amber-200`;
  return `${base} bg-gray-100 text-gray-700 ring-1 ring-gray-200`;
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
    "PDF상태",
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
    formatPdfStatus(getPdfStatus(submission)),
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

async function loadServerSubmissions() {
  const response = await fetch("/api/modu-startup-submissions", {
    credentials: "same-origin"
  });
  const data = (await response.json()) as {
    submissions?: ModuStartupSubmission[];
    code?: string;
    error?: string;
  };

  if (response.status === 401) {
    return { submissions: [], fallback: false, unauthorized: true };
  }

  if (response.status === 503 && (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY")) {
    return { submissions: loadModuStartupSubmissions(), fallback: true, unauthorized: false };
  }

  if (!response.ok || !data.submissions) {
    throw new Error(data.error || "모두의창업 제출 목록을 불러오지 못했습니다.");
  }

  return { submissions: data.submissions, fallback: false, unauthorized: false };
}

export default function ModuStartupAdminList({ embedded = false }: { embedded?: boolean }) {
  const [submissions, setSubmissions] = useState<ModuStartupSubmission[]>([]);
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(embedded);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [query, setQuery] = useState("");
  const [reviewFilter, setReviewFilter] = useState<ModuReviewFilter>("all");
  const [urlReady, setUrlReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ModuStartupSubmission | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refreshList(options: { silentUnauthorized?: boolean } = {}) {
    setRefreshing(true);
    setError("");
    setNotice("");
    try {
      const result = await loadServerSubmissions();
      if (result.unauthorized) {
        setAuthorized(false);
        setSubmissions([]);
        if (!options.silentUnauthorized) {
          setError("관리자 로그인이 필요합니다.");
        }
        return;
      }
      setSubmissions(result.submissions);
      setFallbackMode(result.fallback);
      setAuthorized(true);
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
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get(embedded ? "moduQ" : "q") || "";
    const urlFilter = params.get(embedded ? "moduReviewFilter" : "reviewFilter");
    const hasAdminError = params.get("adminError") === "1";

    if (urlQuery) setQuery(urlQuery);
    if (isModuReviewFilter(urlFilter)) setReviewFilter(urlFilter);
    setUrlReady(true);

    void refreshList({ silentUnauthorized: true }).finally(() => {
      if (hasAdminError) setError("암호가 올바르지 않습니다.");
    });
  }, [embedded]);

  useEffect(() => {
    if (!urlReady) return;

    const params = new URLSearchParams(window.location.search);
    const trimmedQuery = query.trim();
    const queryKey = embedded ? "moduQ" : "q";
    const filterKey = embedded ? "moduReviewFilter" : "reviewFilter";
    params.delete("adminError");

    if (trimmedQuery) {
      params.set(queryKey, trimmedQuery);
    } else {
      params.delete(queryKey);
    }

    if (reviewFilter !== "all") {
      params.set(filterKey, reviewFilter);
    } else {
      params.delete(filterKey);
    }

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [embedded, query, reviewFilter, urlReady]);

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password })
      });
      const data = (await response.json()) as { ok?: boolean };
      if (!response.ok || !data.ok) {
        throw new Error("암호가 올바르지 않습니다.");
      }
      setAuthorized(true);
      await refreshList();
      setPassword("");
      const params = new URLSearchParams(window.location.search);
      params.delete("adminError");
      const nextSearch = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const logout = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    await fetch("/api/admin-logout", { method: "POST", credentials: "same-origin" }).catch(() => null);
    setAuthorized(false);
    setSubmissions([]);
  };

  const removeSubmission = async (submission: ModuStartupSubmission) => {
    setPendingDelete(submission);
  };

  const confirmRemoveSubmission = async () => {
    if (!pendingDelete || deleting) return;
    const submission = pendingDelete;
    setDeleting(true);
    setError("");

    try {
      if (fallbackMode) {
        setSubmissions(deleteModuStartupSubmission(submission.id));
        setPendingDelete(null);
        setNotice("데모 모드 제출물을 이 브라우저에서 삭제했습니다.");
        return;
      }

      const response = await fetch(`/api/modu-startup-submissions/${submission.id}/delete`, {
        method: "POST",
        credentials: "same-origin"
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) throw new Error(data.error || "삭제에 실패했습니다.");

      setSubmissions((current) => current.filter((item) => item.id !== submission.id));
      setPendingDelete(null);
      setNotice("모두의창업 제출물을 삭제했습니다.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const searchedSubmissions = useMemo(
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
    withPolicy: submissions.filter((submission) => submission.draft.policyKeywords.length >= 2).length,
    needsEvidence: submissions.filter((submission) => submission.draft.evidenceLines.length < 2).length,
    needsPolicy: submissions.filter((submission) => submission.draft.policyKeywords.length < 2).length,
    noVideo: submissions.filter((submission) => !submission.input.videoUrl.trim()).length
  };
  const filterCounts: Record<ModuReviewFilter, number> = {
    all: searchedSubmissions.length,
    needsEvidence: searchedSubmissions.filter((submission) => submission.draft.evidenceLines.length < 2).length,
    needsPolicy: searchedSubmissions.filter((submission) => submission.draft.policyKeywords.length < 2).length,
    noVideo: searchedSubmissions.filter((submission) => !submission.input.videoUrl.trim()).length
  };
  const filteredSubmissions = useMemo(() => {
    switch (reviewFilter) {
      case "needsEvidence":
        return searchedSubmissions.filter((submission) => submission.draft.evidenceLines.length < 2);
      case "needsPolicy":
        return searchedSubmissions.filter((submission) => submission.draft.policyKeywords.length < 2);
      case "noVideo":
        return searchedSubmissions.filter((submission) => !submission.input.videoUrl.trim());
      case "all":
      default:
        return searchedSubmissions;
    }
  }, [reviewFilter, searchedSubmissions]);
  const hasActiveListFilter = Boolean(normalizedQuery) || reviewFilter !== "all";
  const reviewFocus =
    metrics.needsEvidence > 0
      ? {
          title: `증거 문장 보완이 필요한 제출 ${metrics.needsEvidence}건`,
          description: "숫자, 출처, 베타 유저, 매출 등 객관 증거가 부족한 팀을 먼저 확인하세요.",
          tone: "amber"
        }
      : metrics.needsPolicy > 0
        ? {
            title: `정책 키워드 보완이 필요한 제출 ${metrics.needsPolicy}건`,
            description: "AI, 로컬, ESG, 글로벌, DX 중 아이디어와 자연스러운 키워드 2~3개가 있는지 확인하세요.",
            tone: "blue"
          }
        : {
            title: "모두의창업 제출 품질이 안정적입니다",
            description: "증거 문장과 정책 키워드가 기본 기준을 충족하고 있습니다.",
            tone: "green"
          };

  if (!authorized) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
        <main className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">관리자</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">모두의창업 제출 목록 로그인</h1>
          <form action="/api/admin-login" className="mt-6 space-y-4" method="post" onSubmit={login}>
            <input name="nextPath" type="hidden" value="/internal?tab=moduStartup" />
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">암호</span>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                name="password"
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
    <div className={embedded ? "grid gap-4" : "mx-auto max-w-6xl px-5 py-8"}>
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
          <Link className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" href="/internal?tab=submissions">
            린캔버스 목록
          </Link>
          {!embedded ? (
            <form action="/api/admin-logout" method="post" onSubmit={logout}>
              <input name="nextPath" type="hidden" value="/internal?tab=moduStartup" />
              <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" type="submit">
                로그아웃
              </button>
            </form>
          ) : null}
        </div>
      </header>

      <section
        className={`mb-4 rounded-lg border p-4 shadow-sm ${
          reviewFocus.tone === "amber"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : reviewFocus.tone === "blue"
              ? "border-blue-200 bg-blue-50 text-blue-900"
              : "border-green-200 bg-green-50 text-green-900"
        }`}
      >
        <p className="text-sm font-bold">{reviewFocus.title}</p>
        <p className="mt-1 text-sm leading-6">{reviewFocus.description}</p>
      </section>

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
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(REVIEW_FILTER_LABELS) as ModuReviewFilter[]).map((item) => (
          <button
            key={item}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
              reviewFilter === item
                ? "border-blue-700 bg-blue-700 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setReviewFilter(item)}
            type="button"
          >
            {REVIEW_FILTER_LABELS[item]} {filterCounts[item]}
          </button>
        ))}
      </div>

      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</div> : null}

      <main className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {filteredSubmissions.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-600">
            <p className="font-semibold text-gray-800">
              {hasActiveListFilter ? "현재 조건에 맞는 모두의창업 제출물이 없습니다." : "표시할 모두의창업 제출물이 없습니다."}
            </p>
            <p className="mt-2">
              {hasActiveListFilter
                ? "검색어 또는 검토 필터를 초기화하면 전체 제출 목록을 다시 볼 수 있습니다."
                : "참여자가 모두의창업 초안을 운영 시스템에 제출하면 이 목록에 표시됩니다."}
            </p>
            {hasActiveListFilter ? (
              <button
                className="mt-4 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setQuery("");
                  setReviewFilter("all");
                }}
                type="button"
              >
                검색/필터 초기화
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
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
                  <th className="px-4 py-3">PDF상태</th>
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
                      <span className={getPdfStatusClassName(getPdfStatus(submission))}>{formatPdfStatus(getPdfStatus(submission))}</span>
                    </td>
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
      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center" role="presentation">
          <section
            aria-labelledby="modu-delete-title"
            aria-modal="true"
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
            role="dialog"
          >
            <p className="text-sm font-bold text-red-700">삭제 후 복구할 수 없습니다</p>
            <h2 className="mt-1 text-xl font-bold text-gray-950" id="modu-delete-title">
              모두의창업 제출물을 삭제할까요?
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              {pendingDelete.input.teamName || pendingDelete.input.participantName || pendingDelete.input.ideaTitle || "선택한 제출물"}의
              신청서 초안과 PDF 상태가 운영 목록에서 삭제됩니다.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
                type="button"
              >
                취소
              </button>
              <button
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:bg-gray-400"
                disabled={deleting}
                onClick={confirmRemoveSubmission}
                type="button"
              >
                {deleting ? "삭제 중..." : "제출물 삭제"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
