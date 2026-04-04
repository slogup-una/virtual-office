import crypto from "node:crypto";

import { env } from "../config/env.js";
import type { OfficeMessage, SlackProfile } from "../types/domain.js";

const slackApiBase = "https://slack.com/api";
const refreshLeewayMs = 60 * 1000;
const channelIdCache = new Map<string, { id: string; cachedAt: number }>();
const channelCacheTtlMs = 5 * 60 * 1000;
const bracketedAuthorPrefixPattern = /^\[([^\]\n]+)\]\s*\n?([\s\S]*)$/;

interface SlackWorkspaceToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

const workspaceTokens = new Map<string, SlackWorkspaceToken>();

function getFallbackWorkspaceToken(): SlackWorkspaceToken | null {
  return env.SLACK_BOT_TOKEN
    ? {
        accessToken: env.SLACK_BOT_TOKEN
      }
    : null;
}

function getStoredWorkspaceToken(workspaceId?: string) {
  if (workspaceId) {
    return workspaceTokens.get(workspaceId) ?? getFallbackWorkspaceToken();
  }

  return workspaceTokens.values().next().value ?? getFallbackWorkspaceToken();
}

function shouldRefreshToken(token: SlackWorkspaceToken) {
  return Boolean(token.refreshToken && token.expiresAt && Date.now() >= token.expiresAt - refreshLeewayMs);
}

async function refreshWorkspaceAccessToken(workspaceId: string, refreshToken: string) {
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

  const data = (await response.json()) as {
    ok: boolean;
    error?: string;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!data.ok || !data.access_token) {
    throw new Error(data.error ?? "Slack token refresh failed");
  }

  const nextToken: SlackWorkspaceToken = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: typeof data.expires_in === "number" ? Date.now() + data.expires_in * 1000 : undefined
  };

  workspaceTokens.set(workspaceId, nextToken);
  return nextToken;
}

async function getSlackAccessToken(workspaceId?: string) {
  const token = getStoredWorkspaceToken(workspaceId);
  if (!token) {
    throw new Error("Slack token is not configured");
  }

  if (workspaceId && shouldRefreshToken(token)) {
    return refreshWorkspaceAccessToken(workspaceId, token.refreshToken!);
  }

  return token;
}

async function slackFetch<T>(path: string, workspaceId?: string, init?: RequestInit) {
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

  const data = (await response.json()) as T & { ok?: boolean; error?: string };
  if (data.ok === false) {
    throw new Error(data.error ?? "Slack API request failed");
  }

  return data;
}

async function resolveChannelId(workspaceId: string, channelRef: string) {
  if (channelRef.startsWith("C") || channelRef.startsWith("G")) {
    return channelRef;
  }

  const cacheKey = `${workspaceId}:${channelRef}`;
  const cached = channelIdCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < channelCacheTtlMs) {
    return cached.id;
  }

  const data = await slackFetch<{
    channels: Array<{
      id: string;
      name: string;
      is_archived?: boolean;
    }>;
  }>(`/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=1000`, workspaceId);

  const channel = data.channels.find((item) => item.name === channelRef);
  if (!channel) {
    throw new Error(
      `Slack channel not found: ${channelRef}. Set SLACK_DEFAULT_CHANNEL to the exact Slack channel name or channel ID.`
    );
  }

  channelIdCache.set(cacheKey, {
    id: channel.id,
    cachedAt: Date.now()
  });

  return channel.id;
}

