import type { HighViewProgram, StartupModule, StartupModuleCategoryKey } from "@/lib/types";

export const startupModuleCategoryLabels: Record<StartupModuleCategoryKey, string> = {
  idea: "아이디어 정리 단계",
  customer_problem: "고객·문제 정의 단계",
  validation: "고객 검증 단계",
  market: "시장·경쟁 분석 단계",
  business_model: "비즈니스 모델 단계",
  execution: "실행계획·사업화 단계",
  proposal: "사업계획서·신청서 단계",
  pitch: "발표·심사 대응 단계",
  operations: "멘토링·평가·운영 단계"
};

export const startupModuleCategoryOrder: StartupModuleCategoryKey[] = [
  "idea",
  "customer_problem",
  "validation",
  "market",
  "business_model",
  "execution",
  "proposal",
  "pitch",
  "operations"
];

export const STARTUP_MODULES: StartupModule[] = [
  {
    id: 1,
    order: 1,
    title: "한줄 아이디어 생성기",
    description: "막연한 아이디어를 한 문장으로 정리합니다.",
    category: "idea",
    isDefault: true,
    isAdminOnly: false,
    status: "ready",
    slug: "one-line-idea",
    route: "/participant/modules/one-line-idea"
  },
  {
    id: 2,
    order: 2,
    title: "아이디어 사전진단 리포트 생성기",
    description: "문제성, 고객성, 시장성, 실현가능성을 진단합니다.",
    category: "idea",
    isDefault: true,
    isAdminOnly: false,
    status: "ready",
    slug: "idea-diagnosis",
    route: "/participant/modules/idea-diagnosis"
  },
  {
    id: 3,
    order: 3,
    title: "고객 페르소나 생성기",
    description: "핵심 고객을 구체적인 인물상으로 정의합니다.",
    category: "customer_problem",
    isDefault: true,
    isAdminOnly: false,
    status: "ready",
    slug: "customer-persona",
    route: "/participant/modules/customer-persona"
  },
  {
    id: 4,
    order: 4,
    title: "고객 여정지도 생성기",
    description: "고객이 문제를 겪는 흐름과 접점을 정리합니다.",
    category: "customer_problem",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "customer-journey-map",
    route: "/participant/modules/customer-journey-map"
  },
  {
    id: 5,
    order: 5,
    title: "문제정의문 생성기",
    description: "해결할 문제를 발표용 문장으로 좁힙니다.",
    category: "customer_problem",
    isDefault: true,
    isAdminOnly: false,
    status: "ready",
    slug: "problem-statement",
    route: "/participant/modules/problem-statement"
  },
  {
    id: 6,
    order: 6,
    title: "고객 인터뷰 질문지 생성기",
    description: "검증 인터뷰 질문과 진행 순서를 만듭니다.",
    category: "validation",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "customer-interview-questions",
    route: "/participant/modules/customer-interview-questions"
  },
  {
    id: 7,
    order: 7,
    title: "설문지 자동 생성기",
    description: "고객 검증용 설문 문항을 구성합니다.",
    category: "validation",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "survey-generator",
    route: "/participant/modules/survey-generator"
  },
  {
    id: 8,
    order: 8,
    title: "검증 실험 설계 생성기",
    description: "가설, 실험 방법, 성공 기준을 정리합니다.",
    category: "validation",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "validation-experiment",
    route: "/participant/modules/validation-experiment"
  },
  {
    id: 9,
    order: 9,
    title: "시장조사 리포트 생성기",
    description: "시장 규모와 트렌드 조사 방향을 잡습니다.",
    category: "market",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "market-research-report",
    route: "/participant/modules/market-research-report"
  },
  {
    id: 10,
    order: 10,
    title: "경쟁사 분석표 생성기",
    description: "경쟁사와 대안을 비교표로 정리합니다.",
    category: "market",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "competitor-analysis",
    route: "/participant/modules/competitor-analysis"
  },
  {
    id: 11,
    order: 11,
    title: "차별화 전략 생성기",
    description: "우리만의 강점과 차별 포인트를 도출합니다.",
    category: "market",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "differentiation-strategy",
    route: "/participant/modules/differentiation-strategy"
  },
  {
    id: 12,
    order: 12,
    title: "BM 수익모델 생성기",
    description: "수익원, 과금 방식, 고객 지불 구조를 정리합니다.",
    category: "business_model",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "business-model",
    route: "/participant/modules/business-model"
  },
  {
    id: 13,
    order: 13,
    title: "가격정책 생성기",
    description: "초기 가격, 할인, 패키지 정책을 설계합니다.",
    category: "business_model",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "pricing-policy",
    route: "/participant/modules/pricing-policy"
  },
  {
    id: 14,
    order: 14,
    title: "린캔버스 생성기",
    description: "아이디어를 10칸 린캔버스로 정리합니다.",
    category: "business_model",
    isDefault: true,
    isAdminOnly: false,
    status: "ready",
    slug: "lean-canvas",
    route: "/participant/modules/lean-canvas"
  },
  {
    id: 15,
    order: 15,
    title: "MVP 설계서 생성기",
    description: "핵심 기능과 첫 실험 범위를 설계합니다.",
    category: "execution",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "mvp-spec",
    route: "/participant/modules/mvp-spec"
  },
  {
    id: 16,
    order: 16,
    title: "사업화 로드맵 생성기",
    description: "실행 일정과 주요 마일스톤을 정리합니다.",
    category: "execution",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "commercialization-roadmap",
    route: "/participant/modules/commercialization-roadmap"
  },
  {
    id: 17,
    order: 17,
    title: "사업비 산출 생성기",
    description: "필요 예산과 사용 계획을 항목별로 정리합니다.",
    category: "execution",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "budget-estimator",
    route: "/participant/modules/budget-estimator"
  },
  {
    id: 18,
    order: 18,
    title: "지원사업 적합도 진단기",
    description: "지원사업 조건과 아이디어 적합도를 점검합니다.",
    category: "execution",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "grant-fit-diagnosis",
    route: "/participant/modules/grant-fit-diagnosis"
  },
  {
    id: 19,
    order: 19,
    title: "PSST 사업계획서 생성기",
    description: "PSST 구조에 맞춘 사업계획서 초안을 준비합니다.",
    category: "proposal",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "psst-business-plan",
    route: "/participant/modules/psst-business-plan"
  },
  {
    id: 20,
    order: 20,
    title: "모두의창업 신청서 생성기",
    description: "Q1~Q8 신청서 초안과 체크리스트를 정리합니다.",
    category: "proposal",
    isDefault: true,
    isAdminOnly: false,
    status: "ready",
    slug: "modu-startup-application",
    route: "/participant/modules/modu-startup-application"
  },
  {
    id: 21,
    order: 21,
    title: "발표자료 생성기",
    description: "발표 흐름과 슬라이드 초안을 구성합니다.",
    category: "pitch",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "pitch-deck",
    route: "/participant/modules/pitch-deck"
  },
  {
    id: 22,
    order: 22,
    title: "심사위원 예상질문 생성기",
    description: "심사에서 나올 질문과 답변 방향을 준비합니다.",
    category: "pitch",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "judge-questions",
    route: "/participant/modules/judge-questions"
  },
  {
    id: 23,
    order: 23,
    title: "발표 대본 생성기",
    description: "제한 시간에 맞춘 발표 대본을 정리합니다.",
    category: "pitch",
    isDefault: false,
    isAdminOnly: false,
    status: "ready",
    slug: "pitch-script",
    route: "/participant/modules/pitch-script"
  },
  {
    id: 24,
    order: 24,
    title: "멘토링 리포트 자동 생성기",
    description: "멘토링 내용과 다음 액션을 리포트로 정리합니다.",
    category: "operations",
    isDefault: false,
    isAdminOnly: true,
    status: "ready",
    slug: "mentoring-report",
    route: "/participant/modules/mentoring-report"
  },
  {
    id: 25,
    order: 25,
    title: "심사평/평가표 자동 생성기",
    description: "심사 의견과 평가표 정리를 지원합니다.",
    category: "operations",
    isDefault: false,
    isAdminOnly: true,
    status: "ready",
    slug: "evaluation-sheet",
    route: "/participant/modules/evaluation-sheet"
  },
  {
    id: 26,
    order: 26,
    title: "창업교육 운영자료 자동 생성기",
    description: "출석, 만족도, 사진, 결과보고 자료를 정리합니다.",
    category: "operations",
    isDefault: false,
    isAdminOnly: true,
    status: "ready",
    slug: "operation-pack",
    route: "/participant/modules/operation-pack"
  }
];

