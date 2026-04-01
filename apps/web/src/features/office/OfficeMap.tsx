import { useState } from "react";

import type { OfficeSnapshot } from "../../types/domain";
import { useAssignSeat, useClearSeat } from "../../hooks/useOfficeData";
import { useUIStore } from "../../stores/uiStore";

const roomZones = [
  { id: "lounge-large", label: "휴게공간 2인실", x: 2, y: 3, width: 18, height: 14 },
  { id: "lounge-small", label: "휴게공간 1인실", x: 20.5, y: 3, width: 9, height: 6 },
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
  { rowKey: "A", y: 30, seats: 5, width: 64, height: 5.6 },
  { rowKey: "B", y: 36, seats: 5, width: 64, height: 5.6 },
  { rowKey: "C", y: 49, seats: 5, width: 64, height: 5.6 },
  { rowKey: "D", y: 55, seats: 5, width: 64, height: 5.6 },
  { rowKey: "E", y: 68, seats: 5, width: 64, height: 5.6 },
  { rowKey: "F", y: 74, seats: 5, width: 64, height: 5.6 }
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

const decorativeWindows = [
  { x: 4, y: 7, width: 8, height: 13 },
  { x: 13, y: 7, width: 8, height: 13 }
] as const;

const neonSigns = [
  { x: 22, y: 8, label: "WORK MODE", tone: "pink" },
  { x: 42, y: 9, label: "ON AIR", tone: "cyan" },
  { x: 78, y: 8, label: "COFFEE", tone: "yellow" }
] as const;

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

  const selectedSeat = snapshot.seats.find((seat) => seat.key === selectedSeatKey) ?? null;
  const selectedSeatMember = selectedSeat?.assignedSlackUserId
    ? snapshot.members.find((member) => member.slackUserId === selectedSeat.assignedSlackUserId) ?? null
    : null;
  const handleSeatClick = (seatKey: string) => {
    console.log("[seat-click]", {
      seatKey,
      seat: snapshot.seats.find((seat) => seat.key === seatKey) ?? null
    });
    setSelectedSeatKey(seatKey);
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
          {neonSigns.map((sign) => (
            <div
              className={`pixel-neon-sign ${sign.tone}`}
              key={sign.label}
              style={{ left: `${sign.x}%`, top: `${sign.y}%` }}
            >
              {sign.label}
            </div>
          ))}
          <div className="pixel-clock" style={{ left: "58%", top: "9%" }}>
            21:42
          </div>
          <div className="pixel-ticker" style={{ left: "82%", top: "9%", width: "14%", height: "2.8%" }}>
            <div className="pixel-ticker-inner">
              <span>SLACK SYNC · NIGHT SHIFT · OFFICE LIVE</span>
            </div>
          </div>
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
              style={{ left: "3%", top: `${band.y}%`, width: `${band.width}%`, height: `${band.height}%` }}
            >
              {Array.from({ length: band.seats }).map((_, index) => (
                <button
                  className={`seat-chip ${snapshot.seats.find((seat) => seat.key === `${band.rowKey}-${String(index + 1).padStart(2, "0")}`)?.assignedSlackUserId ? "is-assigned" : ""}`}
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
          {snapshot.members.map((member) => (
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
        {selectedSeat ? (
          <aside className="seat-assignment-panel">
            <div className="floating-header">
              <div>
                <span className="eyebrow">Seat Manager</span>
                <h2>{selectedSeat.key}</h2>
              </div>
              <button className="panel-icon-button" onClick={() => setSelectedSeatKey(null)} type="button">
                닫기
              </button>
            </div>
            <p className="seat-assignment-copy">
              현재 배정: {selectedSeatMember ? `${selectedSeatMember.displayName} (${selectedSeatMember.slackUserId})` : "없음"}
            </p>
            <div className="seat-member-list">
              {snapshot.members.map((member) => (
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
            </div>
            <div className="seat-assignment-actions">
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
        선택된 좌석: {selectedSeatKey ?? "없음"}
      </div>
    </section>
  );
}
