import { nanoid } from "nanoid";
const sessions = new Map();
export function createSession(user) {
    const sessionId = nanoid();
    sessions.set(sessionId, user);
    return sessionId;
}
export function getSession(sessionId) {
    if (!sessionId) {
        return null;
    }
    return sessions.get(sessionId) ?? null;
}
export function destroySession(sessionId) {
    if (!sessionId) {
        return;
    }
    sessions.delete(sessionId);
}
export function getSessionFromAuthHeader(authHeader) {
    if (!authHeader?.startsWith("Bearer ")) {
        return null;
    }
    const sessionId = authHeader.slice("Bearer ".length).trim();
    return getSession(sessionId);
}
