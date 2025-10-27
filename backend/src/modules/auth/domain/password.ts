/**
 * Password Hashing Module
 *
 * Provides secure password hashing and verification using bcrypt.
 * Reference: docs/specs/architecture/security.md
 */

import bcrypt from 'bcrypt';

/**
 * Cost factor for bcrypt hashing.
 * Higher values provide more security but take longer to compute.
 * Recommended: 12 or higher for production.
 */
const BCRYPT_COST_FACTOR = 12;

/**
 * Maximum password length supported by bcrypt.
 * bcrypt truncates passwords longer than 72 bytes.
 */
const MAX_PASSWORD_LENGTH = 72;

/**
 * Hashes a plain-text password using bcrypt.
 *
 * @param plainPassword - The plain-text password to hash
 * @returns Promise<string> - The bcrypt hash
 * @throws Error if password is empty or exceeds maximum length
 *
 * @example
 * const hash = await hashPassword('SecurePass123!');
 * // Returns: '$2a$12$...'
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  // Validate input
  if (!plainPassword || plainPassword.length === 0) {
    throw new Error('Password cannot be empty');
  }

  if (plainPassword.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`);
  }

  // Hash the password with bcrypt
  const hash = await bcrypt.hash(plainPassword, BCRYPT_COST_FACTOR);

  return hash;
}

/**
 * Verifies a plain-text password against a bcrypt hash.
 *
 * @param plainPassword - The plain-text password to verify
 * @param hash - The bcrypt hash to verify against
 * @returns Promise<boolean> - True if password matches, false otherwise
 * @throws Error if hash format is invalid
 *
 * @example
 * const isValid = await verifyPassword('SecurePass123!', hash);
 * // Returns: true or false
 */
export async function verifyPassword(
  plainPassword: string,
  hash: string
): Promise<boolean> {
  // Validate input
  if (!plainPassword) {
    return false;
  }

  if (!hash) {
    throw new Error('Hash cannot be empty');
  }

  // Verify hash format (bcrypt hashes start with $2a$, $2b$, or $2y$)
  if (!hash.match(/^\$2[aby]\$/)) {
    throw new Error('Invalid hash format');
  }

  // Compare password with hash
  // bcrypt.compare is timing-attack safe
  const isMatch = await bcrypt.compare(plainPassword, hash);

  return isMatch;
}

/**
 * Gets the cost factor used for hashing.
 * Useful for testing and configuration validation.
 *
 * @returns number - The bcrypt cost factor
 */
export function getCostFactor(): number {
  return BCRYPT_COST_FACTOR;
}
