"use client";

import { useEffect, useState } from "react";
import type { LeanCanvasSubmission } from "@/lib/types";
import { deleteSubmission, loadSubmissions } from "@/lib/storage";

const ADMIN_SESSION_KEY = "lean-canvas-admin-authorized";

export default function AdminList() {
  const [submissions, setSubmissions] = useState<LeanCanvasSubmission[]>([]);
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.sessionStorage.getItem(ADMIN_SESSION_KEY) === "true") {
      setAuthorized(true);
      setSubmissions(loadSubmissions());
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
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
      setAuthorized(true);
      setSubmissions(loadSubmissions());
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAuthorized(false);
    setSubmissions([]);
  };

  const removeSubmission = (submission: LeanCanvasSubmission) => {
    const label = submission.participant.teamName || submission.participant.ideaName || "선택한 제출물";
    if (!window.confirm(`${label} 제출물을 삭제할까요?`)) return;
    setSubmissions(deleteSubmission(submission.id));
  };

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
          <a className="mt-4 inline-block text-sm font-semibold text-gray-700 underline" href="/">
            입력 화면으로 이동
          </a>
        </main>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-700">관리자</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">제출 목록</h1>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={logout}>
            로그아웃
          </button>
          <a className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" href="/">
            입력 화면
          </a>
        </div>
      </header>

      <main className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {submissions.length === 0 ? (
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
                  <th className="px-4 py-3">삭제</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id} className="border-t border-gray-200">
                    <td className="px-4 py-3">{new Date(submission.createdAt).toLocaleString("ko-KR")}</td>
                    <td className="px-4 py-3">{submission.participant.educationName || "-"}</td>
                    <td className="px-4 py-3 font-semibold">{submission.participant.teamName || "-"}</td>
                    <td className="px-4 py-3">{submission.participant.participantName || "-"}</td>
                    <td className="px-4 py-3">{submission.participant.ideaName || "-"}</td>
                    <td className="px-4 py-3">
                      <a className="font-semibold text-blue-700 underline" href={`/preview/${submission.id}`}>
                        미리보기
                      </a>
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
