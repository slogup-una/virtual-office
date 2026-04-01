# Virtual Office

Slack 상태 기반 버추얼 오피스 MVP 예제입니다. 기획안의 Phase 1 범위를 기준으로 아래 기능을 구현했습니다.

다음 세션에서 맥락을 이어가려면 `/Users/una/github/virtual-office/docs/PROJECT_CONTEXT.md` 를 먼저 확인하면 됩니다. 기획안 요약, 현재 구현 범위, 인증/Slack 연동 흐름, 상태 관리 원칙, 다음 우선순위를 정리해 두었습니다.

- Slack OAuth 로그인 또는 데모 로그인
- Slack 사용자/상태 동기화
- Slack 메시지 전송
- Slack Events API 기반 메시지 수신
- React 기반 오피스 맵, 팀 상태 패널, 채팅 패널
- Zustand 로컬 UI 상태 + TanStack Query 서버 상태 관리

## 폴더 구조

```text
.
├── apps
│   ├── server
│   │   ├── src
│   │   │   ├── middleware
│   │   │   ├── routes
│   │   │   ├── services
│   │   │   ├── slack
│   │   │   └── types
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web
│       ├── src
│       │   ├── api
│       │   ├── features
│       │   ├── hooks
│       │   ├── stores
│       │   └── types
│       ├── .env.example
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
└── package.json
```

## 실행 방법

```bash
npm install
cp apps/server/.env.example apps/server/.env
npm run dev
```

실제 `.env` 파일은 저장소에 올리지 않는 기준입니다.

- 로컬 개발 프론트: `apps/web/.env.local` 또는 `apps/web/.env.development.local`
- 로컬 개발 서버: `apps/server/.env`
- Vercel 배포: Project Settings 의 Environment Variables 사용
- Render 배포: Dashboard 의 Environment Variables 사용

프론트 권장 값:

- 개발: `VITE_API_BASE_URL=http://localhost:4000`
- 배포: `VITE_API_BASE_URL=https://virtual-office-api.onrender.com`

Slack 실연동 시 `apps/server/.env` 에 아래 값을 채우면 됩니다.

- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`
- `SLACK_REDIRECT_URI`

## Render / Vercel 배포

- Render: 루트의 `render.yaml` 사용
- Vercel: 루트의 `vercel.json` 사용

중요:

- Vercel은 이 저장소에서 루트의 `vercel.json` 을 기준으로 배포하는 구성이 가장 안전합니다.
- Vercel Project Settings 의 Root Directory 는 `.` 으로 두는 것을 권장합니다.
- 이 경우 Build Output Directory 는 `apps/web/dist` 입니다.
- Root Directory 를 `apps/web` 로 잡고 하위 `vercel.json` 을 따로 두는 방식은 설정 충돌이 나기 쉽습니다.

배포 순서는 아래가 안전합니다.

1. Render에 서버 배포
2. Render 서버 URL 확인
3. Vercel에 `VITE_API_BASE_URL` 을 Render URL로 설정 후 프론트 배포
4. Render의 `CLIENT_ORIGIN` 을 Vercel URL로 설정
5. Slack App의 Redirect URL을 `https://<render-domain>/auth/slack/callback` 으로 등록

필수 환경 변수 예시:

- Render
  - `CLIENT_ORIGIN=https://virtual-office-web-ten.vercel.app`
  - `SLACK_CLIENT_ID`
  - `SLACK_CLIENT_SECRET`
  - `SLACK_SIGNING_SECRET`
  - `SLACK_BOT_TOKEN`
  - `SLACK_REDIRECT_URI=https://virtual-office-api.onrender.com/auth/slack/callback`
  - `ENABLE_SLACK_MOCK=false`
- Vercel
  - `VITE_API_BASE_URL=https://virtual-office-api.onrender.com`

배포 순서:

1. Render에 서버를 `virtual-office-api` 로 배포합니다.
2. Render 환경 변수에 `CLIENT_ORIGIN=https://virtual-office-web-ten.vercel.app` 를 입력합니다.
3. Slack Redirect URI를 `https://virtual-office-api.onrender.com/auth/slack/callback` 으로 맞춥니다.
4. Vercel은 production 환경 변수 `VITE_API_BASE_URL=https://virtual-office-api.onrender.com` 로 Render API를 호출합니다.
5. 배포 후 `https://virtual-office-api.onrender.com/health` 에서 `{"ok":true}` 를 확인합니다.

## 상태 관리

- TanStack Query: 세션, 오피스 스냅샷, 메시지 목록
- Zustand: 선택 구역, 채널, 메시지 draft 같은 UI 상태

## 주요 서버 엔드포인트

- `GET /auth/slack/start`
- `GET /auth/slack/callback`
- `POST /auth/demo-login`
- `GET /api/office`
- `GET /api/messages`
- `POST /api/messages`
- `POST /slack/events`
