const baseUrl = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, init = {}) {
  return fetch(`${baseUrl}${path}`, { redirect: "manual", ...init });
}

async function run() {
  const home = await request("/");
  assert(home.status === 200, `홈 응답이 200이 아닙니다: ${home.status}`);

  const admin = await request("/admin");
  const adminLocation = admin.headers.get("location") || "";
  assert([307, 308].includes(admin.status), `/admin 리다이렉트 상태가 올바르지 않습니다: ${admin.status}`);
  assert(adminLocation.includes("/internal?tab=submissions"), `/admin 이동 경로가 올바르지 않습니다: ${adminLocation}`);

  const submissions = await request("/api/submissions");
  assert(submissions.status === 401, `비인증 제출 목록 응답이 401이 아닙니다: ${submissions.status}`);

  const drafts = await request(
    "/api/module-drafts?programId=smoke-program&participantId=smoke-participant&moduleSlug=lean-canvas"
  );
  assert(drafts.status === 401, `비인증 draft 응답이 401이 아닙니다: ${drafts.status}`);

  const moduleSubmission = await request("/api/module-submissions", { method: "POST" });
  assert(moduleSubmission.status === 401, `비인증 모듈 제출 응답이 401이 아닙니다: ${moduleSubmission.status}`);

  const moduleGeneration = await request("/api/generate-startup-module", { method: "POST" });
  assert(moduleGeneration.status === 401, `비인증 모듈 생성 응답이 401이 아닙니다: ${moduleGeneration.status}`);

  const protectedGenerationRequests = [
    ["/api/generate", {}],
    ["/api/generate-modu-startup", {}],
    ["/api/generate-one-line-idea", { rawIdea: "smoke" }],
    ["/api/generate-idea-diagnosis", { ideaMemo: "smoke" }],
    ["/api/generate-customer-persona", { ideaMemo: "smoke" }],
    ["/api/generate-customer-journey", { ideaMemo: "smoke" }],
    ["/api/generate-problem-statement", { ideaMemo: "smoke" }],
    ["/api/generate-customer-interview", { ideaMemo: "smoke" }],
    ["/api/generate-survey", { ideaMemo: "smoke" }],
    ["/api/generate-validation-experiment", { ideaMemo: "smoke" }],
    ["/api/generate-market-research", { ideaMemo: "smoke" }],
    ["/api/generate-competitor-analysis", { ideaMemo: "smoke" }],
    ["/api/generate-differentiation-strategy", { ideaMemo: "smoke" }],
    ["/api/generate-business-model", { ideaMemo: "smoke" }],
    ["/api/generate-pricing-policy", { ideaMemo: "smoke" }]
  ];

  for (const [path, body] of protectedGenerationRequests) {
    const generation = await request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    assert(generation.status === 401, `비인증 AI 생성 응답이 401이 아닙니다 (${path}): ${generation.status}`);
  }

  if (process.env.SMOKE_ADMIN_PASSWORD) {
    const login = await request("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: process.env.SMOKE_ADMIN_PASSWORD })
    });
    assert(login.status === 200, `관리자 로그인이 실패했습니다: ${login.status}`);
    const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
    assert(cookie.startsWith("highview_admin_session="), "관리자 세션 쿠키가 발급되지 않았습니다.");

    const readiness = await request("/api/system-readiness", { headers: { Cookie: cookie } });
    assert(readiness.status === 200, `운영 준비상태 API가 실패했습니다: ${readiness.status}`);
  }

  if (process.env.SMOKE_PARTICIPANT_PROGRAM_CODE && process.env.SMOKE_PARTICIPANT_CODE) {
    const join = await request("/api/participants/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programCode: process.env.SMOKE_PARTICIPANT_PROGRAM_CODE,
        participantCode: process.env.SMOKE_PARTICIPANT_CODE
      })
    });
    const joinData = await join.json();
    assert(join.status === 200, `참여자 입장이 실패했습니다: ${join.status}`);
    assert(joinData.program?.id && joinData.participant?.id, "참여자 입장 응답에 운영 식별자가 없습니다.");
    const cookie = (join.headers.get("set-cookie") || "").split(";")[0];
    assert(cookie.startsWith("highview_participant_session="), "참여자 세션 쿠키가 발급되지 않았습니다.");

    const workspace = await request("/api/participants/session", { headers: { Cookie: cookie } });
    const workspaceData = await workspace.json();
    assert(workspace.status === 200, `Participant workspace refresh failed: ${workspace.status}`);
    assert(
      workspaceData.program?.id === joinData.program.id && workspaceData.participant?.id === joinData.participant.id,
      "Participant workspace refresh returned a different session identity."
    );

    const draftQuery = new URLSearchParams({
      programId: joinData.program.id,
      participantId: joinData.participant.id,
      moduleSlug: "one-line-idea"
    });
    const draft = await request(`/api/module-drafts?${draftQuery}`, { headers: { Cookie: cookie } });
    assert(draft.status === 200, `참여자 인증 draft 조회가 실패했습니다: ${draft.status}`);

    const mismatchedGeneration = await request("/api/generate-one-line-idea", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        rawIdea: "smoke",
        operation: {
          programId: joinData.program.id,
          participantId: "another-participant"
        }
      })
    });
    assert(mismatchedGeneration.status === 403, `다른 참여자 AI 요청 응답이 403이 아닙니다: ${mismatchedGeneration.status}`);
  }

  console.log(`smoke ok: ${baseUrl}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
