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
  currentUserPosition: Position | null;
  setSelectedChannelId: (channelId: string) => void;
  setSelectedZoneId: (zoneId: string | null) => void;
  setMessageDraft: (draft: string) => void;
  setChatOpacity: (opacity: number) => void;
  setChatOffset: (position: Position) => void;
  setCurrentUserPosition: (position: Position) => void;
  moveCurrentUserPosition: (delta: Position) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedChannelId: "general",
  selectedZoneId: null,
  messageDraft: "",
  chatOpacity: 0.86,
  chatOffset: { x: 0, y: 0 },
  currentUserPosition: null,
  setSelectedChannelId: (selectedChannelId) => set({ selectedChannelId }),
  setSelectedZoneId: (selectedZoneId) => set({ selectedZoneId }),
  setMessageDraft: (messageDraft) => set({ messageDraft }),
  setChatOpacity: (chatOpacity) => set({ chatOpacity }),
  setChatOffset: (chatOffset) => set({ chatOffset }),
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
