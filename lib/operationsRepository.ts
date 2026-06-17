import { createSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabaseServer";

export type JsonObject = Record<string, unknown>;

export interface OperationsProgramRow {
  id: string;
  name: string;
  client_name: string;
  program_code: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  brief: string;
  created_at: string;
  updated_at: string;
}

export interface OperationsTeamRow {
  id: string;
  program_id: string;
  name: string;
  memo: string;
  created_at: string;
  updated_at: string;
}

export interface OperationsParticipantRow {
  id: string;
  program_id: string;
  team_id: string | null;
  participant_code: string;
  join_token: string;
  name: string;
  email: string;
  phone: string;
  school: string;
  major: string;
  role: string;
  joined_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OperationsProgramModuleRow {
  id: string;
  program_id: string;
  module_id: number;
  module_slug: string;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
}

export interface ModuleDraftRow {
  id: string;
  program_id: string;
  participant_id: string;
  module_slug: string;
  draft_data: JsonObject;
  current_step: number;
  saved_at: string;
}

export interface ModuleSubmissionRow {
  id: string;
  program_id: string;
  participant_id: string;
  team_id: string | null;
  module_slug: string;
  title: string;
  status: string;
  pdf_status: string;
  pdf_error_message: string | null;
  pdf_generated_at: string | null;
  input_data: JsonObject;
  output_data: JsonObject;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface ParticipantModuleProgressRow {
  id: string;
  program_id: string;
  participant_id: string;
  module_slug: string;
  status: string;
  current_step: number;
  input_data: JsonObject;
  output_data: JsonObject;
  admin_comment: string;
  reviewed_at: string | null;
  updated_at: string;
}

export interface FeedbackRow {
  id: string;
  program_id: string;
  participant_id: string;
  submission_id: string | null;
  module_slug: string | null;
  status: string;
  comment: string;
  next_action: string;
  created_at: string;
  updated_at: string;
}

export class OperationsRepositoryUnavailableError extends Error {
  constructor() {
    super("Supabase 운영 저장소가 설정되지 않았습니다.");
    this.name = "OperationsRepositoryUnavailableError";
  }
}

function getClient() {
  if (!hasSupabaseServerConfig()) {
    throw new OperationsRepositoryUnavailableError();
  }

  return createSupabaseServerClient();
}

function throwIfError(error: unknown) {
  if (error) {
    throw error;
  }
}

function requireData<T>(data: T | null, message: string) {
  if (!data) {
    throw new Error(message);
  }

  return data;
}

export async function listPrograms() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<OperationsProgramRow[]>();

  throwIfError(error);
  return data ?? [];
}

export async function getProgram(programId: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("id", programId)
    .maybeSingle<OperationsProgramRow>();

  throwIfError(error);
  return data ?? null;
}

export async function getProgramByCode(programCode: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("program_code", programCode)
    .maybeSingle<OperationsProgramRow>();

  throwIfError(error);
  return data ?? null;
}

export async function createProgram(input: {
  name: string;
  clientName?: string;
  programCode: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
  brief?: string;
}) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("programs")
    .insert({
      name: input.name,
      client_name: input.clientName ?? "",
      program_code: input.programCode,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      status: input.status ?? "active",
      brief: input.brief ?? ""
    })
    .select("*")
    .single<OperationsProgramRow>();

  throwIfError(error);
  return requireData(data, "프로그램 생성 결과가 없습니다.");
}

export async function listParticipants(programId: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("program_id", programId)
    .order("created_at", { ascending: true })
    .returns<OperationsParticipantRow[]>();

  throwIfError(error);
  return data ?? [];
}

export async function getParticipantByCode(programId: string, participantCode: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("program_id", programId)
    .eq("participant_code", participantCode)
    .maybeSingle<OperationsParticipantRow>();

  throwIfError(error);
  return data ?? null;
}

export async function createParticipant(input: {
  programId: string;
  teamId?: string | null;
  participantCode: string;
  name: string;
  email?: string;
  phone?: string;
  school?: string;
  major?: string;
  role?: string;
}) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("participants")
    .insert({
      program_id: input.programId,
      team_id: input.teamId ?? null,
      participant_code: input.participantCode,
      name: input.name,
      email: input.email ?? "",
      phone: input.phone ?? "",
      school: input.school ?? "",
      major: input.major ?? "",
      role: input.role ?? "participant"
    })
    .select("*")
    .single<OperationsParticipantRow>();

  throwIfError(error);
  return requireData(data, "참여자 생성 결과가 없습니다.");
}

