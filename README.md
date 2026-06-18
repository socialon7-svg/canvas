# 창업교육·캠프 운영 MVP / 하이뷰랩 프로그램 운영 MVP

하이뷰랩의 창업교육·캠프 현장에서 참여자 과제 작성, AI 초안 생성, 제출, PDF/인쇄, 운영진 확인, 피드백, 결과보고용 데이터 정리까지 한 흐름으로 관리하기 위한 운영 MVP입니다.

초기 버전은 린캔버스 초안 자동화와 PDF 제출 시스템으로 시작했지만, 현재는 모두의창업 초안 생성, 참여자 포털, 관리자 제출 목록, 운영 상태판, CSV 다운로드 기능까지 포함하는 창업교육 현장 운영 OS의 1차 버전을 목표로 합니다.

## 1. 제품 개요

이 웹앱은 창업교육 참여자가 자신의 아이디어를 입력하면 AI가 산출물 초안을 생성하고, 참여자가 수정한 뒤 운영 시스템에 제출할 수 있도록 돕습니다.

운영진은 관리자 화면에서 제출 현황, PDF 상태, 피드백 여부, CSV 데이터를 확인하여 현장 운영과 결과보고 업무를 효율화할 수 있습니다.

핵심 목표는 다음과 같습니다.

- 교육생은 무엇을 작성해야 하는지 쉽게 이해한다.
- 교육생은 제출 완료 여부를 명확히 확인한다.
- 운영진은 제출, PDF, 피드백 상태를 한눈에 파악한다.
- 하이뷰랩은 캠프 종료 후 결과보고용 데이터를 빠르게 정리한다.
- 향후 린캔버스, 모두의창업, PSST, IR, 멘토링 리포트 등 다양한 교육 산출물을 모듈형으로 확장한다.

## 2. 핵심 사용자

### 교육생 / 참여자

- 프로그램 코드와 참여자 코드로 입장
- 내 정보와 팀 정보 확인
- 린캔버스 작성 및 제출
- 모두의창업 신청서 초안 생성 및 제출
- 제출 완료 여부 확인
- PDF/인쇄 또는 복사용 텍스트 활용
- 운영진 피드백 확인

### 내부직원 / 운영진 / 관리자

- 참여자 제출 목록 확인
- 제출 상태, PDF 상태, 피드백 여부 확인
- 검색 및 상태 필터 활용
- 결과보고용 CSV 다운로드
- 미제출자, PDF 오류, 피드백 대기 항목 확인
- 프로그램별 운영 현황 관리

## 3. 핵심 기능

### 3.1 참여자 코드 기반 입장

참여자는 내부직원이 발급한 프로그램 코드와 참여자 코드를 입력해 자신의 프로그램 워크스페이스로 입장합니다.

운영 모드에서는 참여자별 매직링크도 사용할 수 있습니다. 내부직원 포털의 참여자 목록에서 입장 링크를 복사해 카카오톡, 문자, QR 안내문에 붙이면 참여자가 코드를 직접 입력하지 않고 입장할 수 있습니다.

입장 후 참여자는 다음 흐름을 확인합니다.

1. 입장
2. 내 정보 확인
3. 린캔버스 제출
4. 모두의창업 초안 제출
5. 피드백 확인

### 3.2 린캔버스 초안 생성 및 PDF 제출

참여자가 아이디어 정보를 입력하면 AI가 린캔버스 초안을 생성합니다. 참여자는 생성된 내용을 수정한 뒤 최종 제출하고, A4 가로형 PDF 또는 인쇄 산출물로 활용할 수 있습니다.

주요 기능:

- 아이디어 정보 입력
- AI 린캔버스 초안 생성
- 참여자 직접 수정
- 최종 제출
- PDF 다운로드
- 브라우저 인쇄
- 관리자 제출 목록 연동

### 3.3 모두의창업 초안 생성 및 제출

모두의창업 신청을 준비하는 참여자를 위해 Q1~Q8 기반 신청서 초안을 자동 생성합니다.

주요 입력 항목:

- 교육명
- 팀명
- 참가자명
- 아이디어명
- Q1. 한 줄 소개
- Q2. 배경 이야기
- Q3. 고객과 문제
- Q4. 실행 계획과 증거
- Q5. 분야
- Q6. 창업 여부
- Q7. 팀원
- Q8. 영상 링크

