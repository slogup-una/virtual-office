import crypto from "node:crypto";
import { env } from "../config/env.js";
const slackApiBase = "https://slack.com/api";
async function slackFetch(path, init) {
    const response = await fetch(`${slackApiBase}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`,
            "Content-Type": "application/json; charset=utf-8",
            ...(init?.headers ?? {})
        }
    });
    if (!response.ok) {
        throw new Error(`Slack API request failed: ${response.status}`);
    }
    const data = (await response.json());
    if (data.ok === false) {
        throw new Error(data.error ?? "Slack API request failed");
    }
    return data;
}
export async function exchangeCodeForToken(code) {
    const params = new URLSearchParams({
        code,
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        redirect_uri: env.SLACK_REDIRECT_URI
    });
    const response = await fetch(`${slackApiBase}/oauth.v2.access`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
    });
    const data = (await response.json());
    if (!data.ok || !data.authed_user?.id || !data.team?.id) {
        throw new Error(data.error ?? "Slack OAuth failed");
    }
    return {
        slackUserId: data.authed_user.id,
        workspaceId: data.team.id,
        workspaceName: data.team.name ?? "Slack Workspace"
    };
}
export async function fetchSlackUserProfile(slackUserId) {
    const data = await slackFetch(`/users.info?user=${encodeURIComponent(slackUserId)}`);
    const profile = data.user.profile;
    const result = {
        id: data.user.id,
        email: profile.email,
        displayName: profile.display_name || profile.real_name || "Slack User",
        imageUrl: profile.image_192 || `https://api.dicebear.com/9.x/shapes/svg?seed=${slackUserId}`,
        statusText: profile.status_text,
        statusEmoji: profile.status_emoji,
        presence: data.user.presence
    };
    return result;
}
export async function fetchWorkspaceMembers() {
    const data = await slackFetch("/users.list");
    const activeMembers = data.members.filter((member) => !member.deleted && !member.is_bot && member.id !== "USLACKBOT");
    const profiles = await Promise.all(activeMembers.map(async (member) => {
        let presence;
        try {
            const presenceData = await slackFetch(`/users.getPresence?user=${encodeURIComponent(member.id)}`);
            presence = presenceData.presence;
        }
        catch {
            presence = undefined;
        }
        return {
            id: member.id,
            email: member.profile.email,
            displayName: member.profile.display_name || member.profile.real_name || member.name || "Slack User",
            imageUrl: member.profile.image_192 || `https://api.dicebear.com/9.x/shapes/svg?seed=${member.id}`,
            statusText: member.profile.status_text,
            statusEmoji: member.profile.status_emoji,
            presence
        };
    }));
    return profiles;
}
export async function postSlackMessage(channelId, text) {
    return slackFetch("/chat.postMessage", {
        method: "POST",
        body: JSON.stringify({
            channel: channelId,
            text
        })
    });
}
export function verifySlackRequest(signatureHeader, timestampHeader, rawBody) {
    if (!signatureHeader || !timestampHeader) {
        return false;
    }
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const slackTimestamp = Number(timestampHeader);
    if (Number.isNaN(slackTimestamp) || Math.abs(currentTimestamp - slackTimestamp) > 60 * 5) {
        return false;
    }
    const baseString = `v0:${timestampHeader}:${rawBody}`;
    const computedSignature = "v0=" +
        crypto.createHmac("sha256", env.SLACK_SIGNING_SECRET).update(baseString, "utf8").digest("hex");
    return crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(signatureHeader));
}
