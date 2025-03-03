import { createHash, randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getMongoDb } from "./mongodb";

// Token expiration time in milliseconds (15 minutes)
const TOKEN_EXPIRATION = 15 * 60 * 1000;

// In-memory token store (in a real app, this would be a database)
// Format: { [token]: { email: string, expires: number } }
const tokenStore: Record<string, { email: string; expires: number }> = {};

// Debug configuration
type LogLevel = "none" | "error" | "warn" | "info" | "debug" | "trace";
interface DebugConfig {
  enabled: boolean;
  level: LogLevel;
  logToConsole: boolean;
  logToFile: boolean;
  maskTokens: boolean; // Whether to mask full tokens in logs for security
}

// Default debug configuration
let debugConfig: DebugConfig = {
  enabled: process.env.NODE_ENV !== "production",
  level: (process.env.TOKEN_DEBUG_LEVEL as LogLevel) || "info",
  logToConsole: true,
  logToFile: false,
  maskTokens: true,
};

// Log levels hierarchy
const LOG_LEVELS: Record<LogLevel, number> = {
  none: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

/**
 * Configure the token debugging system
 */
export function configureTokenDebug(config: Partial<DebugConfig>): void {
  debugConfig = { ...debugConfig, ...config };
  logDebug("debug", "Token debugging configured", { config: debugConfig });
}

/**
 * Internal logging function
 */
function logDebug(
  level: Exclude<LogLevel, "none">,
  message: string,
  data?: any
): void {
  if (
    !debugConfig.enabled ||
    LOG_LEVELS[debugConfig.level] < LOG_LEVELS[level]
  ) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data: data ? maskSensitiveData(data) : undefined,
  };

  if (debugConfig.logToConsole) {
    const coloredLevel = getColoredLevel(level);
    console.log(
      `[Token] ${timestamp} ${coloredLevel}: ${message}`,
      data ? maskSensitiveData(data) : ""
    );
  }

  if (debugConfig.logToFile) {
    // In a real implementation, this would write to a file
    // For now, we'll just note that this would happen
    console.log(`[Would log to file]: ${JSON.stringify(logEntry)}`);
  }
}

/**
 * Mask sensitive data like full tokens
 */
function maskSensitiveData(data: any): any {
  if (!debugConfig.maskTokens) return data;

  const masked = { ...data };

  // Mask token if it exists
  if (masked.token && typeof masked.token === "string") {
    masked.token = maskToken(masked.token);
  }

  // Handle nested objects
  Object.keys(masked).forEach((key) => {
    if (typeof masked[key] === "object" && masked[key] !== null) {
      masked[key] = maskSensitiveData(masked[key]);
    }
  });

  return masked;
}

/**
 * Mask a token for display in logs
 */
function maskToken(token: string): string {
  if (token.length <= 8) return "****";
  return token.substring(0, 4) + "..." + token.substring(token.length - 4);
}

/**
 * Get colored log level for console output
 */
function getColoredLevel(level: Exclude<LogLevel, "none">): string {
  const colors = {
    error: "\x1b[31m", // Red
    warn: "\x1b[33m", // Yellow
    info: "\x1b[36m", // Cyan
    debug: "\x1b[35m", // Magenta
    trace: "\x1b[90m", // Gray
    reset: "\x1b[0m", // Reset
  };

  return `${colors[level]}${level.toUpperCase()}${colors.reset}`;
}

/**
 * Get current token store statistics
 */
export function getTokenStoreStats(): { total: number; expired: number } {
  const now = Date.now();
  const total = Object.keys(tokenStore).length;
  const expired = Object.values(tokenStore).filter(
    (data) => data.expires < now
  ).length;

  return { total, expired };
}

export type Token = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  email: string;
  type: "VERIFICATION" | "PASSWORD_RESET";
};

// Collection name for tokens
const TOKENS_COLLECTION = "tokens";

/**
 * Generate a new token
 */
export async function generateToken(
  userId: string,
  type: Token["type"],
  expiresInHours = 24
): Promise<Token> {
  const db = await getMongoDb();
  const tokens = db.collection<Token>(TOKENS_COLLECTION);

  const token: Token = {
    id: uuidv4(),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
    email: userId,
    type,
  };

  await tokens.insertOne(token);
  return token;
}

/**
 * Validate a token
 */
export async function validateToken(
  id: string,
  type: Token["type"]
): Promise<Token | null> {
  const db = await getMongoDb();
  const tokens = db.collection<Token>(TOKENS_COLLECTION);

  const token = await tokens.findOne({
    id,
    type,
    expiresAt: { $gt: new Date() },
  });

  return token;
}

/**
 * Invalidate a token (delete it)
 */
export async function invalidateToken(id: string): Promise<boolean> {
  const db = await getMongoDb();
  const tokens = db.collection<Token>(TOKENS_COLLECTION);

  const result = await tokens.deleteOne({ id });
  return result.deletedCount > 0;
}

