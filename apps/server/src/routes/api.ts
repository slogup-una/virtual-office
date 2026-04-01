import { Router } from "express";
import { z } from "zod";

import { isSeatAdminSlackUserId } from "../config/admin.js";
import { isSlackConfigured } from "../config/env.js";
import {
  addMessage,
  assignSeat,
  clearSeatAssignment,
  getMemberById,
  getSnapshot,
  listMessages
} from "../services/officeStore.js";
import { postSlackMessage } from "../slack/client.js";

const router = Router();

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

  response.json(
    getSnapshot(
      request.sessionUser.id,
      request.sessionUser.workspaceId,
      isSeatAdminSlackUserId(request.sessionUser.slackUserId)
    )
  );
});

router.get("/messages", (request, response) => {
  const channelId = typeof request.query.channelId === "string" ? request.query.channelId : "general";
  response.json({ items: listMessages(channelId) });
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
    await postSlackMessage(parsed.data.channelId, parsed.data.text);
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
