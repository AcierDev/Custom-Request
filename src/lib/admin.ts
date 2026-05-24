const DEFAULT_PALETTE_VIEWER_EMAILS = ["akivaweil@gmail.com"];

const configuredPaletteViewerEmails =
  process.env.ADMIN_PALETTE_VIEWER_EMAILS?.split(",")
    .map((email) => email.trim())
    .filter(Boolean) ?? [];

export const PALETTE_VIEWER_EMAILS = [
  ...DEFAULT_PALETTE_VIEWER_EMAILS,
  ...configuredPaletteViewerEmails,
].map((email) => email.toLowerCase());

export function canViewAllPalettes(email?: string | null) {
  if (!email) return false;
  return PALETTE_VIEWER_EMAILS.includes(email.toLowerCase());
}
