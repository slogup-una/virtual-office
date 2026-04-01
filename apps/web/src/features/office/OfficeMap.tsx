import { useState } from "react";

import { apiClient } from "../../api/client";
import type { OfficeSnapshot } from "../../types/domain";
import { useAssignSeat, useClearSeat } from "../../hooks/useOfficeData";
import { useUIStore } from "../../stores/uiStore";

const roomZones = [
  { id: "lounge", label: "휴게공간", x: 2, y: 3, width: 27.5, height: 14 },
  { id: "event-hall", label: "다목적 공간", x: 30, y: 3, width: 36, height: 13 },
  { id: "entrance", label: "출구", x: 66, y: 3, width: 10, height: 4 },
  { id: "storage", label: "창고", x: 77, y: 3, width: 21, height: 12 },
  { id: "meeting-room", label: "회의실 1", x: 77, y: 15, width: 21, height: 25 },
  { id: "qa-room", label: "QA ROOM", x: 78, y: 45, width: 19, height: 10 },
  { id: "meeting-a", label: "회의실 A", x: 2, y: 84, width: 18, height: 13 },
  { id: "meeting-b", label: "회의실 B", x: 20.5, y: 84, width: 18, height: 13 },
  { id: "meeting-c", label: "회의실 C", x: 39, y: 84, width: 18, height: 13 },
  { id: "meeting-d", label: "회의실 D", x: 57.5, y: 84, width: 18, height: 13 },
  { id: "ceo-room", label: "CEO", x: 76, y: 84, width: 22, height: 13 }
] as const;

const deskBands = [
  { rowKey: "A", x: 3, y: 30, seats: 6, columns: 6, emptyLeadingSlots: 0, width: 64, height: 5.6 },
  { rowKey: "B", x: 13.67, y: 36, seats: 5, columns: 5, emptyLeadingSlots: 0, width: 53.33, height: 5.6 },
  { rowKey: "C", x: 3, y: 49, seats: 6, columns: 6, emptyLeadingSlots: 0, width: 64, height: 5.6 },
  { rowKey: "D", x: 3, y: 55, seats: 6, columns: 6, emptyLeadingSlots: 0, width: 64, height: 5.6 },
  { rowKey: "E", x: 13.67, y: 68, seats: 5, columns: 5, emptyLeadingSlots: 0, width: 53.33, height: 5.6 },
  { rowKey: "F", x: 13.67, y: 74, seats: 5, columns: 5, emptyLeadingSlots: 0, width: 53.33, height: 5.6 }
] as const;

const sideDeskBands = [
  { rowKey: "R", y: 62, seats: 2 },
  { rowKey: "S", y: 70, seats: 2 },
  { rowKey: "T", y: 77, seats: 2 }
] as const;

const wallSegments = [
  { x: 2, y: 22, width: 64, height: 3.4, label: "벽" },
  { x: 77, y: 40.5, width: 21, height: 3.4, label: "벽" },
  { x: 77, y: 58.5, width: 21, height: 3.4, label: "벽" }
] as const;

const decorativeWindows: Array<{ x: number; y: number; width: number; height: number }> = [];

const cabinets = [
  { x: 70.5, y: 70, width: 4.4, height: 11 },
  { x: 75.6, y: 70, width: 4.4, height: 11 }
] as const;

const plants = [
  { x: 95, y: 74 },
  { x: 72.5, y: 23 },
  { x: 93, y: 54 }
] as const;