function parseBracketedAuthorPrefix(text: string) {
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

export async function exchangeCodeForToken(code: string) {
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

  const data = (await response.json()) as {
    ok: boolean;
    error?: string;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    authed_user?: { id: string };
    team?: { id: string; name?: string };
  };

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

export function storeSlackWorkspaceToken(workspaceId: string, token: SlackWorkspaceToken) {
  workspaceTokens.set(workspaceId, token);
}

export async function fetchSlackUserProfile(workspaceId: string, slackUserId: string) {
  const data = await slackFetch<{
    user: {
      id: string;
      profile: {
        email?: string;
        display_name?: string;
        real_name?: string;
        image_192?: string;
        status_text?: string;
        status_emoji?: string;
      };
      presence?: "active" | "away";
    };
  }>(`/users.info?user=${encodeURIComponent(slackUserId)}`, workspaceId);

  let presence: "active" | "away" | undefined;

  try {
    const presenceData = await slackFetch<{ presence: "active" | "away" }>(
      `/users.getPresence?user=${encodeURIComponent(slackUserId)}`,
      workspaceId
    );
    presence = presenceData.presence;
  } catch {
    presence = data.user.presence;
  }

  const profile = data.user.profile;
  const result: SlackProfile = {
    id: data.user.id,
    email: profile.email,
    displayName: profile.display_name || profile.real_name || "Slack User",
    imageUrl: profile.image_192 || `https://api.dicebear.com/9.x/shapes/svg?seed=${slackUserId}`,
    statusText: profile.status_text,
    statusEmoji: profile.status_emoji,
    presence
  };

  return result;
}

export async function fetchWorkspaceMembers(workspaceId: string) {
  const data = await slackFetch<{
    members: Array<{
      id: string;
      deleted?: boolean;
      is_bot?: boolean;
      name?: string;
      profile: {
        email?: string;
        display_name?: string;
        real_name?: string;
        image_192?: string;
        status_text?: string;
        status_emoji?: string;
      };
    }>;
  }>("/users.list", workspaceId);

  const activeMembers = data.members.filter(
    (member) => !member.deleted && !member.is_bot && member.id !== "USLACKBOT"
  );

  const profiles = await Promise.all(
    activeMembers.map(async (member) => {
      let presence: "active" | "away" | undefined;

      try {
        const presenceData = await slackFetch<{ presence: "active" | "away" }>(
          `/users.getPresence?user=${encodeURIComponent(member.id)}`,
          workspaceId
        );
        presence = presenceData.presence;
      } catch {
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
      } satisfies SlackProfile;
    })
  );

  return profiles;
}

export async function fetchChannelMessages(workspaceId: string, channelRef: string) {
  const channelId = await resolveChannelId(workspaceId, channelRef);
  const data = await slackFetch<{
    messages: Array<{
      ts: string;
      text?: string;
      user?: string;
      subtype?: string;
      username?: string;
      metadata?: {
        event_type?: string;
        event_payload?: {
          office_user_id?: string;
          slack_user_id?: string;
          display_name?: string;
        };
      };
    }>;
  }>(
    `/conversations.history?channel=${encodeURIComponent(channelId)}&limit=40&include_all_metadata=true`,
    workspaceId
  );

  const items = data.messages
    .filter(
      (message) =>
        typeof message.text === "string" &&
        typeof message.ts === "string" &&
        (!message.subtype || message.subtype === "bot_message")
    )
    .map((message) => {
      const seconds = Number(message.ts.split(".")[0] ?? "0");
      const prefixedAuthor = parseBracketedAuthorPrefix(message.text ?? "");
      const metadataPayload = message.metadata?.event_type === "virtual_office_message"
        ? message.metadata.event_payload
        : undefined;
      const isBotMessage = message.subtype === "bot_message";
      const hasBracketedAuthorPrefix = Boolean(prefixedAuthor.authorName);

      return {
        id: message.ts,
        channelId,
        userId:
          metadataPayload?.office_user_id ??
          metadataPayload?.slack_user_id ??
          (!isBotMessage && message.user ? message.user : "unknown"),
        userName:
          metadataPayload?.display_name ??
          prefixedAuthor.authorName ??
          message.username ??
          message.user ??
          "Slack User",
        text: hasBracketedAuthorPrefix ? prefixedAuthor.body : message.text ?? "",
        source: "slack",
        createdAt: new Date(seconds * 1000).toISOString()
      } satisfies OfficeMessage;
    })
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  return {
    channelId,
    items
  };
}

export async function postSlackMessage(
  workspaceId: string,
  channelId: string,
  text: string,
  author: { officeUserId: string; slackUserId: string; displayName: string }
) {
  const resolvedChannelId = await resolveChannelId(workspaceId, channelId);

  return slackFetch<{ ts: string; channel: string }>("/chat.postMessage", workspaceId, {
    method: "POST",
    body: JSON.stringify({
      channel: resolvedChannelId,
      text,
      metadata: {
        event_type: "virtual_office_message",
        event_payload: {
          office_user_id: author.officeUserId,
          slack_user_id: author.slackUserId,
          display_name: author.displayName
        }
      }
    })
  });
}

export function verifySlackRequest(signatureHeader: string | undefined, timestampHeader: string | undefined, rawBody: string) {
  if (!signatureHeader || !timestampHeader) {
    return false;
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const slackTimestamp = Number(timestampHeader);
  if (Number.isNaN(slackTimestamp) || Math.abs(currentTimestamp - slackTimestamp) > 60 * 5) {
    return false;
  }

  const baseString = `v0:${timestampHeader}:${rawBody}`;
  const computedSignature =
    "v0=" +
    crypto.createHmac("sha256", env.SLACK_SIGNING_SECRET).update(baseString, "utf8").digest("hex");

  return crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(signatureHeader));
}
