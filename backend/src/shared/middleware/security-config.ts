/**
 * Security Configuration
 *
 * Centralized security settings for CORS, Helmet, and Rate Limiting.
 */

import { FastifyCorsOptions } from '@fastify/cors';
import { FastifyHelmetOptions } from '@fastify/helmet';
import { RateLimitOptions } from '@fastify/rate-limit';

/**
 * CORS Configuration
 */
export const corsConfig: FastifyCorsOptions = {
  // Allow multiple origins for development and production
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:8081']; // Default for Expo web and mobile

    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'x-request-id',
  ],
  exposedHeaders: ['x-request-id'],
  maxAge: 86400, // 24 hours
};

/**
 * Helmet Security Headers Configuration
 */
export const helmetConfig: FastifyHelmetOptions = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'https:'],
      frameSrc: ["'none'"],
    },
  },
  // Cross-Origin policies
  crossOriginEmbedderPolicy: false, // Disable for CDN resources
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Security headers
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
};

/**
 * Rate Limiting Configuration
 */
export const rateLimitConfig: RateLimitOptions = {
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  cache: 10000, // Cache size
  allowList: (req) => {
    // Allow health checks and metrics without rate limiting
    return req.url === '/health' || req.url === '/metrics';
  },
  // Custom error response
  errorResponseBuilder: (request, context) => {
    return {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil(context.ttl / 1000), // seconds
      },
    };
  },
  // Redis for distributed rate limiting (production)
  ...(process.env.NODE_ENV === 'production' && {
    redis: undefined, // Will use Redis if configured
  }),
};

/**
 * Endpoint-specific rate limits
 */
export const endpointRateLimits = {
  // Authentication endpoints - stricter limits
  auth: {
    max: 5,
    timeWindow: 60000, // 5 requests per minute
  },
  // Video upload - very strict
  upload: {
    max: 10,
    timeWindow: 3600000, // 10 uploads per hour
  },
  // Search endpoints - moderate
  search: {
    max: 30,
    timeWindow: 60000, // 30 searches per minute
  },
  // General API - standard
  api: {
    max: 100,
    timeWindow: 60000, // 100 requests per minute
  },
};

/**
 * Input validation patterns
 */
export const ValidationPatterns = {
  // Email validation (RFC 5322 simplified)
  email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,

  // Password requirements: 8-128 chars, at least one uppercase, one lowercase, one number
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,128}$/,

  // UUID v4
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  // URL (http/https only)
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,

  // Alphanumeric with spaces, hyphens, underscores (for names)
  name: /^[a-zA-Z0-9\s\-_]{1,100}$/,

  // Slug (lowercase alphanumeric with hyphens)
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
};

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize object fields
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fieldsToSanitize: (keyof T)[]
): T {
  const sanitized = { ...obj };

  for (const field of fieldsToSanitize) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeInput(sanitized[field] as string) as T[keyof T];
    }
  }

  return sanitized;
}

/**
 * Check if string contains SQL injection patterns
 */
export function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bSELECT\b.*\bFROM\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bUPDATE\b.*\bSET\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(;.*--)/,
    /('.*OR.*'.*=.*')/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Security headers for file uploads
 */
export const uploadSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'",
};
