import { nanoid } from "nanoid";
import { seatAssignmentsBySlackUserId, seatDefinitionByKey } from "../config/seating.js";
const workspaces = new Map([
    [
        "demo-workspace",
        {
            id: "demo-workspace",
            name: "Virtual Office Workspace",
            defaultChannelId: "general"
        }
    ]
]);
const zoneByStatus = {
    active: "main-office",
    away: "lounge",
    dnd: "meeting-room",
    lunch: "cafeteria",
    meeting: "meeting-room",
    field: "field-zone",
    offline: "entrance"
};
const positionByZone = {
    "main-office": { x: 24, y: 28 },
    "meeting-room": { x: 66, y: 22 },
    cafeteria: { x: 78, y: 64 },
    lounge: { x: 44, y: 72 },
    "field-zone": { x: 15, y: 70 },
    entrance: { x: 10, y: 16 }
};
const members = new Map();
const messages = [];
const seatAssignmentsByWorkspace = new Map();
const seedMembers = [
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
        x: 9.4,
        y: 32.8,
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
        isOnline: true
    }
];
seedMembers.forEach((member) => members.set(member.id, member));
seedMembers.forEach((member) => {
    if (member.seatKey) {
        setSeatAssignment("demo-workspace", member.seatKey, member.slackUserId);
    }
});
messages.push({
    id: nanoid(),
    channelId: "general",
    userId: "u-2",
    userName: "Jae",
    text: "10분 뒤 스탠드업 시작합니다.",
    source: "slack",
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString()
}, {
    id: nanoid(),
    channelId: "general",
    userId: "u-3",
    userName: "Mina",
    text: "점심 먹고 라운지에서 이야기해요.",
    source: "app",
    createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString()
});
export function listMembers() {
    return [...members.values()];
}
export function upsertWorkspace(workspace) {
    workspaces.set(workspace.id, workspace);
    return workspace;
}
export function getMemberById(userId) {
    return members.get(userId) ?? null;
}
export function getMemberBySlackId(slackUserId, workspaceId) {
    return ([...members.values()].find((member) => member.slackUserId === slackUserId && (!workspaceId || member.workspaceId === workspaceId)) ?? null);
}
export function getWorkspace(workspaceId) {
    return (workspaces.get(workspaceId) ?? {
        id: workspaceId,
        name: "Slack Workspace",
        defaultChannelId: "general"
    });
}
export function createOrUpdateMemberFromSlack(profile, workspaceId) {
    const existing = getMemberBySlackId(profile.id, workspaceId);
    const officeStatus = mapSlackProfileToStatus(profile);
    const seatKey = resolveSeatKeyForSlackUserId(workspaceId, profile.id) ?? existing?.seatKey;
    const placement = resolvePlacement(officeStatus, seatKey);
    const member = {
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
        x: placement.x,
        y: placement.y,
        isOnline: profile.presence !== "away"
    };
    members.set(member.id, member);
    return member;
}
export function updateMemberPresence(slackUserId, presence, workspaceId) {
    const member = getMemberBySlackId(slackUserId, workspaceId);
    if (!member) {
        return null;
    }
    const officeStatus = presence === "away" ? "away" : member.officeStatus === "offline" ? "active" : member.officeStatus;
    const placement = resolvePlacement(officeStatus, member.seatKey);
    const updated = {
        ...member,
        officeStatus,
        zoneId: placement.zoneId,
        x: placement.x,
        y: placement.y,
        isOnline: presence === "active"
    };
    members.set(updated.id, updated);
    return updated;
}
export function addMessage(message) {
    const created = {
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
export function getSnapshot(currentUserId, workspaceId) {
    return {
        workspace: getWorkspace(workspaceId),
        currentUserId,
        members: listMembers().filter((member) => member.workspaceId === workspaceId),
        seats: listSeats(workspaceId),
        messages: listMessages()
    };
}
export function listSeats(workspaceId) {
    const assignments = getSeatAssignments(workspaceId);
    return Object.values(seatDefinitionByKey).map((seat) => ({
        key: seat.key,
        label: seat.label,
        x: seat.x,
        y: seat.y,
        assignedSlackUserId: assignments.get(seat.key)
    }));
}
export function assignSeat(workspaceId, seatKey, slackUserId) {
    const seat = seatDefinitionByKey[seatKey];
    if (!seat) {
        return null;
    }
    const assignments = getSeatAssignments(workspaceId);
    let clearedMember = null;
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
export function clearSeatAssignment(workspaceId, seatKey) {
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
function mapSlackProfileToStatus(profile) {
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
    return "active";
}
function resolveSeatKeyForSlackUserId(workspaceId, slackUserId) {
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
function resolvePlacement(officeStatus, seatKey) {
    if (officeStatus === "active" && seatKey) {
        const seat = seatDefinitionByKey[seatKey];
        if (seat) {
            return {
                zoneId: "main-office",
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
function getSeatAssignments(workspaceId) {
    let assignments = seatAssignmentsByWorkspace.get(workspaceId);
    if (!assignments) {
        assignments = new Map();
        seatAssignmentsByWorkspace.set(workspaceId, assignments);
    }
    return assignments;
}
function setSeatAssignment(workspaceId, seatKey, slackUserId) {
    const assignments = getSeatAssignments(workspaceId);
    assignments.set(seatKey, slackUserId);
}
function updateMemberSeat(member, seatKey) {
    const placement = resolvePlacement(member.officeStatus, seatKey);
    const updatedMember = {
        ...member,
        seatKey,
        zoneId: placement.zoneId,
        x: placement.x,
        y: placement.y
    };
    members.set(updatedMember.id, updatedMember);
    return updatedMember;
}
