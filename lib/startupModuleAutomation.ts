import { z } from "zod";
import type { ParticipantOperationContext } from "@/lib/types";

export interface AutomatedStartupModuleInput {
  moduleSlug: string;
  programName: string;
  teamName: string;
  participantName: string;
  ideaMemo: string;
  previousResults?: string;
  operation?: ParticipantOperationContext;
}

export interface AutomatedStartupModuleSection {
  heading: string;
  items: string[];
}

export interface AutomatedStartupModuleDraft {
  title: string;
  summary: string;
  sections: AutomatedStartupModuleSection[];
  assumptions: string[];
  nextActions: string[];
  mentorComment: string;
}

export interface StartupModuleAutomationConfig {
  slug: string;
  title: string;
  adminOnly: boolean;
  inputTitle: string;
  inputDescription: string;
  inputLabel: string;
  inputPlaceholder: string;
  resultTitle: string;
  resultDescription: string;
  resultPlaceholder: string;
  buttonLabel: string;
  generatingMessage: string;
  completionMessage: string;
  focus: string;
  sectionHeadings: string[];
}

const configs: StartupModuleAutomationConfig[] = [
  {
    slug: "mvp-spec",
    title: "MVP 설계서 생성기",
    adminOnly: false,
    inputTitle: "MVP 범위 메모 입력",
    inputDescription: "첫 고객이 반드시 써야 할 기능과 이번 검증에서 제외할 기능을 적어주세요.",
    inputLabel: "사용자·핵심 기능·검증 메모",
    inputPlaceholder: "예: 자취생이 3분 안에 따뜻한 한 끼를 준비한다. 첫 버전은 메뉴 선택, 조리 시작, 완료 알림만 제공한다.",
    resultTitle: "AI MVP 설계서 / 수정 가능",
    resultDescription: "기능 수보다 가장 위험한 가정을 빠르게 확인하는 범위인지 점검하세요.",
    resultPlaceholder: "AI가 핵심 사용자, 기능 범위, 사용 흐름, 검증 기준을 정리합니다.",
    buttonLabel: "AI MVP 설계서 생성",
    generatingMessage: "AI가 첫 검증에 필요한 최소 기능과 제외 범위를 정리하고 있습니다.",
    completionMessage: "MVP 설계서가 생성되었습니다. 첫 실험에서 꼭 필요한 기능만 남겨주세요.",
    focus: "개발 명세가 아니라 가장 위험한 가정을 최소 비용으로 검증하는 MVP 범위를 설계한다.",
    sectionHeadings: ["핵심 사용자", "검증할 가정", "필수 기능", "제외 기능", "사용 흐름", "완료 기준"]
  },
  {
    slug: "commercialization-roadmap",
    title: "사업화 로드맵 생성기",
    adminOnly: false,
    inputTitle: "사업화 목표와 일정 메모",
    inputDescription: "현재 단계, 6개월 안에 만들 결과, 필요한 고객 검증과 파트너를 적어주세요.",
    inputLabel: "현재 상태·목표·일정 메모",
    inputPlaceholder: "예: 인터뷰 10명을 마쳤고 1개월 안에 베타, 3개월 안에 유료 고객 20명, 6개월 안에 기관 계약을 검증하고 싶다.",
    resultTitle: "AI 사업화 로드맵 / 수정 가능",
    resultDescription: "각 단계가 측정 가능한 산출물과 담당 행동으로 연결되는지 확인하세요.",
    resultPlaceholder: "AI가 기간별 목표, 마일스톤, 위험과 대응을 정리합니다.",
    buttonLabel: "AI 사업화 로드맵 생성",
    generatingMessage: "AI가 현재 단계부터 6개월 사업화 마일스톤을 정리하고 있습니다.",
    completionMessage: "사업화 로드맵이 생성되었습니다. 실제 교육·사업 일정에 맞게 날짜와 담당자를 수정하세요.",
    focus: "현재 단계에서 6개월 안에 고객 검증, 제품, 매출, 파트너 성과를 순서대로 만드는 실행 로드맵을 설계한다.",
    sectionHeadings: ["현재 단계", "0~1개월", "2~3개월", "4~6개월", "핵심 마일스톤", "위험과 대응"]
  },
  {
    slug: "budget-estimator",
    title: "사업비 산출 생성기",
    adminOnly: false,
    inputTitle: "사업비 가정 입력",
    inputDescription: "사업 기간, 필요한 인력·개발·마케팅·운영 항목과 알고 있는 단가를 적어주세요.",
    inputLabel: "기간·항목·단가 메모",
    inputPlaceholder: "예: 6개월 사업, 기획 1명, 외주 개발, 베타 사용자 50명 모집, 서버와 홍보비가 필요하다. 정확한 견적은 아직 없다.",
    resultTitle: "AI 사업비 산출안 / 수정 가능",
    resultDescription: "금액은 확정 견적이 아닌 가설입니다. 지원사업 기준과 실제 견적서로 반드시 교체하세요.",
    resultPlaceholder: "AI가 산출 기준, 항목별 범위, 확인할 견적과 예비비를 정리합니다.",
    buttonLabel: "AI 사업비 산출안 생성",
    generatingMessage: "AI가 사업기간과 실행 범위에 맞는 예산 항목을 산출하고 있습니다.",
    completionMessage: "사업비 산출안이 생성되었습니다. 금액은 실제 견적과 공고문 집행 기준으로 검증하세요.",
    focus: "확인되지 않은 정확한 금액을 만들지 않고 항목, 산출식, 금액 범위, 확인 근거를 구분한 예산안을 만든다.",
    sectionHeadings: ["산출 기준", "인건비", "개발·제작비", "마케팅·고객검증비", "운영비", "예비비·확인자료"]
  },
  {
    slug: "grant-fit-diagnosis",
    title: "지원사업 적합도 진단기",
    adminOnly: false,
    inputTitle: "지원사업과 아이디어 정보 입력",
    inputDescription: "검토 중인 공고의 목적·대상·제외 조건과 우리 아이디어의 현재 상태를 적어주세요.",
    inputLabel: "공고 조건·신청자 상태 메모",
    inputPlaceholder: "예: 예비창업자 대상 AI 서비스 지원사업. 사업자등록과 중복수혜 제한이 있으며, 우리는 인터뷰 단계이고 아직 사업자가 없다.",
    resultTitle: "AI 지원사업 적합도 진단 / 수정 가능",
    resultDescription: "최종 자격 판단은 반드시 최신 공고문과 주관기관 답변으로 확인하세요.",
    resultPlaceholder: "AI가 적합 근거, 위험 조건, 확인 서류와 신청 전략을 정리합니다.",
    buttonLabel: "AI 지원사업 적합도 진단",
    generatingMessage: "AI가 지원 목적, 신청 자격, 아이디어 단계의 적합성을 점검하고 있습니다.",
    completionMessage: "적합도 진단이 생성되었습니다. 결격·중복지원 항목은 주관기관에 최종 확인하세요.",
    focus: "공고문이 제공된 범위에서 적합 근거와 결격 위험을 분리하고 모르는 조건은 확인 필요로 표시한다.",
    sectionHeadings: ["종합 적합도", "적합 근거", "강점", "결격·중복 위험", "확인할 서류", "신청 전략"]
  },
  {
    slug: "psst-business-plan",
    title: "PSST 사업계획서 생성기",
    adminOnly: false,
    inputTitle: "PSST 사업계획 메모 입력",
    inputDescription: "문제, 해결책, 성장전략, 팀 역량과 보유한 고객·시장 증거를 자유롭게 적어주세요.",
    inputLabel: "문제·해결·성장·팀 메모",
    inputPlaceholder: "예: 자취생의 늦은 식사 문제를 3분 조리 서비스로 해결한다. 인터뷰 30명, 베타 10명이 있고 기숙사 제휴를 검토 중이다.",
    resultTitle: "AI PSST 사업계획서 초안 / 수정 가능",
    resultDescription: "공고별 분량과 평가항목에 맞게 재배치하고, 모든 수치의 근거를 첨부하세요.",
    resultPlaceholder: "AI가 P-S-S-T 구조와 증빙·보완 과제를 정리합니다.",
    buttonLabel: "AI PSST 사업계획서 생성",
    generatingMessage: "AI가 입력 자료를 PSST 평가 흐름에 맞춰 구조화하고 있습니다.",
    completionMessage: "PSST 초안이 생성되었습니다. 공고 양식과 실제 증빙에 맞게 문장을 보완하세요.",
    focus: "Problem, Solution, Scale-up, Team 구조가 인과관계로 이어지고 평가자가 확인할 증거와 숫자가 드러나게 작성한다.",
    sectionHeadings: ["P 문제인식", "S 실현가능성", "S 성장전략", "T 팀 구성", "핵심 증빙", "보완 과제"]
  },
  {
    slug: "pitch-deck",
    title: "발표자료 생성기",
    adminOnly: false,
    inputTitle: "발표 목적과 핵심 내용 입력",
    inputDescription: "발표 시간, 청중, 반드시 전달할 문제·해결책·증거·요청사항을 적어주세요.",
    inputLabel: "발표 시간·청중·핵심 메시지",
    inputPlaceholder: "예: 5분 데모데이 발표. 심사위원에게 고객 문제, 3분 조리 해결책, 인터뷰 30명, 기관 실증 계획을 전달하고 싶다.",
    resultTitle: "AI 발표자료 구성안 / 수정 가능",
    resultDescription: "한 슬라이드에 한 메시지만 남기고, 숫자와 화면·사진 증거를 우선 배치하세요.",
    resultPlaceholder: "AI가 발표 흐름과 슬라이드별 핵심 메시지를 정리합니다.",
    buttonLabel: "AI 발표자료 구성안 생성",
    generatingMessage: "AI가 발표 시간에 맞춰 슬라이드 흐름과 핵심 메시지를 설계하고 있습니다.",
    completionMessage: "발표자료 구성안이 생성되었습니다. 실제 이미지와 검증 증거를 슬라이드에 추가하세요.",
    focus: "발표 시간 안에 문제, 고객, 해결책, 시장, 사업모델, 검증, 팀, 요청이 한 흐름으로 이어지는 슬라이드 구성을 만든다.",
    sectionHeadings: ["오프닝", "문제·고객", "해결책·제품", "시장·경쟁", "사업모델·검증", "팀·요청"]
  },
  {
    slug: "judge-questions",
    title: "심사위원 예상질문 생성기",
    adminOnly: false,
    inputTitle: "심사 대비 자료 입력",
    inputDescription: "발표 내용, 약한 근거, 걱정되는 질문과 현재 답변을 적어주세요.",
    inputLabel: "발표 요약·약점·답변 메모",
    inputPlaceholder: "예: 시장 규모와 원가 근거가 약하다. 경쟁사가 따라 할 수 있다는 질문과 실제 고객 지불의사 질문이 걱정된다.",
    resultTitle: "AI 심사위원 예상질문 / 수정 가능",
    resultDescription: "답을 외우기보다 질문 의도, 근거, 모르는 부분을 정직하게 말하는 방식을 준비하세요.",
    resultPlaceholder: "AI가 영역별 예상질문과 답변 방향을 정리합니다.",
    buttonLabel: "AI 심사 예상질문 생성",
    generatingMessage: "AI가 심사 관점에서 취약한 근거와 후속 질문을 점검하고 있습니다.",
    completionMessage: "예상질문이 생성되었습니다. 각 답변에 실제 수치와 증빙 위치를 연결하세요.",
    focus: "심사위원이 문제, 시장, 차별성, 수익성, 실행력, 팀, 위험을 확인하기 위해 물을 날카로운 질문과 답변 방향을 만든다.",
    sectionHeadings: ["문제·고객 질문", "시장·경쟁 질문", "제품·기술 질문", "수익·사업모델 질문", "실행·팀 질문", "위험·후속 질문"]
  },
  {
    slug: "pitch-script",
    title: "발표 대본 생성기",
    adminOnly: false,
    inputTitle: "발표 대본 재료 입력",
    inputDescription: "발표 시간, 말투, 핵심 메시지와 슬라이드 흐름을 적어주세요.",
    inputLabel: "발표 시간·슬라이드·말투 메모",
    inputPlaceholder: "예: 5분 발표, 담백하고 자신 있는 말투. 고객 장면으로 시작해 문제, 해결책, 검증, 사업모델, 팀, 요청 순으로 말한다.",
    resultTitle: "AI 발표 대본 / 수정 가능",
    resultDescription: "소리 내어 읽고 제한 시간의 80~90% 안에 끝나도록 문장을 줄이세요.",
    resultPlaceholder: "AI가 구간별 발표 문장과 시간 배분을 정리합니다.",
    buttonLabel: "AI 발표 대본 생성",
    generatingMessage: "AI가 발표 시간과 슬라이드 흐름에 맞는 말하기 대본을 작성하고 있습니다.",
    completionMessage: "발표 대본이 생성되었습니다. 직접 읽어보며 본인 말투와 실제 시간에 맞게 다듬으세요.",
    focus: "글말이 아닌 자연스러운 입말로 작성하고 발표 시간의 80~90% 분량에 맞춰 구간별 핵심 문장을 만든다.",
    sectionHeadings: ["도입", "문제·고객", "해결책", "시장·사업모델", "검증·팀", "마무리·요청"]
  },
  {
    slug: "mentoring-report",
    title: "멘토링 리포트 자동 생성기",
    adminOnly: true,
    inputTitle: "멘토링 기록 입력",
    inputDescription: "논의한 내용, 확인한 문제, 멘토 조언, 참여자의 결정과 다음 행동을 적어주세요.",
    inputLabel: "멘토링 메모",
    inputPlaceholder: "예: 고객을 대학생 전체에서 기숙사 자취생으로 좁혔다. 이번 주 인터뷰 10명과 가격 질문을 진행하기로 했다.",
    resultTitle: "AI 멘토링 리포트 / 수정 가능",
    resultDescription: "사실과 멘토 의견을 구분하고 다음 회차에서 확인할 행동을 명확히 남기세요.",
    resultPlaceholder: "AI가 회차 요약, 진단, 피드백, 결정사항, 다음 행동을 정리합니다.",
    buttonLabel: "AI 멘토링 리포트 생성",
    generatingMessage: "AI가 멘토링 기록을 사실, 진단, 다음 행동으로 구분하고 있습니다.",
    completionMessage: "멘토링 리포트가 생성되었습니다. 참여자와 합의한 다음 행동을 최종 확인하세요.",
    focus: "멘토링에서 확인된 사실, 멘토의 진단, 참여자의 결정, 기한이 있는 다음 행동을 구분해 기록한다.",
    sectionHeadings: ["회차 요약", "확인된 사실", "핵심 진단", "멘토 피드백", "결정사항", "다음 행동"]
  },
  {
    slug: "evaluation-sheet",
    title: "심사평/평가표 자동 생성기",
    adminOnly: true,
    inputTitle: "심사 메모와 평가기준 입력",
    inputDescription: "평가항목, 발표·서류에서 확인한 사실, 강점, 우려와 질문을 적어주세요.",
    inputLabel: "평가기준·관찰 근거 메모",
    inputPlaceholder: "예: 문제 적합성, 시장성, 실현가능성, 팀 역량을 평가한다. 인터뷰 근거는 좋지만 원가와 시장 수치가 부족하다.",
    resultTitle: "AI 심사평·평가표 초안 / 수정 가능",
    resultDescription: "AI 초안은 판단 보조용입니다. 최종 점수와 선정 판단은 심사자가 근거를 확인해 결정하세요.",
    resultPlaceholder: "AI가 항목별 근거, 강점, 보완점과 추가 질문을 정리합니다.",
    buttonLabel: "AI 심사평·평가표 생성",
    generatingMessage: "AI가 관찰 근거를 평가항목별로 분류하고 있습니다.",
    completionMessage: "심사평 초안이 생성되었습니다. 최종 판단 전에 근거와 이해상충 여부를 확인하세요.",
    focus: "입력된 관찰 근거만 사용하고 평가항목별 강점과 보완점을 균형 있게 작성하며 근거 없는 점수는 만들지 않는다.",
    sectionHeadings: ["종합 의견", "문제·고객", "시장·사업성", "실현가능성", "팀 역량", "보완점·추가 질문"]
  },
  {
    slug: "operation-pack",
    title: "창업교육 운영자료 자동 생성기",
    adminOnly: true,
    inputTitle: "교육 운영 데이터 입력",
    inputDescription: "출석, 제출, 만족도, 사진·증빙, 특이사항과 기관 보고 요구사항을 적어주세요.",
    inputLabel: "운영 현황·결과보고 메모",
    inputPlaceholder: "예: 참여자 30명 중 28명 출석, 린캔버스 25건 제출, 만족도 4.6점. 사진 폴더와 미제출자 3명 확인이 필요하다.",
    resultTitle: "AI 창업교육 운영자료 팩 / 수정 가능",
    resultDescription: "개인정보와 사진 공개 범위를 확인하고 기관 양식의 실제 집계값으로 교체하세요.",
    resultPlaceholder: "AI가 운영 요약, 출석·제출·만족도, 증빙, 이슈와 보고 체크리스트를 정리합니다.",
    buttonLabel: "AI 운영자료 팩 생성",
    generatingMessage: "AI가 운영 데이터를 기관 보고 흐름에 맞게 정리하고 있습니다.",
    completionMessage: "운영자료 팩이 생성되었습니다. 실제 집계값과 개인정보 공개 범위를 최종 확인하세요.",
    focus: "출석, 제출, 만족도, 사진·증빙, 운영 이슈를 기관 보고에 바로 옮길 수 있게 정리하고 누락 확인 항목을 제시한다.",
    sectionHeadings: ["운영 요약", "출석 현황", "제출 현황", "만족도·성과", "사진·증빙", "이슈·보고 체크리스트"]
  }
];