export function OfficeMap({ snapshot }: { snapshot: OfficeSnapshot }) {
  const selectedZoneId = useUIStore((state) => state.selectedZoneId);
  const setSelectedZoneId = useUIStore((state) => state.setSelectedZoneId);
  const assignSeat = useAssignSeat();
  const clearSeat = useClearSeat();
  const [selectedSeatKey, setSelectedSeatKey] = useState<string | null>(null);
  const [seatSearch, setSeatSearch] = useState("");

  const selectedSeat = snapshot.seats.find((seat) => seat.key === selectedSeatKey) ?? null;
  const selectedSeatMember = selectedSeat?.assignedSlackUserId
    ? snapshot.members.find((member) => member.slackUserId === selectedSeat.assignedSlackUserId) ?? null
    : null;
  const canManageSeats = snapshot.canManageSeats;
  const normalizedSeatSearch = seatSearch.trim().toLowerCase();
  const filteredMembers = snapshot.members.filter((member) => {
    if (!normalizedSeatSearch) {
      return true;
    }

    return (
      member.displayName.toLowerCase().includes(normalizedSeatSearch) ||
      member.slackUserId.toLowerCase().includes(normalizedSeatSearch)
    );
  });
  const handleSeatClick = (seatKey: string) => {
    if (!canManageSeats) {
      return;
    }

    console.log("[seat-click]", {
      seatKey,
      seat: snapshot.seats.find((seat) => seat.key === seatKey) ?? null
    });
    setSelectedSeatKey(seatKey);
    setSeatSearch("");
  };
  const handleSeatBackupDownload = async () => {
    const content = await apiClient.exportSeatAssignments();
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "seat-assignments.ts";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="office-scene">
      <div className="map-surface">
        <div className="map-grid" />
        <div className="map-decor-layer">
          {decorativeWindows.map((windowRect, index) => (
            <div
              className="pixel-window"
              key={index}
              style={{
                left: `${windowRect.x}%`,
                top: `${windowRect.y}%`,
                width: `${windowRect.width}%`,
                height: `${windowRect.height}%`
              }}
            />
          ))}
          {roomZones.map((zone) => (
            <button
              key={zone.id}
              className={`zone-card zone-room ${selectedZoneId === zone.id ? "is-selected" : ""}`}
              onClick={() => setSelectedZoneId(zone.id)}
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`
              }}
              type="button"
            >
              <strong>{zone.label}</strong>
            </button>
          ))}
          {wallSegments.map((wall) => (
            <div
              className="wall-segment"
              key={`${wall.x}-${wall.y}`}
              style={{
                left: `${wall.x}%`,
                top: `${wall.y}%`,
                width: `${wall.width}%`,
                height: `${wall.height}%`
              }}
            >
              <span>{wall.label}</span>
            </div>
          ))}
          {cabinets.map((cabinet, index) => (
            <div
              className="pixel-cabinet"
              key={index}
              style={{
                left: `${cabinet.x}%`,
                top: `${cabinet.y}%`,
                width: `${cabinet.width}%`,
                height: `${cabinet.height}%`
              }}
            />
          ))}
          {plants.map((plant, index) => (
            <div className="pixel-plant" key={index} style={{ left: `${plant.x}%`, top: `${plant.y}%` }} />
          ))}
        </div>
        <div className="map-seat-layer">
          {deskBands.map((band) => (
            <div
              className="desk-row"
              key={band.rowKey}
              style={{
                left: `${band.x}%`,
                top: `${band.y}%`,
                width: `${band.width}%`,
                height: `${band.height}%`,
                gridTemplateColumns: `repeat(${band.columns}, 1fr)`
              }}
            >
              {Array.from({ length: band.emptyLeadingSlots }).map((_, index) => (
                <div aria-hidden="true" className="seat-spacer" key={`spacer-${band.rowKey}-${index}`} />
              ))}
              {Array.from({ length: band.seats }).map((_, index) => (
                <button
                  className={`seat-chip ${snapshot.seats.find((seat) => seat.key === `${band.rowKey}-${String(index + 1).padStart(2, "0")}`)?.assignedSlackUserId ? "is-assigned" : ""}`}
                  disabled={!canManageSeats}
                  key={index}
                  onClick={() => handleSeatClick(`${band.rowKey}-${String(index + 1).padStart(2, "0")}`)}
                  type="button"
                >
                  <strong>{`${band.rowKey}-${String(index + 1).padStart(2, "0")}`}</strong>
                  <small>{`자리${index + 1}`}</small>
                </button>
              ))}
            </div>
          ))}
          {sideDeskBands.map((band) => (
            <div
              className="desk-row desk-row-side"
              key={band.rowKey}
              style={{ left: "77%", top: `${band.y}%`, width: "21%", height: "5.2%" }}
            >
              {Array.from({ length: band.seats }).map((_, index) => (
                <button
                  className={`seat-chip ${snapshot.seats.find((seat) => seat.key === `${band.rowKey}-${String(index + 1).padStart(2, "0")}`)?.assignedSlackUserId ? "is-assigned" : ""}`}
                  disabled={!canManageSeats}
                  key={index}
                  onClick={() => handleSeatClick(`${band.rowKey}-${String(index + 1).padStart(2, "0")}`)}
                  type="button"
                >
                  <strong>{`${band.rowKey}-${String(index + 1).padStart(2, "0")}`}</strong>
                  <small>{`자리${index + 1}`}</small>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="map-avatar-layer">
          {snapshot.members.filter((member) => member.officeStatus !== "away").map((member) => (
            <div
              key={member.id}
              className={`avatar-token ${member.officeStatus} ${member.id === snapshot.currentUserId ? "is-current" : ""}`}
              style={{ left: `${member.x}%`, top: `${member.y}%` }}
              title={`${member.displayName} · ${member.slackStatusText ?? member.officeStatus}`}
            >
              {member.id === snapshot.currentUserId ? <em className="you-badge">YOU</em> : null}
              <img alt={member.displayName} src={member.avatarUrl} />
              {member.seatKey ? <small className="avatar-seat-tag">{member.seatKey}</small> : null}
              <span>{member.displayName}</span>
            </div>
          ))}
        </div>
        {selectedSeat && canManageSeats ? (
          <aside className="seat-assignment-panel">
            <div className="floating-header">
              <div>
                <span className="eyebrow">Seat Manager</span>
                <h2>{selectedSeat.key}</h2>
              </div>
              <button
                aria-label="좌석 관리자 닫기"
                className="panel-icon-button panel-close-button"
                onClick={() => setSelectedSeatKey(null)}
                type="button"
              >
                <span aria-hidden="true" className="close-glyph">
                  ×
                </span>
              </button>
            </div>
            <p className="seat-assignment-copy">
              현재 배정: {selectedSeatMember ? `${selectedSeatMember.displayName} (${selectedSeatMember.slackUserId})` : "없음"}
            </p>
            <label className="seat-search-field">
              <span>유저 검색</span>
              <input
                onChange={(event) => setSeatSearch(event.target.value)}
                placeholder="닉네임 또는 Slack ID"
                type="text"
                value={seatSearch}
              />
            </label>
            <div className="seat-member-list">
              {filteredMembers.map((member) => (
                <button
                  className={`seat-member-option ${selectedSeat.assignedSlackUserId === member.slackUserId ? "is-selected" : ""}`}
                  key={member.id}
                  onClick={() =>
                    void assignSeat.mutateAsync({ seatKey: selectedSeat.key, slackUserId: member.slackUserId })
                  }
                  type="button"
                >
                  <strong>{member.displayName}</strong>
                  <small>{member.slackUserId}</small>
                </button>
              ))}
              {filteredMembers.length === 0 ? <p className="seat-empty-state">검색 결과가 없습니다.</p> : null}
            </div>
            <div className="seat-assignment-actions">
              <button className="ghost-button" onClick={() => void handleSeatBackupDownload()} type="button">
                배정 백업 다운로드
              </button>
              <button
                className="ghost-button"
                disabled={!selectedSeat.assignedSlackUserId}
                onClick={() => void clearSeat.mutateAsync(selectedSeat.key)}
                type="button"
              >
                자리 비우기
              </button>
            </div>
          </aside>
        ) : null}
      </div>
      <div className="seat-debug-indicator">
        선택된 좌석: {selectedSeatKey ?? "없음"} · 권한: {canManageSeats ? "관리자" : "읽기 전용"}
      </div>
    </section>
  );
}