AI 생성 결과:

- 첫 문장 훅
- Q1~Q8 신청서 초안
- 핵심 페르소나
- 차별점
- 증거 한 줄
- 정책 키워드
- 사회적 임팩트 마무리
- 최종 제출 전 체크리스트
- 보완 코멘트

### 3.4 관리자 제출 목록

관리자는 `/admin`에서 제출된 린캔버스 목록을 확인할 수 있습니다.

현재 제공 기능:

- 제출 목록 조회
- 검색
- 상태 필터
- PDF 상태 확인
- 제출상태 확인
- 미리보기
- PDF 화면 이동
- 삭제
- CSV 다운로드
- Supabase 미설정 시 localStorage fallback 안내

### 3.5 운영 상태판

내부 운영 포털과 관리자 화면 상단에서 현재 제출 상태를 숫자로 확인할 수 있습니다.

예시 지표:

- 총 제출
- 제출 완료
- PDF 정상
- PDF 오류
- 피드백 있음
- 현재 표시 건수

### 3.6 CSV 다운로드

관리자는 현재 필터링된 제출 목록을 CSV로 다운로드할 수 있습니다.

CSV 포함 항목:

- 제출일
- 교육명
- 팀명
- 참가자명
- 아이디어명
- 제출상태
- PDF상태
- 미리보기경로

### 3.7 PDF / 인쇄

린캔버스 미리보기 화면에서 PDF 다운로드와 브라우저 인쇄를 지원합니다.

- PDF 생성: `html2pdf.js`
- 인쇄: 브라우저 인쇄
- 출력 기준: A4 가로형
- PDF 상태: 제출 직후 `idle`, 생성 버튼 클릭 시 `generating`, 성공 시 `success`, 실패 시 `failed`
- 상태 저장: Supabase 운영 모드에서는 제출 테이블에 `pdf_status`, `pdf_error_message`, `pdf_generated_at`을 저장하고, 데모 모드에서는 localStorage에 반영합니다.

### 3.8 Supabase 중앙 저장 및 localStorage fallback

운영 배포에서는 Supabase 중앙 저장을 사용합니다. Supabase 설정이 없거나 테이블이 준비되지 않은 경우, MVP 흐름 유지를 위해 해당 브라우저의 localStorage에 임시 저장합니다.

참여자 화면에서는 브라우저에 남아 있는 작성 중 초안, 화면 이동용 임시 정보, 서버 미연결 상태에서 저장된 제출 기록을 구분해 안내합니다. 공용 PC 사용을 고려해 참여자가 작성 중 초안과 임시 이동 정보를 직접 삭제할 수 있으며, 제출 완료 기록은 운영 확인을 위해 자동 삭제하지 않습니다.

### 3.9 Supabase 운영 모드

실제 기관/대학 운영에서는 Supabase를 단일 원천으로 사용합니다. 여러 운영진이 같은 프로그램을 동시에 열어도 참여자, 팀, 모듈 진행, 제출, 피드백 상태가 같은 DB 기준으로 보이도록 설계합니다.

운영 모드 기준:

- `NEXT_PUBLIC_SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY` 또는 `SUPABASE_SECRET_KEY`를 서버 환경변수에 설정합니다.
- `supabase/migrations/001_operations_core.sql`을 적용해 프로그램, 참여자, 팀, 공통 모듈 제출 테이블을 준비합니다.
- 관리자 인증은 `ADMIN_PASSWORD` 검증 후 httpOnly cookie를 발급합니다. 비밀번호는 브라우저 `sessionStorage`에 저장하지 않습니다.
- production에서는 `ADMIN_SESSION_SECRET`과 참여자 세션 서명용 `PARTICIPANT_SESSION_SECRET`을 반드시 별도 설정합니다.
- client component에서 service role key를 직접 사용하지 않습니다.

### 3.10 localStorage 데모 모드

Supabase 환경변수가 없거나 테이블이 아직 준비되지 않은 경우, 현장 데모와 오프라인 테스트를 위해 기존 localStorage fallback이 동작합니다.

데모 모드 주의:

- 데이터는 현재 브라우저에만 저장됩니다.
- 다른 운영진 또는 다른 기기에서는 같은 상태를 볼 수 없습니다.
- 개인정보가 들어갈 수 있으므로 실제 교육 운영에서는 Supabase 운영 모드를 사용해야 합니다.
- 화면에는 “이 브라우저 임시 제출 목록” 안내를 표시합니다.
- 참여자 화면에는 “이 브라우저에 임시 저장 데이터가 있습니다” 안내와 임시 작성 데이터 삭제 버튼을 표시합니다.

## 4. 화면 경로

| 경로 | 설명 |
| --- | --- |
| `/` | 역할 선택 및 메인 화면 |
| `/participant` | 참여자 포털 |
| `/participant/join?token=...` | 참여자 매직링크 입장 |
| `/p/[token]` | 참여자 매직링크 짧은 경로 |
| `/participant/canvas` | 참여자 린캔버스 작성 화면 |
| `/editor` | 린캔버스 AI 생성 결과 수정 화면 |
| `/preview/[id]` | 린캔버스 제출 완료 / PDF 미리보기 화면 |
| `/modu-startup` | 모두의창업 초안 생성 화면 |
| `/modu-startup/preview/[id]` | 모두의창업 제출물 미리보기 화면 |
| `/admin` | 공식 운영 콘솔의 제출 탭으로 이동 |
| `/admin/modu-startup` | 관리자 모두의창업 제출 목록 |
| `/internal` | 내부 운영 포털 |

## 5. 현장 운영 흐름

1. 운영진이 프로그램과 참여자 코드를 준비합니다.
2. 참여자는 QR 또는 링크로 접속합니다.
3. 참여자는 프로그램 코드와 참여자 코드로 입장합니다.
4. 참여자는 내 정보와 팀 정보를 확인합니다.
5. 참여자는 린캔버스 또는 모두의창업 초안을 작성합니다.
6. AI가 초안을 생성합니다.
7. 참여자는 결과물을 직접 수정합니다.
8. 참여자는 최종 제출합니다.
9. 운영진은 관리자 화면에서 제출 현황을 확인합니다.
10. 운영진은 PDF 오류, 미제출, 피드백 대기 항목을 확인합니다.
11. 운영진은 CSV를 내려받아 결과보고 자료로 활용합니다.

## 6. 실행

```bash
npm install
npm run dev
```

기본 주소는 다음과 같습니다.

```bash
http://localhost:3000
```

## 7. 품질 확인

```bash
npm run typecheck
npm run lint
npm run build
npm run smoke
```

`npm run smoke`는 기본적으로 `http://127.0.0.1:3000`을 검사합니다. 배포 주소는 `SMOKE_BASE_URL`로 지정하고, 관리자 쿠키 발급과 운영 준비상태 API까지 확인하려면 `SMOKE_ADMIN_PASSWORD`를 함께 설정합니다.

## 8. 환경변수

```bash
AI_API_KEY=
AI_BASE_URL=https://integrate.api.nvidia.com/v1
AI_MODEL_NAME=gpt-5.4
AI_MOCK=false

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_SECRET_KEY=

ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
PARTICIPANT_SESSION_SECRET=
```

주의:

- `AI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `ADMIN_PASSWORD`는 서버에서만 사용합니다.
- production에서는 `ADMIN_SESSION_SECRET`이 필수입니다. development에서만 미설정 시 `ADMIN_PASSWORD`를 관리자 쿠키 서명에 사용할 수 있습니다.
- `PARTICIPANT_SESSION_SECRET`은 참여자 세션 HMAC 서명 키입니다. production에서 반드시 별도 난수값을 사용합니다.
- production에서는 레거시 `x-admin-password` 헤더 인증을 허용하지 않습니다.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`는 브라우저 노출이 가능한 값입니다.
- 운영 배포에서는 Vercel Project Environment Variables에 위 환경변수를 설정해야 합니다.
- Supabase 중앙 저장을 사용하려면 `NEXT_PUBLIC_SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY` 또는 `SUPABASE_SECRET_KEY`가 필요합니다.

## 9. Supabase 테이블

### 9.1 린캔버스 제출 테이블

