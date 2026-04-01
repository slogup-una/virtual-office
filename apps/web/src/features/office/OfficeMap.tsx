import type { OfficeSnapshot } from "../../types/domain";
import { useUIStore } from "../../stores/uiStore";

const zones = [
  { id: "entrance", label: "출입구", x: 2, y: 5, width: 18, height: 16 },
  { id: "main-office", label: "메인 오피스", x: 22, y: 5, width: 42, height: 44 },
  { id: "meeting-room", label: "회의실", x: 66, y: 5, width: 26, height: 26 },
  { id: "cafeteria", label: "구내식당", x: 66, y: 35, width: 26, height: 26 },
  { id: "lounge", label: "라운지", x: 22, y: 52, width: 42, height: 24 },
  { id: "field-zone", label: "외근 구역", x: 2, y: 52, width: 18, height: 24 }
] as const;

export function OfficeMap({ snapshot }: { snapshot: OfficeSnapshot }) {
  const selectedZoneId = useUIStore((state) => state.selectedZoneId);
  const setSelectedZoneId = useUIStore((state) => state.setSelectedZoneId);

  return (
    <section className="panel map-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Office View</span>
          <h2>Slack 상태 기반 맵</h2>
        </div>
        <button className="ghost-button" onClick={() => setSelectedZoneId(null)} type="button">
          전체 보기
        </button>
      </div>
      <div className="map-surface">
        {zones.map((zone) => (
          <button
            key={zone.id}
            className={`zone-card ${selectedZoneId === zone.id ? "is-selected" : ""}`}
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
        {snapshot.members.map((member) => (
          <div
            key={member.id}
            className={`avatar-token ${member.officeStatus}`}
            style={{ left: `${member.x}%`, top: `${member.y}%` }}
            title={`${member.displayName} · ${member.slackStatusText ?? member.officeStatus}`}
          >
            <img alt={member.displayName} src={member.avatarUrl} />
            <span>{member.displayName}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
