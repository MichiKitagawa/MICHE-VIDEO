# Deployment Guide

Complete guide for deploying the Video Platform backend to production.

## 📋 Table of Contents

1. [Deployment Strategy](#deployment-strategy)
2. [Option 1: Render.com (Recommended for MVP)](#option-1-rendercom-recommended-for-mvp)
3. [Option 2: AWS Full Stack](#option-2-aws-full-stack)
4. [AWS S3 Setup (Required for Both Options)](#aws-s3-setup-required-for-both-options)
5. [Stripe Setup](#stripe-setup)
6. [Post-Deployment](#post-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Deployment Strategy

### Why Start with Render.com?

**Cost Comparison (Monthly):**

| Service | Render + S3 | AWS Full Stack |
|---------|------------|----------------|
| Backend Hosting | $7 (Starter) | $15 (EC2 t3.small) |
| Database | $7 (PostgreSQL) | $15 (RDS t3.micro) |
| Cache | $7 (Redis) | $15 (ElastiCache) |
| Storage | $2.30 (S3) | $2.30 (S3) |
| CDN | $8.50 (CloudFront) | $8.50 (CloudFront) |
| Load Balancer | Included | $16 (ALB) |
| **Total** | **$31.80/month** | **$71.80/month** |

**With Free Tiers:**
- Render Free Plan: $0 (with sleep)
- Redis Cloud Free: $0 (25MB)
- AWS Free Tier: $0-5
- **MVP Cost: $0-5/month for first 3 months**

### Recommended Scaling Path

```
Stage 1: MVP (0-1,000 users)
└─ Render.com + AWS S3
   Cost: $0-50/month

Stage 2: Growth (1,000-10,000 users)
└─ Render Professional + AWS S3
   Cost: $100-200/month

Stage 3: Scale (10,000+ users)
└─ AWS Full Stack or Kubernetes
   Cost: $500+/month
```

---

## Option 1: Render.com (Recommended for MVP)

### Prerequisites

- GitHub account
- Render.com account (free)
- AWS account (for S3 only)
- Stripe account
- Domain name (optional)

### Step 1: Create Render Account

1. Visit https://render.com/
2. Sign up with GitHub
3. Verify email

### Step 2: Create PostgreSQL Database

1. Dashboard → **New** → **PostgreSQL**
2. Settings:
   - **Name**: `video-platform-db`
   - **Database**: `video_platform`
   - **User**: auto-generated
   - **Region**: Oregon (US West) or nearest
   - **Plan**: Starter - $7/month
3. Click **Create Database**
4. Wait 2-3 minutes for provisioning
5. **Copy Internal Database URL** (starts with `postgresql://`)

### Step 3: Create Redis Instance

1. Dashboard → **New** → **Redis**
2. Settings:
   - **Name**: `video-platform-redis`
   - **Region**: Same as PostgreSQL
   - **Plan**: Starter - $7/month
3. Click **Create Redis**
4. **Copy Internal Redis URL**

### Step 4: Create Web Service

1. Dashboard → **New** → **Web Service**
2. **Connect GitHub Repository**:
   - Repository: `your-org/video-platform`
   - Branch: `main`
3. Settings:
   - **Name**: `video-platform-api`
   - **Region**: Same as database
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**:
     ```bash
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command**:
     ```bash
     npx prisma migrate deploy && npm start
     ```
   - **Plan**: Starter - $7/month

### Step 5: Configure Environment Variables

In Render Dashboard → Web Service → Environment:

```bash
# Server
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# Database (use Internal Database URL from Step 2)
DATABASE_URL=postgresql://user:pass@dpg-xxxxx.oregon-postgres.render.com/video_platform

# Redis (use Internal Redis URL from Step 3)
REDIS_HOST=red-xxxxx.oregon-redis.render.com
REDIS_PORT=6379
REDIS_PASSWORD=auto-generated-password

# JWT (generate with: openssl rand -base64 64)
JWT_SECRET=your-generated-secret-key-here
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=30d

# CORS (your frontend URL)
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://www.your-domain.com

# AWS (S3 only - setup in next section)
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET_NAME=video-platform-uploads
CLOUDFRONT_DOMAIN=d123456.cloudfront.net
MEDIACONVERT_ENDPOINT=https://xxx.mediaconvert.ap-northeast-1.amazonaws.com

# Stripe (setup later)
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Logging
LOG_LEVEL=info
LOG_DIR=/var/log

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
SLOW_QUERY_THRESHOLD=1000

# Feature Flags
ENABLE_VIDEO_UPLOAD=true
ENABLE_LIVE_STREAMING=false
ENABLE_SHORTS=true
ENABLE_SUBSCRIPTIONS=true
ENABLE_TIPS=true
```

### Step 6: Deploy

1. Click **Save** → Render automatically builds and deploys
2. Monitor logs in Dashboard
3. Wait 5-10 minutes for first deployment
4. Your API will be live at: `https://video-platform-api.onrender.com`

### Step 7: Verify Deployment

```bash
# Health check
curl https://video-platform-api.onrender.com/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 100,
  "memory": { ... }
}
```

### Step 8: Custom Domain (Optional)

1. Render Dashboard → Web Service → Settings
2. Scroll to **Custom Domains**
3. Add domain: `api.your-domain.com`
4. Add DNS records (Render provides instructions):
   ```
   Type: CNAME
   Name: api
   Value: video-platform-api.onrender.com
   ```
5. SSL certificate auto-provisioned (free)

---

## Option 2: AWS Full Stack

### When to Use AWS Full Stack

- You need more control over infrastructure
- You require multi-region deployment
- You have 10,000+ concurrent users
- You need custom network configuration
- You have DevOps expertise

### Prerequisites

- **Node.js**: 18.x or higher
- **PostgreSQL**: 15.x or higher
- **Redis**: 7.x or higher
- **AWS Account**: With full access
- **Stripe Account**
- **Domain**: SSL certificate

### AWS Services Setup

#### 1. EC2 Instance

```bash
# Launch t3.small instance
Instance Type: t3.small (2 vCPU, 2GB RAM)
AMI: Ubuntu 22.04 LTS
Storage: 30GB gp3
Security Group: Allow 22 (SSH), 4000 (API), 443 (HTTPS)

# Connect via SSH
ssh -i your-key.pem ubuntu@your-ec2-ip
```

#### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Prisma CLI
sudo npm install -g prisma
```

#### 3. RDS PostgreSQL

```bash
# Create RDS instance
Engine: PostgreSQL 15
Instance Class: db.t3.micro
Storage: 20GB gp3
Multi-AZ: No (for MVP)
Public Access: No
VPC Security Group: Allow 5432 from EC2

# Connection string
postgresql://username:password@your-rds-endpoint.rds.amazonaws.com:5432/video_platform
```

#### 4. ElastiCache Redis

```bash
# Create Redis cluster
Engine: Redis 7.x
Node Type: cache.t3.micro
Replicas: 0 (for MVP)
VPC Security Group: Allow 6379 from EC2

# Connection info
Host: your-redis.cache.amazonaws.com
Port: 6379
```

#### 5. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-org/video-platform.git
cd video-platform/backend

# Install dependencies
npm install --production

# Create .env file
cp .env.example .env
nano .env  # Configure all environment variables

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build TypeScript
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
```

#### 6. Load Balancer (ALB)

```bash
# Create Application Load Balancer
Type: Application Load Balancer
Scheme: Internet-facing
Listeners: 443 (HTTPS), 80 (HTTP → redirect to 443)
Target Group: EC2 instance on port 4000
Health Check: /health

# Configure SSL certificate (ACM)
```

---

## AWS S3 Setup (Required for Both Options)

### Step 1: Create S3 Bucket

```bash
# Using AWS CLI
aws s3 mb s3://video-platform-uploads --region ap-northeast-1

# Or via AWS Console:
# S3 → Create Bucket
# Name: video-platform-uploads
# Region: ap-northeast-1 (Tokyo) or nearest
# Block Public Access: ON (we'll use signed URLs)
```

### Step 2: Enable Versioning

```bash
aws s3api put-bucket-versioning \
  --bucket video-platform-uploads \
  --versioning-configuration Status=Enabled
```

### Step 3: Configure CORS

Create `s3-cors.json`:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://your-frontend.vercel.app"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

Apply CORS:

```bash
aws s3api put-bucket-cors \
  --bucket video-platform-uploads \
  --cors-configuration file://s3-cors.json
```

### Step 4: Create IAM User for Backend

Create policy `s3-video-platform-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::video-platform-uploads",
        "arn:aws:s3:::video-platform-uploads/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "mediaconvert:*"
      ],
      "Resource": "*"
    }
  ]
}
```

Create IAM user:

```bash
# Create user
aws iam create-user --user-name video-platform-backend

# Attach policy
aws iam put-user-policy \
  --user-name video-platform-backend \
  --policy-name S3MediaConvertAccess \
  --policy-document file://s3-video-platform-policy.json

# Create access keys
aws iam create-access-key --user-name video-platform-backend

# Save the Access Key ID and Secret Access Key
```

### Step 5: CloudFront Distribution

```bash
# Create distribution via AWS Console
Origin Domain: video-platform-uploads.s3.ap-northeast-1.amazonaws.com
Origin Path: empty
Viewer Protocol Policy: Redirect HTTP to HTTPS
Allowed HTTP Methods: GET, HEAD, OPTIONS
Cache Policy: CachingOptimized
Price Class: Use Only US, Canada, Europe (or adjust)

# Note the CloudFront Domain Name (e.g., d123456.cloudfront.net)
```

### Step 6: MediaConvert Setup

```bash
# Get MediaConvert endpoint
aws mediaconvert describe-endpoints --region ap-northeast-1

# Output example:
# https://abc123def.mediaconvert.ap-northeast-1.amazonaws.com

# Create IAM Role for MediaConvert
Role Name: MediaConvertRole
Trust Policy: MediaConvert service
Permissions: S3 read/write access to video-platform-uploads
```

Create MediaConvert job template via console:
- Input: S3 bucket
- Outputs: HLS adaptive bitrate (360p, 480p, 720p, 1080p)
- Thumbnails: Every 5 seconds
- Destination: S3 bucket

---

## Stripe Setup

### Step 1: Create Stripe Account

1. Visit https://stripe.com/
2. Create account (use test mode for development)

### Step 2: Create Products and Prices

```bash
# Premium Plan
Product: Premium Membership
Price: $9.99/month (recurring)
Price ID: price_premium_xxxxx

# Premium Plus Plan
Product: Premium Plus Membership
Price: $19.99/month (recurring)
Price ID: price_premium_plus_xxxxx
```

### Step 3: Get API Keys

Dashboard → Developers → API Keys:
- **Publishable Key**: `pk_test_...` (for frontend)
- **Secret Key**: `sk_test_...` (for backend)

Add to environment variables:
```bash
STRIPE_SECRET_KEY=sk_test_your_key_here
```

### Step 4: Configure Webhooks

1. Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-api-domain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy **Signing Secret**: `whsec_...`
5. Add to environment:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

### Step 5: Test Webhook Locally (Development)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:4000/api/webhooks/stripe

# Test webhook
stripe trigger checkout.session.completed
```

---

## Post-Deployment

### 1. Database Migration

```bash
# For Render (automatic via Start Command)
# Already configured in Step 4

# For AWS EC2
ssh into-your-server
cd /path/to/backend
npx prisma migrate deploy
```

### 2. Verify API Endpoints

```bash
# Health check
curl https://your-api-domain.com/health

# Register test user
curl -X POST https://your-api-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User"
  }'

# Login
curl -X POST https://your-api-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

### 3. Test Video Upload Flow

```bash
# 1. Get presigned URL
curl -X POST https://your-api-domain.com/api/videos/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Video",
    "fileName": "test.mp4",
    "fileSize": 10485760,
    "mimeType": "video/mp4"
  }'

# 2. Upload to S3 (use returned uploadUrl)
curl -X PUT "PRESIGNED_URL" \
  --upload-file test.mp4

# 3. Complete upload and start transcoding
curl -X POST https://your-api-domain.com/api/videos/VIDEO_ID/complete \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Test Stripe Payment

```bash
# Use Stripe test card: 4242 4242 4242 4242
# Expiry: any future date
# CVC: any 3 digits

# Create checkout session
curl -X POST https://your-api-domain.com/api/subscriptions/create-checkout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "PLAN_UUID",
    "successUrl": "https://your-frontend.com/success",
    "cancelUrl": "https://your-frontend.com/cancel"
  }'
```

---

## Monitoring & Maintenance

### Daily Checks

```bash
# Render: Check Dashboard
- Service status
- Error logs
- Database connections
- Redis memory

# AWS: SSH into EC2
pm2 status
pm2 logs video-platform-api --lines 100
df -h  # Disk space
free -m  # Memory
```

### Weekly Tasks

- Review error logs
- Check slow query logs
- Verify backup integrity
- Review performance metrics
- Update dependencies (security patches)

### Monthly Tasks

- Database vacuum and analyze (PostgreSQL)
- Review and optimize slow queries
- Rotate logs
- Review costs
- Update SSL certificates (if manual)

---

## Backup Strategy

### Render Backup

Render automatically backs up PostgreSQL databases:
- Continuous backups (point-in-time recovery)
- 7-day retention (Starter plan)
- Manual snapshots available

### AWS RDS Backup

```bash
# Automated backups
Retention: 7 days
Backup window: 03:00-04:00 UTC

# Manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier video-platform-db \
  --db-snapshot-identifier manual-backup-2025-01-01
```

### S3 Backup

```bash
# Enable versioning (already done)
# Enable cross-region replication (optional)

aws s3api put-bucket-replication \
  --bucket video-platform-uploads \
  --replication-configuration file://replication.json
```

---

## Troubleshooting

### Render Issues

#### Service Won't Start

1. Check logs in Render Dashboard
2. Verify all environment variables are set
3. Check database connection:
   ```bash
   # Use Render Shell
   psql $DATABASE_URL -c "SELECT 1;"
   ```

#### Out of Memory

- Upgrade to Standard plan ($25/month, 2GB RAM)
- Or optimize code (reduce memory usage)

#### Slow Response Times

- Enable Redis caching
- Add database indexes
- Check slow query logs
- Consider upgrading plan

### AWS Issues

#### EC2 High CPU

```bash
# Check processes
top
pm2 monit

# Restart if needed
pm2 restart video-platform-api
```

#### RDS Connection Limit

```bash
# Check connections
SELECT count(*) FROM pg_stat_activity;

# Increase max_connections in RDS parameter group
# Or use PgBouncer for connection pooling
```

### Common Issues

#### CORS Errors

- Verify `CORS_ALLOWED_ORIGINS` includes your frontend URL
- Check for trailing slashes
- Ensure protocol matches (http vs https)

#### Stripe Webhook Fails

- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check webhook endpoint is accessible
- Review Stripe Dashboard → Webhooks for errors

#### Video Upload Fails

- Check S3 credentials
- Verify CORS configuration on S3
- Check file size limits
- Review CloudWatch logs (AWS) or Render logs

#### MediaConvert Job Fails

- Verify IAM role has S3 access
- Check input file format
- Review MediaConvert job errors in AWS Console

---

## Rollback Procedure

### Render Rollback

1. Dashboard → Web Service → Settings
2. Scroll to **Deploy Hooks**
3. Click on previous successful deployment
4. Click **Redeploy**

### AWS Rollback

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
- [ ] Database uses SSL connections (Render: auto, AWS: configure)
- [ ] Firewall configured (Render: auto, AWS: Security Groups)
- [ ] Rate limiting enabled ✅
- [ ] CORS properly configured ✅
- [ ] Helmet security headers active ✅
- [ ] Regular security updates applied
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] DDoS protection (CloudFlare optional)
- [ ] Access logs reviewed regularly

---

## Cost Optimization

### Render

- Start with Free plan (sleep after inactivity)
- Upgrade to Starter only when needed
- Use Redis Cloud free tier (25MB)

### AWS

- Use S3 Intelligent-Tiering for old videos
- Enable CloudFront compression
- Set S3 lifecycle policies (delete after X days)
- Use MediaConvert only when needed
- Monitor costs with AWS Budgets

### Scaling Recommendations

| Users | Render Plan | Database | Redis | Monthly Cost |
|-------|------------|----------|-------|--------------|
| 0-100 | Free | Free (256MB) | Free | $0 |
| 100-1K | Starter | Starter | Starter | $21 |
| 1K-10K | Standard | Standard | Standard | $100 |
| 10K+ | Pro | Pro | Pro or AWS | $200+ |

---

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Fastify Production Best Practices](https://www.fastify.io/docs/latest/Guides/Recommendations/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Stripe Webhook Guide](https://stripe.com/docs/webhooks)
