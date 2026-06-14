"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { emptyParticipantInput, type LeanCanvasDraft, type ParticipantInput } from "@/lib/types";
import {
  clearParticipantPrefill,
  loadDraftSession,
  loadParticipantPrefill,
  saveDraftSession
} from "@/lib/storage";

type ParticipantTextFieldKey = Exclude<keyof ParticipantInput, "operation">;

interface FieldConfig {
  key: ParticipantTextFieldKey;
  label: string;
  placeholder: string;
  helper: string;
  required?: boolean;
  multiline?: boolean;
  wide?: boolean;
}

const fields: FieldConfig[] = [
  {
    key: "educationName",
    label: "교육명",
    placeholder: "예: 2026 청년 창업 부트캠프",
    helper: "참여 중인 교육명 또는 프로그램명을 확인합니다.",
    required: true
  },
  {
    key: "teamName",
    label: "팀명",
    placeholder: "예: 팀 캔버스",
    helper: "결과물에 표시될 팀명을 입력합니다.",
    required: true
  },
  {
    key: "participantName",
    label: "참가자명",
    placeholder: "예: 김민지",
    helper: "대표 작성자 또는 제출자를 입력합니다.",
    required: true
  },
  {
    key: "ideaName",
    label: "아이디어명",
    placeholder: "예: AI 린캔버스 도우미",
    helper: "발표 자료에 그대로 쓸 수 있는 짧은 이름이 좋습니다.",
    required: true
  },
  {
    key: "ideaSummary",
    label: "아이디어 한 줄 설명",
    placeholder: "예: 창업교육생의 린캔버스 작성을 AI가 도와주는 서비스",
    helper: "누구의 어떤 문제를 어떤 방식으로 해결하는지 한 문장으로 적어주세요.",
    required: true,
    multiline: true,
    wide: true
  },
  {
    key: "targetCustomer",
    label: "대상 고객",
    placeholder: "예: 린캔버스를 처음 작성하는 예비창업팀",
    helper: "가장 먼저 돈을 내거나 적극적으로 사용할 고객을 구체적으로 적어주세요.",
    required: true,
    multiline: true
  },
  {
    key: "problemToSolve",
    label: "해결하고 싶은 문제",
    placeholder: "예: 각 항목에 무엇을 써야 할지 몰라 작성 시간이 오래 걸림",
    helper: "대상 고객이 겪는 가장 핵심적인 불편함이나 손실을 적어주세요.",
    required: true,
    multiline: true
  },
  {
    key: "existingAlternative",
    label: "현재 대안",
    placeholder: "예: 검색 자료, 멘토 피드백, 기존 양식 참고",
    helper: "고객이 지금 문제를 해결하기 위해 쓰는 방법을 적어주세요.",
    multiline: true
  },
  {
    key: "ourSolution",
    label: "우리의 해결책",
    placeholder: "예: 입력값을 기반으로 발표용 린캔버스 초안을 자동 생성",
    helper: "우리 제품이나 서비스가 문제를 해결하는 핵심 방식을 적어주세요.",
    required: true,
    multiline: true
  },
  {
    key: "revenueModel",
    label: "수익모델",
    placeholder: "예: 교육기관 월 구독, 캠프별 라이선스",
    helper: "누가, 왜, 어떤 방식으로 비용을 지불할지 적어주세요.",
    multiline: true
  },
  {
    key: "differentiation",
    label: "차별점",
    placeholder: "예: 교육 현장 양식에 맞춘 짧은 문장 자동 생성",
    helper: "기존 대안보다 더 낫거나 빠른 이유를 적어주세요.",
    multiline: true
  }
];

const fieldGroups: Array<{ title: string; keys: ParticipantTextFieldKey[] }> = [
  { title: "기본 정보", keys: ["educationName", "teamName", "participantName"] },
  { title: "아이디어 개요", keys: ["ideaName", "ideaSummary"] },
  {
    title: "비즈니스 모델",
    keys: ["targetCustomer", "problemToSolve", "existingAlternative", "ourSolution", "revenueModel", "differentiation"]
  }
];

const fieldByKey = Object.fromEntries(fields.map((field) => [field.key, field])) as Record<
  ParticipantTextFieldKey,
  FieldConfig
>;

const validateInput = (input: ParticipantInput) => {
  const fieldErrors: Partial<Record<ParticipantTextFieldKey, string>> = {};
  const requiredFields = fields.filter((field) => field.required).map((field) => field.key);

  requiredFields.forEach((key) => {
    if (!input[key]?.trim()) fieldErrors[key] = "필수 항목입니다.";
  });

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

  if (!Object.keys(fieldErrors).length && ideaContext.length < 30) {
    fieldErrors.ideaSummary = "AI가 초안을 만들 수 있도록 핵심 내용을 조금 더 구체적으로 작성해주세요.";
  }

  return fieldErrors;
};

