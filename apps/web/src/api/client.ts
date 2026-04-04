import type { OfficeMessage, OfficeSnapshot } from "../types/domain";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const SESSION_STORAGE_KEY = "virtual-office-session";

function getStoredSession() {
  return window.localStorage.getItem(SESSION_STORAGE_KEY);
}

export function storeSession(sessionId: string) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
}

export function clearStoredSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

async function request<T>(path: string, init?: RequestInit) {
  const sessionId = getStoredSession();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(sessionId ? { Authorization: `Bearer ${sessionId}` } : {}),
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function requestText(path: string, init?: RequestInit) {
  const sessionId = getStoredSession();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      ...(sessionId ? { Authorization: `Bearer ${sessionId}` } : {}),
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `${response.status}`);
  }

  return response.text();
}

export const apiClient = {
  getSession: () => request<{ user: { id: string } }>("/auth/session"),
  demoLogin: () => request<{ sessionId: string }>("/auth/demo-login", { method: "POST" }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  getOffice: () => request<OfficeSnapshot>("/api/office"),
  updateMyPosition: (payload: {
    x: number;
    y: number;
    direction?: "up" | "down" | "left" | "right";
    isMoving?: boolean;
    isDancing?: boolean;
  }) =>
    request<{ ok: true }>("/api/me/position", {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  getMessages: (channelId: string) =>
    request<{ items: OfficeMessage[] }>(`/api/messages?channelId=${encodeURIComponent(channelId)}`),
  sendMessage: (payload: { channelId: string; text: string }) =>
    request<{ item: OfficeMessage }>("/api/messages", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  assignSeat: (seatKey: string, payload: { slackUserId: string }) =>
    request<{ ok: true }>(`/api/seats/${encodeURIComponent(seatKey)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  clearSeat: (seatKey: string) =>
    request<{ ok: true }>(`/api/seats/${encodeURIComponent(seatKey)}`, {
      method: "DELETE"
    }),
  exportSeatAssignments: () => requestText("/api/seats/export"),
  getSlackLoginUrl: () => `${API_BASE_URL}/auth/slack/start`
};