```sql
create table if not exists lean_canvas_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  participant jsonb not null,
  canvas jsonb not null,
  pdf_status text not null default 'idle'
    check (pdf_status in ('idle', 'generating', 'success', 'failed')),
  pdf_error_message text,
  pdf_generated_at timestamptz
);

create index if not exists idx_lean_canvas_submissions_created_at
on lean_canvas_submissions (created_at desc);
```

### 9.2 모두의창업 제출 테이블

```sql
create table if not exists modu_startup_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  input jsonb not null,
  draft jsonb not null
);

create index if not exists idx_modu_startup_submissions_created_at
on modu_startup_submissions (created_at desc);
```

운영 초기에는 RLS를 끄거나, 서버 Route에서 service role key로만 접근하게 구성합니다. 클라이언트에서 직접 insert/select하지 않습니다.

### 9.3 운영 공통 테이블

P0 안정화부터는 다음 공통 운영 테이블을 추가합니다.

- `programs`: 교육 프로그램 기본 정보와 프로그램 코드
- `teams`: 프로그램별 팀
- `participants`: 참여자 정보, 참여자 코드, QR/매직링크용 `join_token`
- `program_modules`: 프로그램별 활성 모듈
- `participant_module_progress`: 참여자별 모듈 진행 상태
- `module_drafts`: 서버 자동저장 draft
- `module_submissions`: 린캔버스, 모두의창업 등 공통 모듈 제출
- `feedbacks`: 운영진/멘토 피드백

적용 파일:

```bash
supabase/migrations/001_operations_core.sql
supabase/migrations/20260618010000_reconcile_pdf_status_schema.sql
```

`20260618010000_reconcile_pdf_status_schema.sql`은 기존 설치에도 PDF 상태 컬럼과 제약조건을 안전하게 보강합니다. `module_submissions.pdf_generated_at`도 이 migration에서 추가하므로 PDF 생성 성공 시각 저장 코드와 DB schema가 일치합니다.

기존 `lean_canvas_submissions`, `modu_startup_submissions`는 호환을 위해 유지합니다. 신규 기능은 가능한 한 공통 `module_submissions`와 관련 운영 테이블을 사용하도록 점진적으로 이관합니다.

현재 린캔버스와 모두의창업 제출은 기존 제출 테이블에 먼저 저장한 뒤, 운영 context(`programId`, `participantId`)가 있는 경우 공통 `module_submissions`에도 mirror합니다. PDF 생성 상태 변경도 `sourceSubmissionId` 기준으로 공통 제출 테이블에 함께 반영합니다. 운영 context가 없거나 운영 테이블이 아직 준비되지 않은 레거시 제출은 기존 제출 흐름을 깨지 않도록 공통 mirror만 건너뜁니다.

### 9.4 운영 API 1차

P0 Phase 2에서 다음 서버 API를 추가했습니다.

- `GET /api/programs`
- `POST /api/programs`
- `GET /api/programs/[id]/participants`
- `POST /api/programs/[id]/participants`
- `POST /api/programs/[id]/participants/bulk`
- `GET /api/participants/join-token/[token]`
- `POST /api/participants/join`
- `PATCH /api/participants/[id]/last-seen`
- `GET /api/module-drafts?programId=&participantId=&moduleSlug=`
- `PUT /api/module-drafts`
- `GET /api/module-submissions?programId=&moduleSlug=&status=`
- `POST /api/module-submissions`
- `PATCH /api/module-progress`
- `POST /api/feedbacks`
- `GET /api/system-readiness` (관리자 전용 운영 DB·PDF 컬럼 점검)

프로그램/참여자 관리 API는 관리자 httpOnly cookie 인증을 사용합니다. 참여자 입장 API는 프로그램 코드+참여자 코드 또는 `join_token`으로 참여자를 확인하고, 정상 입장 시 HMAC 서명된 httpOnly 참여자 세션을 발급하며 `joined_at`, `last_seen_at`을 갱신합니다. `module-drafts`, `module-progress`, 참여자 제출 API는 세션의 `programId`, `participantId`와 요청값이 다르면 403을 반환합니다. Supabase 운영 테이블이 준비되지 않은 경우에만 기존 localStorage 데모 흐름으로 fallback합니다.

