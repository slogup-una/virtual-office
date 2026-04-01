export const seatAdminSlackUserIds = new Set(["U098H1ZTJSW"]);
export function isSeatAdminSlackUserId(slackUserId) {
    if (!slackUserId) {
        return false;
    }
    return seatAdminSlackUserIds.has(slackUserId);
}
