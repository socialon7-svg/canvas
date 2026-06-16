export interface ParticipantInput {
  educationName: string;
  teamName: string;
  participantName: string;
  ideaName: string;
  ideaSummary: string;
  targetCustomer: string;
  problemToSolve: string;
  existingAlternative: string;
  ourSolution: string;
  revenueModel: string;
  differentiation: string;
  operation?: ParticipantOperationContext;
}

export interface ParticipantOperationContext {
  programId?: string;
  programCode?: string;
  programName?: string;
  participantId?: string;
  participantCode?: string;
  teamId?: string;
  teamName?: string;
  role?: string;
}

export interface LeanCanvasDraft {
  problem: string[];
  existingAlternatives: string[];
  customerSegments: string[];
  uniqueValueProposition: string[];
  solution: string[];
  channels: string[];
  revenueStreams: string[];
  costStructure: string[];
  keyMetrics: string[];
  unfairAdvantage: string[];
  mentorComment: string[];
}

export interface LeanCanvasSubmission {
  id: string;
  createdAt: string;
  participant: ParticipantInput;
  canvas: LeanCanvasDraft;
  submissionStatus?: SubmissionStatus;
  pdfStatus?: PdfStatus;
  pdfErrorMessage?: string;
  pdfGeneratedAt?: string;
  adminCheckedAt?: string;
}

export type CanvasFieldKey = keyof LeanCanvasDraft;

export const canvasLabels: Record<CanvasFieldKey, string> = {
  problem: "문제",
  existingAlternatives: "기존대안",
  customerSegments: "고객군",
  uniqueValueProposition: "가치제안",
  solution: "해결책",
  channels: "채널",
  revenueStreams: "수익구조",
  costStructure: "비용구조",
  keyMetrics: "핵심지표",
  unfairAdvantage: "경쟁우위",
  mentorComment: "멘토 코멘트"
};

export const emptyParticipantInput: ParticipantInput = {
  educationName: "",
  teamName: "",
  participantName: "",
  ideaName: "",
  ideaSummary: "",
  targetCustomer: "",
  problemToSolve: "",
  existingAlternative: "",
  ourSolution: "",
  revenueModel: "",
  differentiation: ""
};

export const emptyCanvasDraft: LeanCanvasDraft = {
  problem: [],
  existingAlternatives: [],
  customerSegments: [],
  uniqueValueProposition: [],
  solution: [],
  channels: [],
  revenueStreams: [],
  costStructure: [],
  keyMetrics: [],
  unfairAdvantage: [],
  mentorComment: []
};

export type ProgramStatus = "active" | "closed";
export type SubmissionStatus = "draft" | "submitted" | "reviewed" | "returned";
export type PdfStatus = "idle" | "generating" | "success" | "failed";
export type StartupModuleStatus = "ready" | "coming_soon" | "disabled";
export type StartupModuleCategoryKey =
  | "idea"
  | "customer_problem"
  | "validation"
  | "market"
  | "business_model"
  | "execution"
  | "proposal"
  | "pitch"
  | "operations";
export type ParticipantModuleProgressStatus = "not_started" | "in_progress" | "completed" | "needs_review";

export interface StartupModule {
  id: number;
  order: number;
  title: string;
  description: string;
  category: StartupModuleCategoryKey;
  isDefault: boolean;
  isAdminOnly: boolean;
  status: StartupModuleStatus;
  slug: string;
  route: string;
}

export interface ParticipantModuleProgress {
  moduleId: number;
  status: ParticipantModuleProgressStatus;
  inputData: string;
  outputData: string;
  adminComment?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HighViewProgram {
  id: string;
  name: string;
  clientName: string;
  startDate: string;
  endDate: string;
  programCode: string;
  status: ProgramStatus;
  createdAt: string;
  brief: string;
  moduleIds: number[];
}

export interface HighViewParticipant {
  id: string;
  programId: string;
  code: string;
  joinToken?: string;
  name: string;
  email: string;
  phone: string;
  school: string;
  major: string;
  teamId: string;
  role: string;
  joinedAt: string;
  lastSeenAt: string;
  latestSubmissionId?: string;
  submittedAt?: string;
  latestModuStartupSubmissionId?: string;
  moduStartupSubmittedAt?: string;
  moduleProgress?: Record<string, ParticipantModuleProgress>;
}

export interface HighViewTeam {
  id: string;
  programId: string;
  name: string;
  memo: string;
  createdAt: string;
}

export type FeedbackStatus = "needs_revision" | "good" | "excellent";

export interface HighViewFeedback {
  id: string;
  programId: string;
  participantId: string;
  submissionId: string;
  comment: string;
  nextAction: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HighViewOperationsState {
  version: number;
  programs: HighViewProgram[];
  participants: HighViewParticipant[];
  teams: HighViewTeam[];
  feedbacks: HighViewFeedback[];
}

export interface ModuStartupInput {
  programName: string;
  teamName: string;
  participantName: string;
  ideaTitle: string;
  ideaOneLine: string;
  backgroundStory: string;
  customerProblem: string;
  executionPlan: string;
  category: string;
  businessStatus: string;
  teamMembers: string;
  videoUrl: string;
  operation?: ParticipantOperationContext;
}

export interface ModuStartupDraft {
  q1IdeaIntro: string;
  q2BackgroundStory: string;
  q3CustomerProblem: string;
  q4ExecutionPlan: string;
  q5CategoryReason: string;
  q6BusinessStatusCheck: string;
  q7TeamIntro: string;
  q8VideoPitch: string;
  openingHook: string;
  evidenceLines: string[];
  personaDefinition: string;
  differentiationFocus: string;
  policyKeywords: string[];
  socialImpactEnding: string;
  finalChecklist: string[];
  mentorComment: string;
}

export interface ModuStartupSubmission {
  id: string;
  createdAt: string;
  input: ModuStartupInput;
  draft: ModuStartupDraft;
  submissionStatus?: SubmissionStatus;
  pdfStatus?: PdfStatus;
  pdfErrorMessage?: string;
  pdfGeneratedAt?: string;
  adminCheckedAt?: string;
}
