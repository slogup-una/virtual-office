import { useEffect, useRef, useState } from "react";

import { apiClient, clearStoredSession } from "../../api/client";
import { useOfficeSnapshot } from "../../hooks/useOfficeData";
import { useUIStore } from "../../stores/uiStore";
import type { AvatarDirection } from "../../stores/uiStore";
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
const roomObjectStorageKey = "virtual-office-room-objects-v3";
const movementObstaclePadding = 1.2;
const objectHitboxInsetRatio = 0.18;
const objectHitboxMinInset = 0.35;

const wallObstacleSegments = [
  { x: 2, y: 22, width: 64, height: 3.4 },
  { x: 77, y: 40.5, width: 17, height: 3.4 },
  { x: 77, y: 58.5, width: 17, height: 3.4 }
] as const;

const deskBarrierSegments = [
  { x: 3, y: 33.8, width: 64 },
  { x: 13.67, y: 39.8, width: 53.33 },
  { x: 3, y: 52.8, width: 64 },
  { x: 3, y: 58.8, width: 64 },
  { x: 13.67, y: 71.8, width: 53.33 },
  { x: 13.67, y: 77.8, width: 53.33 },
  { x: 78.7, y: 66.05, width: 15.3 },
  { x: 78.7, y: 74.05, width: 15.3 },
  { x: 78.7, y: 81.05, width: 15.3 }
] as const;

const defaultObstacleObjects = [
  { id: "whiteboard-1", x: 88.9, y: 16.7, width: 4.1, height: 5.3 },
  { id: "wall-clock-1", x: 78.2, y: 16.4, width: 2.8, height: 4.1 },
  { id: "l-desk-1", x: 74, y: 86.5, width: 9.5, height: 7.2 },
  { id: "trophy-shelf-1", x: 90, y: 89, width: 3.7, height: 4.6 }
] as const;

const defaultObstacleObjectIds = new Set<string>(defaultObstacleObjects.map((object) => object.id));

const isVirtualOfficeMember = (member: OfficeMember) =>
  member.id.toLowerCase().includes("virtual-office") ||
  member.slackUserId.toLowerCase().includes("virtual-office") ||
  member.displayName.toLowerCase().includes("virtual-office");

function loadObstacleObjects() {
  try {
    const raw = window.localStorage.getItem(roomObjectStorageKey);
    if (!raw) {
      return defaultObstacleObjects.map(({ id, ...object }) => object);
    }

    const parsed = JSON.parse(raw) as Array<{
      id?: string;
      x: number;
      y: number;
      width: number;
      height: number;
      blocksMovement?: boolean;
    }>;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return defaultObstacleObjects.map(({ id, ...object }) => object);
    }

    return parsed.filter(
      (item) =>
        (item?.blocksMovement === true || (typeof item?.id === "string" && defaultObstacleObjectIds.has(item.id))) &&
        typeof item?.x === "number" &&
        typeof item?.y === "number" &&
        typeof item?.width === "number" &&
        typeof item?.height === "number"
    ).map(({ x, y, width, height }) => ({ x, y, width, height }));
  } catch {
    return defaultObstacleObjects.map(({ id, ...object }) => object);
  }
}

function getObjectCollisionBounds(object: { x: number; y: number; width: number; height: number }) {
  const insetX = Math.max(object.width * objectHitboxInsetRatio, objectHitboxMinInset);
  const insetY = Math.max(object.height * objectHitboxInsetRatio, objectHitboxMinInset);

  return {
    left: object.x + insetX,
    right: object.x + object.width - insetX,
    top: object.y + insetY,
    bottom: object.y + object.height - insetY
  };
}

function crossesDeskBarrier(
  previousX: number,
  previousY: number,
  nextX: number,
  nextY: number,
  barrier: { x: number; y: number; width: number }
) {
  const withinHorizontalRange =
    Math.max(previousX, nextX) >= barrier.x && Math.min(previousX, nextX) <= barrier.x + barrier.width;
  const crossedVerticalLine =
    (previousY < barrier.y && nextY >= barrier.y) || (previousY > barrier.y && nextY <= barrier.y);

  return withinHorizontalRange && crossedVerticalLine;
}

function isMovementBlocked(
  previousX: number,
  previousY: number,
  nextX: number,
  nextY: number,
  obstacles: Array<{ x: number; y: number; width: number; height: number }>
) {
  return (
    obstacles.some(
      (object) => {
        const bounds = getObjectCollisionBounds(object);
        return (
          nextX >= bounds.left - movementObstaclePadding &&
          nextX <= bounds.right + movementObstaclePadding &&
          nextY >= bounds.top - movementObstaclePadding &&
          nextY <= bounds.bottom + movementObstaclePadding
        );
      }
    ) ||
    wallObstacleSegments.some(
      (wall) =>
        nextX >= wall.x - movementObstaclePadding &&
        nextX <= wall.x + wall.width + movementObstaclePadding &&
        nextY >= wall.y - movementObstaclePadding &&
        nextY <= wall.y + wall.height + movementObstaclePadding
    ) ||
    deskBarrierSegments.some((barrier) => crossesDeskBarrier(previousX, previousY, nextX, nextY, barrier))
  );
}

