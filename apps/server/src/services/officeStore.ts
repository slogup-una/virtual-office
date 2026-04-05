import { nanoid } from "nanoid";

import { env } from "../config/env.js";
import { seatAssignmentsBySlackUserId, seatDefinitionByKey } from "../config/seating.js";
import type {
  OfficeMember,
  OfficeMessage,
  OfficeSeat,
  OfficeSnapshot,
  OfficeStatus,
  OfficeZoneId,
  SlackProfile,
  WorkspaceInfo
} from "../types/domain.js";

const workspaces = new Map<string, WorkspaceInfo>([
  [
    "demo-workspace",
    {
      id: "demo-workspace",
      name: "Virtual Office Workspace",
      defaultChannelId: env.SLACK_DEFAULT_CHANNEL
    }
  ]
]);

const zoneByStatus: Record<OfficeStatus, OfficeZoneId> = {
  active: "main-office",
  away: "lounge",
  dnd: "meeting-room",
  lunch: "cafeteria",
  meeting: "meeting-room",
  field: "field-zone",
  offline: "entrance"
};

const positionByZone: Record<OfficeZoneId, { x: number; y: number }> = {
  "main-office": { x: 24, y: 28 },
  "meeting-room": { x: 66, y: 22 },
  cafeteria: { x: 78, y: 64 },
  lounge: { x: 44, y: 72 },
  "field-zone": { x: 15, y: 70 },
  entrance: { x: 10, y: 16 }
};

const members = new Map<string, OfficeMember>();
const messages: OfficeMessage[] = [];
const seatAssignmentsByWorkspace = new Map<string, Map<string, string>>();
const demoNicknamePrefixes = ["Blue", "Sunny", "Pixel", "Mint", "Cloud", "Coral", "Mellow", "Lucky"];
const demoNicknameSuffixes = ["Otter", "Panda", "Fox", "Koala", "Seal", "Bunny", "Bear", "Cat"];

const seedMembers: OfficeMember[] = [
  {
    id: "u-1",
    workspaceId: "demo-workspace",
    slackUserId: "U_DEMO_1",
    displayName: "Una",
    email: "una@example.com",
    avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=Una",
    officeStatus: "active",
    slackStatusEmoji: ":computer:",
    slackStatusText: "집중 근무",
    seatKey: "A-01",
    zoneId: "main-office",
    x: 8.33,
    y: 32.8,
    direction: "down",
    isMoving: false,
    isDancing: false,
    isOnline: true
  },
  {
    id: "u-2",
    workspaceId: "demo-workspace",
    slackUserId: "U_DEMO_2",
    displayName: "Jae",
    email: "jae@example.com",
    avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=Jae",
    officeStatus: "meeting",
    slackStatusEmoji: ":spiral_calendar_pad:",
    slackStatusText: "회의 중",
    seatKey: "B-02",
    zoneId: "meeting-room",
    x: 66,
    y: 22,
    direction: "down",
    isMoving: false,
    isDancing: false,
    isOnline: true
  },
  {
    id: "u-3",
    workspaceId: "demo-workspace",
    slackUserId: "U_DEMO_3",
    displayName: "Mina",
    email: "mina@example.com",
    avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=Mina",
    officeStatus: "lunch",
    slackStatusEmoji: ":fork_and_knife:",
    slackStatusText: "점심",
    seatKey: "C-03",
    zoneId: "cafeteria",
    x: 78,
    y: 64,
    direction: "down",
    isMoving: false,
    isDancing: false,
    isOnline: true
  }
];

seedMembers.forEach((member) => members.set(member.id, member));
seedMembers.forEach((member) => {
  if (member.seatKey) {
    setSeatAssignment("demo-workspace", member.seatKey, member.slackUserId);
  }
});

export function listMembers() {
  return [...members.values()];
}

export function upsertWorkspace(workspace: WorkspaceInfo) {
  workspaces.set(workspace.id, workspace);
  return workspace;
}

export function getMemberById(userId: string) {
  return members.get(userId) ?? null;
}

export function getMemberBySlackId(slackUserId: string, workspaceId?: string) {
  return (
    [...members.values()].find(
      (member) => member.slackUserId === slackUserId && (!workspaceId || member.workspaceId === workspaceId)
    ) ?? null
  );
}

export function getMemberByDisplayName(displayName: string, workspaceId?: string) {
  const normalizedDisplayName = displayName.trim().toLowerCase();
  if (!normalizedDisplayName) {
    return null;
  }

  return (
    [...members.values()].find(
      (member) =>
        member.displayName.trim().toLowerCase() === normalizedDisplayName &&
        (!workspaceId || member.workspaceId === workspaceId)
    ) ?? null
  );
}

export function getWorkspace(workspaceId: string) {
  return (
    workspaces.get(workspaceId) ?? {
      id: workspaceId,
      name: "Slack Workspace",
      defaultChannelId: env.SLACK_DEFAULT_CHANNEL
    }
  );
}

