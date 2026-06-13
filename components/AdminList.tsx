"use client";

import { useEffect, useState } from "react";
import type { LeanCanvasSubmission } from "@/lib/types";
import { loadSubmissions } from "@/lib/storage";

export default function AdminList() {
  const [submissions, setSubmissions] = useState<LeanCanvasSubmission[]>([]);

  useEffect(() => {
    setSubmissions(loadSubmissions());
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-700">관리자</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">제출 목록</h1>
        </div>
        <a className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" href="/">
          입력 화면
        </a>
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
