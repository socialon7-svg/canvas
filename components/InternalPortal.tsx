"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FeedbackStatus, HighViewOperationsState, LeanCanvasSubmission } from "@/lib/types";
import { deleteSubmission, loadSubmissions } from "@/lib/storage";
import {
  createParticipant,
  createProgram,
  createTeam,
  defaultOperationsState,
  exportOperationsState,
  findFeedback,
  getProgramStats,
  loadOperationsState,
  resetOperationsState,
  saveFeedback,
  saveOperationsState
} from "@/lib/operationsStorage";

type InternalTab = "dashboard" | "programs" | "participants" | "teams" | "submissions" | "report";

const ADMIN_SESSION_KEY = "highviewlab-internal-authorized";
const ADMIN_PASSWORD_KEY = "highviewlab-internal-password";

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

async function loadServerSubmissions(adminPassword: string) {
  const response = await fetch("/api/submissions", {
    headers: { "x-admin-password": adminPassword }
  });
  const data = (await response.json()) as {
    submissions?: LeanCanvasSubmission[];
    code?: string;
    error?: string;
  };

  if (response.status === 503 && (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY")) {
    return { submissions: loadSubmissions(), fallback: true };
  }

  if (!response.ok || !data.submissions) {
    throw new Error(data.error || "제출 목록을 불러오지 못했습니다.");
  }

  return { submissions: data.submissions, fallback: false };
}

function MetricCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <strong className="mt-2 block text-3xl text-gray-950">{value}</strong>
      <p className="mt-2 text-sm text-gray-600">{hint}</p>
    </section>
  );
}

