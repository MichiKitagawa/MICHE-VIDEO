# Performance Monitoring & Logging Guide

## Overview

Comprehensive monitoring and logging implementation for the Video Platform backend, providing real-time performance insights, error tracking, and operational visibility.

## Architecture

### Components

1. **Winston Logger** - Structured logging with multiple transports
2. **Performance Monitor** - Request/response metrics tracking
3. **Error Handler** - Global error handling with structured responses
4. **Health Checks** - Application health and metrics endpoints

## Winston Logger

Location: `src/shared/infrastructure/logger.ts`

### Features

- **Structured JSON Logging**: All logs are JSON-formatted for easy parsing
- **Multiple Transports**: Console (development), File (production), Error file
- **Log Rotation**: Daily rotation with 14-day retention (30 days for errors)
- **Colored Console**: Development-friendly colored output
- **Contextual Metadata**: Automatic service, environment, timestamp metadata

### Log Levels

```typescript
logger.error('Critical error occurred', { userId, error });
logger.warn('Warning: slow query', { duration, endpoint });
logger.info('User logged in', { userId, ip });
logger.http('HTTP request completed', { method, url, duration });
logger.verbose('Detailed operation info', { data });
logger.debug('Debug information', { state });
```

### Usage Examples

```typescript
import logger from '@/shared/infrastructure/logger';

// Success logging
logger.info('Video uploaded successfully', {
  videoId: '123',
  userId: 'user-456',
  duration: 1250,
  fileSize: '25MB',
});

// Error logging with stack trace
try {
  await processVideo(videoId);
} catch (error) {
  logger.error('Video processing failed', {
    videoId,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
  });
}

// Performance logging
const startTime = Date.now();
await expensiveOperation();
const duration = Date.now() - startTime;

if (duration > 1000) {
  logger.warn('Slow operation detected', {
    operation: 'expensiveOperation',
    duration,
    threshold: 1000,
  });
}
```

### Log File Locations

```
logs/
├── application-2025-10-28.log    # All logs (rotates daily)
├── application-2025-10-27.log.gz # Compressed old logs
├── error-2025-10-28.log           # Error logs only
└── error-2025-10-27.log.gz        # Compressed error logs
```

## Performance Monitoring

Location: `src/shared/infrastructure/performance-monitor.ts`

### Metrics Tracked

- **Request Count**: Total, successful, failed requests
- **Response Times**: Avg, min, max per endpoint
- **Slow Queries**: Requests exceeding threshold (default: 1000ms)
- **Error Rates**: Per endpoint and overall
- **Memory Usage**: Heap, RSS, external memory

### Automatic Tracking

All HTTP requests are automatically tracked via Fastify hooks:

```typescript
// Automatically tracked for every request:
- Request method and URL
- Response status code
- Response time (duration)
- User agent and IP address
- Authenticated user ID
```

### GET /metrics Endpoint

Query current performance metrics:

```bash
curl http://localhost:4000/metrics
```

Response:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRequests": 15432,
      "successfulRequests": 14821,
      "failedRequests": 611,
      "errorRate": "3.96%",
      "avgResponseTime": 87,
      "slowQueries": 23,
      "uptime": 86400
    },
    "endpoints": [
      {
        "endpoint": "GET /api/videos",
        "count": 3421,
        "avgTime": 45,
        "maxTime": 890,
        "minTime": 12,
        "errors": 8,
        "errorRate": "0.23%"
      },
      // ... more endpoints
    ],
    "memory": {
      "heapUsed": "128MB",
      "heapTotal": "256MB",
      "external": "12MB",
      "rss": "312MB"
    },
    "timestamp": "2025-10-28T02:30:00.000Z"
  }
}
```

### Slow Query Detection

Automatically logs requests exceeding threshold:

```typescript
// .env
SLOW_QUERY_THRESHOLD=1000  # milliseconds