const textSchema = z.string().trim().min(1);
export const automatedStartupModuleDraftSchema = z.object({
  title: textSchema,
  summary: textSchema,
  sections: z.array(z.object({ heading: textSchema, items: z.array(textSchema).min(1).max(6) })).min(1).max(8),
  assumptions: z.array(textSchema).min(1).max(6),
  nextActions: z.array(textSchema).min(1).max(6),
  mentorComment: textSchema
});

function truncate(value: unknown, max: number, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return Array.from(text || fallback).slice(0, max).join("");
}

function normalizeList(value: unknown, fallback: string[], maxItems = 5, maxLength = 220) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\n| - /) : [];
  const normalized = values
    .map((item) => truncate(String(item).replace(/^[-*•]\s*/, ""), maxLength, ""))
    .filter(Boolean)
    .slice(0, maxItems);
  return normalized.length ? normalized : fallback;
}

function extractJsonObject(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = fenced || raw;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI 응답에서 JSON 객체를 찾지 못했습니다.");
  return source.slice(start, end + 1);
}

export function getStartupModuleAutomationConfig(slug: string) {
  return configs.find((config) => config.slug === slug);
}

export function getStartupModuleAutomationConfigs(options?: { adminOnly?: boolean }) {
  return typeof options?.adminOnly === "boolean"
    ? configs.filter((config) => config.adminOnly === options.adminOnly)
    : configs;
}

