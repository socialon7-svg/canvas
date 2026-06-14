"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { emptyParticipantInput, type LeanCanvasDraft, type ParticipantInput } from "@/lib/types";
import { clearParticipantPrefill, loadParticipantPrefill, saveDraftSession } from "@/lib/storage";

type ParticipantTextFieldKey = Exclude<keyof ParticipantInput, "operation">;

const fields: Array<{ key: ParticipantTextFieldKey; label: string; placeholder: string; required?: boolean }> = [
  { key: "educationName", label: "교육명", placeholder: "예: 2026 청년 창업 부트캠프", required: true },
  { key: "teamName", label: "팀명", placeholder: "예: 팀 캔버스", required: true },
  { key: "participantName", label: "참가자명", placeholder: "예: 김민지", required: true },
  { key: "ideaName", label: "아이디어명", placeholder: "예: AI 린캔버스 도우미", required: true },
  { key: "ideaSummary", label: "아이디어 한 줄 설명", placeholder: "누구의 어떤 문제를 어떻게 해결하나요?" },
  { key: "targetCustomer", label: "대상 고객", placeholder: "예: 창업교육 참가자, 예비창업팀" },
  { key: "problemToSolve", label: "해결하고 싶은 문제", placeholder: "가장 아픈 문제를 적어주세요." },
  { key: "existingAlternative", label: "현재 대안", placeholder: "고객이 지금 쓰는 방법은 무엇인가요?" },
  { key: "ourSolution", label: "우리의 해결책", placeholder: "우리 서비스의 핵심 해결 방식을 적어주세요." },
  { key: "revenueModel", label: "수익모델", placeholder: "예: 기관 구독, 사용량 기반 과금" },
  { key: "differentiation", label: "차별점", placeholder: "경쟁 서비스와 다른 강점을 적어주세요." }
];

const validateInput = (input: ParticipantInput) => {
  const requiredFields: ParticipantTextFieldKey[] = ["educationName", "teamName", "participantName", "ideaName"];
  const missing = requiredFields.filter((key) => !input[key]?.trim());

  if (missing.length > 0) {
    return "교육명, 팀명, 참가자명, 아이디어명은 필수입니다.";
  }

  const ideaContext = [
    input.ideaSummary,
    input.targetCustomer,
    input.problemToSolve,
    input.ourSolution,
    input.revenueModel,
    input.differentiation
  ]
    .join(" ")
    .trim();

  if (!ideaContext) {
    return "아이디어 한 줄 설명, 고객, 문제, 해결책, 수익모델, 차별점 중 최소 1개는 작성해야 합니다.";
  }

  if (ideaContext.length < 15) {
    return "AI가 초안을 만들 수 있도록 아이디어 내용을 조금 더 구체적으로 작성해주세요.";
  }

  return "";
};

export default function InputForm() {
  const router = useRouter();
  const [input, setInput] = useState<ParticipantInput>(emptyParticipantInput);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prefill = loadParticipantPrefill();
    if (prefill) {
      setInput({ ...emptyParticipantInput, ...prefill });
    }
  }, []);

  const updateValue = (key: ParticipantTextFieldKey, value: string) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const generate = async () => {
    setError("");
    const validationError = validateInput(input);

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const data = (await response.json()) as { canvas?: LeanCanvasDraft; error?: string };
      if (!response.ok || !data.canvas) {
        throw new Error(data.error || "AI 초안 생성에 실패했습니다.");
      }
      saveDraftSession({ participant: input, canvas: data.canvas });
      clearParticipantPrefill();
      router.push("/editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 응답을 처리하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">창업교육 MVP</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950">AI 린캔버스 작성 및 PDF 제출</h1>
          <p className="mt-2 text-sm text-gray-600">
            창업 아이디어를 입력하면 AI가 린캔버스 초안을 만들고, 수정 후 PDF로 제출할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-semibold text-gray-700">
          <Link className="underline" href="/participant">
            참여자 포털
          </Link>
          <Link className="underline" href="/internal">
            내부직원 포털
          </Link>
          <Link className="underline" href="/admin">
            제출 목록
          </Link>
        </div>
      </header>

      {input.operation?.participantCode ? (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          참여자 포털에서 불러온 정보입니다. 참여자 코드{" "}
          <span className="font-bold">{input.operation.participantCode}</span>, 프로그램 코드{" "}
          <span className="font-bold">{input.operation.programCode}</span>
        </div>
      ) : null}

      <main className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field.key} className={field.key === "ideaSummary" ? "md:col-span-2" : ""}>
              <span className="mb-1 block text-sm font-semibold text-gray-800">
                {field.label} {field.required ? <span className="text-red-600">*</span> : null}
              </span>
              {field.key === "ideaSummary" ||
              field.key === "problemToSolve" ||
              field.key === "ourSolution" ||
              field.key === "differentiation" ? (
                <textarea
                  className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder={field.placeholder}
                  value={input[field.key]}
                  onChange={(event) => updateValue(field.key, event.target.value)}
                />
              ) : (
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder={field.placeholder}
                  value={input[field.key]}
                  onChange={(event) => updateValue(field.key, event.target.value)}
                />
              )}
            </label>
          ))}
        </div>

        {error ? (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <div className="mt-1">입력값을 보완하거나 API 설정을 확인한 뒤 다시 생성하세요.</div>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            className="rounded-md bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
            type="button"
            disabled={loading}
            onClick={generate}
          >
            {loading ? "AI 초안 생성 중... 잠시만 기다려주세요" : "AI 초안 생성하기"}
          </button>
        </div>
      </main>
    </div>
  );
}
