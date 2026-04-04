import { create } from "zustand";

interface Position {
  x: number;
  y: number;
}

export type AvatarDirection = "up" | "down" | "left" | "right";

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
  isLayoutEditorPanelOpen: boolean;
  layoutEditorOffset: Position;
  demoMotionOffset: Position;
  seatAssignmentOffset: Position;
  isDemoMotionOpen: boolean;
  currentUserPosition: Position | null;
  currentUserDirection: AvatarDirection;
  isCurrentUserDancing: boolean;
  isCurrentUserMoving: boolean;
  setSelectedChannelId: (channelId: string) => void;
  setSelectedZoneId: (zoneId: string | null) => void;
  setMessageDraft: (draft: string) => void;
  setChatOpacity: (opacity: number) => void;
  setChatOffset: (position: Position) => void;
  setIsChatPanelOpen: (isOpen: boolean) => void;
  setChatSize: (size: { width: number; height: number }) => void;
  setStatusOffset: (position: Position) => void;
  setIsStatusPanelOpen: (isOpen: boolean) => void;
  setIsLayoutEditorPanelOpen: (isOpen: boolean) => void;
  setLayoutEditorOffset: (position: Position) => void;
  setDemoMotionOffset: (position: Position) => void;
  setSeatAssignmentOffset: (position: Position) => void;
  setIsDemoMotionOpen: (isOpen: boolean) => void;
  setCurrentUserPosition: (position: Position) => void;
  moveCurrentUserPosition: (delta: Position) => void;
  setCurrentUserDirection: (direction: AvatarDirection) => void;
  setIsCurrentUserDancing: (isDancing: boolean) => void;
  setIsCurrentUserMoving: (isMoving: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedChannelId: "",
  selectedZoneId: null,
  messageDraft: "",
  chatOpacity: 0.86,
  chatOffset: { x: 0, y: 0 },
  isChatPanelOpen: false,
  chatSize: { width: 300, height: 700 },
  statusOffset: { x: 0, y: 0 },
  isStatusPanelOpen: false,
  isLayoutEditorPanelOpen: false,
  layoutEditorOffset: { x: 0, y: 0 },
  demoMotionOffset: { x: 0, y: 0 },
  seatAssignmentOffset: { x: 0, y: 0 },
  isDemoMotionOpen: false,
  currentUserPosition: null,
  currentUserDirection: "down",
  isCurrentUserDancing: false,
  isCurrentUserMoving: false,
  setSelectedChannelId: (selectedChannelId) => set({ selectedChannelId }),
  setSelectedZoneId: (selectedZoneId) => set({ selectedZoneId }),
  setMessageDraft: (messageDraft) => set({ messageDraft }),
  setChatOpacity: (chatOpacity) => set({ chatOpacity }),
  setChatOffset: (chatOffset) => set({ chatOffset }),
  setIsChatPanelOpen: (isChatPanelOpen) => set({ isChatPanelOpen }),
  setChatSize: (chatSize) => set({ chatSize }),
  setStatusOffset: (statusOffset) => set({ statusOffset }),
  setIsStatusPanelOpen: (isStatusPanelOpen) => set({ isStatusPanelOpen }),
  setIsLayoutEditorPanelOpen: (isLayoutEditorPanelOpen) => set({ isLayoutEditorPanelOpen }),
  setLayoutEditorOffset: (layoutEditorOffset) => set({ layoutEditorOffset }),
  setDemoMotionOffset: (demoMotionOffset) => set({ demoMotionOffset }),
  setSeatAssignmentOffset: (seatAssignmentOffset) => set({ seatAssignmentOffset }),
  setIsDemoMotionOpen: (isDemoMotionOpen) => set({ isDemoMotionOpen }),
  setCurrentUserPosition: (currentUserPosition) => set({ currentUserPosition }),
  setCurrentUserDirection: (currentUserDirection) => set({ currentUserDirection }),
  setIsCurrentUserDancing: (isCurrentUserDancing) => set({ isCurrentUserDancing }),
  setIsCurrentUserMoving: (isCurrentUserMoving) => set({ isCurrentUserMoving }),
  moveCurrentUserPosition: (delta) =>
    set((state) => {
      if (!state.currentUserPosition) {
        return state;
      }

      const nextX = Math.min(98.8, Math.max(4, state.currentUserPosition.x + delta.x));
      const nextY = Math.min(95, Math.max(1.5, state.currentUserPosition.y + delta.y));

      return {
        currentUserPosition: {
          x: nextX,
          y: nextY
        }
      };
    })
}));