export function buildStartupModuleAutomationPrompt(input: AutomatedStartupModuleInput, config: StartupModuleAutomationConfig) {
  return [
    "너는 한국 창업교육 현장에서 바로 사용하는 산출물 초안을 만드는 시니어 멘토다.",
    `현재 모듈: ${config.title}`,
    `작성 목표: ${config.focus}`,
    "참가자 입력이 부족하면 합리적인 가정을 사용할 수 있으나 반드시 [가정]으로 표시하라.",
    "확인하지 못한 시장 수치, 가격, 법률, 지원사업 자격, 성과를 사실처럼 만들지 말고 [확인 필요]로 표시하라.",
    "각 항목은 발표와 현장 피드백에 바로 쓸 수 있는 짧고 구체적인 한국어 문장으로 작성하라.",
    "반드시 JSON 객체만 반환하고 마크다운, 코드블록, 추가 설명을 포함하지 마라.",
    `sections는 다음 제목을 같은 순서로 모두 포함하라: ${config.sectionHeadings.join(", ")}`,
    "각 section의 items는 2~5개, assumptions와 nextActions는 각각 2~5개로 작성하라.",
    "nextActions는 담당자가 바로 실행할 수 있도록 행동과 확인 기준을 포함하라.",
    "",
    "반환 JSON 형식:",
    JSON.stringify(
      {
        title: `${config.title} 초안 제목`,
        summary: "핵심 요약 2~3문장",
        sections: config.sectionHeadings.map((heading) => ({ heading, items: [`${heading} 핵심 1`, `${heading} 핵심 2`] })),
        assumptions: ["[가정] 아직 검증되지 않은 전제"],
        nextActions: ["다음 실행 행동과 확인 기준"],
        mentorComment: "참가자가 가장 먼저 보완할 한 가지"
      },
      null,
      2
    ),
    "",
    "입력:",
    JSON.stringify(input, null, 2)
  ].join("\n");
}

