"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LeanCanvasSubmission } from "@/lib/types";
import { deleteSubmission, loadSubmissions } from "@/lib/storage";

const ADMIN_SESSION_KEY = "lean-canvas-admin-authorized";
const ADMIN_PASSWORD_KEY = "lean-canvas-admin-password";

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
  const [fallbackMode, setFallbackMode] = useState(false);

  async function refreshList(adminPassword = window.sessionStorage.getItem(ADMIN_PASSWORD_KEY) || "") {
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
    const storedPassword = window.sessionStorage.getItem(ADMIN_PASSWORD_KEY) || "";
    if (window.sessionStorage.getItem(ADMIN_SESSION_KEY) === "true" && storedPassword) {
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
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
      window.sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
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
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    window.sessionStorage.removeItem(ADMIN_PASSWORD_KEY);
    setAuthorized(false);
    setSubmissions([]);
    setQuery("");
  };

  const removeSubmission = async (submission: LeanCanvasSubmission) => {
    const label = submission.participant.teamName || submission.participant.ideaName || "선택한 제출물";
    if (!window.confirm(`${label} 제출물을 삭제할까요?`)) return;
    const adminPassword = window.sessionStorage.getItem(ADMIN_PASSWORD_KEY) || "";

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
  const filteredSubmissions = normalizedQuery
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
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            <button
              className="w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:bg-gray-400"
              disabled={loading}
              type="submit"
            >
              {loading ? "확인 중..." : "로그인"}
            </button>
          </form>
          <Link className="mt-4 inline-block text-sm font-semibold text-gray-700 underline" href="/">
            입력 화면으로 이동
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-700">관리자</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">참가자 제출 목록</h1>
          <p className="mt-1 text-sm text-gray-600">총 {submissions.length}건 제출</p>
        </div>
        <div className="flex gap-2">
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
            입력 화면
          </Link>
        </div>
      </header>
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="교육명, 팀명, 참가자명, 아이디어명으로 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="self-center text-sm text-gray-600">표시 {filteredSubmissions.length}건</div>
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
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3">제출일</th>
                  <th className="px-4 py-3">교육명</th>
                  <th className="px-4 py-3">팀명</th>
                  <th className="px-4 py-3">참가자</th>
                  <th className="px-4 py-3">아이디어명</th>
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
