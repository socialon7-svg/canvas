"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ModuStartupDraft, ModuStartupInput, ModuStartupSubmission } from "@/lib/types";
import {
  clearModuStartupPrefill,
  loadModuStartupPrefill,
  saveModuStartupSubmission
} from "@/lib/storage";
import { recordModuStartupSubmission } from "@/lib/operationsStorage";

const initialInput: ModuStartupInput = {
  programName: "",
  teamName: "",
  participantName: "",
  ideaTitle: "",
  ideaOneLine: "",
  backgroundStory: "",
  customerProblem: "",
  executionPlan: "",
  category: "",
  businessStatus: "현재 사업자 아님",
  teamMembers: "",
  videoUrl: ""
};

type DraftTextKey = Exclude<keyof ModuStartupDraft, "evidenceLines" | "policyKeywords" | "finalChecklist">;
type DraftArrayKey = "evidenceLines" | "policyKeywords" | "finalChecklist";

const categoryOptions = ["AI", "로컬", "ESG", "글로벌", "DX", "소상공인", "교육", "기타"];

const businessStatusOptions = [
  "현재 사업자 아님",
  "현재 사업자",
  "예비창업패키지/정부지원사업 수행 중",
  "확인 필요"
];

const draftTextFields: Array<{ key: DraftTextKey; label: string; help: string; rows: number }> = [
  {
    key: "openingHook",
    label: "첫 문장 훅",
    help: "심사위원이 바로 다음 문장을 읽고 싶게 만드는 첫 문장입니다.",
    rows: 2
  },
  {
    key: "q1IdeaIntro",
    label: "Q1. 한 줄 소개",
    help: "무엇을, 누구를 위해, 어떻게 하는지 한 줄로 정리합니다.",
    rows: 2
  },
  {
    key: "q2BackgroundStory",
    label: "Q2. 배경 이야기",
    help: "직접 겪었거나 관찰한 장면 중심으로 작성합니다.",
    rows: 4
  },
  {
    key: "q3CustomerProblem",
    label: "Q3. 고객과 문제",
    help: "고객군을 좁히고 문제를 숫자와 상황으로 설명합니다.",
    rows: 4
  },
  {
    key: "q4ExecutionPlan",
    label: "Q4. 실행 계획",
    help: "베타 유저, 매출, MOU, 특허, 수상 등 증거로 보강합니다.",
    rows: 4
  },
  {
    key: "q5CategoryReason",
    label: "Q5. 분야 선택 이유",
    help: "분야와 정책 키워드가 아이디어와 자연스럽게 이어지게 합니다.",
    rows: 3
  },
  {
    key: "q6BusinessStatusCheck",
    label: "Q6. 창업 여부 확인",
    help: "중복 지원 위험과 현재 사업자 여부를 점검합니다.",
    rows: 3
  },
  {
    key: "q7TeamIntro",
    label: "Q7. 팀 소개",
    help: "팀원의 역할과 실행 역량을 짧게 정리합니다.",
    rows: 3
  },
  {
    key: "q8VideoPitch",
    label: "Q8. 영상 제출 구성",
    help: "60초 영상에 담을 순서와 핵심 메시지를 제안합니다.",
    rows: 3
  },
  {
    key: "personaDefinition",
    label: "핵심 페르소나",
    help: "한 명의 명확한 고객처럼 좁혀 적습니다.",
    rows: 2
  },
  {
    key: "differentiationFocus",
    label: "차별점 1개",
    help: "여러 장점보다 가장 강한 차별점 하나에 집중합니다.",
    rows: 2
  },
  {
    key: "socialImpactEnding",
    label: "사회적 임팩트 마무리",
    help: "개인 성공보다 고객, 지역, 사회 변화로 마무리합니다.",
    rows: 2
  },
  {
    key: "mentorComment",
    label: "보완 코멘트",
    help: "최종 제출 전 우선 보완할 점입니다.",
    rows: 3
  }
];