const isUnavailableStatus = (status: OfficeMember["officeStatus"]) =>
  status === "away" || status === "offline";

export function AppShell() {
  const { data, isLoading } = useOfficeSnapshot();
  const selectedZoneId = useUIStore((state) => state.selectedZoneId);
  const isChatPanelOpen = useUIStore((state) => state.isChatPanelOpen);
  const isStatusPanelOpen = useUIStore((state) => state.isStatusPanelOpen);
  const isLayoutEditorPanelOpen = useUIStore((state) => state.isLayoutEditorPanelOpen);
  const currentUserPosition = useUIStore((state) => state.currentUserPosition);
  const setCurrentUserPosition = useUIStore((state) => state.setCurrentUserPosition);
  const setIsChatPanelOpen = useUIStore((state) => state.setIsChatPanelOpen);
  const setIsStatusPanelOpen = useUIStore((state) => state.setIsStatusPanelOpen);
  const setIsLayoutEditorPanelOpen = useUIStore((state) => state.setIsLayoutEditorPanelOpen);
  const moveCurrentUserPosition = useUIStore((state) => state.moveCurrentUserPosition);
  const setCurrentUserDirection = useUIStore((state) => state.setCurrentUserDirection);
  const isCurrentUserSeated = useUIStore((state) => state.isCurrentUserSeated);
  const setIsCurrentUserSeated = useUIStore((state) => state.setIsCurrentUserSeated);
  const setIsCurrentUserMoving = useUIStore((state) => state.setIsCurrentUserMoving);
  const isDemoWorkspace = data?.workspace.id === "demo-workspace";
  const visibleMembers = data?.members.filter((member) => !isVirtualOfficeMember(member)) ?? [];
  const currentUser = visibleMembers.find((member) => member.id === data?.currentUserId) ?? null;
  const canManageSeats = isDemoWorkspace || (data?.canManageSeats ?? false);
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
    setCurrentUserDirection("down");
  }, [setCurrentUserDirection]);

  useEffect(() => {
    setIsCurrentUserSeated(false);
  }, [setIsCurrentUserSeated]);

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
      let direction: AvatarDirection | null = null;

      if (event.key === "ArrowUp") {
        event.preventDefault();
        deltaY = -1.5;
        direction = "down";
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        deltaY = 1.5;
        direction = "down";
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        deltaX = -1.5;
        direction = "left";
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        deltaX = 1.5;
        direction = "down";
      }

      if (deltaX === 0 && deltaY === 0) {
        return;
      }

      if (direction) {
        setCurrentUserDirection(direction);
      }
      setIsCurrentUserMoving(true);

      const nextX = Math.min(96, Math.max(4, currentUserPosition.x + deltaX));
      const nextY = Math.min(95, Math.max(5, currentUserPosition.y + deltaY));
      const obstacles = loadObstacleObjects();

      if (!isMovementBlocked(currentUserPosition.x, currentUserPosition.y, nextX, nextY, obstacles)) {
        moveCurrentUserPosition({ x: deltaX, y: deltaY });
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key.startsWith("Arrow")) {
        setIsCurrentUserMoving(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    currentUserPosition,
    moveCurrentUserPosition,
    setCurrentUserDirection,
    setIsCurrentUserMoving,
    setIsCurrentUserSeated
  ]);

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
    const nextMembers = new Map(visibleMembers.map((member) => [member.id, member]));

    if (previousMembers.size > 0) {
      const currentHour = new Date().getHours();

      for (const member of visibleMembers) {
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
  }, [visibleMembers]);

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
    canManageSeats,
    members: visibleMembers.map((member) =>
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
        <div className="panel-label-group">
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
        </div>
        {canManageSeats ? (
          <div className="panel-label-group panel-label-group-bottom">
            <button
              className={`panel-label-button ${isLayoutEditorPanelOpen ? "is-active" : ""}`}
              onClick={() => setIsLayoutEditorPanelOpen(!isLayoutEditorPanelOpen)}
              type="button"
            >
              {isLayoutEditorPanelOpen ? "편집 닫기" : "오브젝트 편집"}
            </button>
          </div>
        ) : null}
      </aside>
      <OfficeMap snapshot={snapshot} />
      <TeamSidebar snapshot={snapshot} />
      <ChatPanel
        currentUserId={snapshot.currentUserId}
        currentUserName={currentUser?.displayName}
        workspace={snapshot.workspace}
      />
    </main>
  );
}