// Log output for slow queries:
{
  "level": "warn",
  "message": "Slow query detected",
  "endpoint": "GET /api/videos",
  "duration": 1523,
  "method": "GET",
  "url": "/api/videos?limit=100",
  "statusCode": 200,
  "userId": "user-123"
}
```

### Periodic Reporting

In production, automatic performance summaries every 60 minutes:

```typescript
// Logged automatically:
{
  "level": "info",
  "message": "Performance Summary",
  "period": "60 minutes",
  "totalRequests": 5420,
  "successfulRequests": 5201,
  "failedRequests": 219,
  "errorRate": "4.04%",
  "avgResponseTime": 92,
  "slowQueries": 8,
  "uptime": 3600
}
```

### Memory Monitoring

Automatic memory usage logging every 30 minutes (production):

```typescript
{
  "level": "info",
  "message": "Memory Usage",
  "heapUsed": "156MB",
  "heapTotal": "256MB",
  "external": "15MB",
  "rss": "340MB"
}

// Warns if heap usage > 80%:
{
  "level": "warn",
  "message": "High Memory Usage Detected",
  "heapUsedPercentage": "82.43%",
  "heapUsed": "211MB",
  "heapTotal": "256MB"
}
```

## Error Handling

Location: `src/shared/infrastructure/error-handler.ts`

### Error Response Format

All errors return consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Video with ID '123' not found",
    "requestId": "1698456789-abc123",
    "details": {
      // Optional additional context
    }
  }
}
```

### Error Codes

```typescript
// Authentication & Authorization
UNAUTHORIZED           // 401
FORBIDDEN              // 403
INVALID_TOKEN          // 401
TOKEN_EXPIRED          // 401

// Validation
VALIDATION_ERROR       // 400
INVALID_INPUT          // 400
MISSING_REQUIRED_FIELD // 400

// Resources
NOT_FOUND              // 404
ALREADY_EXISTS         // 409
CONFLICT               // 409

// Business Logic
INSUFFICIENT_PERMISSIONS // 403
OPERATION_NOT_ALLOWED    // 403
QUOTA_EXCEEDED           // 429

// External Services
PAYMENT_FAILED           // 402
EXTERNAL_SERVICE_ERROR   // 502
STORAGE_ERROR            // 500

// Server Errors
INTERNAL_SERVER_ERROR  // 500
DATABASE_ERROR         // 500
RATE_LIMIT_EXCEEDED    // 429
```

### Throwing Errors

Use helper functions for consistent error handling:

```typescript
import {
  throwNotFoundError,
  throwValidationError,
  throwUnauthorizedError,
  throwForbiddenError,
  throwConflictError,
  AppError,
  ErrorCodes,
} from '@/shared/infrastructure/error-handler';

// Not found
const video = await videoRepo.findById(id);
if (!video) {
  throwNotFoundError('Video', id);
}

// Validation error
if (!email || !password) {
  throwValidationError('Email and password are required', {
    missing: ['email', 'password'],
  });
}

// Authorization
if (video.userId !== currentUserId) {
  throwForbiddenError('You do not have permission to edit this video');
}

// Custom error
throw new AppError(
  ErrorCodes.QUOTA_EXCEEDED,
  'Upload quota exceeded',
  429,
  { currentQuota: 100, limit: 100 }
);
```

### Uncaught Exception Handling

Automatically logs and gracefully shuts down:

```typescript
// Uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  // Gives 1 second for logs to write, then exits
});

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', { reason, promise });
});
```

## Health Checks

### GET /health

Basic health check with memory usage:

```bash
curl http://localhost:4000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-28T02:30:00.000Z",
  "uptime": 86400,
  "memory": {
    "heapUsed": "128MB",
    "heapTotal": "256MB",
    "external": "12MB",
    "rss": "312MB"
  }
}
```

## Environment Variables

```bash
# Logging
LOG_LEVEL=info              # error, warn, info, http, verbose, debug, silly
LOG_DIR=logs                # Log file directory
NODE_ENV=production         # production or development

# Performance
SLOW_QUERY_THRESHOLD=1000   # Slow query threshold in ms

# Rate Limiting
RATE_LIMIT_MAX=100          # Max requests per window
RATE_LIMIT_WINDOW_MS=60000  # Time window in ms
```

