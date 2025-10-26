/**
 * Test User Fixtures
 *
 * Predefined test users for consistent testing across all test suites
 */

export const testUsers = {
  freeUser: {
    email: 'free@example.com',
    password: 'FreePass123!',
    name: 'Free User',
    plan: 'Free',
    isEmailVerified: true
  },

  premiumUser: {
    email: 'premium@example.com',
    password: 'PremiumPass123!',
    name: 'Premium User',
    plan: 'Premium',
    isEmailVerified: true
  },

  premiumPlusUser: {
    email: 'premium-plus@example.com',
    password: 'PremiumPlusPass123!',
    name: 'Premium Plus User',
    plan: 'Premium+',
    isEmailVerified: true
  },

  unverifiedUser: {
    email: 'unverified@example.com',
    password: 'UnverifiedPass123!',
    name: 'Unverified User',
    plan: 'Free',
    isEmailVerified: false
  },

  newUser: {
    email: 'new-user@example.com',
    password: 'NewUserPass123!',
    name: 'New Test User',
    plan: 'Free'
  }
};

export const invalidUsers = {
  invalidEmail: {
    email: 'invalid-email',
    password: 'ValidPass123!',
    name: 'Invalid Email User'
  },

  weakPassword: {
    email: 'weak@example.com',
    password: 'weak',
    name: 'Weak Password User'
  },

  noUppercase: {
    email: 'test@example.com',
    password: 'lowercase123!',
    name: 'No Uppercase'
  },

  noLowercase: {
    email: 'test@example.com',
    password: 'UPPERCASE123!',
    name: 'No Lowercase'
  },

  noNumber: {
    email: 'test@example.com',
    password: 'NoNumber!',
    name: 'No Number'
  },

  noSpecialChar: {
    email: 'test@example.com',
    password: 'NoSpecial123',
    name: 'No Special'
  }
};

export const maliciousInputs = {
  sqlInjection: {
    email: "admin' OR '1'='1",
    password: "anything"
  },

  xssScript: {
    email: 'xss@example.com',
    password: 'XssPass123!',
    name: '<script>alert("XSS")</script>Test User'
  },

  htmlTags: {
    email: 'html@example.com',
    password: 'HtmlPass123!',
    name: '<b>Bold User</b>'
  }
};
