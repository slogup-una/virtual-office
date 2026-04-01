import type { SessionUser } from "./domain.js";

declare global {
  namespace Express {
    interface Request {
      rawBody?: string;
      sessionUser?: SessionUser;
    }
  }
}

export {};
