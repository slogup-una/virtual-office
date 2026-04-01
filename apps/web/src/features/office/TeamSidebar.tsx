import type { OfficeSnapshot } from "../../types/domain";

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
  return (
    <aside className="panel sidebar-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Team Presence</span>
          <h2>구성원 상태</h2>
        </div>
      </div>
      <div className="member-list">
        {snapshot.members.map((member) => (
          <article className="member-card" key={member.id}>
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