/**
 * Clean up expired tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const db = await getMongoDb();
  const tokens = db.collection<Token>(TOKENS_COLLECTION);

  const result = await tokens.deleteMany({
    expiresAt: { $lt: new Date() },
  });

  return result.deletedCount;
}

/**
 * Generates a secure hash for a token
 * This can be used to create a shorter token for URLs
 */
export function hashToken(token: string): string {
  const hash = createHash("sha256")
    .update(token)
    .digest("hex")
    .substring(0, 16);
  logDebug("debug", "Token hashed", {
    token: { value: token },
    hash,
  });
  return hash;
}

/**
 * Generates the magic link URL for email authentication
 */
export function generateMagicLink(token: string, email: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/auth/email/callback?token=${encodeURIComponent(
    token
  )}&email=${encodeURIComponent(email)}`;

  logDebug("info", "Magic link generated", {
    token: { value: token },
    email,
    url,
  });

  return url;
}

/**
 * Force expire a token (useful for testing or security measures)
 */
export function expireToken(token: string): boolean {
  if (!tokenStore[token]) {
    logDebug("warn", "Cannot expire token: Token not found", {
      token: { value: token },
    });
    return false;
  }

  delete tokenStore[token];
  logDebug("info", "Token forcibly expired", { token: { value: token } });
  return true;
}

/**
 * Get token information (for debugging purposes)
 */
export function getTokenInfo(token: string): {
  exists: boolean;
  expired?: boolean;
  email?: string;
  expiresAt?: string;
} {
  if (!tokenStore[token]) {
    return { exists: false };
  }

  const now = Date.now();
  const tokenData = tokenStore[token];
  const expired = tokenData.expires < now;

  return {
    exists: true,
    expired,
    email: tokenData.email,
    expiresAt: new Date(tokenData.expires).toISOString(),
  };
}

/**
 * Diagnose token validation issues
 * This function doesn't modify the token store, it just provides diagnostic information
 */
export function diagnoseTokenValidation(token: string): {
  exists: boolean;
  isValid: boolean;
  reason?: string;
  details?: any;
} {
  logDebug("debug", "Running token validation diagnostics", {
    token: { value: token },
  });

  // Check if token exists in store
  const tokenData = tokenStore[token];
  if (!tokenData) {
    // Token not found, check if it's a hash mismatch
    const possibleMatches = Object.keys(tokenStore).filter(
      (storeToken) =>
        storeToken.substring(0, 8) === token.substring(0, 8) ||
        storeToken.substring(storeToken.length - 8) ===
          token.substring(token.length - 8)
    );

    return {
      exists: false,
      isValid: false,
      reason: "Token not found in store",
      details: {
        possiblePartialMatches: possibleMatches.length,
        storeSize: Object.keys(tokenStore).length,
        tokenLength: token.length,
        expectedLength: 64, // 32 bytes as hex
        isHashed: token.length === 16, // Check if it might be a hashed token
      },
    };
  }

  // Check expiration
  const now = Date.now();
  if (tokenData.expires < now) {
    const expirationDate = new Date(tokenData.expires);
    const currentDate = new Date();
    const timeDifference = currentDate.getTime() - expirationDate.getTime();

    return {
      exists: true,
      isValid: false,
      reason: "Token expired",
      details: {
        email: tokenData.email,
        expiredAt: expirationDate.toISOString(),
        currentTime: currentDate.toISOString(),
        expiredForMs: timeDifference,
        expiredForMinutes: Math.floor(timeDifference / (1000 * 60)),
        configuredExpirationMinutes: TOKEN_EXPIRATION / (1000 * 60),
      },
    };
  }

  // Token is valid
  return {
    exists: true,
    isValid: true,
    details: {
      email: tokenData.email,
      expiresAt: new Date(tokenData.expires).toISOString(),
      timeRemaining: `${Math.floor(
        (tokenData.expires - now) / (1000 * 60)
      )} minutes`,
    },
  };
}

/**
 * List all active tokens (for debugging purposes)
 * This should only be used in development/debugging
 */
export function listActiveTokens(): Array<{
  tokenPreview: string;
  email: string;
  expiresAt: string;
  isExpired: boolean;
  timeRemaining?: string;
}> {
  if (process.env.NODE_ENV === "production" && !debugConfig.enabled) {
    logDebug(
      "error",
      "listActiveTokens called in production with debugging disabled"
    );
    return [];
  }

  const now = Date.now();
  return Object.entries(tokenStore).map(([token, data]) => {
    const isExpired = data.expires < now;
    const timeRemaining = isExpired
      ? undefined
      : `${Math.floor((data.expires - now) / (1000 * 60))} minutes`;

    return {
      tokenPreview: maskToken(token),
      email: data.email,
      expiresAt: new Date(data.expires).toISOString(),
      isExpired,
      timeRemaining,
    };
  });
}