export const DEFAULT_STARTUP_MODULE_IDS = [1, 2, 3, 5, 14, 20];

export const startupModulePresets = [
  {
    id: "idea-discovery",
    title: "아이디어 발굴형 캠프",
    description: "초기 아이디어 정리와 고객 검증 중심",
    moduleIds: [1, 2, 3, 4, 5, 6, 7, 8]
  },
  {
    id: "lean-startup",
    title: "린스타트업 실습형 캠프",
    description: "검증, 시장분석, BM, MVP까지 진행",
    moduleIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  },
  {
    id: "government-grant",
    title: "정부지원사업 준비형",
    description: "지원사업 신청과 사업계획서 작성 중심",
    moduleIds: [1, 2, 3, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  },
  {
    id: "pitch-competition",
    title: "창업경진대회 발표형",
    description: "발표평가와 심사 대응 중심",
    moduleIds: [1, 2, 3, 5, 9, 10, 11, 12, 14, 15, 21, 22, 23]
  },
  {
    id: "operations-mentoring",
    title: "운영자/멘토링 관리형",
    description: "운영진과 멘토가 쓰는 관리 모듈",
    moduleIds: [24, 25, 26]
  },
  {
    id: "full-camp",
    title: "전체 창업캠프형",
    description: "26개 모듈 전체 운영",
    moduleIds: STARTUP_MODULES.map((module) => module.id)
  }
];

export function normalizeStartupModuleIds(moduleIds?: number[]) {
  const validIds = new Set(STARTUP_MODULES.map((module) => module.id));
  const uniqueIds = Array.from(new Set((moduleIds?.length ? moduleIds : DEFAULT_STARTUP_MODULE_IDS).map(Number)));
  return uniqueIds
    .filter((id) => validIds.has(id))
    .sort((a, b) => {
      const left = STARTUP_MODULES.find((module) => module.id === a)?.order ?? a;
      const right = STARTUP_MODULES.find((module) => module.id === b)?.order ?? b;
      return left - right;
    });
}

export function getStartupModulesByIds(moduleIds?: number[]) {
  const selectedIds = new Set(normalizeStartupModuleIds(moduleIds));
  return STARTUP_MODULES.filter((module) => selectedIds.has(module.id)).sort((a, b) => a.order - b.order);
}

export function getProgramModuleIds(program?: Pick<HighViewProgram, "moduleIds"> | null) {
  return normalizeStartupModuleIds(program?.moduleIds);
}

export function getProgramModules(program?: Pick<HighViewProgram, "moduleIds"> | null) {
  return getStartupModulesByIds(getProgramModuleIds(program));
}

export function getParticipantVisibleModules(program?: Pick<HighViewProgram, "moduleIds"> | null) {
  return getProgramModules(program).filter((module) => !module.isAdminOnly && module.status !== "disabled");
}

export function getStartupModuleBySlug(slug: string) {
  return STARTUP_MODULES.find((module) => module.slug === slug);
}
