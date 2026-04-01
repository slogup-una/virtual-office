import { useEffect, useRef, useState } from "react";

import { apiClient, clearStoredSession } from "../../api/client";
import { useOfficeSnapshot } from "../../hooks/useOfficeData";
import { useUIStore } from "../../stores/uiStore";
import { ChatPanel } from "../chat/ChatPanel";
import { OfficeMap } from "../office/OfficeMap";
import { TeamSidebar } from "../office/TeamSidebar";

const starSeed = Array.from({ length: 90 }).map((_, index) => ({
  id: index,
  size: index % 5 === 0 ? 2 : 1,
  left: (index * 13) % 100,
  top: (index * 17) % 100,
  dur: `${2 + (index % 5)}s`,
  delay: `${(index % 7) * 0.4}s`,
  minOpacity: 0.15 + (index % 3) * 0.08,
  maxOpacity: 0.55 + (index % 4) * 0.1
}));

const skylineHeights = [88, 130, 112, 164, 96, 142, 104, 176, 118, 154, 94, 136];

export function AppShell() {
  const { data, isLoading } = useOfficeSnapshot();
  const selectedZoneId = useUIStore((state) => state.selectedZoneId);
  const currentUserPosition = useUIStore((state) => state.currentUserPosition);
  const setCurrentUserPosition = useUIStore((state) => state.setCurrentUserPosition);
  const moveCurrentUserPosition = useUIStore((state) => state.moveCurrentUserPosition);
  const currentUser = data?.members.find((member) => member.id === data.currentUserId) ?? null;
  const initializedUserIdRef = useRef<string | null>(null);
  const initializedSeatKeyRef = useRef<string | undefined>(undefined);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (
      initializedUserIdRef.current !== currentUser.id ||
      initializedSeatKeyRef.current !== currentUser.seatKey ||
      !currentUserPosition
    ) {
      initializedUserIdRef.current = currentUser.id;
      initializedSeatKeyRef.current = currentUser.seatKey;
      setCurrentUserPosition({ x: currentUser.x, y: currentUser.y });
    }
  }, [currentUser, currentUserPosition, setCurrentUserPosition]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLInputElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveCurrentUserPosition({ x: 0, y: -1.5 });
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveCurrentUserPosition({ x: 0, y: 1.5 });
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveCurrentUserPosition({ x: -1.5, y: 0 });
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveCurrentUserPosition({ x: 1.5, y: 0 });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moveCurrentUserPosition]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (isLoading || !data) {
    return <div className="screen-center">오피스 데이터를 불러오는 중...</div>;
  }

  const snapshot = {
    ...data,
    members: data.members.map((member) =>
      member.id === data.currentUserId && currentUserPosition
        ? {
            ...member,
            x: currentUserPosition.x,
            y: currentUserPosition.y
          }
        : member
    )
  };
  const formattedTime = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(now);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  })
    .format(now)
    .replace(/\//g, ".");

  return (
    <main className="app-shell">
      <div className="starfield">
        {starSeed.map((star) => (
          <span
            className="star"
            key={star.id}
            style={{
              width: `${star.size}px`,
              height: `${star.size}px`,
              left: `${star.left}%`,
              top: `${star.top}%`,
              ["--dur" as string]: star.dur,
              ["--delay" as string]: star.delay,
              ["--min-op" as string]: String(star.minOpacity),
              ["--max-op" as string]: String(star.maxOpacity)
            }}
          />
        ))}
      </div>
      <div className="city-skyline" aria-hidden="true">
        {skylineHeights.map((height, index) => (
          <div className="city-building" key={index} style={{ height }} />
        ))}
      </div>
      <header className="hud-bar">
        <div className="hud-logo">
          <div className="hud-logo-text">NIGHT SHIFT</div>
          <div className="hud-logo-sub">{snapshot.workspace.name}</div>
        </div>
        <div className="hud-status-row">
          {currentUser ? (
            <div className="hud-me">
              <img alt={currentUser.displayName} className="hud-avatar" src={currentUser.avatarUrl} />
              <div>
                <div className="hud-name">{currentUser.displayName}</div>
                <div className="hud-zone">
                  {currentUser.seatKey ? `${currentUser.seatKey} · ` : ""}
                  {selectedZoneId ?? currentUser.zoneId}
                </div>
              </div>
            </div>
          ) : null}
          {snapshot.members.map((member) => (
            <div className={`hud-member ${member.officeStatus}`} key={member.id}>
              <img alt={member.displayName} className="hud-member-avatar" src={member.avatarUrl} />
              <div>
                <div className="hud-member-name">{member.displayName}</div>
                <div className="hud-member-status">{member.slackStatusText || member.officeStatus}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="hud-clock">
          <div className="hud-time">{formattedTime}</div>
          <div className="hud-date">{formattedDate}</div>
        </div>
      </header>
      <div className="world-actions">
          <button
            className="ghost-button"
            onClick={() => useUIStore.getState().setSelectedZoneId(null)}
            type="button"
          >
            전체 보기
          </button>
          <button
            className="ghost-button"
            onClick={() =>
              void apiClient.logout().then(() => {
                clearStoredSession();
                window.location.reload();
              })
            }
            type="button"
          >
            로그아웃
          </button>
      </div>
      <OfficeMap snapshot={snapshot} />
      <TeamSidebar snapshot={snapshot} />
      <ChatPanel workspace={snapshot.workspace} />
    </main>
  );
}
