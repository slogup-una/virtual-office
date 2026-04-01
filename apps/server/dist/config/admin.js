export const seatAdminSlackUserIds = new Set([
    "U_DEMO_1"
    // Replace with your real Slack user ID, e.g. "U08ABC12345"
]);
export function isSeatAdminSlackUserId(slackUserId) {
    if (!slackUserId) {
        return false;
    }
    return seatAdminSlackUserIds.has(slackUserId);
}
