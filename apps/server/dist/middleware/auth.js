import { env } from "../config/env.js";
import { getSession, getSessionFromAuthHeader } from "../services/sessionStore.js";
export function requireAuth(request, response, next) {
    const sessionId = request.cookies[env.SESSION_COOKIE_NAME];
    const session = getSession(sessionId) ?? getSessionFromAuthHeader(request.header("authorization"));
    if (!session) {
        response.status(401).json({ message: "Unauthorized" });
        return;
    }
    request.sessionUser = session;
    next();
}
