import type { ReactNode } from "react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import projectSymbol from "../../assets/brand/project-symbol.png";
import {
  apiClient,
  clearStoredSession,
  hasExpiredSession,
  resetSessionExpiryState,
  storeSession,
  subscribeToSessionExpiry
} from "../../api/client";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const isSessionExpired = useSyncExternalStore(subscribeToSessionExpiry, hasExpiredSession, hasExpiredSession);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const hashSessionId = hash.get("session");
  if (hashSessionId) {
    storeSession(hashSessionId);
  }

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["session"],
    queryFn: apiClient.getSession,
    retry: false
  });

  useEffect(() => {
    if (!hashSessionId) {
      return;
    }

    window.history.replaceState(null, "", window.location.pathname);
    void refetch();
  }, [hashSessionId, refetch]);

  if (isSessionExpired) {
    return (
      <section className="auth-shell">
        <div className="auth-card session-expired-card">
          <img alt="Virtual Office Symbol" className="auth-symbol" src={projectSymbol} />
          <span className="eyebrow">Session Notice</span>
          <h1>세션이 만료되었습니다.</h1>
          <p>안전을 위해 추가 호출을 멈췄습니다. 홈으로 돌아가 다시 접속해주세요.</p>
          <div className="auth-actions">
            <button
              className="primary-button"
              onClick={() => {
                clearStoredSession();
                resetSessionExpiryState();
                window.location.assign("/");
              }}
              type="button"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return <div className="screen-center">세션 확인 중...</div>;
  }

  if (!data?.user) {
    return (
      <section className="auth-shell">
        <div className="auth-card">
          <img alt="Virtual Office Symbol" className="auth-symbol" src={projectSymbol} />
          <span className="eyebrow">Slack Virtual Office</span>
          <h1>팀 상태를 공간으로 보여주는 오피스 허브</h1>
          <p>
            Slack OAuth로 워크스페이스를 연결하거나, 데모 모드로 흐름을 먼저 확인할 수 있습니다.
          </p>
          {error instanceof Error ? <p className="error-text">인증 서버 연결 실패: {error.message}</p> : null}
          <div className="auth-actions">
            <a className="primary-button" href={apiClient.getSlackLoginUrl()}>
              Slack으로 시작하기
            </a>
            <button
              className="secondary-button"
              onClick={async () => {
                try {
                  const result = await apiClient.demoLogin();
                  storeSession(result.sessionId);
                  await refetch();
                } catch (loginError) {
                  console.error(loginError);
                  window.alert(
                    loginError instanceof Error ? `데모 로그인 실패: ${loginError.message}` : "데모 로그인에 실패했습니다."
                  );
                }
              }}
              type="button"
            >
              데모 로그인
            </button>
          </div>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