export async function createParticipants(
  inputs: Array<{
    programId: string;
    teamId?: string | null;
    participantCode: string;
    name?: string;
    email?: string;
    phone?: string;
    school?: string;
    major?: string;
    role?: string;
  }>
) {
  if (!inputs.length) return [];

  const supabase = getClient();
  const { data, error } = await supabase
    .from("participants")
    .insert(
      inputs.map((input) => ({
        program_id: input.programId,
        team_id: input.teamId ?? null,
        participant_code: input.participantCode,
        name: input.name ?? input.participantCode,
        email: input.email ?? "",
        phone: input.phone ?? "",
        school: input.school ?? "",
        major: input.major ?? "",
        role: input.role ?? "participant"
      }))
    )
    .select("*")
    .returns<OperationsParticipantRow[]>();

  throwIfError(error);
  return data ?? [];
}

export async function getParticipantByJoinToken(joinToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("join_token", joinToken)
    .maybeSingle<OperationsParticipantRow>();

  throwIfError(error);
  return data ?? null;
}

export async function touchParticipantSeen(participantId: string, joined = false) {
  const supabase = getClient();
  const patch: Record<string, string> = { last_seen_at: new Date().toISOString() };
  if (joined) patch.joined_at = patch.last_seen_at;

  const { data, error } = await supabase
    .from("participants")
    .update(patch)
    .eq("id", participantId)
    .select("*")
    .single<OperationsParticipantRow>();

  throwIfError(error);
  return requireData(data, "참여자 접속 상태 저장 결과가 없습니다.");
}

export async function listTeams(programId: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("program_id", programId)
    .order("created_at", { ascending: true })
    .returns<OperationsTeamRow[]>();

  throwIfError(error);
  return data ?? [];
}

export async function getTeam(teamId: string | null | undefined) {
  if (!teamId) return null;

  const supabase = getClient();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .maybeSingle<OperationsTeamRow>();

  throwIfError(error);
  return data ?? null;
}

export async function listProgramModules(programId: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("program_modules")
    .select("*")
    .eq("program_id", programId)
    .order("sort_order", { ascending: true })
    .returns<OperationsProgramModuleRow[]>();

  throwIfError(error);
  return data ?? [];
}

export async function getModuleDraft(input: { programId: string; participantId: string; moduleSlug: string }) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("module_drafts")
    .select("*")
    .eq("program_id", input.programId)
    .eq("participant_id", input.participantId)
    .eq("module_slug", input.moduleSlug)
    .maybeSingle<ModuleDraftRow>();

  throwIfError(error);
  return data ?? null;
}

export async function upsertModuleDraft(input: {
  programId: string;
  participantId: string;
  moduleSlug: string;
  draftData: JsonObject;
  currentStep?: number;
}) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("module_drafts")
    .upsert(
      {
        program_id: input.programId,
        participant_id: input.participantId,
        module_slug: input.moduleSlug,
        draft_data: input.draftData,
        current_step: input.currentStep ?? 0,
        saved_at: new Date().toISOString()
      },
      { onConflict: "program_id,participant_id,module_slug" }
    )
    .select("*")
    .single<ModuleDraftRow>();

  throwIfError(error);
  return requireData(data, "모듈 draft 저장 결과가 없습니다.");
}

export async function upsertModuleProgress(input: {
  programId: string;
  participantId: string;
  moduleSlug: string;
  status: string;
  currentStep?: number;
  inputData?: JsonObject;
  outputData?: JsonObject;
  adminComment?: string;
  reviewedAt?: string | null;
}) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("participant_module_progress")
    .upsert(
      {
        program_id: input.programId,
        participant_id: input.participantId,
        module_slug: input.moduleSlug,
        status: input.status,
        current_step: input.currentStep ?? 0,
        input_data: input.inputData ?? {},
        output_data: input.outputData ?? {},
        admin_comment: input.adminComment ?? "",
        reviewed_at: input.reviewedAt ?? null,
        updated_at: new Date().toISOString()
      },
      { onConflict: "program_id,participant_id,module_slug" }
    )
    .select("*")
    .single<ParticipantModuleProgressRow>();

  throwIfError(error);
  return requireData(data, "모듈 진행 상태 저장 결과가 없습니다.");
}

