/**
 * Admin authorization utilities.
 *
 * Set ADMIN_EMAILS as a comma-separated list of email addresses in your
 * environment to grant admin access.
 */

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  const admins = getAdminEmails();
  return admins.includes(email.toLowerCase());
}
