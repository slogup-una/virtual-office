import { create } from "zustand";

interface Position {
  x: number;
  y: number;
}

interface UIState {
  selectedChannelId: string;
  selectedZoneId: string | null;
  messageDraft: string;
  chatOpacity: number;
  chatOffset: Position;
  isChatPanelOpen: boolean;
  chatSize: {
    width: number;
    height: number;
  };
  statusOffset: Position;
  isStatusPanelOpen: boolean;
  currentUserPosition: Position | null;
  setSelectedChannelId: (channelId: string) => void;
  setSelectedZoneId: (zoneId: string | null) => void;
  setMessageDraft: (draft: string) => void;
  setChatOpacity: (opacity: number) => void;
  setChatOffset: (position: Position) => void;
  setIsChatPanelOpen: (isOpen: boolean) => void;
  setChatSize: (size: { width: number; height: number }) => void;
  setStatusOffset: (position: Position) => void;
  setIsStatusPanelOpen: (isOpen: boolean) => void;
  setCurrentUserPosition: (position: Position) => void;
  moveCurrentUserPosition: (delta: Position) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedChannelId: "",
  selectedZoneId: null,
  messageDraft: "",
  chatOpacity: 0.86,
  chatOffset: { x: 0, y: 0 },
  isChatPanelOpen: true,
  chatSize: { width: 300, height: 700 },
  statusOffset: { x: 0, y: 0 },
  isStatusPanelOpen: true,
  currentUserPosition: null,
  setSelectedChannelId: (selectedChannelId) => set({ selectedChannelId }),
  setSelectedZoneId: (selectedZoneId) => set({ selectedZoneId }),
  setMessageDraft: (messageDraft) => set({ messageDraft }),
  setChatOpacity: (chatOpacity) => set({ chatOpacity }),
  setChatOffset: (chatOffset) => set({ chatOffset }),
  setIsChatPanelOpen: (isChatPanelOpen) => set({ isChatPanelOpen }),
  setChatSize: (chatSize) => set({ chatSize }),
  setStatusOffset: (statusOffset) => set({ statusOffset }),
  setIsStatusPanelOpen: (isStatusPanelOpen) => set({ isStatusPanelOpen }),
  setCurrentUserPosition: (currentUserPosition) => set({ currentUserPosition }),
  moveCurrentUserPosition: (delta) =>
    set((state) => {
      if (!state.currentUserPosition) {
        return state;
      }

      const nextX = Math.min(96, Math.max(4, state.currentUserPosition.x + delta.x));
      const nextY = Math.min(95, Math.max(5, state.currentUserPosition.y + delta.y));

      return {
        currentUserPosition: {
          x: nextX,
          y: nextY
        }
      };
    })
}));