## Production Best Practices

### 1. Log Aggregation

Send logs to centralized service (CloudWatch, Elasticsearch, Datadog):

```typescript
// Add transport for CloudWatch
import CloudWatchTransport from 'winston-cloudwatch';

logger.add(new CloudWatchTransport({
  logGroupName: 'video-platform-api',
  logStreamName: `${process.env.NODE_ENV}-${Date.now()}`,
  awsRegion: process.env.AWS_REGION,
}));
```

### 2. Alerting

Set up alerts for:
- Error rate > 5%
- Slow queries > 50/hour
- Memory usage > 85%
- Response time > 500ms average

### 3. Dashboards

Create dashboards for:
- Request rate and response times
- Error rates by endpoint
- Memory and CPU usage
- Slow query trends

### 4. Log Retention

Production recommendations:
- Application logs: 14-30 days
- Error logs: 90 days
- Metrics: 1 year (aggregated hourly)

## Integration with Monitoring Services

### Datadog

```typescript
import { StatsD } from 'hot-shots';

const statsd = new StatsD({
  host: 'localhost',
  port: 8125,
  prefix: 'video-platform.',
});

// Track custom metrics
statsd.increment('api.requests');
statsd.timing('api.response_time', duration);
statsd.gauge('api.active_connections', activeConnections);
```

### Sentry

```bash
npm install @sentry/node
```

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Capture errors
try {
  await dangerousOperation();
} catch (error) {
  Sentry.captureException(error);
  logger.error('Operation failed', { error });
}
```

### New Relic

```bash
npm install newrelic
```

```typescript
// At the top of server.ts
require('newrelic');
```

## Debugging

### Enable Debug Logging

```bash
# Development
LOG_LEVEL=debug npm run dev

# Show all logs including HTTP requests
LOG_LEVEL=http npm run dev
```

### Request Tracing

Every request gets unique ID for tracing:

```typescript
// Automatically added to all logs:
{
  "requestId": "1698456789-abc123",
  "method": "POST",
  "url": "/api/videos",
  "userId": "user-123"
}

// Use x-request-id header for distributed tracing
curl -H "x-request-id: my-trace-id" http://localhost:4000/api/videos
```

### Performance Profiling

```bash
# Node.js built-in profiler
node --prof src/server.ts

# Generate report
node --prof-process isolate-*.log > processed.txt

# Flame graphs
npm install -g 0x
0x src/server.ts
```

## Monitoring Checklist

- [ ] Winston logger configured with file rotation
- [ ] Performance monitoring active on all routes
- [ ] Error handler registered globally
- [ ] Health check endpoint accessible
- [ ] Metrics endpoint available (internal only)
- [ ] Slow query threshold configured
- [ ] Memory monitoring enabled (production)
- [ ] Periodic performance reporting enabled (production)
- [ ] Uncaught exception handlers registered
- [ ] Log aggregation service connected (production)
- [ ] Alerting rules configured (production)
- [ ] Dashboards created (production)

## Troubleshooting

### High Memory Usage

1. Check `/metrics` for memory stats
2. Review slow queries and optimize
3. Check for memory leaks with heap snapshots
4. Increase Node.js memory if needed: `node --max-old-space-size=4096`

### High Error Rate

1. Check error logs: `tail -f logs/error-*.log`
2. Review `/metrics` for error-prone endpoints
3. Check external service status (DB, Redis, S3)
4. Review recent deployments

### Slow Response Times

1. Check `/metrics` for slow endpoints
2. Review slow query logs
3. Check database query performance
4. Verify cache hit rates
5. Check network latency to external services

## References

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Fastify Hooks](https://www.fastify.io/docs/latest/Reference/Hooks/)
- [Node.js Error Handling Best Practices](https://nodejs.org/en/docs/guides/error-handling/)
- [Monitoring Best Practices](https://docs.datadoghq.com/monitors/guide/best-practices/)
