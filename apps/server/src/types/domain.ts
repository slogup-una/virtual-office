export type OfficeStatus =
  | "active"
  | "away"
  | "dnd"
  | "lunch"
  | "meeting"
  | "field"
  | "offline";

export type OfficeZoneId =
  | "main-office"
  | "meeting-room"
  | "cafeteria"
  | "lounge"
  | "field-zone"
  | "entrance";

export interface SlackProfile {
  id: string;
  email?: string;
  displayName: string;
  imageUrl: string;
  statusText?: string;
  statusEmoji?: string;
  presence?: "active" | "away";
}

export interface OfficeMember {
  id: string;
  workspaceId: string;
  slackUserId: string;
  displayName: string;
  email?: string;
  avatarUrl: string;
  officeStatus: OfficeStatus;
  slackStatusText?: string;
  slackStatusEmoji?: string;
  seatKey?: string;
  zoneId: OfficeZoneId;
  x: number;
  y: number;
  direction?: "up" | "down" | "left" | "right";
  isMoving?: boolean;
  isDancing?: boolean;
  isOnline: boolean;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  defaultChannelId: string;
}

export interface OfficeSeat {
  key: string;
  label: string;
  x: number;
  y: number;
  assignedSlackUserId?: string;
}

export interface OfficeMessage {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  text: string;
  source: "app" | "slack";
  createdAt: string;
}

export interface OfficeSnapshot {
  workspace: WorkspaceInfo;
  currentUserId: string;
  canManageSeats: boolean;
  members: OfficeMember[];
  seats: OfficeSeat[];
  messages: OfficeMessage[];
}

export interface SessionUser {
  id: string;
  slackUserId: string;
  workspaceId: string;
}
