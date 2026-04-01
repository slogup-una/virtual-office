import { create } from "zustand";

interface UIState {
  selectedChannelId: string;
  selectedZoneId: string | null;
  messageDraft: string;
  setSelectedChannelId: (channelId: string) => void;
  setSelectedZoneId: (zoneId: string | null) => void;
  setMessageDraft: (draft: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedChannelId: "general",
  selectedZoneId: null,
  messageDraft: "",
  setSelectedChannelId: (selectedChannelId) => set({ selectedChannelId }),
  setSelectedZoneId: (selectedZoneId) => set({ selectedZoneId }),
  setMessageDraft: (messageDraft) => set({ messageDraft })
}));
