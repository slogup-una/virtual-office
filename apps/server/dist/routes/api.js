import { Router } from "express";
import { z } from "zod";
import { isSeatAdminSlackUserId } from "../config/admin.js";
import { isSlackConfigured } from "../config/env.js";
import { addMessage, assignSeat, clearSeatAssignment, exportSeatAssignments, getMemberByDisplayName, getMemberById, getMemberBySlackId, getSnapshot, createOrUpdateMemberFromSlack, listMessages, getWorkspace, updateMemberPosition } from "../services/officeStore.js";
import { fetchChannelMessages, fetchSlackUserProfile, fetchWorkspaceMembers, postSlackMessage } from "../slack/client.js";
const router = Router();
const lastWorkspaceSyncAt = new Map();
const workspaceSyncIntervalMs = 15 * 1000;
const bracketedAuthorPrefixPattern = /^\s*\[([^\]\n]+)\]\s*\n?([\s\S]*)$/;
const slackUserIdPattern = /^[UW][A-Z0-9]+$/;
function parseBracketedAuthorPrefix(text) {
    const matched = text.match(bracketedAuthorPrefixPattern);
    if (!matched) {
        return {
            authorName: null,
            body: text
        };
    }
    return {
        authorName: matched[1]?.trim() || null,
        body: matched[2] ?? ""
    };
}
function isSlackUserId(value) {
    return slackUserIdPattern.test(value);
}
async function syncWorkspaceMembersIfNeeded(workspaceId) {
    if (!isSlackConfigured || workspaceId === "demo-workspace") {
        return;
    }
    const lastSyncedAt = lastWorkspaceSyncAt.get(workspaceId) ?? 0;
    if (Date.now() - lastSyncedAt < workspaceSyncIntervalMs) {
        return;
    }
    const members = await fetchWorkspaceMembers(workspaceId);
    members.forEach((member) => {
        createOrUpdateMemberFromSlack(member, workspaceId);
    });
    lastWorkspaceSyncAt.set(workspaceId, Date.now());
}
router.get("/me", (request, response) => {
    if (!request.sessionUser) {
        response.status(401).json({ message: "Unauthorized" });
        return;
    }
    const member = getMemberById(request.sessionUser.id);
    response.json({ user: member });
});
router.get("/office", (request, response) => {
    if (!request.sessionUser) {
        response.status(401).json({ message: "Unauthorized" });
        return;
    }
    void syncWorkspaceMembersIfNeeded(request.sessionUser.workspaceId)
        .catch(() => undefined)
        .finally(() => {
        response.json(getSnapshot(request.sessionUser.id, request.sessionUser.workspaceId, isSeatAdminSlackUserId(request.sessionUser.slackUserId)));
    });
});
router.put("/me/position", (request, response) => {
    const payloadSchema = z.object({
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100)
    });
    const parsed = payloadSchema.safeParse(request.body);
    if (!parsed.success || !request.sessionUser) {
        response.status(400).json({ message: "Invalid payload" });
        return;
    }
    const member = updateMemberPosition(request.sessionUser.id, request.sessionUser.workspaceId, parsed.data.x, parsed.data.y);
    if (!member) {
        response.status(404).json({ message: "User not found" });
        return;
    }
    response.json({ ok: true, member });
});
router.get("/messages", async (request, response) => {
    if (!request.sessionUser) {
        response.status(401).json({ message: "Unauthorized" });
        return;
    }
    const workspace = getWorkspace(request.sessionUser.workspaceId);
    const channelId = typeof request.query.channelId === "string" ? request.query.channelId : workspace.defaultChannelId;
    if (!isSlackConfigured || request.sessionUser.workspaceId === "demo-workspace") {
        response.json({ items: listMessages(channelId) });
        return;
    }
    try {
        await syncWorkspaceMembersIfNeeded(request.sessionUser.workspaceId);
        const result = await fetchChannelMessages(request.sessionUser.workspaceId, channelId);
        const items = await Promise.all(result.items.map(async (message) => {
            const prefixedAuthor = parseBracketedAuthorPrefix(message.text);
            const effectiveUserName = message.userName === "virtual-office" && prefixedAuthor.authorName
                ? prefixedAuthor.authorName
                : message.userName;
            const effectiveText = message.userName === "virtual-office" && prefixedAuthor.authorName ? prefixedAuthor.body : message.text;
            const memberByOfficeId = getMemberById(message.userId);
            const memberBySlackId = memberByOfficeId ??
                getMemberBySlackId(message.userId, request.sessionUser.workspaceId) ??
                (message.userId !== "unknown" && !memberByOfficeId && isSlackUserId(message.userId)
                    ? createOrUpdateMemberFromSlack(await fetchSlackUserProfile(request.sessionUser.workspaceId, message.userId), request.sessionUser.workspaceId)
                    : null);
            const memberByDisplayName = memberBySlackId ?? getMemberByDisplayName(effectiveUserName, request.sessionUser.workspaceId);
            const member = memberByDisplayName;
            return {
                ...message,
                channelId,
                userId: member?.id ?? message.userId,
                userName: member?.displayName ?? effectiveUserName,
                text: effectiveText
            };
        }));
        response.json({ items });
    }
    catch (error) {
        response.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch messages" });
    }
});
router.put("/seats/:seatKey", (request, response) => {
    const payloadSchema = z.object({
        slackUserId: z.string().min(1)
    });
    const parsed = payloadSchema.safeParse(request.body);
    if (!parsed.success || !request.sessionUser) {
        response.status(400).json({ message: "Invalid payload" });
        return;
    }
    if (!isSeatAdminSlackUserId(request.sessionUser.slackUserId)) {
        response.status(403).json({ message: "Forbidden" });
        return;
    }
    const result = assignSeat(request.sessionUser.workspaceId, request.params.seatKey, parsed.data.slackUserId);
    if (!result) {
        response.status(404).json({ message: "Seat not found" });
        return;
    }
    response.json({ ok: true, result });
});
router.delete("/seats/:seatKey", (request, response) => {
    if (!request.sessionUser) {
        response.status(401).json({ message: "Unauthorized" });
        return;
    }
    if (!isSeatAdminSlackUserId(request.sessionUser.slackUserId)) {
        response.status(403).json({ message: "Forbidden" });
        return;
    }
    const result = clearSeatAssignment(request.sessionUser.workspaceId, request.params.seatKey);
    if (!result) {
        response.status(404).json({ message: "Seat assignment not found" });
        return;
    }
    response.json({ ok: true, result });
});
router.get("/seats/export", (request, response) => {
    if (!request.sessionUser) {
        response.status(401).json({ message: "Unauthorized" });
        return;
    }
    if (!isSeatAdminSlackUserId(request.sessionUser.slackUserId)) {
        response.status(403).json({ message: "Forbidden" });
        return;
    }
    const assignments = exportSeatAssignments(request.sessionUser.workspaceId);
    const body = [
        "export const seatAssignmentsBySlackUserId: Record<string, string> = {",
        ...Object.entries(assignments).map(([seatKey, slackUserId]) => `  ${JSON.stringify(slackUserId)}: ${JSON.stringify(seatKey)},`),
        "};",
        ""
    ].join("\n");
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.setHeader("Content-Disposition", "attachment; filename=\"seat-assignments.ts\"");
    response.send(body);
});
router.post("/messages", async (request, response) => {
    const payloadSchema = z.object({
        channelId: z.string().min(1),
        text: z.string().min(1).max(3000)
    });
    const parsed = payloadSchema.safeParse(request.body);
    if (!parsed.success) {
        response.status(400).json({ message: "Invalid payload" });
        return;
    }
    if (!request.sessionUser) {
        response.status(401).json({ message: "Unauthorized" });
        return;
    }
    const author = getMemberById(request.sessionUser.id);
    if (!author) {
        response.status(404).json({ message: "User not found" });
        return;
    }
    if (isSlackConfigured) {
        await postSlackMessage(request.sessionUser.workspaceId, parsed.data.channelId, parsed.data.text, {
            officeUserId: author.id,
            slackUserId: author.slackUserId,
            displayName: author.displayName
        });
    }
    const item = addMessage({
        channelId: parsed.data.channelId,
        userId: author.id,
        userName: author.displayName,
        text: parsed.data.text,
        source: isSlackConfigured ? "slack" : "app"
    });
    response.status(201).json({ item });
});
export { router as apiRouter };
