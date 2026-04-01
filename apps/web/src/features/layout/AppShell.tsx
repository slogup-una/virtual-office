import { apiClient, clearStoredSession } from "../../api/client";
import { useOfficeSnapshot } from "../../hooks/useOfficeData";
import { useUIStore } from "../../stores/uiStore";
import { ChatPanel } from "../chat/ChatPanel";
import { OfficeMap } from "../office/OfficeMap";
import { TeamSidebar } from "../office/TeamSidebar";

export function AppShell() {
  const { data, isLoading } = useOfficeSnapshot();
  const selectedZoneId = useUIStore((state) => state.selectedZoneId);

  if (isLoading || !data) {
    return <div className="screen-center">오피스 데이터를 불러오는 중...</div>;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>{data.workspace.name}</h1>
        </div>
        <div className="topbar-actions">
          <span className="status-chip">선택 구역: {selectedZoneId ?? "전체"}</span>
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
      </header>
      <section className="content-grid">
        <OfficeMap snapshot={data} />
        <TeamSidebar snapshot={data} />
        <ChatPanel workspace={data.workspace} />
      </section>
    </main>
  );
}
