import { createHash, randomBytes } from "crypto";

// Token expiration time in milliseconds (15 minutes)
const TOKEN_EXPIRATION = 15 * 60 * 1000;

// In-memory token store (in a real app, this would be a database)
// Format: { [token]: { email: string, expires: number } }
const tokenStore: Record<string, { email: string; expires: number }> = {};

/**
 * Generates a secure token for email authentication
 */
export function generateToken(email: string): string {
  // Clean up expired tokens
  cleanupExpiredTokens();

  // Generate a random token
  const token = randomBytes(32).toString("hex");

  // Store the token with expiration
  tokenStore[token] = {
    email,
    expires: Date.now() + TOKEN_EXPIRATION,
  };

  return token;
}

/**
 * Validates a token and returns the associated email if valid
 */
export function validateToken(token: string): string | null {
  // Clean up expired tokens
  cleanupExpiredTokens();

  // Check if token exists and is not expired
  const tokenData = tokenStore[token];
  if (!tokenData) {
    return null;
  }

  // Check if token is expired
  if (tokenData.expires < Date.now()) {
    delete tokenStore[token];
    return null;
  }

  // Token is valid, remove it from store (one-time use)
  const { email } = tokenData;
  delete tokenStore[token];

  return email;
}

/**
 * Cleans up expired tokens from the token store
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();

  Object.entries(tokenStore).forEach(([token, data]) => {
    if (data.expires < now) {
      delete tokenStore[token];
    }
  });
}

/**
 * Generates a secure hash for a token
 * This can be used to create a shorter token for URLs
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").substring(0, 16); // Use first 16 chars for a shorter hash
}

/**
 * Generates the magic link URL for email authentication
 */
export function generateMagicLink(token: string, email: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/auth/email/callback?token=${encodeURIComponent(
    token
  )}&email=${encodeURIComponent(email)}`;
}
