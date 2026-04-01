export const seatAdminEmails = new Set([
  "una@slogup.com",
  "una@example.com"
]);

export function isSeatAdminEmail(email?: string) {
  if (!email) {
    return false;
  }

  return seatAdminEmails.has(email.toLowerCase());
}
