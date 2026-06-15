# 린캔버스 초안 자동화 및 PDF 제출 시스템

창업교육 참가자가 아이디어 정보를 입력하면 AI가 린캔버스 초안을 생성하고, 참가자가 수정 후 최종 제출하면 A4 가로형 PDF로 산출되는 웹앱입니다.

## 실행

```bash
npm install
npm run dev
```

기본 주소는 `http://localhost:3000`입니다.

품질 확인:

```bash
npm run typecheck
npm run lint
npm run build
```

## 환경변수

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
```

주의:

- `AI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `ADMIN_PASSWORD`는 서버에서만 사용합니다.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`는 브라우저 노출이 가능한 값입니다.
- Supabase가 설정되지 않으면 제출은 기존 MVP처럼 해당 브라우저 `localStorage`에 임시 저장됩니다.
- 서버 기반 중앙 저장을 활성화하려면 `SUPABASE_SERVICE_ROLE_KEY` 또는 `SUPABASE_SECRET_KEY`가 필요합니다.

## Supabase 테이블

Supabase SQL Editor에서 아래 SQL을 실행하세요.

```sql
create table if not exists lean_canvas_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  participant jsonb not null,
  canvas jsonb not null
);

create index if not exists idx_lean_canvas_submissions_created_at
on lean_canvas_submissions (created_at desc);
```

운영 초기에는 RLS를 끄거나, 서버 Route에서 service role key로만 접근하게 구성합니다. 클라이언트에서 직접 insert/select하지 않습니다.

## 화면 경로

- `/` 참가자 입력 화면
- `/editor` AI 생성 결과 수정 화면
- `/preview/[id]` 제출 완료 / PDF 미리보기 화면
- `/admin` 관리자 제출 목록 화면

## 현장 운영 흐름

1. 참가자가 QR 또는 링크로 접속
2. 팀 정보와 아이디어 입력
3. AI 초안 생성
4. 참가자가 직접 수정
5. 최종 제출
6. PDF 다운로드 또는 인쇄
7. 관리자는 전체 제출 목록 확인

## 관리자

`/admin`에서 관리자 암호를 입력하면 제출 목록을 볼 수 있습니다. 목록에서는 검색, 새로고침, 미리보기, PDF 화면 이동, 삭제가 가능합니다.

운영 배포에서는 Vercel 환경변수 `ADMIN_PASSWORD`를 반드시 설정하세요.

## PDF / 인쇄

미리보기 화면의 `PDF 다운로드`는 `html2pdf.js`로 실제 PDF 파일을 생성합니다. `바로 인쇄`는 브라우저 인쇄 창을 열며, A4 가로형 한 페이지 출력에 맞춰 `@page`와 `@media print`를 적용합니다.

## AI 테스트

API 비용 없이 흐름을 점검하려면:

```bash
AI_MOCK=true
```

실제 AI API를 사용할 때는:

```bash
AI_MOCK=false
```

## Vercel 배포

Vercel Project Environment Variables에 위 환경변수를 설정하세요. 특히 Supabase 중앙 저장을 사용하려면 `NEXT_PUBLIC_SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY` 또는 `SUPABASE_SECRET_KEY`가 필요합니다.
