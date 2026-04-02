import { useEffect, useRef, useState } from "react";

import { apiClient, clearStoredSession } from "../../api/client";
import { useOfficeSnapshot } from "../../hooks/useOfficeData";
import { useUIStore } from "../../stores/uiStore";
import type { OfficeMember } from "../../types/domain";
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
const officeNoticeEventName = "office-notice";
const roomObjectStorageKey = "virtual-office-room-objects-v2";
const movementObstaclePadding = 1.2;

const wallObstacleSegments = [
  { x: 2, y: 22, width: 64, height: 3.4 },
  { x: 77, y: 40.5, width: 21, height: 3.4 },
  { x: 77, y: 58.5, width: 21, height: 3.4 }
] as const;

const defaultObstacleObjects = [
  { x: 79.5, y: 22.5, width: 16.5, height: 14 },
  { x: 91.5, y: 16.5, width: 5.8, height: 6.8 },
  { x: 78.8, y: 16.2, width: 3.8, height: 5.2 },
  { x: 5.2, y: 7.5, width: 18, height: 7.5 },
  { x: 12.5, y: 13.6, width: 7.6, height: 4.8 },
  { x: 79.3, y: 86.2, width: 12.5, height: 8.5 },
  { x: 93, y: 85.6, width: 4.8, height: 5.8 },
  { x: 79.2, y: 4.4, width: 7.2, height: 8.6 },
  { x: 90.4, y: 4.4, width: 7.2, height: 8.6 },
  { x: 85.3, y: 8.5, width: 5.6, height: 5.4 },
  { x: 66.4, y: 3.2, width: 7.6, height: 3.7 },
  { x: 73.2, y: 3.45, width: 1.8, height: 3.1 }
] as const;

function loadObstacleObjects() {
  try {
    const raw = window.localStorage.getItem(roomObjectStorageKey);
    if (!raw) {
      return [...defaultObstacleObjects];
    }

    const parsed = JSON.parse(raw) as Array<{ x: number; y: number; width: number; height: number }>;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...defaultObstacleObjects];
    }

    return parsed.filter(
      (item) =>
        typeof item?.x === "number" &&
        typeof item?.y === "number" &&
        typeof item?.width === "number" &&
        typeof item?.height === "number"
    );
  } catch {
    return [...defaultObstacleObjects];
  }
}

function isMovementBlocked(x: number, y: number, obstacles: Array<{ x: number; y: number; width: number; height: number }>) {
  return (
    obstacles.some(
      (object) =>
        x >= object.x - movementObstaclePadding &&
        x <= object.x + object.width + movementObstaclePadding &&
        y >= object.y - movementObstaclePadding &&
        y <= object.y + object.height + movementObstaclePadding
    ) ||
    wallObstacleSegments.some(
      (wall) =>
        x >= wall.x - movementObstaclePadding &&
        x <= wall.x + wall.width + movementObstaclePadding &&
        y >= wall.y - movementObstaclePadding &&
        y <= wall.y + wall.height + movementObstaclePadding
    )
  );
}

const isUnavailableStatus = (status: OfficeMember["officeStatus"]) =>
  status === "away" || status === "offline";

