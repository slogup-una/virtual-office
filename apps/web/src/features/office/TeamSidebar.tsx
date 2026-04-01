import { PointerEvent, useRef } from "react";

import type { OfficeSnapshot } from "../../types/domain";
import { useUIStore } from "../../stores/uiStore";

const statusLabel = {
  active: "업무 중",
  away: "자리 비움",
  dnd: "집중",
  lunch: "점심",
  meeting: "회의",
  field: "외근",
  offline: "오프라인"
} as const;

export function TeamSidebar({ snapshot }: { snapshot: OfficeSnapshot }) {
  const statusOffset = useUIStore((state) => state.statusOffset);
  const isStatusPanelOpen = useUIStore((state) => state.isStatusPanelOpen);
  const setStatusOffset = useUIStore((state) => state.setStatusOffset);
  const setIsStatusPanelOpen = useUIStore((state) => state.setIsStatusPanelOpen);
  const dragState = useRef<{ x: number; y: number; pointerId: number } | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragState.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId
    };

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      if (!dragState.current || moveEvent.pointerId !== dragState.current.pointerId) {
        return;
      }

      const deltaX = moveEvent.clientX - dragState.current.x;
      const deltaY = moveEvent.clientY - dragState.current.y;
      dragState.current = {
        x: moveEvent.clientX,
        y: moveEvent.clientY,
        pointerId: moveEvent.pointerId
      };

      const currentOffset = useUIStore.getState().statusOffset;
      setStatusOffset({
        x: currentOffset.x + deltaX,
        y: currentOffset.y + deltaY
      });
    };

    const handlePointerUp = () => {
      dragState.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  if (!isStatusPanelOpen) {
    return (
      <button
        className="status-panel-toggle"
        onClick={() => setIsStatusPanelOpen(true)}
        type="button"
      >
        상태 열기
      </button>
    );
  }

  return (
    <aside
      className="floating-panel status-panel"
      style={{ transform: `translate(${statusOffset.x}px, ${statusOffset.y}px)` }}
    >
      <div className="floating-header draggable-header" onPointerDown={handlePointerDown}>
        <div>
          <span className="eyebrow">Team Presence</span>
          <h2>상태</h2>
        </div>
        <div className="panel-tools">
          <span className="drag-hint">drag</span>
          <button
            className="panel-icon-button"
            onClick={() => setIsStatusPanelOpen(false)}
            type="button"
          >
            닫기
          </button>
        </div>
      </div>
      <div className="member-list compact-list">
        {snapshot.members.map((member) => (
          <article
            className={`member-card compact-card ${member.id === snapshot.currentUserId ? "is-current" : ""}`}
            key={member.id}
          >
            <img alt={member.displayName} className="member-avatar" src={member.avatarUrl} />
            <div>
              <strong>{member.displayName}</strong>
              <p>{statusLabel[member.officeStatus]}</p>
              <small>
                {member.slackStatusEmoji} {member.slackStatusText || member.zoneId}
              </small>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
