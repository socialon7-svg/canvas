"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { HighViewOperationsState, HighViewParticipant, LeanCanvasSubmission } from "@/lib/types";
import { getSubmission, saveParticipantPrefill } from "@/lib/storage";
import { normalizeAccessCode, validateAccessCodeInput } from "@/lib/normalize";
import {
  defaultOperationsState,
  findFeedback,
  loadOperationsState,
  saveOperationsState,
  toParticipantInput
} from "@/lib/operationsStorage";

type ParticipantTab = "home" | "profile" | "write" | "feedback";

const PROGRAM_SESSION_KEY = "highviewlab-participant-program-id";
const PARTICIPANT_SESSION_KEY = "highviewlab-participant-id";

function readSessionValue(key: string) {
  try {
    return window.sessionStorage?.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeSessionValue(key: string, value: string) {
  try {
    window.sessionStorage?.setItem(key, value);
  } catch {
    // Session storage can be blocked in embedded browser contexts.
  }
}

function removeSessionValue(key: string) {
  try {
    window.sessionStorage?.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export default function ParticipantPortal() {
  const router = useRouter();
  const [state, setState] = useState<HighViewOperationsState>(() => defaultOperationsState());
  const [programId, setProgramId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [tab, setTab] = useState<ParticipantTab>("home");
  const [programCode, setProgramCode] = useState("");
  const [participantCode, setParticipantCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [latestSubmission, setLatestSubmission] = useState<LeanCanvasSubmission | null>(null);

  useEffect(() => {
    const loaded = loadOperationsState();
    setState(loaded);
    setProgramId(readSessionValue(PROGRAM_SESSION_KEY));
    setParticipantId(readSessionValue(PARTICIPANT_SESSION_KEY));
  }, []);

  const program = state.programs.find((item) => item.id === programId);
  const participant = state.participants.find((item) => item.id === participantId);
  const team = state.teams.find((item) => item.id === participant?.teamId);
  const feedback = findFeedback(state, participant?.latestSubmissionId);
  const latestPdfStatus = latestSubmission?.pdfStatus ?? "success";
  const latestSubmissionCode = latestSubmission?.id.slice(0, 8).toUpperCase();
  const progressSteps = [
    { label: "입장", done: Boolean(program && participant) },
    { label: "내 정보", done: Boolean(participant?.name?.trim()) },
    { label: "과제 제출", done: Boolean(participant?.latestSubmissionId || latestSubmission) },
    { label: "피드백", done: Boolean(feedback) }
  ];
  const completedSteps = progressSteps.filter((step) => step.done).length;
  const progressPercent = Math.round((completedSteps / progressSteps.length) * 100);

  useEffect(() => {
    let cancelled = false;

    async function loadLatestSubmission() {
      if (!participant?.latestSubmissionId) {
        setLatestSubmission(null);
        return;
      }

      const local = getSubmission(participant.latestSubmissionId);
      if (local) {
        setLatestSubmission(local);
        return;
      }

      try {
        const response = await fetch(`/api/submissions/${participant.latestSubmissionId}`);
        const data = (await response.json()) as { submission?: LeanCanvasSubmission };
        if (!cancelled) setLatestSubmission(response.ok && data.submission ? data.submission : null);
      } catch {
        if (!cancelled) setLatestSubmission(null);
      }
    }

    loadLatestSubmission();
    return () => {
      cancelled = true;
    };
  }, [participant?.latestSubmissionId]);

  const persistState = (nextState: HighViewOperationsState) => {
    saveOperationsState(nextState);
    setState({ ...nextState });
  };

  const login = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const validation = validateAccessCodeInput({
      programCode: String(formData.get("programCode") || programCode),
      participantCode: String(formData.get("participantCode") || participantCode)
    });
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    const { programCode: submittedProgramCode, participantCode: submittedParticipantCode } = validation.value;
    const matchedProgram = state.programs.find(
      (item) => normalizeAccessCode(item.programCode) === submittedProgramCode
    );
    if (!matchedProgram) {
      setError("입장 정보를 찾을 수 없습니다. 프로그램 코드와 참여자 코드를 다시 확인해주세요.");
      return;
    }

    const matchedParticipant = state.participants.find(
      (item) =>
        item.programId === matchedProgram.id &&
        normalizeAccessCode(item.code) === submittedParticipantCode
    );
    if (!matchedParticipant) {
      setError("입장 정보를 찾을 수 없습니다. 프로그램 코드와 참여자 코드를 다시 확인해주세요.");
      return;
    }

    matchedParticipant.joinedAt ||= new Date().toISOString();
    matchedParticipant.lastSeenAt = new Date().toISOString();
    persistState(state);
    writeSessionValue(PROGRAM_SESSION_KEY, matchedProgram.id);
    writeSessionValue(PARTICIPANT_SESSION_KEY, matchedParticipant.id);
    setProgramId(matchedProgram.id);
    setParticipantId(matchedParticipant.id);
    setError("");
    setNotice("입장했습니다. 내 정보를 확인한 뒤 린캔버스를 작성하세요.");
  };

  const logout = () => {
    removeSessionValue(PROGRAM_SESSION_KEY);
    removeSessionValue(PARTICIPANT_SESSION_KEY);
    setProgramId("");
    setParticipantId("");
    setProgramCode("");
    setParticipantCode("");
    setTab("home");
    setNotice("");
  };

  const updateProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!participant) return;
    const formData = new FormData(event.currentTarget);
    Object.assign(participant, {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      school: String(formData.get("school") || "").trim(),
      major: String(formData.get("major") || "").trim(),
      role: String(formData.get("role") || "").trim(),
      lastSeenAt: new Date().toISOString()
    } satisfies Partial<HighViewParticipant>);
    persistState(state);
    setNotice("내 정보를 저장했습니다.");
  };

  const startCanvas = () => {
    if (!program || !participant) return;
    saveParticipantPrefill(toParticipantInput(program, participant, team));
    router.push("/participant/canvas");
  };

  if (!program || !participant) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
        <main className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">참여자 포털</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">참여자 입장</h1>
          <p className="mt-2 text-sm text-gray-600">
            내부직원이 발급한 프로그램 코드와 참여자 코드를 입력하세요.
          </p>
          <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-600">
            공백, 하이픈, 대소문자는 자동으로 보정됩니다. 입장이 안 되면 화면의 코드와 안내받은 코드를 다시 비교하세요.
          </p>
          <form className="mt-6 space-y-4" onSubmit={login}>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">프로그램 코드</span>
              <input
                name="programCode"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="예: HV-DEMO"
                value={programCode}
                onChange={(event) => setProgramCode(normalizeAccessCode(event.target.value))}
              />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">참여자 코드</span>
              <input
                name="participantCode"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="예: P-DEMO1"
                value={participantCode}
                onChange={(event) => setParticipantCode(normalizeAccessCode(event.target.value))}
              />
            </label>
            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {error} 공백과 소문자는 자동으로 보정됩니다. 예: HV-DEMO / P-DEMO1
              </p>
            ) : null}
            <button
              className="w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-800 active:bg-blue-900"
              type="submit"
            >
              입장하기
            </button>
          </form>
          <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
            <p className="mb-1 font-bold">데모 체험하기</p>
            <p>
              프로그램 코드: <code className="rounded bg-blue-100 px-1 py-0.5 font-mono font-bold">HV-DEMO</code>
            </p>
            <p>
              참여자 코드: <code className="rounded bg-blue-100 px-1 py-0.5 font-mono font-bold">P-DEMO1</code>
            </p>
          </div>
          <Link className="mt-4 inline-block text-sm font-semibold text-gray-500 hover:text-gray-700" href="/">
            역할 선택으로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  const tabs: Array<{ key: ParticipantTab; label: string }> = [
    { key: "home", label: "홈" },
    { key: "profile", label: "내 정보" },
    { key: "write", label: "작성하기" },
    { key: "feedback", label: "피드백" }
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">참여자 워크스페이스 · {program.programCode}</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">{program.name}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {participant.name || participant.code} · {team?.name || "미배정"} · {program.clientName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                tab === item.key ? "bg-blue-700 text-white" : "border border-gray-300 bg-white text-gray-800"
              }`}
              onClick={() => setTab(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
          <button className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700" onClick={logout}>
            나가기
          </button>
        </div>
      </header>

      {notice ? (
        <p className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{notice}</p>
      ) : null}

      {tab === "home" ? (
        <main className="grid gap-4 md:grid-cols-3">
          <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 shadow-sm md:col-span-3">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700">오늘의 과제</p>
                <h2 className="mt-1 text-xl font-bold text-gray-950">린캔버스 초안 작성 및 제출</h2>
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  {latestSubmission
                    ? "이미 제출된 산출물이 있습니다. 필요하면 제출물을 다시 열어 PDF와 피드백 상태를 확인하세요."
                    : "아이디어 정보를 입력하면 AI 초안이 생성되고, 수정 후 PDF 산출물로 제출됩니다."}
                </p>
              </div>
              <button
                className="rounded-md bg-blue-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-800 active:bg-blue-900"
                onClick={() => (latestSubmission ? router.push(`/preview/${latestSubmission.id}`) : startCanvas())}
                type="button"
              >
                {latestSubmission ? "제출물 확인하기" : "과제 작성 시작"}
              </button>
            </div>
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:col-span-3">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-500">내 배정 확인</p>
                <h2 className="mt-1 text-xl font-bold text-gray-950">{participant.name || participant.code}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  아래 정보가 다르면 과제 작성 전에 운영진에게 알려주세요.
                </p>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:min-w-[520px]">
                <div className="rounded-md bg-gray-50 p-3">
                  <dt className="text-gray-500">프로그램</dt>
                  <dd className="mt-1 font-semibold text-gray-950">{program.name}</dd>
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <dt className="text-gray-500">팀</dt>
                  <dd className="mt-1 font-semibold text-gray-950">{team?.name || "미배정"}</dd>
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <dt className="text-gray-500">참여자 코드</dt>
                  <dd className="mt-1 font-mono font-semibold text-gray-950">{participant.code}</dd>
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <dt className="text-gray-500">소속</dt>
                  <dd className="mt-1 font-semibold text-gray-950">{participant.school || "미입력"}</dd>
                </div>
              </dl>
            </div>
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:col-span-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-500">진행률</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-950">{progressPercent}% 완료</h2>
              </div>
              <p className="text-sm text-gray-600">
                {completedSteps}/{progressSteps.length}단계 완료
              </p>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {progressSteps.map((step) => (
                <div
                  key={step.label}
                  className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                    step.done ? "border-blue-200 bg-blue-50 text-blue-800" : "border-gray-200 bg-gray-50 text-gray-500"
                  }`}
                >
                  {step.done ? "완료" : "대기"} · {step.label}
                </div>
              ))}
            </div>
          </section>
          {latestSubmission ? (
            <section className="rounded-lg border border-green-200 bg-green-50 p-5 shadow-sm md:col-span-3">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-700">제출 완료 확인</p>
                  <h2 className="mt-1 text-xl font-bold text-gray-950">
                    {latestSubmission.participant.ideaName || "린캔버스 제출물"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-green-900">
                    운영진 제출 목록에 접수된 상태입니다. 제출번호 {latestSubmissionCode}
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-3">
                    <p>
                      <span className="font-semibold">제출 시간</span>
                      <br />
                      {new Date(latestSubmission.createdAt).toLocaleString("ko-KR")}
                    </p>
                    <p>
                      <span className="font-semibold">PDF 상태</span>
                      <br />
                      <span className={latestPdfStatus === "failed" ? "font-bold text-red-700" : "font-bold text-green-700"}>
                        {latestPdfStatus === "failed" ? "PDF 오류" : "PDF 정상"}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold">피드백</span>
                      <br />
                      {feedback ? "도착" : "대기 중"}
                    </p>
                  </div>
                </div>
                <button
                  className="w-full rounded-md bg-green-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-800 sm:w-auto"
                  onClick={() => router.push(`/preview/${latestSubmission.id}`)}
                  type="button"
                >
                  제출물 열람
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm md:col-span-3">
              <p className="text-sm font-semibold text-amber-800">아직 제출 전입니다</p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                최종 제출이 완료되면 이 자리에 제출 시간, PDF 상태, 제출물 열람 버튼이 표시됩니다.
              </p>
            </section>
          )}
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">내 상태</p>
            <strong className="mt-2 block text-2xl text-gray-950">{participant.name ? "등록" : "미등록"}</strong>
            <p className="mt-2 text-sm text-gray-600">내 정보를 먼저 저장하면 결과보고서 품질이 좋아집니다.</p>
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">팀</p>
            <strong className="mt-2 block text-2xl text-gray-950">{team?.name || "미배정"}</strong>
            <p className="mt-2 text-sm text-gray-600">{team?.memo || "내부직원이 팀을 배정합니다."}</p>
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">제출</p>
            <strong className="mt-2 block text-2xl text-gray-950">{participant.latestSubmissionId ? "완료" : "대기"}</strong>
            <p className="mt-2 text-sm text-gray-600">피드백: {feedback ? "도착" : "대기 중"}</p>
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:col-span-3">
            <h2 className="text-lg font-bold text-gray-950">사용 순서</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              내 정보 입력 → 린캔버스 과제 작성 → 수정 후 제출 → 피드백 확인 → 필요하면 다시 작성
            </p>
          </section>
        </main>
      ) : null}

      {tab === "profile" ? (
        <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={updateProfile}>
          <h2 className="text-lg font-bold text-gray-950">참여자 정보</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">이름</span>
              <input name="name" defaultValue={participant.name} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">이메일</span>
              <input name="email" defaultValue={participant.email} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">연락처</span>
              <input name="phone" defaultValue={participant.phone} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">소속/학교</span>
              <input name="school" defaultValue={participant.school} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">학과/부서</span>
              <input name="major" defaultValue={participant.major} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">팀 내 역할</span>
              <input name="role" defaultValue={participant.role} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button className="rounded-md bg-blue-700 px-5 py-2 text-sm font-bold text-white" type="submit">
              저장하기
            </button>
          </div>
        </form>
      ) : null}

      {tab === "write" ? (
        <main className="grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">오늘의 과제: 린캔버스 작성</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            기존 린캔버스 입력 화면으로 이동합니다. 교육명, 팀명, 참가자명은 자동으로 채워집니다.
          </p>
          <button className="mt-5 rounded-md bg-blue-700 px-5 py-3 text-sm font-bold text-white" onClick={startCanvas}>
            린캔버스 과제 작성 시작
          </button>
          </section>

          <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">모두의창업</p>
            <h2 className="mt-1 text-lg font-bold text-gray-950">신청서 초안 생성</h2>
            <p className="mt-2 text-sm leading-6 text-blue-950">
              Q1~Q8 답변, 증거 문장, 정책 키워드, 최종 체크리스트를 자동 생성합니다. 신청서 제출 전 보완용으로 사용하세요.
            </p>
            <button
              className="mt-5 rounded-md bg-blue-700 px-5 py-3 text-sm font-bold text-white"
              onClick={() => router.push("/modu-startup")}
              type="button"
            >
              모두의창업 초안 생성
            </button>
          </section>
        </main>
      ) : null}

      {tab === "feedback" ? (
        <main className="grid gap-4">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-950">내 제출물</h2>
            {latestSubmission ? (
              <div className="mt-3 text-sm text-gray-700">
                <p className="font-semibold">{latestSubmission.participant.ideaName || "아이디어명 없음"}</p>
                <p className="mt-1 text-gray-600">{new Date(latestSubmission.createdAt).toLocaleString("ko-KR")} 제출</p>
                <button
                  className="mt-3 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold"
                  onClick={() => router.push(`/preview/${latestSubmission.id}`)}
                >
                  제출물 열람
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-600">아직 연결된 제출물이 없습니다. 최종 제출 후 다시 확인하세요.</p>
            )}
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-950">피드백</h2>
            {feedback ? (
              <div className="mt-3 space-y-3 text-sm">
                <p>
                  <span className="rounded-full bg-blue-50 px-3 py-1 font-bold text-blue-700">{feedback.status}</span>
                </p>
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="font-bold text-gray-900">코멘트</p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-700">{feedback.comment || "-"}</p>
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <p className="font-bold text-gray-900">다음 액션</p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-700">{feedback.nextAction || "-"}</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-600">아직 피드백이 없습니다. 운영진 검토가 끝나면 이곳에 코멘트와 다음 액션이 표시됩니다.</p>
            )}
          </section>
        </main>
      ) : null}
    </div>
  );
}
