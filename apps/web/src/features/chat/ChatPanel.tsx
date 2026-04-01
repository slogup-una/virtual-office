import { FormEvent } from "react";

import { useMessages, useSendMessage } from "../../hooks/useOfficeData";
import { useUIStore } from "../../stores/uiStore";
import type { WorkspaceInfo } from "../../types/domain";

export function ChatPanel({ workspace }: { workspace: WorkspaceInfo }) {
  const selectedChannelId = useUIStore((state) => state.selectedChannelId);
  const messageDraft = useUIStore((state) => state.messageDraft);
  const setMessageDraft = useUIStore((state) => state.setMessageDraft);
  const { data, isLoading } = useMessages(selectedChannelId);
  const sendMessage = useSendMessage();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = messageDraft.trim();
    if (!text) {
      return;
    }

    await sendMessage.mutateAsync({
      channelId: selectedChannelId,
      text
    });
    setMessageDraft("");
  };

  return (
    <section className="panel chat-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Slack Sync</span>
          <h2>#{workspace.defaultChannelId}</h2>
        </div>
      </div>
      <div className="message-list">
        {isLoading ? (
          <p>메시지를 불러오는 중...</p>
        ) : (
          data?.items.map((message) => (
            <article className="message-card" key={message.id}>
              <div className="message-meta">
                <strong>{message.userName}</strong>
                <span>{new Date(message.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p>{message.text}</p>
              <small>{message.source === "slack" ? "Slack Events / Web API" : "App Demo Store"}</small>
            </article>
          ))
        )}
      </div>
      <form className="composer" onSubmit={(event) => void handleSubmit(event)}>
        <textarea
          onChange={(event) => setMessageDraft(event.target.value)}
          placeholder="Slack 채널에 전송할 메시지를 입력하세요."
          rows={3}
          value={messageDraft}
        />
        <button className="primary-button" disabled={sendMessage.isPending} type="submit">
          {sendMessage.isPending ? "전송 중..." : "메시지 전송"}
        </button>
      </form>
    </section>
  );
}
