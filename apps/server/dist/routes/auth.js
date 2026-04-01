import { Router } from "express";
import { env, isSlackConfigured } from "../config/env.js";
import { createOrUpdateMemberFromSlack, getMemberById, upsertWorkspace } from "../services/officeStore.js";
import { createSession, destroySession } from "../services/sessionStore.js";
import { exchangeCodeForToken, fetchSlackUserProfile, fetchWorkspaceMembers, storeSlackWorkspaceToken } from "../slack/client.js";
const router = Router();
router.get("/session", (request, response) => {
    if (!request.sessionUser) {
        response.status(401).json({ message: "Unauthorized" });
        return;
    }
    const member = getMemberById(request.sessionUser.id);
    response.json({ user: member });
});
router.get("/slack/start", (_request, response) => {
    if (!isSlackConfigured) {
        response.status(400).json({ message: "Slack is not configured." });
        return;
    }
    const params = new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        scope: "chat:write,channels:history,channels:read,users:read,users.profile:read",
        user_scope: "openid,profile,email",
        redirect_uri: env.SLACK_REDIRECT_URI
    });
    response.redirect(`https://slack.com/oauth/v2/authorize?${params.toString()}`);
});
router.get("/slack/callback", async (request, response) => {
    try {
        const code = request.query.code;
        if (typeof code !== "string") {
            response.status(400).send("Missing OAuth code");
            return;
        }
        const token = await exchangeCodeForToken(code);
        upsertWorkspace({
            id: token.workspaceId,
            name: token.workspaceName,
            defaultChannelId: "general"
        });
        storeSlackWorkspaceToken(token.workspaceId, {
            accessToken: token.botAccessToken,
            refreshToken: token.botRefreshToken,
            expiresAt: token.botTokenExpiresAt
        });
        const workspaceMembers = await fetchWorkspaceMembers(token.workspaceId);
        workspaceMembers.forEach((workspaceMember) => {
            createOrUpdateMemberFromSlack(workspaceMember, token.workspaceId);
        });
        const profile = await fetchSlackUserProfile(token.workspaceId, token.slackUserId);
        const member = createOrUpdateMemberFromSlack(profile, token.workspaceId);
        const sessionId = createSession({
            id: member.id,
            slackUserId: token.slackUserId,
            workspaceId: token.workspaceId
        });
        response.cookie(env.SESSION_COOKIE_NAME, sessionId, {
            httpOnly: true,
            sameSite: "lax"
        });
        response.redirect(`${env.CLIENT_ORIGIN}/auth/callback#session=${encodeURIComponent(sessionId)}`);
    }
    catch (error) {
        response.status(500).send(error instanceof Error ? error.message : "OAuth callback failed");
    }
});
router.post("/demo-login", (_request, response) => {
    const member = getMemberById("u-1");
    if (!member) {
        response.status(500).json({ message: "Demo user not found" });
        return;
    }
    const sessionId = createSession({
        id: member.id,
        slackUserId: member.slackUserId,
        workspaceId: "demo-workspace"
    });
    response.cookie(env.SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        sameSite: "lax"
    });
    response.json({ sessionId });
});
router.post("/logout", (request, response) => {
    const sessionId = request.cookies[env.SESSION_COOKIE_NAME];
    const authHeader = request.header("authorization");
    const bearerSessionId = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : undefined;
    destroySession(sessionId);
    destroySession(bearerSessionId);
    response.clearCookie(env.SESSION_COOKIE_NAME);
    response.status(204).send();
});
export { router as authRouter };
