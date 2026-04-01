import crypto from "node:crypto";
import { env } from "../config/env.js";
const slackApiBase = "https://slack.com/api";
const refreshLeewayMs = 60 * 1000;
const workspaceTokens = new Map();
function getFallbackWorkspaceToken() {
    return env.SLACK_BOT_TOKEN
        ? {
            accessToken: env.SLACK_BOT_TOKEN
        }
        : null;
}
function getStoredWorkspaceToken(workspaceId) {
    if (workspaceId) {
        return workspaceTokens.get(workspaceId) ?? getFallbackWorkspaceToken();
    }
    return workspaceTokens.values().next().value ?? getFallbackWorkspaceToken();
}
function shouldRefreshToken(token) {
    return Boolean(token.refreshToken && token.expiresAt && Date.now() >= token.expiresAt - refreshLeewayMs);
}
async function refreshWorkspaceAccessToken(workspaceId, refreshToken) {
    const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET
    });
    const response = await fetch(`${slackApiBase}/oauth.v2.access`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
    });
    const data = (await response.json());
    if (!data.ok || !data.access_token) {
        throw new Error(data.error ?? "Slack token refresh failed");
    }
    const nextToken = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? refreshToken,
        expiresAt: typeof data.expires_in === "number" ? Date.now() + data.expires_in * 1000 : undefined
    };
    workspaceTokens.set(workspaceId, nextToken);
    return nextToken;
}
async function getSlackAccessToken(workspaceId) {
    const token = getStoredWorkspaceToken(workspaceId);
    if (!token) {
        throw new Error("Slack token is not configured");
    }
    if (workspaceId && shouldRefreshToken(token)) {
        return refreshWorkspaceAccessToken(workspaceId, token.refreshToken);
    }
    return token;
}
async function slackFetch(path, workspaceId, init) {
    const token = await getSlackAccessToken(workspaceId);
    const response = await fetch(`${slackApiBase}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${token.accessToken}`,
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
    if (!data.ok || !data.authed_user?.id || !data.team?.id || !data.access_token) {
        throw new Error(data.error ?? "Slack OAuth failed");
    }
    return {
        slackUserId: data.authed_user.id,
        workspaceId: data.team.id,
        workspaceName: data.team.name ?? "Slack Workspace",
        botAccessToken: data.access_token,
        botRefreshToken: data.refresh_token,
        botTokenExpiresAt: typeof data.expires_in === "number" ? Date.now() + data.expires_in * 1000 : undefined
    };
}
export function storeSlackWorkspaceToken(workspaceId, token) {
    workspaceTokens.set(workspaceId, token);
}
export async function fetchSlackUserProfile(workspaceId, slackUserId) {
    const data = await slackFetch(`/users.info?user=${encodeURIComponent(slackUserId)}`, workspaceId);
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
export async function fetchWorkspaceMembers(workspaceId) {
    const data = await slackFetch("/users.list", workspaceId);
    const activeMembers = data.members.filter((member) => !member.deleted && !member.is_bot && member.id !== "USLACKBOT");
    const profiles = await Promise.all(activeMembers.map(async (member) => {
        let presence;
        try {
            const presenceData = await slackFetch(`/users.getPresence?user=${encodeURIComponent(member.id)}`, workspaceId);
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
export async function postSlackMessage(workspaceId, channelId, text) {
    return slackFetch("/chat.postMessage", workspaceId, {
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
