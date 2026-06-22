import type {
  HighViewParticipant,
  HighViewProgram,
  ModuStartupInput,
  ParticipantInput,
  StartupModule
} from "@/lib/types";

export const ONE_LINE_IDEA_MODULE_SLUG = "one-line-idea";
export const LEAN_CANVAS_MODULE_SLUG = "lean-canvas";
export const MODU_STARTUP_MODULE_SLUG = "modu-startup-application";

export interface ParticipantIdeaContext {
  oneLine: string;
  title: string;
  targetCustomer: string;
  problem: string;
  solution: string;
  valueProposition: string;
  memo: string;
}

const ONE_LINE_SECTION_LABELS = [
  "대표 한 줄",
  "대안 문장",
  "핵심 고객",
  "해결할 문제",
  "해결 방식",
  "가치 제안",
  "발표 팁",
  "다음 확인 질문",
  "멘토 코멘트"
];

function sectionValue(text: string, label: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const start = lines.findIndex((line) => line === label || line === `${label}:`);
  if (start < 0) return "";

  const values: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (ONE_LINE_SECTION_LABELS.some((section) => line === section || line === `${section}:`)) break;
    if (line) values.push(line.replace(/^[-*]\s*/, ""));
  }
  return values.join(" ").trim();
}

function firstMeaningfulLine(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*]\s*/, ""))
    .find((line) => line && !ONE_LINE_SECTION_LABELS.includes(line)) || "";
}

function ideaTitle(oneLine: string, memo: string) {
  const source = oneLine || firstMeaningfulLine(memo);
  return source.replace(/^["'“”]+|["'“”]+$/g, "").slice(0, 80);
}

export function getParticipantIdeaContext(
  participant?: Pick<HighViewParticipant, "moduleProgress"> | null
): ParticipantIdeaContext | null {
  const progress = participant?.moduleProgress?.[ONE_LINE_IDEA_MODULE_SLUG];
  if (!progress) return null;

  const memo = progress.inputData?.trim() || "";
  const output = progress.outputData?.trim() || "";
  const oneLine = sectionValue(output, "대표 한 줄") || firstMeaningfulLine(output) || firstMeaningfulLine(memo);
  const context: ParticipantIdeaContext = {
    oneLine,
    title: ideaTitle(oneLine, memo),
    targetCustomer: sectionValue(output, "핵심 고객"),
    problem: sectionValue(output, "해결할 문제"),
    solution: sectionValue(output, "해결 방식"),
    valueProposition: sectionValue(output, "가치 제안"),
    memo
  };

  return Object.values(context).some(Boolean) ? context : null;
}

export function formatParticipantIdeaContext(context?: ParticipantIdeaContext | null) {
  if (!context) return "";
  return [
    context.oneLine ? `현재 아이디어: ${context.oneLine}` : "",
    context.targetCustomer ? `핵심 고객: ${context.targetCustomer}` : "",
    context.problem ? `해결할 문제: ${context.problem}` : "",
    context.solution ? `해결 방식: ${context.solution}` : "",
    context.valueProposition ? `가치 제안: ${context.valueProposition}` : "",
    context.memo && context.memo !== context.oneLine ? `기존 메모: ${context.memo}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export function mergeIdeaContextIntoParticipantInput(
  input: ParticipantInput,
  context?: ParticipantIdeaContext | null
): ParticipantInput {
  if (!context) return input;
  return {
    ...input,
    ideaName: input.ideaName || context.title,
    ideaSummary: input.ideaSummary || context.oneLine,
    targetCustomer: input.targetCustomer || context.targetCustomer,
    problemToSolve: input.problemToSolve || context.problem,
    ourSolution: input.ourSolution || context.solution,
    differentiation: input.differentiation || context.valueProposition
  };
}

export function mergeIdeaContextIntoModuStartupInput(
  input: ModuStartupInput,
  context?: ParticipantIdeaContext | null
): ModuStartupInput {
  if (!context) return input;
  return {
    ...input,
    ideaTitle: input.ideaTitle || context.title,
    ideaOneLine: input.ideaOneLine || context.oneLine,
    backgroundStory: input.backgroundStory || context.memo,
    customerProblem: input.customerProblem || context.problem,
    executionPlan: input.executionPlan || context.solution
  };
}

export function getNextParticipantModule(modules: StartupModule[], currentSlug: string) {
  const currentIndex = modules.findIndex((module) => module.slug === currentSlug);
  return currentIndex >= 0 ? modules[currentIndex + 1] : undefined;
}

export function getParticipantModuleRoute(module: StartupModule) {
  return module.slug === MODU_STARTUP_MODULE_SLUG ? "/modu-startup" : module.route;
}

export function isDemoProgram(program?: Pick<HighViewProgram, "programCode"> | null) {
  return program?.programCode.replace(/[^A-Z0-9]/gi, "").toUpperCase() === "HVDEMO";
}