const draftArrayFields: Array<{ key: DraftArrayKey; label: string; help: string; rows: number }> = [
  {
    key: "evidenceLines",
    label: "증거 한 줄",
    help: "숫자, 출처, 베타 유저, 매출, MOU 같은 객관 증거를 줄 단위로 정리합니다.",
    rows: 5
  },
  {
    key: "policyKeywords",
    label: "정책 키워드",
    help: "AI, 로컬, ESG, 글로벌, DX 중 어울리는 2~3개만 남깁니다.",
    rows: 3
  },
  {
    key: "finalChecklist",
    label: "최종 제출 전 체크리스트",
    help: "24시간 묵힌 뒤 다시 확인할 항목입니다.",
    rows: 6
  }
];

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDraft(input: ModuStartupInput, draft: ModuStartupDraft) {
  const lines = [
    `[모두의창업 초안] ${input.ideaTitle || input.ideaOneLine || "아이디어"}`,
    "",
    `프로그램: ${input.programName || "-"}`,
    `팀명: ${input.teamName || "-"}`,
    `작성자: ${input.participantName || "-"}`,
    "",
    `첫 문장 훅: ${draft.openingHook}`,
    "",
    `Q1. 한 줄 소개\n${draft.q1IdeaIntro}`,
    "",
    `Q2. 배경 이야기\n${draft.q2BackgroundStory}`,
    "",
    `Q3. 고객과 문제\n${draft.q3CustomerProblem}`,
    "",
    `Q4. 실행 계획\n${draft.q4ExecutionPlan}`,
    "",
    `Q5. 분야 선택 이유\n${draft.q5CategoryReason}`,
    "",
    `Q6. 창업 여부 확인\n${draft.q6BusinessStatusCheck}`,
    "",
    `Q7. 팀 소개\n${draft.q7TeamIntro}`,
    "",
    `Q8. 영상 제출 구성\n${draft.q8VideoPitch}`,
    "",
    `핵심 페르소나\n${draft.personaDefinition}`,
    "",
    `차별점 1개\n${draft.differentiationFocus}`,
    "",
    `증거 한 줄\n${draft.evidenceLines.map((item) => `- ${item}`).join("\n")}`,
    "",
    `정책 키워드\n${draft.policyKeywords.map((item) => `- ${item}`).join("\n")}`,
    "",
    `사회적 임팩트 마무리\n${draft.socialImpactEnding}`,
    "",
    `최종 제출 전 체크리스트\n${draft.finalChecklist.map((item) => `- ${item}`).join("\n")}`,
    "",
    `보완 코멘트\n${draft.mentorComment}`
  ];

  return lines.join("\n");
}

