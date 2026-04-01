import { Router } from "express";
import { isSlackConfigured } from "../config/env.js";
import { addMessage, createOrUpdateMemberFromSlack, getMemberBySlackId, updateMemberPresence } from "../services/officeStore.js";
import { fetchSlackUserProfile, verifySlackRequest } from "../slack/client.js";
const router = Router();
router.post("/events", async (request, response) => {
    if (!isSlackConfigured) {
        response.status(202).json({ message: "Slack mock mode" });
        return;
    }
    const isValid = verifySlackRequest(request.header("x-slack-signature"), request.header("x-slack-request-timestamp"), request.rawBody ?? "");
    if (!isValid) {
        response.status(401).json({ message: "Invalid Slack signature" });
        return;
    }
    const body = request.body;
    if (body.type === "url_verification") {
        response.json({ challenge: body.challenge });
        return;
    }
    const event = body.event;
    if (!event) {
        response.status(200).send();
        return;
    }
    try {
        if (event.type === "message" && typeof event.user === "string" && typeof event.text === "string") {
            const workspaceId = typeof body.team_id === "string" ? body.team_id : undefined;
            const member = getMemberBySlackId(event.user, workspaceId) ??
                createOrUpdateMemberFromSlack(await fetchSlackUserProfile(event.user), workspaceId ?? "slack-workspace");
            addMessage({
                channelId: typeof event.channel === "string" ? event.channel : "general",
                userId: member.id,
                userName: member.displayName,
                text: event.text,
                source: "slack"
            });
        }
        if (event.type === "presence_change" && typeof event.user === "string" && (event.presence === "active" || event.presence === "away")) {
            updateMemberPresence(event.user, event.presence, typeof body.team_id === "string" ? body.team_id : undefined);
        }
        if (event.type === "user_change") {
            const user = event.user;
            if (typeof user?.id === "string") {
                const profile = await fetchSlackUserProfile(user.id);
                createOrUpdateMemberFromSlack(profile, typeof body.team_id === "string" ? body.team_id : "slack-workspace");
            }
        }
    }
    catch (error) {
        response.status(500).json({ message: error instanceof Error ? error.message : "Slack event handling failed" });
        return;
    }
    response.status(200).send();
});
export { router as slackRouter };