export default function InputForm({ requireParticipantSession = false }: { requireParticipantSession?: boolean }) {
  const router = useRouter();
  const fieldRefs = useRef<Partial<Record<ParticipantTextFieldKey, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const [input, setInput] = useState<ParticipantInput>(emptyParticipantInput);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ParticipantTextFieldKey, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accessChecked, setAccessChecked] = useState(!requireParticipantSession);

  useEffect(() => {
    const prefill = loadParticipantPrefill();
    const draft = loadDraftSession();

    if (prefill) {
      setInput({ ...emptyParticipantInput, ...prefill });
      setAccessChecked(true);
      return;
    }

    if (requireParticipantSession && draft?.participant.operation?.participantCode) {
      setInput({ ...emptyParticipantInput, ...draft.participant });
      setAccessChecked(true);
      return;
    }

    if (requireParticipantSession) {
      router.replace("/participant");
      return;
    }

    setAccessChecked(true);
  }, [requireParticipantSession, router]);

  const updateValue = (key: ParticipantTextFieldKey, value: string) => {
    setInput((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const focusFirstError = (errors: Partial<Record<ParticipantTextFieldKey, string>>) => {
    const firstKey = fields.find((field) => errors[field.key])?.key;
    if (!firstKey) return;
    const node = fieldRefs.current[firstKey];
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
    node?.focus();
  };

  const generate = async () => {
    setError("");
    const nextFieldErrors = validateInput(input);

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("필수 항목을 확인해주세요.");
      focusFirstError(nextFieldErrors);
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

  const renderField = (field: FieldConfig) => {
    const hasError = Boolean(fieldErrors[field.key]);
    const fieldClassName = `w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
      hasError ? "border-red-500 bg-red-50/40" : "border-gray-300 bg-white"
    }`;

    return (
      <label key={field.key} className={field.wide ? "md:col-span-2" : ""}>
        <span className="mb-1 block text-sm font-semibold text-gray-800">
          {field.label} {field.required ? <span className="text-red-600">*</span> : null}
        </span>
        <span className="mb-2 block text-xs leading-5 text-gray-500">{field.helper}</span>
        {field.multiline ? (
          <textarea
            ref={(node) => {
              fieldRefs.current[field.key] = node;
            }}
            className={`min-h-24 resize-y ${fieldClassName}`}
            placeholder={field.placeholder}
            value={input[field.key]}
            onChange={(event) => updateValue(field.key, event.target.value)}
          />
        ) : (
          <input
            ref={(node) => {
              fieldRefs.current[field.key] = node;
            }}
            className={fieldClassName}
            placeholder={field.placeholder}
            value={input[field.key]}
            onChange={(event) => updateValue(field.key, event.target.value)}
          />
        )}
        {hasError ? <span className="mt-1 block text-xs font-semibold text-red-600">{fieldErrors[field.key]}</span> : null}
      </label>
    );
  };

  if (!accessChecked) {
    return <div className="mx-auto max-w-4xl px-5 py-10 text-sm text-gray-600">참여자 정보를 확인하는 중입니다...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">하이뷰랩 프로그램 과제</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950">린캔버스 과제 작성 및 PDF 제출</h1>
          <p className="mt-2 text-sm text-gray-600">
            창업 아이디어를 입력하면 AI가 린캔버스 초안을 만들고, 수정 후 프로그램 산출물로 제출할 수 있습니다.
          </p>
        </div>
        <Link className="text-sm font-semibold text-gray-700 underline" href="/participant">
          참여자 포털로 돌아가기
        </Link>
      </header>

      {input.operation?.participantCode ? (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          참여자 포털에서 불러온 정보입니다. 참여자 코드{" "}
          <span className="font-bold">{input.operation.participantCode}</span>, 프로그램 코드{" "}
          <span className="font-bold">{input.operation.programCode}</span>
        </div>
      ) : null}

      <main className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="space-y-6">
          {fieldGroups.map((group) => (
            <fieldset key={group.title} className="rounded-lg border border-gray-100 bg-gray-50/60 p-4">
              <legend className="px-2 text-sm font-bold text-gray-700">{group.title}</legend>
              <div className="grid gap-4 md:grid-cols-2">{group.keys.map((key) => renderField(fieldByKey[key]))}</div>
            </fieldset>
          ))}
        </div>

        {error ? (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <div className="mt-1">입력값을 보완하거나 API 설정을 확인한 뒤 다시 생성하세요.</div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col items-end gap-2">
          <button
            className="rounded-md bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-800 active:bg-blue-900 disabled:cursor-not-allowed disabled:bg-gray-400"
            type="button"
            disabled={loading}
            onClick={generate}
          >
            {loading ? "AI 초안 생성 중... 잠시만 기다려주세요" : "AI 초안 생성하기"}
          </button>
          <p className="text-xs text-gray-500">생성된 초안은 다음 단계에서 자유롭게 수정할 수 있습니다.</p>
        </div>
      </main>
    </div>
  );
}
