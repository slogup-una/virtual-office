import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { getSession, getSessionFromAuthHeader } from "../services/sessionStore.js";

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const sessionId = request.cookies[env.SESSION_COOKIE_NAME] as string | undefined;
  const session = getSession(sessionId) ?? getSessionFromAuthHeader(request.header("authorization"));

  if (!session) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  request.sessionUser = session;
  next();
}
