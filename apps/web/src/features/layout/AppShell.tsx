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

const isUnavailableStatus = (status: OfficeMember["officeStatus"]) =>
  status === "away" || status === "offline";

export function AppShell() {
  const { data, isLoading } = useOfficeSnapshot();
  const selectedZoneId = useUIStore((state) => state.selectedZoneId);
  const currentUserPosition = useUIStore((state) => state.currentUserPosition);
  const setCurrentUserPosition = useUIStore((state) => state.setCurrentUserPosition);
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
          <div className="hud-actions">
            <button
              className="ghost-button hud-action-button"
              onClick={() =>
                void apiClient.logout().then(() => {
                  clearStoredSession();
                  window.location.reload();
                })
              }
              type="button"
            >
              logout
            </button>
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
      <OfficeMap snapshot={snapshot} />
      <TeamSidebar snapshot={snapshot} />
      <ChatPanel workspace={snapshot.workspace} />
    </main>
  );
}