export function AppShell() {
  const { data, isLoading } = useOfficeSnapshot();
  const selectedZoneId = useUIStore((state) => state.selectedZoneId);
  const isChatPanelOpen = useUIStore((state) => state.isChatPanelOpen);
  const isStatusPanelOpen = useUIStore((state) => state.isStatusPanelOpen);
  const currentUserPosition = useUIStore((state) => state.currentUserPosition);
  const setCurrentUserPosition = useUIStore((state) => state.setCurrentUserPosition);
  const setIsChatPanelOpen = useUIStore((state) => state.setIsChatPanelOpen);
  const setIsStatusPanelOpen = useUIStore((state) => state.setIsStatusPanelOpen);
  const moveCurrentUserPosition = useUIStore((state) => state.moveCurrentUserPosition);
  const currentUser = data?.members.find((member) => member.id === data.currentUserId) ?? null;
  const initializedUserIdRef = useRef<string | null>(null);
  const initializedSeatKeyRef = useRef<string | undefined>(undefined);
  const previousMembersRef = useRef<Map<string, OfficeMember>>(new Map());
  const noticeTimeoutRef = useRef<number | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

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

      if (!currentUserPosition) {
        return;
      }

      let deltaX = 0;
      let deltaY = 0;

      if (event.key === "ArrowUp") {
        event.preventDefault();
        deltaY = -1.5;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        deltaY = 1.5;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        deltaX = -1.5;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        deltaX = 1.5;
      }

      if (deltaX === 0 && deltaY === 0) {
        return;
      }

      const nextX = Math.min(96, Math.max(4, currentUserPosition.x + deltaX));
      const nextY = Math.min(95, Math.max(5, currentUserPosition.y + deltaY));
      const obstacles = loadObstacleObjects();

      if (!isMovementBlocked(nextX, nextY, obstacles)) {
        moveCurrentUserPosition({ x: deltaX, y: deltaY });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentUserPosition, moveCurrentUserPosition]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOfficeNotice = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      if (typeof customEvent.detail?.message === "string" && customEvent.detail.message.trim()) {
        setNoticeMessage(customEvent.detail.message.trim());
      }
    };

    window.addEventListener(officeNoticeEventName, handleOfficeNotice as EventListener);
    return () => window.removeEventListener(officeNoticeEventName, handleOfficeNotice as EventListener);
  }, []);

  useEffect(() => {
    if (!data) {
      return;
    }

    const previousMembers = previousMembersRef.current;
    const nextMembers = new Map(data.members.map((member) => [member.id, member]));

    if (previousMembers.size > 0) {
      const currentHour = new Date().getHours();

      for (const member of data.members) {
        const previousMember = previousMembers.get(member.id);
        if (!previousMember) {
          continue;
        }

        const wasUnavailable = isUnavailableStatus(previousMember.officeStatus);
        const isUnavailable = isUnavailableStatus(member.officeStatus);

        if (wasUnavailable && !isUnavailable && currentHour >= 8 && currentHour < 11) {
          setNoticeMessage(`${member.displayName}님 좋은 아침입니다.`);
          break;
        }

        if (!wasUnavailable && isUnavailable && currentHour >= 17 && currentHour < 20) {
          setNoticeMessage(`${member.displayName}님 고생하셨습니다.`);
          break;
        }
      }
    }

    previousMembersRef.current = nextMembers;
  }, [data]);

  useEffect(() => {
    if (!noticeMessage) {
      return;
    }

    if (noticeTimeoutRef.current) {
      window.clearTimeout(noticeTimeoutRef.current);
    }

    noticeTimeoutRef.current = window.setTimeout(() => {
      setNoticeMessage(null);
      noticeTimeoutRef.current = null;
    }, 6000);

    return () => {
      if (noticeTimeoutRef.current) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, [noticeMessage]);

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
  const timeOfDay = now.getHours() >= 6 && now.getHours() < 18 ? "day" : "night";

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
          <div className="hud-logo-text">SAFIENCE X SLOGUP</div>
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
          <div className="hud-billboard">
            <div className="hud-billboard-track">
              <span>WHAT&apos;S UP? WE&apos;RE SLOGUP!</span>
            </div>
          </div>
        </div>
        <div className="hud-clock">
          <div className="hud-time-row">
            <span
              aria-hidden="true"
              className={`hud-time-icon ${timeOfDay === "day" ? "is-sun" : "is-moon"}`}
            />
            <div className="hud-time">{formattedTime}</div>
          </div>
          <div className="hud-date">{formattedDate}</div>
        </div>
      </header>
      {noticeMessage ? (
        <div className="hud-notice-bar">
          <div className="hud-notice-pill">NOTICE</div>
          <div className="hud-notice-text">{noticeMessage}</div>
        </div>
      ) : null}
      <aside className="panel-label-dock" aria-label="패널 컨트롤">
        <button
          className={`panel-label-button ${isStatusPanelOpen ? "is-active" : ""}`}
          onClick={() => setIsStatusPanelOpen(!isStatusPanelOpen)}
          type="button"
        >
          상태
        </button>
        <button
          className={`panel-label-button ${isChatPanelOpen ? "is-active" : ""}`}
          onClick={() => setIsChatPanelOpen(!isChatPanelOpen)}
          type="button"
        >
          채팅
        </button>
        <button
          className="panel-label-button"
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
      </aside>
      <OfficeMap snapshot={snapshot} />
      <TeamSidebar snapshot={snapshot} />
      <ChatPanel workspace={snapshot.workspace} />
    </main>
  );
}