export async function createModuleSubmission(input: {
  programId: string;
  participantId: string;
  teamId?: string | null;
  moduleSlug: string;
  title?: string;
  status?: string;
  pdfStatus?: string;
  inputData?: JsonObject;
  outputData?: JsonObject;
}) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("module_submissions")
    .insert({
      program_id: input.programId,
      participant_id: input.participantId,
      team_id: input.teamId ?? null,
      module_slug: input.moduleSlug,
      title: input.title ?? "",
      status: input.status ?? "submitted",
      pdf_status: input.pdfStatus ?? "idle",
      input_data: input.inputData ?? {},
      output_data: input.outputData ?? {}
    })
    .select("*")
    .single<ModuleSubmissionRow>();

  throwIfError(error);
  return requireData(data, "모듈 제출 저장 결과가 없습니다.");
}

export async function listModuleSubmissions(filters: { programId?: string; moduleSlug?: string; status?: string }) {
  const supabase = getClient();
  let query = supabase.from("module_submissions").select("*").order("submitted_at", { ascending: false });

  if (filters.programId) query = query.eq("program_id", filters.programId);
  if (filters.moduleSlug) query = query.eq("module_slug", filters.moduleSlug);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query.returns<ModuleSubmissionRow[]>();
  throwIfError(error);
  return data ?? [];
}

export async function updateModuleSubmissionPdfStatus(input: {
  submissionId: string;
  pdfStatus: "idle" | "generating" | "success" | "failed";
  pdfErrorMessage?: string;
}) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("module_submissions")
    .update({
      pdf_status: input.pdfStatus,
      pdf_error_message: input.pdfStatus === "failed" ? (input.pdfErrorMessage ?? "") : null,
      pdf_generated_at: input.pdfStatus === "success" ? new Date().toISOString() : null
    })
    .eq("id", input.submissionId)
    .select("*")
    .single<ModuleSubmissionRow>();

  throwIfError(error);
  return requireData(data, "모듈 제출 PDF 상태 저장 결과가 없습니다.");
}

export async function updateModuleSubmissionPdfStatusBySource(input: {
  source: string;
  sourceSubmissionId: string;
  pdfStatus: "idle" | "generating" | "success" | "failed";
  pdfErrorMessage?: string;
}) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("module_submissions")
    .update({
      pdf_status: input.pdfStatus,
      pdf_error_message: input.pdfStatus === "failed" ? (input.pdfErrorMessage ?? "") : null,
      pdf_generated_at: input.pdfStatus === "success" ? new Date().toISOString() : null
    })
    .contains("input_data", {
      source: input.source,
      sourceSubmissionId: input.sourceSubmissionId
    })
    .select("*")
    .returns<ModuleSubmissionRow[]>();

  throwIfError(error);
  return data ?? [];
}

export async function deleteModuleSubmissionsBySource(input: { source: string; sourceSubmissionId: string }) {
  const supabase = getClient();
  const { error } = await supabase
    .from("module_submissions")
    .delete()
    .contains("input_data", {
      source: input.source,
      sourceSubmissionId: input.sourceSubmissionId
    });

  throwIfError(error);
}

export async function createFeedback(input: {
  programId: string;
  participantId: string;
  submissionId?: string | null;
  moduleSlug?: string | null;
  status: string;
  comment?: string;
  nextAction?: string;
}) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("feedbacks")
    .insert({
      program_id: input.programId,
      participant_id: input.participantId,
      submission_id: input.submissionId ?? null,
      module_slug: input.moduleSlug ?? null,
      status: input.status,
      comment: input.comment ?? "",
      next_action: input.nextAction ?? ""
    })
    .select("*")
    .single<FeedbackRow>();

  throwIfError(error);
  return requireData(data, "피드백 저장 결과가 없습니다.");
}
