/**
 * Performance Monitoring Middleware
 *
 * Tracks request performance metrics:
 * - Response time
 * - Request count by endpoint
 * - Error rate
 * - Slow query detection
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import logger from './logger';

/**
 * Performance metrics storage
 */
interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalResponseTime: number;
  slowQueries: number;
  endpointMetrics: Map<string, {
    count: number;
    totalTime: number;
    avgTime: number;
    maxTime: number;
    minTime: number;
    errors: number;
  }>;
}

const metrics: PerformanceMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalResponseTime: 0,
  slowQueries: 0,
  endpointMetrics: new Map(),
};

/**
 * Slow query threshold (in milliseconds)
 */
const SLOW_QUERY_THRESHOLD = parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000');

/**
 * Performance monitoring hook for Fastify
 */
export async function performanceMonitoringHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const startTime = Date.now();
  const endpoint = `${request.method} ${request.routerPath || request.url}`;

  // Track request start
  metrics.totalRequests++;

  // Initialize endpoint metrics if needed
  if (!metrics.endpointMetrics.has(endpoint)) {
    metrics.endpointMetrics.set(endpoint, {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      maxTime: 0,
      minTime: Infinity,
      errors: 0,
    });
  }

  const endpointMetric = metrics.endpointMetrics.get(endpoint)!;
  endpointMetric.count++;

  // Track response completion
  reply.raw.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = reply.statusCode;

    // Update metrics
    metrics.totalResponseTime += duration;
    endpointMetric.totalTime += duration;
    endpointMetric.avgTime = endpointMetric.totalTime / endpointMetric.count;
    endpointMetric.maxTime = Math.max(endpointMetric.maxTime, duration);
    endpointMetric.minTime = Math.min(endpointMetric.minTime, duration);

    // Track success/failure
    if (statusCode >= 200 && statusCode < 400) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
      endpointMetric.errors++;
    }

    // Log slow queries
    if (duration > SLOW_QUERY_THRESHOLD) {
      metrics.slowQueries++;
      logger.warn('Slow query detected', {
        endpoint,
        duration,
        method: request.method,
        url: request.url,
        statusCode,
        userId: (request as any).user?.id || 'anonymous',
      });
    }

    // Log request details
    logger.http('HTTP Request', {
      method: request.method,
      url: request.url,
      statusCode,
      duration,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: (request as any).user?.id || 'anonymous',
    });
  });
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): {
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    errorRate: string;
    avgResponseTime: number;
    slowQueries: number;
    uptime: number;
  };
  endpoints: Array<{
    endpoint: string;
    count: number;
    avgTime: number;
    maxTime: number;
    minTime: number;
    errors: number;
    errorRate: string;
  }>;
} {
  const avgResponseTime = metrics.totalRequests > 0
    ? metrics.totalResponseTime / metrics.totalRequests
    : 0;

  const errorRate = metrics.totalRequests > 0
    ? ((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(2)
    : '0.00';

  const endpoints = Array.from(metrics.endpointMetrics.entries())
    .map(([endpoint, data]) => ({
      endpoint,
      count: data.count,
      avgTime: Math.round(data.avgTime),
      maxTime: data.maxTime,
      minTime: data.minTime === Infinity ? 0 : data.minTime,
      errors: data.errors,
      errorRate: data.count > 0
        ? ((data.errors / data.count) * 100).toFixed(2)
        : '0.00',
    }))
    .sort((a, b) => b.count - a.count); // Sort by request count

  return {
    summary: {
      totalRequests: metrics.totalRequests,
      successfulRequests: metrics.successfulRequests,
      failedRequests: metrics.failedRequests,
      errorRate: `${errorRate}%`,
      avgResponseTime: Math.round(avgResponseTime),
      slowQueries: metrics.slowQueries,
      uptime: process.uptime(),
    },
    endpoints,
  };
}

/**
 * Reset performance metrics
 */
export function resetPerformanceMetrics(): void {
  metrics.totalRequests = 0;
  metrics.successfulRequests = 0;
  metrics.failedRequests = 0;
  metrics.totalResponseTime = 0;
  metrics.slowQueries = 0;
  metrics.endpointMetrics.clear();
  logger.info('Performance metrics reset');
}

/**
 * Log performance summary periodically
 */
export function startPerformanceReporting(intervalMinutes: number = 60): NodeJS.Timeout {
  const interval = intervalMinutes * 60 * 1000;

  return setInterval(() => {
    const metricsData = getPerformanceMetrics();

    logger.info('Performance Summary', {
      period: `${intervalMinutes} minutes`,
      ...metricsData.summary,
    });

    // Log top 10 most called endpoints
    const topEndpoints = metricsData.endpoints.slice(0, 10);
    if (topEndpoints.length > 0) {
      logger.info('Top 10 Endpoints', {
        endpoints: topEndpoints,
      });
    }

    // Log slow endpoints (avg > 500ms)
    const slowEndpoints = metricsData.endpoints.filter(e => e.avgTime > 500);
    if (slowEndpoints.length > 0) {
      logger.warn('Slow Endpoints Detected', {
        count: slowEndpoints.length,
        endpoints: slowEndpoints.slice(0, 5), // Top 5 slowest
      });
    }

    // Log high error rate endpoints (> 5%)
    const errorProneEndpoints = metricsData.endpoints.filter(
      e => parseFloat(e.errorRate) > 5
    );
    if (errorProneEndpoints.length > 0) {
      logger.warn('High Error Rate Endpoints', {
        count: errorProneEndpoints.length,
        endpoints: errorProneEndpoints.slice(0, 5),
      });
    }
  }, interval);
}

/**
 * Memory usage monitoring
 */
export function getMemoryUsage(): {
  heapUsed: string;
  heapTotal: string;
  external: string;
  rss: string;
} {
  const usage = process.memoryUsage();

  return {
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`,
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
  };
}

/**
 * Log memory usage periodically
 */
export function startMemoryMonitoring(intervalMinutes: number = 30): NodeJS.Timeout {
  const interval = intervalMinutes * 60 * 1000;

  return setInterval(() => {
    const memoryUsage = getMemoryUsage();

    logger.info('Memory Usage', memoryUsage);

    // Warn if heap usage is high (> 80% of total)
    const heapUsedMB = parseInt(memoryUsage.heapUsed);
    const heapTotalMB = parseInt(memoryUsage.heapTotal);

    if (heapUsedMB / heapTotalMB > 0.8) {
      logger.warn('High Memory Usage Detected', {
        heapUsedPercentage: `${((heapUsedMB / heapTotalMB) * 100).toFixed(2)}%`,
        ...memoryUsage,
      });
    }
  }, interval);
}
