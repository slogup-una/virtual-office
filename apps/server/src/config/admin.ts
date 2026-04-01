export const seatAdminSlackUserIds = new Set(["U098H1ZTJSW"]);

export function isSeatAdminSlackUserId(slackUserId?: string) {
  if (!slackUserId) {
    return false;
  }

  return seatAdminSlackUserIds.has(slackUserId);
}