export function parseStartupModuleAutomationJson(
  raw: string,
  config: StartupModuleAutomationConfig
): AutomatedStartupModuleDraft {
  const parsed = JSON.parse(extractJsonObject(raw)) as Partial<AutomatedStartupModuleDraft>;
  const rawSections = Array.isArray(parsed.sections) ? parsed.sections : [];
  const sections = config.sectionHeadings.map((heading) => {
    const matched = rawSections.find((section) => section && typeof section === "object" && section.heading === heading);
    return {
      heading,
      items: normalizeList(matched?.items, [`${heading} 내용을 입력 자료와 실제 근거로 보완하세요.`])
    };
  });
  return automatedStartupModuleDraftSchema.parse({
    title: truncate(parsed.title, 120, config.title),
    summary: truncate(parsed.summary, 500, "입력 자료를 바탕으로 핵심 내용을 정리했습니다."),
    sections,
    assumptions: normalizeList(parsed.assumptions, ["[가정] 입력이 부족한 항목은 현장 검증이 필요합니다."]),
    nextActions: normalizeList(parsed.nextActions, ["핵심 가정 한 가지를 실제 고객 또는 운영 데이터로 확인하세요."]),
    mentorComment: truncate(parsed.mentorComment, 300, "가장 불확실한 근거부터 확인하면 초안의 설득력이 높아집니다.")
  });
}

