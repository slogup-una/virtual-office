import { FormEvent, PointerEvent, useEffect, useRef } from "react";

import { useMessages, useSendMessage } from "../../hooks/useOfficeData";
import { useUIStore } from "../../stores/uiStore";
import type { WorkspaceInfo } from "../../types/domain";

export function ChatPanel({
  workspace,
  currentUserId,
  currentUserName
}: {
  workspace: WorkspaceInfo;
  currentUserId?: string;
  currentUserName?: string;
}) {
  const selectedChannelId = useUIStore((state) => state.selectedChannelId);
  const messageDraft = useUIStore((state) => state.messageDraft);
  const chatOffset = useUIStore((state) => state.chatOffset);
  const isChatPanelOpen = useUIStore((state) => state.isChatPanelOpen);
  const chatSize = useUIStore((state) => state.chatSize);
  const setMessageDraft = useUIStore((state) => state.setMessageDraft);
  const setChatOffset = useUIStore((state) => state.setChatOffset);
  const setIsChatPanelOpen = useUIStore((state) => state.setIsChatPanelOpen);
  const setChatSize = useUIStore((state) => state.setChatSize);
  const setSelectedChannelId = useUIStore((state) => state.setSelectedChannelId);
  const { data, isLoading } = useMessages(selectedChannelId);
  const sendMessage = useSendMessage();
  const dragState = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const hasObservedInitialSize = useRef(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = messageDraft.replace(/\r\n/g, "\n");
    if (!text.trim()) {
      return;
    }

    await sendMessage.mutateAsync({
      channelId: selectedChannelId,
      text
    });
    setMessageDraft("");
  };

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

      const currentOffset = useUIStore.getState().chatOffset;
      setChatOffset({
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

  useEffect(() => {
    if (workspace.defaultChannelId && selectedChannelId !== workspace.defaultChannelId) {
      setSelectedChannelId(workspace.defaultChannelId);
    }
  }, [selectedChannelId, setSelectedChannelId, workspace.defaultChannelId]);

  useEffect(() => {
    const panelElement = panelRef.current;
    if (!panelElement) {
      return;
    }

    hasObservedInitialSize.current = false;

    const resizeObserver = new ResizeObserver(() => {
      const nextWidth = Math.round(panelElement.offsetWidth);
      const nextHeight = Math.round(panelElement.offsetHeight);

      if (!hasObservedInitialSize.current) {
        hasObservedInitialSize.current = true;
        return;
      }

      setChatSize({
        width: nextWidth,
        height: nextHeight
      });
    });

    resizeObserver.observe(panelElement);
    return () => resizeObserver.disconnect();
  }, [setChatSize]);

  if (!isChatPanelOpen) {
    return null;
  }

  const orderedMessages = [...(data?.items ?? [])].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );

  return (
    <section
      ref={panelRef}
      className="floating-panel chat-panel"
      style={{
        backgroundColor: "rgba(255, 252, 255, 0.85)",
        transform: `translate(${chatOffset.x}px, ${chatOffset.y}px)`,
        width: `${chatSize.width}px`,
        height: `${chatSize.height}px`
      }}
    >
      <div className="floating-header draggable-header" onPointerDown={handlePointerDown}>
        <div>
          <span className="eyebrow panel-pixel-badge">Slack Sync</span>
          <h2>virtual-office</h2>
        </div>
        <div className="panel-tools">
          <button
            aria-label="채팅 패널 닫기"
            className="panel-icon-button panel-close-button"
            onClick={() => setIsChatPanelOpen(false)}
            type="button"
          >
            <span aria-hidden="true" className="close-glyph">
              ×
            </span>
          </button>
        </div>
      </div>
      <div className="message-list popup-message-list">
        {isLoading ? (
          <p>메시지를 불러오는 중...</p>
        ) : (
          orderedMessages.map((message) => {
            const isCurrentUserMessage = message.userId === currentUserId;
            const resolvedAuthorName =
              message.source === "app" && isCurrentUserMessage && currentUserName
                ? currentUserName
                : message.userName;

            return (
            <article className="message-card" key={message.id}>
              <div className="message-author-row">
                <strong className="message-author">{resolvedAuthorName}</strong>
                {isCurrentUserMessage ? (
                  <span className="message-author-badge">나</span>
                ) : null}
              </div>
              <p className="message-text">{message.text}</p>
              <div className="message-meta">
                <small>{message.source === "slack" ? "Slack Events / Web API" : "App Demo Store"}</small>
                <span>{new Date(message.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </article>
            );
          })
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
