import { useEffect } from "react";

import { apiClient, clearStoredSession } from "../../api/client";
import { useOfficeSnapshot } from "../../hooks/useOfficeData";
import { useUIStore } from "../../stores/uiStore";
import { ChatPanel } from "../chat/ChatPanel";
import { OfficeMap } from "../office/OfficeMap";
import { TeamSidebar } from "../office/TeamSidebar";

export function AppShell() {
  const { data, isLoading } = useOfficeSnapshot();
  const selectedZoneId = useUIStore((state) => state.selectedZoneId);
  const currentUserPosition = useUIStore((state) => state.currentUserPosition);
  const setCurrentUserPosition = useUIStore((state) => state.setCurrentUserPosition);
  const moveCurrentUserPosition = useUIStore((state) => state.moveCurrentUserPosition);
  const currentUser = data?.members.find((member) => member.id === data.currentUserId) ?? null;

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (
      !currentUserPosition ||
      currentUserPosition.x !== currentUser.x ||
      currentUserPosition.y !== currentUser.y
    ) {
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

  return (
    <main className="app-shell">
      <div className="world-hud">
        <div className="world-title">
          <span className="eyebrow">Workspace</span>
          <h1>{snapshot.workspace.name}</h1>
          <p>방향키로 내 아바타를 이동할 수 있습니다. 선택 구역: {selectedZoneId ?? "전체"}</p>
        </div>
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
      </div>
      <OfficeMap snapshot={snapshot} />
      <TeamSidebar snapshot={snapshot} />
      <ChatPanel workspace={snapshot.workspace} />
    </main>
  );
}
