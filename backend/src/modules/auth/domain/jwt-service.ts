/**
 * JWT Service Module
 *
 * Provides JWT token generation and verification for authentication.
 * Reference: docs/specs/architecture/security.md
 */

import jwt from 'jsonwebtoken';

/**
 * JWT secret key from environment variables.
 * Must be set in production for security.
 */
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

/**
 * Access token expiration time.
 * Default: 15 minutes
 */
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m';

/**
 * Refresh token expiration time.
 * Default: 30 days
 */
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_TOKEN_EXPIRY || '30d';

/**
 * Token payload interface
 */
export interface TokenPayload {
  userId: string;
  email?: string;
  [key: string]: any;
}

/**
 * Sensitive fields that should not be included in JWT tokens.
 */
const SENSITIVE_FIELDS = ['password', 'passwordHash', 'refreshToken', 'accessToken', 'secret'];

/**
 * Decoded token interface
 */
export interface DecodedToken extends TokenPayload {
  type: 'access' | 'refresh';
  iat: number; // Issued at
  exp: number; // Expiration time
}

/**
 * Generates an access token with short expiration (15 minutes).
 *
 * @param payload - User data to include in the token
 * @returns string - JWT access token
 *
 * @example
 * const token = generateAccessToken({ userId: 'user_123', email: 'test@example.com' });
 */
export function generateAccessToken(payload: TokenPayload): string {
  // Filter out sensitive fields
  const sanitizedPayload = Object.keys(payload).reduce((acc, key) => {
    if (!SENSITIVE_FIELDS.includes(key)) {
      acc[key] = payload[key];
    }
    return acc;
  }, {} as Record<string, any>);

  const tokenPayload = {
    ...sanitizedPayload,
    type: 'access' as const,
    jti: generateJti(), // Add unique identifier
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY as string | number,
  } as jwt.SignOptions);

  return token;
}

/**
 * Generates a refresh token with long expiration (30 days).
 *
 * @param payload - User data to include in the token
 * @returns string - JWT refresh token
 *
 * @example
 * const token = generateRefreshToken({ userId: 'user_123' });
 */
export function generateRefreshToken(payload: TokenPayload): string {
  // Filter out sensitive fields
  const sanitizedPayload = Object.keys(payload).reduce((acc, key) => {
    if (!SENSITIVE_FIELDS.includes(key)) {
      acc[key] = payload[key];
    }
    return acc;
  }, {} as Record<string, any>);

  const tokenPayload = {
    ...sanitizedPayload,
    type: 'refresh' as const,
    jti: generateJti(), // Add unique identifier
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY as string | number,
  } as jwt.SignOptions);

  return token;
}

/**
 * Verifies and decodes an access token.
 *
 * @param token - JWT access token
 * @returns DecodedToken - Decoded token payload
 * @throws Error if token is invalid, expired, or wrong type
 *
 * @example
 * const decoded = verifyAccessToken(token);
 * console.log(decoded.userId); // 'user_123'
 */
export function verifyAccessToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

    // Verify token type
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Verifies and decodes a refresh token.
 *
 * @param token - JWT refresh token
 * @returns DecodedToken - Decoded token payload
 * @throws Error if token is invalid, expired, or wrong type
 *
 * @example
 * const decoded = verifyRefreshToken(token);
 * console.log(decoded.userId); // 'user_123'
 */
export function verifyRefreshToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

    // Verify token type
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Generates a unique JWT ID (jti) for token uniqueness.
 * Combines timestamp with random string.
 *
 * @returns string - Unique identifier
 */
function generateJti(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

/**
 * Decodes a token without verifying the signature.
 * Useful for debugging or extracting data from expired tokens.
 *
 * @param token - JWT token
 * @returns DecodedToken | null - Decoded token payload or null if invalid
 *
 * @example
 * const decoded = decodeToken(token);
 * if (decoded) console.log(decoded.userId);
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.decode(token) as DecodedToken;
    return decoded;
  } catch {
    return null;
  }
}
