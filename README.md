# Virtual Office

Slack 상태 기반 버추얼 오피스 MVP 예제입니다. 기획안의 Phase 1 범위를 기준으로 아래 기능을 구현했습니다.

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
cp apps/web/.env.example apps/web/.env
npm run dev
```

Slack 실연동 시 `apps/server/.env` 에 아래 값을 채우면 됩니다.

- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`
- `SLACK_REDIRECT_URI`

## Render / Vercel 배포

- Render: 루트의 `render.yaml` 사용
- Vercel: 루트의 `vercel.json` 사용

배포 순서는 아래가 안전합니다.

1. Render에 서버 배포
2. Render 서버 URL 확인
3. Vercel에 `VITE_API_BASE_URL` 을 Render URL로 설정 후 프론트 배포
4. Render의 `CLIENT_ORIGIN` 을 Vercel URL로 설정
5. Slack App의 Redirect URL을 `https://<render-domain>/auth/slack/callback` 으로 등록

필수 환경 변수 예시:

- Render
  - `CLIENT_ORIGIN=https://<your-vercel-domain>`
  - `SLACK_REDIRECT_URI=https://<your-render-domain>/auth/slack/callback`
- Vercel
  - `VITE_API_BASE_URL=https://<your-render-domain>`

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
