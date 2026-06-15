"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ModuStartupSubmission } from "@/lib/types";
import { getModuStartupSubmission } from "@/lib/storage";

const sections = [
  ["첫 문장 훅", "openingHook"],
  ["Q1. 한 줄 소개", "q1IdeaIntro"],
  ["Q2. 배경 이야기", "q2BackgroundStory"],
  ["Q3. 고객과 문제", "q3CustomerProblem"],
  ["Q4. 실행 계획", "q4ExecutionPlan"],
  ["Q5. 분야 선택 이유", "q5CategoryReason"],
  ["Q6. 창업 여부 확인", "q6BusinessStatusCheck"],
  ["Q7. 팀 소개", "q7TeamIntro"],
  ["Q8. 영상 제출 구성", "q8VideoPitch"],
  ["핵심 페르소나", "personaDefinition"],
  ["차별점 1개", "differentiationFocus"],
  ["사회적 임팩트 마무리", "socialImpactEnding"],
  ["보완 코멘트", "mentorComment"]
] as const;

const arraySections = [
  ["증거 한 줄", "evidenceLines"],
  ["정책 키워드", "policyKeywords"],
  ["최종 제출 전 체크리스트", "finalChecklist"]
] as const;

function formatSubmission(submission: ModuStartupSubmission) {
  const { input, draft } = submission;
  return [
    `[모두의창업 제출물] ${input.ideaTitle || input.ideaOneLine || "아이디어"}`,
    `제출번호: ${submission.id}`,
    `제출일: ${new Date(submission.createdAt).toLocaleString("ko-KR")}`,
    `프로그램: ${input.programName || "-"}`,
    `팀명: ${input.teamName || "-"}`,
    `작성자: ${input.participantName || "-"}`,
    "",
    ...sections.flatMap(([label, key]) => [label, draft[key], ""]),
    ...arraySections.flatMap(([label, key]) => [label, draft[key].map((item) => `- ${item}`).join("\n"), ""])
  ].join("\n");
}

export default function ModuStartupPreview({ id }: { id: string }) {
  const [submission, setSubmission] = useState<ModuStartupSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const text = useMemo(() => (submission ? formatSubmission(submission) : ""), [submission]);

  useEffect(() => {
    let cancelled = false;

    async function loadSubmission() {
      const local = getModuStartupSubmission(id);
      if (local) {
        setSubmission(local);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/modu-startup-submissions/${id}`);
        const data = (await response.json()) as {
          submission?: ModuStartupSubmission;
          error?: string;
        };

        if (!response.ok || !data.submission) {
          throw new Error(data.error || "모두의창업 제출물을 찾을 수 없습니다.");
        }

        if (!cancelled) setSubmission(data.submission);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "제출물 조회 중 오류가 발생했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSubmission();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const copyText = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl px-5 py-10 text-sm text-gray-600">모두의창업 제출물을 불러오는 중입니다...</div>;
  }

  if (error || !submission) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10">
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="text-xl font-bold">제출물을 열 수 없습니다.</h1>
          <p className="mt-2 text-sm">{error || "제출물이 없습니다."}</p>
          <Link className="mt-4 inline-flex rounded-md bg-white px-4 py-2 text-sm font-bold text-red-700" href="/admin/modu-startup">
            목록으로
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <section className="no-print mb-5 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">모두의창업 제출물</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">{submission.input.ideaTitle || submission.input.ideaOneLine || "아이디어"}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {submission.input.teamName || "-"} · {submission.input.participantName || "-"} ·{" "}
            {new Date(submission.createdAt).toLocaleString("ko-KR")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={copyText} type="button">
            전체 복사
          </button>
          <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white" onClick={() => window.print()} type="button">
            바로 인쇄
          </button>
          <Link className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" href="/admin/modu-startup">
            관리자 목록
          </Link>
        </div>
      </section>

      <article className="print-page rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <header className="print-header border-b border-gray-200 pb-4">
          <p className="text-sm font-semibold text-blue-700">{submission.input.programName || "프로그램명 없음"}</p>
          <h2 className="mt-1 text-3xl font-bold text-gray-950">{submission.input.ideaTitle || submission.input.ideaOneLine || "아이디어"}</h2>
          <p className="mt-2 text-sm text-gray-600">
            팀 {submission.input.teamName || "-"} · 작성자 {submission.input.participantName || "-"} · 제출번호{" "}
            {submission.id.slice(0, 8).toUpperCase()}
          </p>
        </header>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {sections.map(([label, key]) => (
            <section key={key} className="print-avoid-break rounded-md border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-950">{label}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{submission.draft[key]}</p>
            </section>
          ))}
          {arraySections.map(([label, key]) => (
            <section key={key} className="print-avoid-break rounded-md border border-gray-200 p-4">
              <h3 className="text-sm font-bold text-gray-950">{label}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-gray-700">
                {submission.draft[key].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