export default function ModuStartupGenerator() {
  const [input, setInput] = useState<ModuStartupInput>(initialInput);
  const [draft, setDraft] = useState<ModuStartupDraft | null>(null);
  const [submittedSubmission, setSubmittedSubmission] = useState<ModuStartupSubmission | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const printableText = useMemo(() => (draft ? formatDraft(input, draft) : ""), [draft, input]);

  useEffect(() => {
    const prefill = loadModuStartupPrefill();
    if (!prefill) return;
    setInput((current) => ({ ...current, ...prefill }));
  }, []);

  const updateInput = <K extends keyof ModuStartupInput>(key: K, value: ModuStartupInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const updateDraftText = (key: DraftTextKey, value: string) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const updateDraftArray = (key: DraftArrayKey, value: string) => {
    setDraft((current) => (current ? { ...current, [key]: splitLines(value) } : current));
  };

  const generateDraft = async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/generate-modu-startup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const data = (await response.json()) as { draft?: ModuStartupDraft; error?: string };

      if (!response.ok || !data.draft) {
        throw new Error(data.error || "초안 생성에 실패했습니다.");
      }

      setDraft(data.draft);
      setSubmittedSubmission(null);
      setNotice("초안이 생성되었습니다. 그대로 쓰기보다 현장 경험과 실제 숫자를 한 번 더 확인하세요.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "초안 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const copyDraft = async () => {
    if (!printableText) return;

    try {
      await navigator.clipboard.writeText(printableText);
      setNotice("초안을 클립보드에 복사했습니다.");
    } catch {
      setError("브라우저 권한 때문에 복사하지 못했습니다. 아래 내용을 직접 선택해 복사해주세요.");
    }
  };

  const submitDraft = async () => {
    if (!draft) return;
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/modu-startup-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, draft })
      });
      const data = (await response.json()) as {
        submission?: ModuStartupSubmission;
        code?: string;
        error?: string;
      };

      if (response.status === 503 && (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY")) {
        const fallbackSubmission = saveModuStartupSubmission(input, draft);
        recordModuStartupSubmission(input, fallbackSubmission.id);
        clearModuStartupPrefill();
        setSubmittedSubmission(fallbackSubmission);
        setNotice("중앙 저장소가 아직 준비되지 않아 이 브라우저에 임시 제출 저장했습니다.");
        return;
      }

      if (!response.ok || !data.submission) {
        throw new Error(data.error || "모두의창업 제출 저장에 실패했습니다.");
      }

      recordModuStartupSubmission(input, data.submission.id);
      clearModuStartupPrefill();
      setSubmittedSubmission(data.submission);
      setNotice("모두의창업 초안이 운영 시스템에 제출되었습니다.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "모두의창업 제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setInput(initialInput);
    setDraft(null);
    setSubmittedSubmission(null);
    setError("");
    setNotice("");
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <section className="no-print mb-6 rounded-lg border border-blue-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">AI 작성 도구</p>
            <h1 className="mt-1 text-3xl font-bold text-gray-950">모두의창업 초안 생성</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              첨부한 합격 노하우를 기준으로 Q1~Q8 신청서 초안, 증거 문장, 정책 키워드, 최종 체크리스트를 자동 생성합니다.
              API 호출은 서버 라우트에서 처리되어 키가 브라우저에 노출되지 않습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700" href="/">
              홈으로
            </Link>
            <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700" onClick={resetAll} type="button">
              새로 작성
            </button>
          </div>
        </div>
      </section>

      {notice ? (
        <p className="no-print mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="no-print mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      {submittedSubmission ? (
        <section className="no-print mb-5 rounded-lg border border-green-200 bg-green-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-green-700">제출 완료</p>
              <h2 className="mt-1 text-xl font-bold text-gray-950">
                모두의창업 초안이 운영 시스템에 접수되었습니다.
              </h2>
              <p className="mt-2 text-sm leading-6 text-green-900">
                제출번호 {submittedSubmission.id.slice(0, 8).toUpperCase()} ·{" "}
                {new Date(submittedSubmission.createdAt).toLocaleString("ko-KR")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="rounded-md bg-green-700 px-4 py-2 text-sm font-bold text-white"
                href={`/modu-startup/preview/${submittedSubmission.id}`}
              >
                제출물 열람
              </Link>
              <Link className="rounded-md border border-green-300 px-4 py-2 text-sm font-semibold text-green-800" href="/participant">
                참여자 포털
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
        <section className="no-print rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">입력 정보</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            내용이 부족해도 생성은 가능하지만, 숫자 2개 이상과 직접 경험 한 문장을 넣으면 결과가 좋아집니다.
          </p>

          {input.operation?.participantCode ? (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              <p className="font-bold">운영 시스템 연동됨</p>
              <p className="mt-1">
                참가자 코드 {input.operation.participantCode} · {input.operation.teamName || input.teamName || "팀 미배정"}
                으로 제출 현황이 기록됩니다.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              참여자 포털에서 입장하면 교육명, 팀명, 참가자명이 자동 연동됩니다. 지금 화면에서도 직접 작성과 제출은 가능합니다.
            </div>
          )}

          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-800">교육명</span>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={input.programName}
                  onChange={(event) => updateInput("programName", event.target.value)}
                  placeholder="예: 모두의창업 캠프"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-800">팀명</span>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={input.teamName}
                  onChange={(event) => updateInput("teamName", event.target.value)}
                  placeholder="예: 하이팀"
                />
              </label>
            </div>

            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">참가자명</span>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                value={input.participantName}
                onChange={(event) => updateInput("participantName", event.target.value)}
                placeholder="예: 김하이"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">아이디어명</span>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                value={input.ideaTitle}
                onChange={(event) => updateInput("ideaTitle", event.target.value)}
                placeholder="예: 1인 브런치 카페 운영 도우미"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">Q1. 한 줄 소개</span>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                maxLength={120}
                value={input.ideaOneLine}
                onChange={(event) => updateInput("ideaOneLine", event.target.value)}
                placeholder="무엇을, 누구를 위해, 어떻게"
              />
              <span className="mt-1 block text-right text-xs text-gray-400">{input.ideaOneLine.length} / 120자</span>
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">Q2. 배경 이야기</span>
              <textarea
                className="min-h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                value={input.backgroundStory}
                onChange={(event) => updateInput("backgroundStory", event.target.value)}
                placeholder="직접 겪은 장면, 관찰한 순간, 왜 시작했는지"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">Q3. 고객과 문제</span>
              <textarea
                className="min-h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                value={input.customerProblem}
                onChange={(event) => updateInput("customerProblem", event.target.value)}
                placeholder="좁은 고객군, 해결하려는 문제, 현재 대안"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">Q4. 실행 계획과 증거</span>
              <textarea
                className="min-h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                value={input.executionPlan}
                onChange={(event) => updateInput("executionPlan", event.target.value)}
                placeholder="베타 유저, 인터뷰, 매출, MOU, 수상, 특허 등"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-800">Q5. 분야</span>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={input.category}
                  onChange={(event) => updateInput("category", event.target.value)}
                >
                  <option value="">분야 선택</option>
                  {categoryOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-gray-800">Q6. 창업 여부</span>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={input.businessStatus}
                  onChange={(event) => updateInput("businessStatus", event.target.value)}
                >
                  {businessStatusOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">Q7. 팀원</span>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                value={input.teamMembers}
                onChange={(event) => updateInput("teamMembers", event.target.value)}
                placeholder="예: 김하이-기획, 박뷰-개발"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">Q8. 영상 링크</span>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                value={input.videoUrl}
                onChange={(event) => updateInput("videoUrl", event.target.value)}
                placeholder="https://"
              />
            </label>

            <button
              className="w-full rounded-md bg-blue-700 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-400"
              disabled={loading}
              onClick={generateDraft}
              type="button"
            >
              {loading ? "AI 초안 생성 중..." : "AI 모두의창업 초안 생성"}
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="no-print flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700">생성 결과 수정</p>
              <h2 className="mt-1 text-xl font-bold text-gray-950">신청서 초안</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:text-gray-400"
                disabled={!draft}
                onClick={copyDraft}
                type="button"
              >
                전체 복사
              </button>
              <button
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:text-gray-400"
                disabled={!draft}
                onClick={() => window.print()}
                type="button"
              >
                바로 인쇄
              </button>
              <button
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                disabled={!draft || submitting}
                onClick={submitDraft}
                type="button"
              >
                {submitting ? "제출 중..." : submittedSubmission ? "다시 제출" : "운영 시스템에 제출"}
              </button>
            </div>
          </div>

          {!draft ? (
            <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-lg font-bold text-gray-900">아직 생성된 초안이 없습니다.</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                왼쪽 입력값을 작성한 뒤 AI 초안 생성 버튼을 누르세요. 결과는 모두 textarea로 수정할 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-800">{input.programName || "프로그램명 미입력"}</p>
                <h3 className="mt-1 text-2xl font-bold text-gray-950">{input.ideaTitle || input.ideaOneLine || "아이디어명 미입력"}</h3>
                <p className="mt-2 text-sm text-gray-700">
                  {input.teamName || "팀명 미입력"} · {input.participantName || "참가자명 미입력"} · {new Date().toLocaleDateString("ko-KR")}
                </p>
              </div>

              {draftTextFields.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-1 block text-sm font-bold text-gray-900">{field.label}</span>
                  <span className="mb-2 block text-xs text-gray-500">{field.help}</span>
                  <textarea
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    rows={field.rows}
                    value={draft[field.key]}
                    onChange={(event) => updateDraftText(field.key, event.target.value)}
                  />
                </label>
              ))}

              {draftArrayFields.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-1 block text-sm font-bold text-gray-900">{field.label}</span>
                  <span className="mb-2 block text-xs text-gray-500">{field.help}</span>
                  <textarea
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    rows={field.rows}
                    value={draft[field.key].join("\n")}
                    onChange={(event) => updateDraftArray(field.key, event.target.value)}
                  />
                </label>
              ))}

              <details className="no-print rounded-md border border-gray-200 bg-gray-50 p-4">
                <summary className="cursor-pointer text-sm font-bold text-gray-800">복사용 텍스트 미리보기</summary>
                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-white p-4 text-xs leading-5 text-gray-700">
                  {printableText}
                </pre>
              </details>
            </div>
          )}
        </section>
      </div>

      <section className="no-print mt-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">반영한 작성 원칙</h2>
        <div className="mt-3 grid gap-3 text-sm leading-6 text-gray-700 md:grid-cols-3">
          <p className="rounded-md bg-gray-50 p-3">첫 문장은 흥미를 만들고, Q1은 무엇을 누구에게 어떻게 제공하는지 선명하게 씁니다.</p>
          <p className="rounded-md bg-gray-50 p-3">Q2~Q4에는 직접 경험, 좁은 고객, 숫자 2개 이상, 객관 증거를 우선 배치합니다.</p>
          <p className="rounded-md bg-gray-50 p-3">마지막은 개인 성과보다 고객, 지역, 사회에 남길 변화로 마무리합니다.</p>
        </div>
      </section>
    </main>
  );
}
