# 린캔버스 초안 자동화 및 PDF 제출 MVP

창업교육 참가자가 아이디어 정보를 입력하고, AI가 생성한 린캔버스 초안을 수정한 뒤 A4 가로형 인쇄/PDF 저장까지 진행하는 Next.js MVP입니다.

## 실행

```bash
npm install
npm run dev
```

기본 주소는 `http://localhost:3000`입니다.

현재 `.env.local`은 현장 테스트를 위해 `AI_MOCK=true`로 설정되어 있습니다. 실제 AI API를 사용할 때는 아래처럼 값을 바꾸세요.

```bash
AI_API_KEY=실제_API_키
AI_BASE_URL=https://integrate.api.nvidia.com/v1
AI_MODEL_NAME=meta/llama-3.3-70b-instruct
AI_MOCK=false
```

API Key는 `/api/generate` 서버 Route에서만 읽고 프론트엔드로 노출하지 않습니다.

## 화면

- `/` 참가자 입력 화면
- `/editor` AI 생성 결과 수정 화면
- `/preview/[id]` PDF 미리보기 / 제출 완료 화면
- `/admin` 관리자 제출 목록 화면

## 저장 방식

MVP 저장소는 브라우저 `localStorage`입니다. 제출 데이터 타입은 `lib/types.ts`에 분리되어 있어 추후 Supabase 테이블 구조로 옮기기 쉽도록 구성했습니다.

## PDF / 인쇄

미리보기 화면의 `PDF 다운로드`와 `바로 인쇄`는 브라우저 인쇄 창을 엽니다. 대상에서 `PDF로 저장`을 선택하면 A4 가로형 PDF로 저장할 수 있습니다.
