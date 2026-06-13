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
