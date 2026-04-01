import { nanoid } from "nanoid";
const workspace = {
    id: "demo-workspace",
    name: "Virtual Office Workspace",
    defaultChannelId: "general"
};
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
const seedMembers = [
    {
        id: "u-1",
        slackUserId: "U_DEMO_1",
        displayName: "Una",
        email: "una@example.com",
        avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=Una",
        officeStatus: "active",
        slackStatusEmoji: ":computer:",
        slackStatusText: "집중 근무",
        zoneId: "main-office",
        x: 24,
        y: 28,
        isOnline: true
    },
    {
        id: "u-2",
        slackUserId: "U_DEMO_2",
        displayName: "Jae",
        email: "jae@example.com",
        avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=Jae",
        officeStatus: "meeting",
        slackStatusEmoji: ":spiral_calendar_pad:",
        slackStatusText: "회의 중",
        zoneId: "meeting-room",
        x: 66,
        y: 22,
        isOnline: true
    },
    {
        id: "u-3",
        slackUserId: "U_DEMO_3",
        displayName: "Mina",
        email: "mina@example.com",
        avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=Mina",
        officeStatus: "lunch",
        slackStatusEmoji: ":fork_and_knife:",
        slackStatusText: "점심",
        zoneId: "cafeteria",
        x: 78,
        y: 64,
        isOnline: true
    }
];
seedMembers.forEach((member) => members.set(member.id, member));
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
export function getMemberById(userId) {
    return members.get(userId) ?? null;
}
export function getMemberBySlackId(slackUserId) {
    return [...members.values()].find((member) => member.slackUserId === slackUserId) ?? null;
}
export function getWorkspace() {
    return workspace;
}
export function createOrUpdateMemberFromSlack(profile) {
    const existing = getMemberBySlackId(profile.id);
    const officeStatus = mapSlackProfileToStatus(profile);
    const zoneId = zoneByStatus[officeStatus];
    const position = positionByZone[zoneId];
    const member = {
        id: existing?.id ?? nanoid(),
        slackUserId: profile.id,
        displayName: profile.displayName,
        email: profile.email,
        avatarUrl: profile.imageUrl,
        officeStatus,
        slackStatusText: profile.statusText,
        slackStatusEmoji: profile.statusEmoji,
        zoneId,
        x: position.x,
        y: position.y,
        isOnline: profile.presence !== "away"
    };
    members.set(member.id, member);
    return member;
}
export function updateMemberPresence(slackUserId, presence) {
    const member = getMemberBySlackId(slackUserId);
    if (!member) {
        return null;
    }
    const officeStatus = presence === "away" ? "away" : member.officeStatus === "offline" ? "active" : member.officeStatus;
    const zoneId = zoneByStatus[officeStatus];
    const position = positionByZone[zoneId];
    const updated = {
        ...member,
        officeStatus,
        zoneId,
        x: position.x,
        y: position.y,
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
export function listMessages(channelId = workspace.defaultChannelId) {
    return messages
        .filter((message) => message.channelId === channelId)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}
export function getSnapshot(currentUserId) {
    return {
        workspace,
        currentUserId,
        members: listMembers(),
        messages: listMessages()
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
