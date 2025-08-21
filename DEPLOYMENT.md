# 🚀 Heat Pumps Now - Internal Portal Deployment Guide

## Coolify Deployment Instructions

### Prerequisites

- ✅ Coolify instance running and accessible
- ✅ Git repository with the Heat Pumps Now Internal Portal code
- ✅ Supabase project with authentication configured
- ✅ Domain name for the application

### Step 1: Environment Variables

Configure these environment variables in Coolify:

#### Required Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://busnutzyiygwpjmygnxs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Database Configuration (Supabase)
DATABASE_HOST=db.busnutzyiygwpjmygnxs.supabase.co
DATABASE_PORT=5432
DATABASE_NAME=postgres
DATABASE_USER=postgres
DATABASE_PASSWORD=your_db_password_here
DATABASE_SSL=true

# Application Configuration
JWT_SECRET=your-super-secret-jwt-key-for-production
NEXTAUTH_SECRET=your-nextauth-secret-for-production
NEXTAUTH_URL=https://your-production-domain.com
NODE_ENV=production
LOG_LEVEL=INFO
```

#### Optional Variables
```env
# Redis Configuration (if using Redis)
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Monitoring (Optional)
SENTRY_DSN=your_sentry_dsn_here
```

### Step 2: Create New Application in Coolify

1. **Navigate to Coolify Dashboard**
2. **Click "New Resource" → "Application"**
3. **Configure Application:**
   - **Name**: `heatpumps-internal`
   - **Source**: Git Repository
   - **Repository URL**: Your Git repository URL
   - **Branch**: `main` (or your production branch)
   - **Build Pack**: Dockerfile

### Step 3: Configure Build Settings

1. **Dockerfile Path**: `./Dockerfile`
2. **Build Context**: `.` (root directory)
3. **Port**: `3000`

### Step 4: Environment Configuration

1. **Go to Environment tab**
2. **Add all the required environment variables listed above**
3. **Ensure sensitive variables are marked as "Secret"**

### Step 5: Domain Configuration

1. **Go to Domains tab**
2. **Add your domain**: `your-domain.com`
3. **Enable HTTPS/SSL**
4. **Configure automatic certificate renewal**

### Step 6: Health Checks

Configure health checks in Coolify:

- **Health Check Path**: `/api/health`
- **Ready Check Path**: `/api/ready`
- **Port**: `3000`
- **Interval**: `30s`
- **Timeout**: `10s`
- **Retries**: `3`

### Step 7: Deploy

1. **Click "Deploy"**
2. **Monitor the build logs**
3. **Verify deployment success**

## Post-Deployment Verification

### 1. Health Checks
```bash
# Check application health
curl https://your-domain.com/api/health

# Check readiness
curl https://your-domain.com/api/ready
```

### 2. Portal Access
- **Employee Portal**: `https://your-domain.com/employee`
- **Owner Portal**: `https://your-domain.com/owner`
- **Sales Portal**: `https://your-domain.com/sales`
- **Project Portal**: `https://your-domain.com/project`

### 3. Authentication Test
1. Navigate to any portal
2. Should redirect to login if not authenticated
3. Test with existing Supabase user credentials

## Monitoring & Maintenance

### Log Access
- View application logs in Coolify dashboard
- Monitor for authentication errors
- Check Supabase connection issues

### Performance Monitoring
- Monitor response times via health endpoints
- Check Supabase dashboard for database performance
- Monitor portal usage and user authentication patterns

### Scaling (if needed)
- Coolify supports horizontal scaling
- Monitor resource usage in Coolify dashboard
- Scale based on portal usage patterns

## Troubleshooting

### Common Issues

1. **Environment Variables Missing**
   - Check `/api/ready` endpoint for missing variables
   - Verify all required variables are set in Coolify

2. **Supabase Connection Issues**
   - Verify Supabase credentials
   - Check network connectivity
   - Review Supabase dashboard for connection limits

3. **Authentication Problems**
   - Verify Supabase Auth configuration
   - Check user roles in Supabase Auth metadata
   - Review CORS settings in Supabase

4. **Build Failures**
   - Check build logs in Coolify
   - Verify Dockerfile configuration
   - Ensure all dependencies are available

### Support Contacts
- **Application Issues**: Check application logs
- **Supabase Issues**: Check Supabase dashboard
- **Coolify Issues**: Check Coolify documentation

## Security Considerations

- ✅ All sensitive environment variables are marked as secrets
- ✅ HTTPS/SSL enabled for all traffic
- ✅ Security headers configured in Next.js
- ✅ Supabase RLS policies active
- ✅ JWT secrets properly configured

## Backup & Recovery

- **Database**: Handled by Supabase (automatic backups)
- **Application Code**: Stored in Git repository
- **Environment Variables**: Document separately (securely)

---

**🎉 Deployment Complete!**

Your Heat Pumps Now Internal Portal is now live and ready for your team to use across all portals with unified authentication and role-based access control.