운영 콘솔은 `/api/system-readiness` 결과를 상단에 표시합니다. 필수 운영 테이블 또는 PDF 상태 컬럼이 없으면 중앙 저장 모드로 오인하지 않고 미준비 항목과 실행할 migration 파일을 안내합니다.

### 9.5 서버 draft 자동저장

린캔버스와 모두의창업 작성 화면은 참여자 세션이 있을 때 `module_drafts`에 작성 중 데이터를 자동저장합니다.

- 저장 기준: `program_id`, `participant_id`, `module_slug`
- 저장 타이밍: 입력 변경 후 약 900ms debounce, 입력창 blur 시 즉시 저장
- 상태 표시: 자동저장 중, 서버에 자동저장됨, 이 브라우저에 자동저장됨, 자동저장 실패
- fallback: Supabase 환경변수 또는 테이블이 준비되지 않으면 기존 localStorage draft를 사용합니다.
- 적용 모듈: `lean-canvas`, `modu-startup-application`

## 10. 현재 MVP의 한계

현재 MVP는 빠른 현장 검증을 위해 일부 데이터를 jsonb와 localStorage fallback 중심으로 처리합니다.

현재 한계:

- 모듈별 제출 테이블이 분리되어 있음
- 기존 제출 테이블과 공통 `module_submissions`가 병행 운영 중임
- 기존 제출과 공통 제출의 연결은 `input_data.sourceSubmissionId` 기반 mirror 구조임
- Supabase Realtime 기반 실시간 관제는 아직 미적용
- Schema-driven Form Renderer는 아직 미적용
- 기관용 대시보드, 멘토/강사 권한은 아직 미구현

## 11. 향후 로드맵

### V1.1 현장 투입 안정화

- 관리자 운영 상태판 고도화
- 관리자 URL 필터 동기화
- 교육생 제출 완료 확인 UX 강화
- PDF 오류 복구 흐름 추가
- CSV 다운로드 항목 확대

### V1.2 모두의창업 사용성 개선

- 모두의창업 단계형 입력 UI
- Q1~Q8 입력 stepper
- 진행률 표시
- 자동저장 / 이어쓰기
- 모바일 입력 피로도 개선

### V1.3 모듈 확장 구조

- Module Registry 도입
- 린캔버스, 모두의창업, PSST, IR, 멘토링 리포트 모듈 공통 관리
- 참여자 포털에서 모듈 카드형 표시
- 관리자 통합 관제표

### V1.4 서버 draft 저장

- 서버 draft 저장 모듈 확대
- 자동저장 복구 UX 고도화
- localStorage fallback 삭제/보존 정책 세분화
- 마지막 저장 시간 표시 개선
- 이어쓰기 안내 개선

### V1.5 통합 제출 데이터 구조

- 기존 제출 테이블과 공통 `module_submissions` 병행 운영 안정화
- 레거시 제출 ID와 공통 제출 ID 연결 방식 고도화
- 결과보고 및 BI 연동 기반 마련

### V1.6 실시간 운영 관제

- Supabase Realtime
- 팀별 진행 상황 표시
- 미입장, 작성 중, 제출 완료, 피드백 대기 실시간 보드
- 강사/운영진 현장 개입 포인트 표시

### V1.7 Schema-driven Form Renderer

- 입력 모듈을 JSON schema 기반으로 정의
- 신규 교육 산출물 추가 시 프론트엔드 수정 최소화
- PSST, IR, 멘토링 리포트, 결과보고서 자동화 확장

## 12. 제품 방향

이 프로젝트의 최종 방향은 단순한 린캔버스 작성기가 아닙니다.

하이뷰랩의 창업교육·캠프 운영에서 다음 흐름을 자동화하는 창업교육 현장 운영 OS를 목표로 합니다.

```text
참여자 입장
→ 정보 확인
→ 아이디어 입력
→ AI 초안 생성
→ 참여자 수정
→ 제출
→ PDF/인쇄
→ 관리자 확인
→ 피드백
→ 결과보고 데이터 정리
```

장기적으로는 린캔버스, 모두의창업, PSST, IR, 멘토링 리포트, 결과보고서까지 하나의 운영 플랫폼에서 관리하는 구조로 확장합니다.