export function createMockStartupModuleDraft(
  input: AutomatedStartupModuleInput,
  config: StartupModuleAutomationConfig
): AutomatedStartupModuleDraft {
  return {
    title: `${config.title} 초안`,
    summary: `${input.ideaMemo.slice(0, 120)}를 바탕으로 현장에서 검토할 초안을 구성했습니다.`,
    sections: config.sectionHeadings.map((heading) => ({
      heading,
      items: [`${heading}의 핵심 내용을 구체화합니다.`, "실제 고객·운영 근거로 확인할 기준을 추가합니다."]
    })),
    assumptions: ["[가정] 입력하지 않은 조건은 초기 가설로 작성했습니다.", "[확인 필요] 수치와 자격 조건은 공식 자료로 검증합니다."],
    nextActions: ["가장 중요한 가정 1개를 이번 주에 검증합니다.", "확인한 수치와 증빙을 초안에 반영합니다."],
    mentorComment: "초안의 범위를 넓히기보다 첫 실행과 측정 기준을 더 구체화하세요."
  };
}

export function formatStartupModuleDraft(draft: AutomatedStartupModuleDraft) {
  return [
    draft.title,
    "",
    "핵심 요약",
    draft.summary,
    "",
    ...draft.sections.flatMap((section) => [section.heading, ...section.items.map((item) => `- ${item}`), ""]),
    "가정·확인 필요",
    ...draft.assumptions.map((item) => `- ${item}`),
    "",
    "다음 행동",
    ...draft.nextActions.map((item) => `- ${item}`),
    "",
    "멘토 코멘트",
    draft.mentorComment
  ].join("\n");
}