export function createDemoMember() {
  const displayName = createDemoDisplayName();
  const member: OfficeMember = {
    id: nanoid(),
    workspaceId: "demo-workspace",
    slackUserId: `U_DEMO_${nanoid(8).toUpperCase()}`,
    displayName,
    email: undefined,
    avatarUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(displayName)}`,
    officeStatus: "active",
    slackStatusEmoji: ":computer:",
    slackStatusText: "집중 근무",
    seatKey: undefined,
    zoneId: "lounge",
    x: 45,
    y: 10,
    direction: "down",
    isMoving: false,
    isDancing: false,
    isOnline: true
  };

  members.set(member.id, member);
  return member;
}

export function createOrUpdateMemberFromSlack(profile: SlackProfile, workspaceId: string) {
  const existing = getMemberBySlackId(profile.id, workspaceId);
  const officeStatus = mapSlackProfileToStatus(profile, existing?.officeStatus);
  const seatKey = resolveSeatKeyForSlackUserId(workspaceId, profile.id) ?? existing?.seatKey;
  const placement = resolvePlacement(officeStatus, seatKey);
  const shouldResetPosition = !existing || existing.officeStatus !== officeStatus || existing.seatKey !== seatKey;

  const member: OfficeMember = {
    id: existing?.id ?? nanoid(),
    workspaceId,
    slackUserId: profile.id,
    displayName: profile.displayName,
    email: profile.email,
    avatarUrl: profile.imageUrl,
    officeStatus,
    slackStatusText: profile.statusText,
    slackStatusEmoji: profile.statusEmoji,
    seatKey,
    zoneId: placement.zoneId,
    x: shouldResetPosition ? placement.x : (existing?.x ?? placement.x),
    y: shouldResetPosition ? placement.y : (existing?.y ?? placement.y),
    direction: existing?.direction ?? "down",
    isMoving: existing?.isMoving ?? false,
    isDancing: existing?.isDancing ?? false,
    isOnline: resolveSlackOnlineState(profile.presence, existing?.isOnline)
  };

  members.set(member.id, member);
  return member;
}

export function updateMemberPresence(slackUserId: string, presence: "active" | "away", workspaceId?: string) {
  const member = getMemberBySlackId(slackUserId, workspaceId);
  if (!member) {
    return null;
  }

  const officeStatus = presence === "away" ? "away" : member.officeStatus === "offline" ? "active" : member.officeStatus;
  const placement = resolvePlacement(officeStatus, member.seatKey);

  const updated: OfficeMember = {
    ...member,
    officeStatus,
    zoneId: placement.zoneId,
    x: placement.x,
    y: placement.y,
    direction: member.direction ?? "down",
    isMoving: false,
    isDancing: false,
    isOnline: presence === "active"
  };

  members.set(updated.id, updated);
  return updated;
}

export function updateMemberPosition(
  memberId: string,
  workspaceId: string,
  x: number,
  y: number,
  direction?: OfficeMember["direction"],
  isMoving?: boolean,
  isDancing?: boolean
) {
  const member = getMemberById(memberId);
  if (!member || member.workspaceId !== workspaceId) {
    return null;
  }

  const updatedMember: OfficeMember = {
    ...member,
    x,
    y,
    direction: direction ?? member.direction ?? "down",
    isMoving: isMoving ?? member.isMoving ?? false,
    isDancing: isDancing ?? member.isDancing ?? false
  };

  members.set(updatedMember.id, updatedMember);
  return updatedMember;
}

export function addMessage(message: Omit<OfficeMessage, "id" | "createdAt">) {
  const created: OfficeMessage = {
    ...message,
    id: nanoid(),
    createdAt: new Date().toISOString()
  };

  messages.push(created);
  return created;
}

export function listMessages(channelId = "general") {
  return messages
    .filter((message) => message.channelId === channelId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function getSnapshot(currentUserId: string, workspaceId: string, canManageSeats = false): OfficeSnapshot {
  const workspace = getWorkspace(workspaceId);

  return {
    workspace,
    currentUserId,
    canManageSeats,
    members: listMembers().filter((member) => member.workspaceId === workspaceId),
    seats: listSeats(workspaceId),
    messages: listMessages(workspace.defaultChannelId)
  };
}

export function listSeats(workspaceId: string): OfficeSeat[] {
  const assignments = getSeatAssignments(workspaceId);

  return Object.values(seatDefinitionByKey).map((seat) => ({
    key: seat.key,
    label: seat.label,
    x: seat.x,
    y: seat.y,
    assignedSlackUserId: assignments.get(seat.key)
  }));
}

export function assignSeat(workspaceId: string, seatKey: string, slackUserId: string) {
  const seat = seatDefinitionByKey[seatKey];
  if (!seat) {
    return null;
  }

  const assignments = getSeatAssignments(workspaceId);
  let clearedMember: OfficeMember | null = null;

  for (const [assignedSeatKey, assignedSlackUserId] of assignments.entries()) {
    if (assignedSlackUserId === slackUserId && assignedSeatKey !== seatKey) {
      assignments.delete(assignedSeatKey);
    }
  }

  const previousSeatHolderSlackUserId = assignments.get(seatKey);
  if (previousSeatHolderSlackUserId && previousSeatHolderSlackUserId !== slackUserId) {
    const previousMember = getMemberBySlackId(previousSeatHolderSlackUserId, workspaceId);
    if (previousMember) {
      clearedMember = updateMemberSeat(previousMember, undefined);
    }
  }

  assignments.set(seatKey, slackUserId);
  const assignedMember = getMemberBySlackId(slackUserId, workspaceId);
  const updatedMember = assignedMember ? updateMemberSeat(assignedMember, seatKey) : null;

  return {
    seatKey,
    assignedSlackUserId: slackUserId,
    updatedMember,
    clearedMember
  };
}

export function clearSeatAssignment(workspaceId: string, seatKey: string) {
  const assignments = getSeatAssignments(workspaceId);
  const slackUserId = assignments.get(seatKey);
  if (!slackUserId) {
    return null;
  }

  assignments.delete(seatKey);
  const member = getMemberBySlackId(slackUserId, workspaceId);
  const updatedMember = member ? updateMemberSeat(member, undefined) : null;

  return {
    seatKey,
    clearedSlackUserId: slackUserId,
    updatedMember
  };
}

export function exportSeatAssignments(workspaceId: string) {
  const assignments = getSeatAssignments(workspaceId);
  return Object.fromEntries([...assignments.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function mapSlackProfileToStatus(profile: SlackProfile, fallbackStatus?: OfficeStatus): OfficeStatus {
  const text = (profile.statusText ?? "").toLowerCase();
  const emoji = profile.statusEmoji ?? "";

  if (text.includes("점심") || emoji.includes("fork_and_knife")) {
    return "lunch";
  }

  if (text.includes("회의") || emoji.includes("calendar")) {
    return "meeting";
  }

  if (text.includes("외근") || emoji.includes("car")) {
    return "field";
  }

  if (text.includes("방해") || text.includes("집중")) {
    return "dnd";
  }

  if (profile.presence === "away") {
    return "away";
  }

  if (profile.presence !== "active") {
    return fallbackStatus ?? "offline";
  }

  return "active";
}

function resolveSlackOnlineState(
  presence: SlackProfile["presence"],
  fallbackIsOnline?: boolean
) {
  if (presence === "active") {
    return true;
  }

  if (presence === "away") {
    return false;
  }

  return fallbackIsOnline ?? false;
}

function resolveSeatKeyForSlackUserId(workspaceId: string, slackUserId: string) {
  const workspaceSeat = getSeatAssignments(workspaceId);

  for (const [seatKey, assignedSlackUserId] of workspaceSeat.entries()) {
    if (assignedSlackUserId === slackUserId) {
      return seatKey;
    }
  }

  const defaultSeatKey = seatAssignmentsBySlackUserId[slackUserId];
  if (defaultSeatKey) {
    workspaceSeat.set(defaultSeatKey, slackUserId);
  }

  return defaultSeatKey;
}

function resolvePlacement(officeStatus: OfficeStatus, seatKey?: string) {
  if (officeStatus === "active" && seatKey) {
    const seat = seatDefinitionByKey[seatKey];
    if (seat) {
      return {
        zoneId: "main-office" as OfficeZoneId,
        x: seat.x,
        y: seat.y
      };
    }
  }

  const zoneId = zoneByStatus[officeStatus];
  const position = positionByZone[zoneId];
  return {
    zoneId,
    x: position.x,
    y: position.y
  };
}

function getSeatAssignments(workspaceId: string) {
  let assignments = seatAssignmentsByWorkspace.get(workspaceId);
  if (!assignments) {
    assignments = new Map<string, string>();
    seatAssignmentsByWorkspace.set(workspaceId, assignments);
  }

  return assignments;
}

function setSeatAssignment(workspaceId: string, seatKey: string, slackUserId: string) {
  const assignments = getSeatAssignments(workspaceId);
  assignments.set(seatKey, slackUserId);
}

function updateMemberSeat(member: OfficeMember, seatKey: string | undefined) {
  const placement = resolvePlacement(member.officeStatus, seatKey);
  const updatedMember: OfficeMember = {
    ...member,
    seatKey,
    zoneId: placement.zoneId,
    x: placement.x,
    y: placement.y,
    direction: member.direction ?? "down",
    isMoving: false,
    isDancing: false
  };

  members.set(updatedMember.id, updatedMember);
  return updatedMember;
}

function createDemoDisplayName() {
  const prefix = demoNicknamePrefixes[Math.floor(Math.random() * demoNicknamePrefixes.length)];
  const suffix = demoNicknameSuffixes[Math.floor(Math.random() * demoNicknameSuffixes.length)];
  const serial = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}${suffix}${serial}`;
}
