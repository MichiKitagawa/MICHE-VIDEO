# Deployment Guide

Complete guide for deploying the Video Platform backend to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Migration](#database-migration)
4. [AWS Services Setup](#aws-services-setup)
5. [Deployment Process](#deployment-process)
6. [Post-Deployment](#post-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

- **Node.js**: 18.x or higher
- **PostgreSQL**: 15.x or higher
- **Redis**: 7.x or higher
- **AWS Account**: With S3, CloudFront, MediaConvert access
- **Stripe Account**: For payment processing
- **Domain**: SSL certificate (via AWS Certificate Manager or Let's Encrypt)

### Development Tools

```bash
npm install -g pm2  # Process manager
npm install -g prisma  # Database migrations
```

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/video-platform.git
cd video-platform/backend
```

### 2. Install Dependencies

```bash
npm install --production
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
nano .env
```

**Critical variables to set**:

```bash
# Production mode
NODE_ENV=production

# Server
PORT=4000
HOST=0.0.0.0

# Database (use connection pooling)
DATABASE_URL=postgresql://user:pass@db-host:5432/video_platform?sslmode=require&pgbouncer=true

# Redis (use AWS ElastiCache)
REDIS_HOST=your-redis.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password

# JWT (generate secure secrets)
JWT_SECRET=$(openssl rand -base64 64)
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=30d

# CORS (your production domains)
CORS_ALLOWED_ORIGINS=https://app.example.com,https://www.example.com

# AWS
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=video-platform-production
CLOUDFRONT_DOMAIN=d123456.cloudfront.net
MEDIACONVERT_ENDPOINT=https://xxx.mediaconvert.ap-northeast-1.amazonaws.com

# Stripe
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Logging
LOG_LEVEL=info
LOG_DIR=/var/log/video-platform

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
SLOW_QUERY_THRESHOLD=1000
```

---

## Database Migration

### 1. Create Production Database

```bash
# On PostgreSQL server
createdb video_platform

# Or via SQL
psql -U postgres
CREATE DATABASE video_platform;
```

### 2. Run Prisma Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Verify schema
npx prisma db pull
```

### 3. Seed Initial Data (Optional)

```bash
npm run seed:production
```

This creates:
- Default subscription plans
- Video categories
- System settings

---

## AWS Services Setup

### 1. S3 Bucket Configuration

```bash
# Create bucket
aws s3 mb s3://video-platform-production --region ap-northeast-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket video-platform-production \
  --versioning-configuration Status=Enabled

# Set CORS policy
aws s3api put-bucket-cors \
  --bucket video-platform-production \
  --cors-configuration file://s3-cors.json
```

**s3-cors.json**:
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://app.example.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

### 2. CloudFront Distribution

```bash
# Create distribution
aws cloudfront create-distribution \
  --origin-domain-name video-platform-production.s3.ap-northeast-1.amazonaws.com \
  --default-root-object index.html
```

Configure:
- **Price Class**: Use Only US, Canada, Europe (or All based on audience)
- **SSL Certificate**: Use ACM certificate
- **Caching**: Cache based on headers (Authorization)
- **TTL**: Default 86400 (1 day), max 31536000 (1 year)

### 3. MediaConvert Job Template

Create job template via AWS Console or CLI with:
- **Input**: S3 bucket source
- **Outputs**:
  - HLS adaptive bitrate (360p, 480p, 720p, 1080p)
  - Thumbnails every 5 seconds
- **Destination**: S3 bucket

### 4. IAM Role for MediaConvert

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::video-platform-production/*"
      ]
    }
  ]
}
```

---

## Deployment Process

### Option 1: PM2 Process Manager (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup systemd
```

**ecosystem.config.js**:
```javascript
module.exports = {
  apps: [{
    name: 'video-platform-api',
    script: './dist/server.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    max_memory_restart: '1G',
    error_file: '/var/log/video-platform/pm2-error.log',
    out_file: '/var/log/video-platform/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
  }]
};
```

**PM2 Commands**:
```bash
# Check status
pm2 status

# View logs
pm2 logs video-platform-api

# Monitor
pm2 monit

# Restart
pm2 restart video-platform-api

# Reload (zero-downtime)
pm2 reload video-platform-api

# Stop
pm2 stop video-platform-api
```

### Option 2: Docker Container

```bash
# Build image
docker build -t video-platform-api:latest .

# Run container
docker run -d \
  --name video-platform-api \
  --env-file .env \
  -p 4000:4000 \
  --restart unless-stopped \
  video-platform-api:latest

# View logs
docker logs -f video-platform-api
```

**Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1

# Start application
CMD ["node", "dist/server.js"]
```

### Option 3: AWS ECS/Fargate

1. Push Docker image to ECR
2. Create ECS task definition
3. Create ECS service with load balancer
4. Configure auto-scaling

---

## Post-Deployment

### 1. Verify Health

```bash
curl https://api.example.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 100,
  "memory": { ... }
}
```

### 2. Test API Endpoints

```bash
# Register user
curl -X POST https://api.example.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123","name":"Test User"}'

# Login
curl -X POST https://api.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123"}'
```

### 3. Setup Stripe Webhook

```bash
# Configure webhook endpoint
https://api.example.com/api/webhooks/stripe

# Select events:
- checkout.session.completed
- payment_intent.succeeded
- payment_intent.payment_failed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
```

### 4. Configure Monitoring

**Datadog Agent**:
```bash
DD_API_KEY=your-key DD_SITE="datadoghq.com" \
  bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"
```

**Sentry**:
```bash
# Add to .env
SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

**CloudWatch Logs**:
```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

---

## Monitoring & Maintenance

### Daily Checks

```bash
# Check application status
pm2 status

# Check logs for errors
pm2 logs video-platform-api --lines 100 | grep ERROR

# Check disk space
df -h

# Check memory usage
free -m

# Check database connections
psql -U user -d video_platform -c "SELECT count(*) FROM pg_stat_activity;"
```

### Weekly Tasks

- Review error logs
- Check slow query logs
- Verify backup integrity
- Review performance metrics
- Update dependencies (security patches)

### Monthly Tasks

- Database vacuum and analyze
- Review and optimize slow queries
- Check and rotate logs
- Review AWS costs
- Update SSL certificates (if needed)

---

## Backup Strategy

### Database Backup

```bash
# Automated daily backup script
#!/bin/bash
BACKUP_DIR="/var/backups/video-platform"
DATE=$(date +%Y%m%d_%H%M%S)

pg_dump -U user video_platform | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
```

### S3 Backup

Enable versioning and cross-region replication:

```bash
aws s3api put-bucket-replication \
  --bucket video-platform-production \
  --replication-configuration file://replication.json
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs video-platform-api --err

# Common issues:
# 1. Port already in use
sudo lsof -i :4000

# 2. Database connection failed
psql -U user -h db-host -d video_platform

# 3. Redis connection failed
redis-cli -h redis-host -p 6379 ping

# 4. Environment variables missing
pm2 env 0
```

### High Memory Usage

```bash
# Check memory
pm2 monit

# Restart application
pm2 restart video-platform-api

# If persistent, check for memory leaks
node --inspect dist/server.js
```

### Slow Performance

```bash
# Check database slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

# Check Redis hit rate
redis-cli INFO stats | grep keyspace

# Review /metrics endpoint
curl https://api.example.com/metrics
```

### Database Connection Pool Exhausted

```bash
# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Increase max connections in postgresql.conf
max_connections = 200

# Use PgBouncer for connection pooling
```

---

## Rollback Procedure

```bash
# 1. Stop current version
pm2 stop video-platform-api

# 2. Checkout previous version
git checkout <previous-tag>

# 3. Install dependencies
npm ci --only=production

# 4. Build
npm run build

# 5. Rollback database (if needed)
npx prisma migrate resolve --rolled-back <migration-name>

# 6. Start application
pm2 start ecosystem.config.js
```

---

## Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Environment variables secured (not in code)
- [ ] Database uses SSL connections
- [ ] Firewall configured (only 80/443 open)
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Helmet security headers active
- [ ] Regular security updates applied
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] DDoS protection (CloudFlare/AWS Shield)
- [ ] Access logs reviewed regularly

---

## Additional Resources

- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [PM2 Production Guide](https://pm2.keymetrics.io/docs/usage/deployment/)
- [AWS Best Practices](https://aws.amazon.com/architecture/well-architected/)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
