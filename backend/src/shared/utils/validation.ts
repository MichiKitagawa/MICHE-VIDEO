/**
 * Validation Utilities
 *
 * Provides validation functions for user input.
 * Reference: docs/specs/architecture/security.md
 */

/**
 * Email validation regex pattern.
 * Conforms to RFC 5322 (simplified version).
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Password validation result interface
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates an email address format.
 *
 * @param email - Email address to validate
 * @returns boolean - True if valid, false otherwise
 *
 * @example
 * validateEmail('test@example.com'); // returns true
 * validateEmail('invalid'); // returns false
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Remove whitespace
  const trimmedEmail = email.trim();

  // Check length (max 255 chars per RFC 5321)
  if (trimmedEmail.length === 0 || trimmedEmail.length > 255) {
    return false;
  }

  // Check for spaces
  if (/\s/.test(trimmedEmail)) {
    return false;
  }

  // Validate with regex
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return false;
  }

  // Additional checks
  const [localPart, domain] = trimmedEmail.split('@');

  // Local part cannot be empty
  if (!localPart || localPart.length === 0) {
    return false;
  }

  // Local part max length is 64 characters (RFC 5321)
  if (localPart.length > 64) {
    return false;
  }

  // Local part cannot start or end with a dot
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return false;
  }

  // Domain must have at least one dot and valid TLD
  if (!domain || !domain.includes('.')) {
    return false;
  }

  // TLD cannot be empty
  const tld = domain.split('.').pop();
  if (!tld || tld.length === 0) {
    return false;
  }

  // Check for consecutive dots
  if (email.includes('..')) {
    return false;
  }

  // Security: Check for potential XSS/SQL injection patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i, // event handlers like onclick=
    /\bselect\b.*\bfrom\b/i, // SQL SELECT
    /\binsert\b.*\binto\b/i, // SQL INSERT
    /\bdrop\b.*\btable\b/i, // SQL DROP
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(email)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates password strength.
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 *
 * @param password - Password to validate
 * @returns PasswordValidationResult - Validation result with errors
 *
 * @example
 * validatePassword('SecurePass123!');
 * // returns { valid: true, errors: [] }
 *
 * validatePassword('weak');
 * // returns { valid: false, errors: ['最小8文字必要', '大文字が必要', ...] }
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Check if password exists and has correct type
  if (typeof password !== 'string') {
    return {
      valid: false,
      errors: ['パスワードが必要'],
    };
  }

  // Minimum length check (8 characters)
  // Empty string also fails this check
  if (password.length < 8) {
    errors.push('最小8文字必要');
  }

  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    errors.push('大文字が必要');
  }

  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    errors.push('小文字が必要');
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push('数字が必要');
  }

  // Special character check
  // Common special characters: !@#$%^&*()_+-=[]{}|;:,.<>?
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('特殊文字が必要');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a user's name.
 * Requirements:
 * - Minimum 2 characters
 * - Maximum 100 characters
 * - No leading/trailing whitespace
 *
 * @param name - Name to validate
 * @returns boolean - True if valid, false otherwise
 *
 * @example
 * validateName('John Doe'); // returns true
 * validateName('A'); // returns false (too short)
 */
export function validateName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const trimmedName = name.trim();

  // Check length
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    return false;
  }

  // Check for leading/trailing whitespace
  if (name !== trimmedName) {
    return false;
  }

  // Security: Check for potential XSS patterns
  const dangerousPatterns = [/<script/i, /javascript:/i, /on\w+=/i];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(name)) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitizes user input by removing potentially dangerous characters.
 *
 * @param input - Input string to sanitize
 * @returns string - Sanitized string
 *
 * @example
 * sanitizeInput('<script>alert("XSS")</script>');
 * // returns '&lt;script&gt;alert("XSS")&lt;/script&gt;'
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
