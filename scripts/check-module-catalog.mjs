import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function unique(values) {
  return new Set(values).size === values.length;
}

const catalogSource = read("lib/startupModules.ts");
const participantRunnerSource = read("components/ParticipantModulePlaceholder.tsx");
const automationSource = read("lib/startupModuleAutomation.ts");

const catalogBody = catalogSource.match(/export const STARTUP_MODULES:[\s\S]*?= \[([\s\S]*?)\n\];/)?.[1] || "";
const modules = [...catalogBody.matchAll(/\{\s*id:\s*(\d+),\s*order:\s*(\d+),[\s\S]*?isAdminOnly:\s*(true|false),[\s\S]*?status:\s*"([^"]+)",\s*slug:\s*"([^"]+)",\s*route:\s*"([^"]+)"\s*\}/g)].map(
  (match) => ({
    id: Number(match[1]),
    order: Number(match[2]),
    isAdminOnly: match[3] === "true",
    status: match[4],
    slug: match[5],
    route: match[6]
  })
);

assert(modules.length === 26, `모듈 카탈로그는 26개여야 합니다. 현재 ${modules.length}개입니다.`);
assert(unique(modules.map((catalogModule) => catalogModule.id)), "모듈 ID가 중복되었습니다.");
assert(unique(modules.map((catalogModule) => catalogModule.order)), "모듈 순서가 중복되었습니다.");
assert(unique(modules.map((catalogModule) => catalogModule.slug)), "모듈 slug가 중복되었습니다.");
assert(unique(modules.map((catalogModule) => catalogModule.route)), "모듈 route가 중복되었습니다.");
assert(
  modules.every((catalogModule) => catalogModule.status === "ready"),
  "ready가 아닌 모듈이 카탈로그에 포함되어 있습니다."
);

for (const catalogModule of modules) {
  const expectedRoute = catalogModule.slug === "lean-canvas"
    ? "/participant/canvas"
    : `/participant/modules/${catalogModule.slug}`;
  assert(
    catalogModule.route === expectedRoute,
    `${catalogModule.slug} route가 예상 경로와 다릅니다: ${catalogModule.route}`
  );
}

const slugConstants = new Map(
  [...participantRunnerSource.matchAll(/const\s+([A-Z0-9_]+_SLUG)\s*=\s*"([^"]+)";/g)].map((match) => [match[1], match[2]])
);
const specializedRunners = [...participantRunnerSource.matchAll(/\[([A-Z0-9_]+_SLUG)\]:\s*defineSpecializedRunner[\s\S]*?endpoint:\s*"([^"]+)"/g)].map(
  (match) => ({ constant: match[1], slug: slugConstants.get(match[1]), endpoint: match[2] })
);

assert(specializedRunners.length === 13, `특화 Runner는 13개여야 합니다. 현재 ${specializedRunners.length}개입니다.`);
assert(specializedRunners.every((runner) => runner.slug), "slug 상수와 연결되지 않은 특화 Runner가 있습니다.");
assert(unique(specializedRunners.map((runner) => runner.slug)), "특화 Runner slug가 중복되었습니다.");

for (const runner of specializedRunners) {
  const routeFile = resolve(root, "app", runner.endpoint.replace(/^\//, ""), "route.ts");
  assert(existsSync(routeFile), `${runner.slug} API route 파일이 없습니다: ${runner.endpoint}`);
}

const automationBody = automationSource.match(/const configs:[\s\S]*?= \[([\s\S]*?)\n\];/)?.[1] || "";
const automatedSlugs = [...automationBody.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]);
assert(automatedSlugs.length === 11, `공통 Module Runner 설정은 11개여야 합니다. 현재 ${automatedSlugs.length}개입니다.`);
assert(unique(automatedSlugs), "공통 Module Runner slug가 중복되었습니다.");
assert(existsSync(resolve(root, "app/api/generate-startup-module/route.ts")), "공통 Module Runner API가 없습니다.");

const dedicatedSlugs = ["lean-canvas", "modu-startup-application"];
const coveredSlugs = [
  ...specializedRunners.map((runner) => runner.slug),
  ...automatedSlugs,
  ...dedicatedSlugs
];

assert(unique(coveredSlugs), "하나 이상의 실행 경로에 중복 등록된 모듈이 있습니다.");
assert(
  coveredSlugs.length === modules.length && modules.every((catalogModule) => coveredSlugs.includes(catalogModule.slug)),
  `Runner 연결이 없는 모듈이 있습니다: ${modules
    .filter((catalogModule) => !coveredSlugs.includes(catalogModule.slug))
    .map((catalogModule) => catalogModule.slug)
    .join(", ")}`
);

assert(existsSync(resolve(root, "app/api/generate/route.ts")), "린캔버스 생성 API가 없습니다.");
assert(existsSync(resolve(root, "app/api/generate-modu-startup/route.ts")), "모두의창업 생성 API가 없습니다.");

console.log(
  `module catalog ok: ${modules.length} modules (${specializedRunners.length} specialized, ${automatedSlugs.length} runner, ${dedicatedSlugs.length} dedicated)`
);
