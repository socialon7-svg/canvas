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

  console.log(`smoke ok: ${baseUrl}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
