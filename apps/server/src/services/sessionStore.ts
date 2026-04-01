import { nanoid } from "nanoid";

import type { SessionUser } from "../types/domain.js";

const sessions = new Map<string, SessionUser>();

export function createSession(user: SessionUser) {
  const sessionId = nanoid();
  sessions.set(sessionId, user);
  return sessionId;
}

export function getSession(sessionId?: string) {
  if (!sessionId) {
    return null;
  }

  return sessions.get(sessionId) ?? null;
}

export function destroySession(sessionId?: string) {
  if (!sessionId) {
    return;
  }

  sessions.delete(sessionId);
}

export function getSessionFromAuthHeader(authHeader?: string) {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const sessionId = authHeader.slice("Bearer ".length).trim();
  return getSession(sessionId);
}
