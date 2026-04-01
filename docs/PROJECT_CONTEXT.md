# Virtual Office Project Context

`/Users/una/Downloads/virtual_office_planning.docx` 를 기준으로 정리한 현재 워크스페이스의 구현 컨텍스트 문서다. 다음 세션에서 이 파일을 먼저 읽으면, 기획 의도와 현재 코드 상태를 빠르게 이어갈 수 있다.

## 1. Product Goal

Slack 상태와 메시지를 기반으로 팀의 현재 상태를 2D 버추얼 오피스 화면에서 보여주는 웹 애플리케이션이다.

MVP 범위:

- Slack OAuth 로그인
- Slack 사용자 프로필 및 상태 동기화
- 오피스 맵에서 팀원 위치/상태 시각화
- Slack 메시지 전송
- Slack Events API 기반 메시지/상태 수신
- 데모 모드 지원

기획안의 장기 목표 중 아래 항목은 아직 미구현이다.

- Phaser/Pixi 기반 실시간 맵 엔진
- WebSocket 기반 실시간 브로드캐스트
- 근접 채팅
- 미니게임
- 관리자 맵 편집기
- 영속 DB/Redis 기반 상태 저장

## 2. Current Architecture

### Frontend

- React 18
- TypeScript
- Zustand: UI 상태
- TanStack Query: 서버 상태 조회/캐시
- Vite

핵심 파일:

- `/Users/una/github/virtual-office/apps/web/src/App.tsx`
- `/Users/una/github/virtual-office/apps/web/src/features/auth/AuthGate.tsx`
- `/Users/una/github/virtual-office/apps/web/src/features/layout/AppShell.tsx`
- `/Users/una/github/virtual-office/apps/web/src/features/office/OfficeMap.tsx`
- `/Users/una/github/virtual-office/apps/web/src/features/office/TeamSidebar.tsx`
- `/Users/una/github/virtual-office/apps/web/src/features/chat/ChatPanel.tsx`
- `/Users/una/github/virtual-office/apps/web/src/stores/uiStore.ts`
- `/Users/una/github/virtual-office/apps/web/src/hooks/useOfficeData.ts`

### Backend

- Express 5
- TypeScript
- In-memory session store
- In-memory office/member/message store
- Slack Web API + OAuth + Events signature 검증

핵심 파일:

- `/Users/una/github/virtual-office/apps/server/src/index.ts`
- `/Users/una/github/virtual-office/apps/server/src/routes/auth.ts`
- `/Users/una/github/virtual-office/apps/server/src/routes/api.ts`
- `/Users/una/github/virtual-office/apps/server/src/routes/slack.ts`
- `/Users/una/github/virtual-office/apps/server/src/slack/client.ts`
- `/Users/una/github/virtual-office/apps/server/src/services/officeStore.ts`
- `/Users/una/github/virtual-office/apps/server/src/services/sessionStore.ts`

## 3. Implemented Flows

### Authentication Flow

1. 사용자가 프론트 로그인 화면 진입
2. `Slack으로 시작하기` 클릭
3. `GET /auth/slack/start`
4. Slack OAuth 승인
5. `GET /auth/slack/callback`
6. 서버가 Slack 사용자 정보를 가져와 내부 member 생성/갱신
7. 서버가 세션 생성 후 쿠키 + 해시 세션 값으로 프론트로 리다이렉트
8. 프론트 `AuthGate` 가 세션을 저장하고 `/auth/session` 으로 사용자 확인

보조 흐름:

- `POST /auth/demo-login` 으로 데모 계정 로그인 가능

### Slack Message Flow

전송:

1. 프론트 `ChatPanel` 에서 메시지 작성
2. `POST /api/messages`
3. Slack 설정이 있으면 `chat.postMessage` 호출
4. 서버 메모리 스토어에도 메시지 저장
5. React Query invalidate 후 목록 갱신

수신:

1. Slack Events API 가 `POST /slack/events` 호출
2. 서버가 Slack signature 검증
3. `message`, `presence_change`, `user_change` 이벤트 처리
4. 메모리 스토어 갱신
5. 프론트는 polling 으로 반영

## 4. State Management Rules

### Zustand

파일: `/Users/una/github/virtual-office/apps/web/src/stores/uiStore.ts`

역할:

- 선택된 채널 ID
- 선택된 맵 구역 ID
- 채팅 입력 draft

원칙:

- 사용자 입력 중간 상태나 화면 선택값만 둔다.
- 서버에서 다시 받아야 하는 엔터티 데이터는 넣지 않는다.

### TanStack Query

파일: `/Users/una/github/virtual-office/apps/web/src/hooks/useOfficeData.ts`

역할:

- 세션 확인
- 오피스 스냅샷 조회
- 메시지 목록 조회
- 메시지 전송 mutation

원칙:

- 멤버/메시지/워크스페이스 같은 서버 데이터는 Query에 둔다.
- mutation 성공 후 관련 query invalidate 로 일관성을 맞춘다.

## 5. Component Structure

현재 컴포넌트 구조:

- `AuthGate`
- `AppShell`
- `OfficeMap`
- `TeamSidebar`
- `ChatPanel`

확장 시 추천 구조:

- `features/auth`
- `features/office`
- `features/chat`
- `features/presence`
- `features/realtime`
- `features/admin`

추천 원칙:

- feature 단위로 API hook, view component, local util을 같은 폴더에 둔다.
- 공통 UI 가 늘어나면 `src/components` 로 승격한다.
- 도메인 타입은 `src/types` 에 유지하되, feature 전용 타입은 feature 내부에 둔다.

## 6. Folder Structure

```text
.
├── apps
│   ├── server
│   │   ├── src
│   │   │   ├── config
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
│       └── vite.config.ts
├── docs
│   └── PROJECT_CONTEXT.md
├── render.yaml
├── vercel.json
└── README.md
```

## 7. Environment Variables

서버:

- `PORT`
- `CLIENT_ORIGIN`
- `SESSION_COOKIE_NAME`
- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`
- `SLACK_REDIRECT_URI`
- `ENABLE_SLACK_MOCK`

프론트:

- `VITE_API_BASE_URL`

## 8. Runbook

설치:

```bash
npm install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

개발 서버:

```bash
npm run dev
```

빌드 검증:

```bash
npm run build
```

## 9. Known Gaps

현재 코드는 동작 가능한 MVP 예제지만 아래 한계가 있다.

- 데이터 저장소가 메모리 기반이라 재시작 시 유실된다.
- 프론트 실시간 갱신은 polling 기반이다.
- Slack 사용자 프로필 조회가 bot token 중심이라 권한 설계가 단순화되어 있다.
- 채널 목록/DM/멀티 워크스페이스 모델이 없다.
- 보안은 데모 수준이며 production-ready session/JWT 저장 구조가 아니다.

## 10. Recommended Next Steps

우선순위 1:

- PostgreSQL + Prisma 도입
- Redis 기반 세션/실시간 상태 저장
- Socket.IO 기반 오피스 스냅샷 push

우선순위 2:

- Slack OAuth scope 재정리 및 workspace 설치 흐름 개선
- Slack channel 목록 조회 및 채널 전환 UI
- 사용자 상태 변경 이력 저장

우선순위 3:

- Phaser 기반 2D 맵 렌더링
- 캐릭터 이동/충돌 처리
- 근접 채팅 및 zone room 개념 도입

우선순위 4:

- 관리자 맵 편집기
- 활동 로그와 팀 대시보드
- 미니게임 모듈

## 11. Suggested Continuation Prompt

다음에 이어서 작업할 때는 아래처럼 요청하면 된다.

```text
docs/PROJECT_CONTEXT.md 기준으로 virtual-office 프로젝트를 이어서 구현해줘.
이번에는 [원하는 기능]을 우선으로 진행하고, 필요한 코드 수정과 실행 검증까지 해줘.
```