export default function InternalPortal() {
  const [state, setState] = useState<HighViewOperationsState>(() => defaultOperationsState());
  const [currentProgramId, setCurrentProgramId] = useState("");
  const [tab, setTab] = useState<InternalTab>("dashboard");
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [submissions, setSubmissions] = useState<LeanCanvasSubmission[]>([]);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const loaded = loadOperationsState();
    setState(loaded);
    setCurrentProgramId(loaded.programs[0]?.id || "");

    const storedPassword = readSessionValue(ADMIN_PASSWORD_KEY);
    const storedAuth = readSessionValue(ADMIN_SESSION_KEY) === "true";
    if (!storedAuth || !storedPassword) return;

    setAuthorized(true);
    setRefreshing(true);
    loadServerSubmissions(storedPassword)
      .then((result) => {
        setSubmissions(result.submissions);
        setFallbackMode(result.fallback);
        if (result.fallback) setNotice("Supabase 대신 이 브라우저의 임시 제출 목록을 표시합니다.");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "제출 목록을 불러오지 못했습니다."))
      .finally(() => setRefreshing(false));
  }, []);

  const currentProgram = state.programs.find((program) => program.id === currentProgramId) || state.programs[0];
  const programTeams = useMemo(
    () => (currentProgram ? state.teams.filter((team) => team.programId === currentProgram.id) : []),
    [state, currentProgram]
  );
  const programParticipants = useMemo(
    () =>
      currentProgram ? state.participants.filter((participant) => participant.programId === currentProgram.id) : [],
    [state, currentProgram]
  );
  const programSubmissions = useMemo(
    () =>
      currentProgram
        ? submissions.filter(
            (submission) =>
              submission.participant.operation?.programId === currentProgram.id ||
              submission.participant.educationName === currentProgram.name
          )
        : [],
    [currentProgram, submissions]
  );
  const stats = currentProgram ? getProgramStats(state, currentProgram.id, submissions) : null;

  const persistState = (nextState: HighViewOperationsState) => {
    saveOperationsState(nextState);
    setState({ ...nextState });
  };

  const refreshSubmissions = async (adminPassword = readSessionValue(ADMIN_PASSWORD_KEY)) => {
    setRefreshing(true);
    setError("");
    setNotice("");
    try {
      const result = await loadServerSubmissions(adminPassword);
      setSubmissions(result.submissions);
      setFallbackMode(result.fallback);
      if (result.fallback) setNotice("Supabase 대신 이 브라우저의 임시 제출 목록을 표시합니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "제출 목록을 불러오지 못했습니다.");
    } finally {
      setRefreshing(false);
    }
  };

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = (await response.json()) as { ok?: boolean };
      if (!response.ok || !data.ok) throw new Error("암호가 올바르지 않습니다.");

      writeSessionValue(ADMIN_SESSION_KEY, "true");
      writeSessionValue(ADMIN_PASSWORD_KEY, password);
      setAuthorized(true);
      setPassword("");
      await refreshSubmissions(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeSessionValue(ADMIN_SESSION_KEY);
    removeSessionValue(ADMIN_PASSWORD_KEY);
    setAuthorized(false);
    setSubmissions([]);
  };

  const addProgram = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const program = createProgram({
      name: String(formData.get("name") || "").trim(),
      clientName: String(formData.get("clientName") || "").trim(),
      startDate: String(formData.get("startDate") || "").trim(),
      endDate: String(formData.get("endDate") || "").trim(),
      brief: String(formData.get("brief") || "").trim()
    });
    if (!program.name || !program.clientName) {
      setError("프로그램명과 기관명은 필수입니다.");
      return;
    }
    const nextState = { ...state, programs: [program, ...state.programs] };
    persistState(nextState);
    setCurrentProgramId(program.id);
    setNotice("프로그램을 생성했습니다.");
    event.currentTarget.reset();
  };

  const addInvites = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentProgram) return;
    const formData = new FormData(event.currentTarget);
    const count = Math.max(1, Math.min(100, Number(formData.get("count") || 1)));
    const school = String(formData.get("school") || "").trim();
    const invites = Array.from({ length: count }, () => createParticipant(currentProgram.id, school));
    persistState({ ...state, participants: [...invites, ...state.participants] });
    setNotice(`${count}개의 참여자 코드를 생성했습니다.`);
  };

  const addTeam = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentProgram) return;
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const memo = String(formData.get("memo") || "").trim();
    if (!name) {
      setError("팀명을 입력해주세요.");
      return;
    }
    const team = createTeam(currentProgram.id, name, memo);
    persistState({ ...state, teams: [team, ...state.teams] });
    setNotice("팀을 생성했습니다.");
    event.currentTarget.reset();
  };

  const assignTeam = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const participantId = String(formData.get("participantId") || "");
    const teamId = String(formData.get("teamId") || "");
    const participant = state.participants.find((item) => item.id === participantId);
    if (!participant) return;
    participant.teamId = teamId;
    persistState(state);
    setNotice("팀 배정을 저장했습니다.");
  };

  const handleReset = () => {
    if (!window.confirm("운영 데모 데이터를 초기화할까요? 제출물은 삭제되지 않습니다.")) return;
    const nextState = resetOperationsState();
    setState(nextState);
    setCurrentProgramId(nextState.programs[0]?.id || "");
    setNotice("운영 데모 데이터를 초기화했습니다.");
  };

  const handleFeedback = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentProgram) return;
    const form = event.currentTarget;
    const submissionId = form.dataset.submissionId || "";
    const submission = submissions.find((item) => item.id === submissionId);
    if (!submission) return;
    const formData = new FormData(form);
    saveFeedback(state, {
      programId: currentProgram.id,
      participantId: submission.participant.operation?.participantId || submission.id,
      submissionId,
      comment: String(formData.get("comment") || "").trim(),
      nextAction: String(formData.get("nextAction") || "").trim(),
      status: String(formData.get("status") || "needs_revision") as FeedbackStatus
    });
    persistState(state);
    setNotice("피드백을 저장했습니다.");
  };

  const removeSubmission = async (submission: LeanCanvasSubmission) => {
    if (!window.confirm(`${submission.participant.ideaName || "선택한 제출물"}을 삭제할까요?`)) return;
    const adminPassword = readSessionValue(ADMIN_PASSWORD_KEY);

    if (fallbackMode) {
      setSubmissions(deleteSubmission(submission.id));
      return;
    }

    const response = await fetch(`/api/submissions/${submission.id}/delete`, {
      method: "POST",
      headers: { "x-admin-password": adminPassword }
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      alert(data.error || "삭제에 실패했습니다.");
      return;
    }
    setSubmissions((current) => current.filter((item) => item.id !== submission.id));
  };

  if (!authorized) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
        <main className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">Internal Portal</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">내부직원 로그인</h1>
          <p className="mt-2 text-sm text-gray-600">암호만 입력하면 운영 포털과 제출 목록을 관리할 수 있습니다.</p>
          <form className="mt-6 space-y-4" onSubmit={login}>
            <label>
              <span className="mb-1 block text-sm font-semibold text-gray-800">암호</span>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            <button className="w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:bg-gray-400" disabled={loading}>
              {loading ? "확인 중..." : "접속하기"}
            </button>
          </form>
        </main>
      </div>
    );
  }

  const tabs: Array<{ key: InternalTab; label: string }> = [
    { key: "dashboard", label: "대시보드" },
    { key: "programs", label: "프로그램" },
    { key: "participants", label: "참여자" },
    { key: "teams", label: "팀" },
    { key: "submissions", label: "제출/피드백" },
    { key: "report", label: "결과보고" }
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <header className="mb-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">HighViewLab Internal OS</p>
            <h1 className="mt-1 text-3xl font-bold text-gray-950">교육/캠프 운영 포털</h1>
            <p className="mt-2 text-sm text-gray-600">프로그램, 참여자, 팀, 린캔버스 제출, 피드백을 한 흐름으로 관리합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={currentProgram?.id || ""}
              onChange={(event) => setCurrentProgramId(event.target.value)}
            >
              {state.programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
            <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={() => refreshSubmissions()} disabled={refreshing}>
              {refreshing ? "새로고침 중..." : "제출 새로고침"}
            </button>
            <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={() => exportOperationsState(state)}>
              운영 데이터 백업
            </button>
            <button className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700" onClick={handleReset}>
              데모 초기화
            </button>
            <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={logout}>
              로그아웃
            </button>
          </div>
        </div>
        <nav className="mt-5 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                tab === item.key ? "bg-blue-700 text-white" : "border border-gray-300 bg-white text-gray-800"
              }`}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {error ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{notice}</p> : null}

      {tab === "dashboard" && currentProgram && stats ? (
        <main className="grid gap-4">
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard label="참여자" value={stats.participants} hint={`접속/등록 ${stats.joined}명`} />
            <MetricCard label="팀" value={stats.teams} hint="프로그램별 팀 구성" />
            <MetricCard label="제출률" value={`${stats.submitRate}%`} hint={`제출 ${stats.submitted}/${stats.participants}`} />
            <MetricCard label="피드백" value={stats.feedbacks} hint="저장된 피드백" />
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950">{currentProgram.name}</h2>
            <p className="mt-2 text-sm text-gray-600">
              기관: {currentProgram.clientName} · 기간: {currentProgram.startDate} ~ {currentProgram.endDate} · 코드:{" "}
              <span className="font-bold">{currentProgram.programCode}</span>
            </p>
            <p className="mt-3 text-sm text-gray-700">{currentProgram.brief}</p>
          </section>
        </main>
      ) : null}

      {tab === "programs" ? (
        <main className="grid gap-4 lg:grid-cols-[420px_1fr]">
          <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={addProgram}>
            <h2 className="text-lg font-bold text-gray-950">새 프로그램 생성</h2>
            <div className="mt-4 space-y-3">
              <input name="name" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="프로그램명" />
              <input name="clientName" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="기관명" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="startDate" type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                <input name="endDate" type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <textarea name="brief" className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="운영 메모" />
              <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white">생성하기</button>
            </div>
          </form>
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3">프로그램</th>
                  <th className="px-4 py-3">기관</th>
                  <th className="px-4 py-3">코드</th>
                  <th className="px-4 py-3">기간</th>
                  <th className="px-4 py-3">선택</th>
                </tr>
              </thead>
              <tbody>
                {state.programs.map((program) => (
                  <tr key={program.id} className="border-t border-gray-200">
                    <td className="px-4 py-3 font-semibold">{program.name}</td>
                    <td className="px-4 py-3">{program.clientName}</td>
                    <td className="px-4 py-3">{program.programCode}</td>
                    <td className="px-4 py-3">{program.startDate} ~ {program.endDate}</td>
                    <td className="px-4 py-3">
                      <button className="font-semibold text-blue-700 underline" onClick={() => setCurrentProgramId(program.id)}>
                        선택
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </main>
      ) : null}

      {tab === "participants" && currentProgram ? (
        <main className="grid gap-4">
          <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:flex md:items-end md:gap-3" onSubmit={addInvites}>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-gray-800">생성 인원</span>
              <input name="count" type="number" min="1" max="100" defaultValue="5" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="mt-3 block md:mt-0">
              <span className="mb-1 block text-sm font-semibold text-gray-800">기본 소속</span>
              <input name="school" className="rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="선택 입력" />
            </label>
            <button className="mt-3 rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white md:mt-0">초대코드 생성</button>
            <p className="mt-3 text-sm text-gray-600 md:mt-0">프로그램 코드: <span className="font-bold">{currentProgram.programCode}</span></p>
          </form>
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3">코드</th>
                  <th className="px-4 py-3">이름/이메일</th>
                  <th className="px-4 py-3">소속</th>
                  <th className="px-4 py-3">팀</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">제출</th>
                </tr>
              </thead>
              <tbody>
                {programParticipants.map((participant) => {
                  const team = programTeams.find((item) => item.id === participant.teamId);
                  return (
                    <tr key={participant.id} className="border-t border-gray-200">
                      <td className="px-4 py-3 font-semibold">{participant.code}</td>
                      <td className="px-4 py-3">{participant.name || "미등록"}<br /><span className="text-xs text-gray-500">{participant.email}</span></td>
                      <td className="px-4 py-3">{participant.school || "-"}<br /><span className="text-xs text-gray-500">{participant.major}</span></td>
                      <td className="px-4 py-3">{team?.name || "미배정"}</td>
                      <td className="px-4 py-3">{participant.joinedAt ? "접속" : "초대됨"}</td>
                      <td className="px-4 py-3">{participant.latestSubmissionId ? "완료" : "대기"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </main>
      ) : null}

      {tab === "teams" ? (
        <main className="grid gap-4 lg:grid-cols-2">
          <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={addTeam}>
            <h2 className="text-lg font-bold text-gray-950">팀 생성</h2>
            <div className="mt-4 space-y-3">
              <input name="name" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="팀명" />
              <textarea name="memo" className="min-h-20 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="메모" />
              <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white">팀 생성</button>
            </div>
          </form>
          <form className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" onSubmit={assignTeam}>
            <h2 className="text-lg font-bold text-gray-950">참여자 팀 배정</h2>
            <div className="mt-4 space-y-3">
              <select name="participantId" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                {programParticipants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name || participant.code} / {participant.code}
                  </option>
                ))}
              </select>
              <select name="teamId" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">미배정</option>
                {programTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white">배정하기</button>
            </div>
          </form>
          <section className="grid gap-3 lg:col-span-2 md:grid-cols-2">
            {programTeams.map((team) => {
              const members = programParticipants.filter((participant) => participant.teamId === team.id);
              return (
                <article key={team.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="font-bold text-gray-950">{team.name}</h3>
                  <p className="mt-1 text-sm text-gray-600">{team.memo || "메모 없음"}</p>
                  <p className="mt-3 text-sm text-gray-700">멤버 {members.length}명: {members.map((member) => member.name || member.code).join(", ") || "없음"}</p>
                </article>
              );
            })}
          </section>
        </main>
      ) : null}

      {tab === "submissions" ? (
        <main className="grid gap-4">
          {programSubmissions.length === 0 ? (
            <section className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-600 shadow-sm">
              이 프로그램에 연결된 린캔버스 제출물이 없습니다.
            </section>
          ) : (
            programSubmissions.map((submission) => {
              const feedback = state ? findFeedback(state, submission.id) : undefined;
              return (
                <article key={submission.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-950">{submission.participant.ideaName || "아이디어명 없음"}</h2>
                      <p className="mt-1 text-sm text-gray-600">
                        {submission.participant.teamName || "팀명 없음"} · {submission.participant.participantName || "참가자 없음"} ·{" "}
                        {new Date(submission.createdAt).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold" href={`/preview/${submission.id}`}>
                        미리보기
                      </Link>
                      <button className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700" onClick={() => removeSubmission(submission)}>
                        삭제
                      </button>
                    </div>
                  </div>
                  <form className="mt-4 grid gap-3" data-submission-id={submission.id} onSubmit={handleFeedback}>
                    <textarea
                      name="comment"
                      className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      defaultValue={feedback?.comment || ""}
                      placeholder="참여자가 다음 수정에 바로 쓸 수 있는 구체적 피드백"
                    />
                    <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                      <input
                        name="nextAction"
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                        defaultValue={feedback?.nextAction || ""}
                        placeholder="다음 액션"
                      />
                      <select name="status" className="rounded-md border border-gray-300 px-3 py-2 text-sm" defaultValue={feedback?.status || "needs_revision"}>
                        <option value="needs_revision">수정 필요</option>
                        <option value="good">양호</option>
                        <option value="excellent">우수</option>
                      </select>
                      <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white">피드백 저장</button>
                    </div>
                  </form>
                </article>
              );
            })
          )}
        </main>
      ) : null}

      {tab === "report" && stats ? (
        <main className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700">HighViewLab Result Report</p>
              <h2 className="mt-1 text-2xl font-bold text-gray-950">{currentProgram?.name}</h2>
              <p className="mt-1 text-sm text-gray-600">제출 {stats.submissions}건 · 참여자 {stats.participants}명 · 제출률 {stats.submitRate}%</p>
            </div>
            <button className="no-print rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white" onClick={() => window.print()}>
              결과보고 인쇄
            </button>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3">팀</th>
                  <th className="px-4 py-3">작성자</th>
                  <th className="px-4 py-3">아이디어</th>
                  <th className="px-4 py-3">피드백</th>
                  <th className="px-4 py-3">열람</th>
                </tr>
              </thead>
              <tbody>
                {programSubmissions.map((submission) => {
                  const feedback = state ? findFeedback(state, submission.id) : undefined;
                  return (
                    <tr key={submission.id} className="border-t border-gray-200">
                      <td className="px-4 py-3">{submission.participant.teamName || "-"}</td>
                      <td className="px-4 py-3">{submission.participant.participantName || "-"}</td>
                      <td className="px-4 py-3">{submission.participant.ideaName || "-"}</td>
                      <td className="px-4 py-3">{feedback?.status || "미작성"}</td>
                      <td className="px-4 py-3">
                        <Link className="font-semibold text-blue-700 underline" href={`/preview/${submission.id}`}>
                          보기
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      ) : null}
    </div>
  );
}
