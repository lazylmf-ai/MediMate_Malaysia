# MediMate Malaysia Docker Infrastructure

🏥 Healthcare platform Docker configuration with Malaysian cultural intelligence and PDPA compliance.

## 🚀 Quick Start

### 1. Initial Setup
```bash
# Copy environment configuration
cp .env.example .env

# Setup development environment (one-time)
./scripts/medimate-docker setup
```

### 2. Daily Development
```bash
# Start services
./scripts/medimate-docker start

# Check health
./scripts/medimate-docker health

# View logs
./scripts/medimate-docker logs

# Stop services
./scripts/medimate-docker stop
```

## 🏗️ Architecture

### Services
- **PostgreSQL 15**: Healthcare database with Malaysian schema
- **Redis 7**: Cultural data caching and sessions
- **MinIO**: S3-compatible healthcare file storage
- **pgAdmin**: Database management (dev only)
- **Prometheus**: Metrics collection
- **Grafana**: Healthcare dashboards

### Networks
- `medimate-network`: Isolated service communication
- `medimate-test-network`: Testing isolation
- `medimate-backend`: Production backend network

### Volumes
- `medimate_postgres_data`: Healthcare database storage
- `medimate_redis_data`: Cache and session data
- `medimate_minio_data`: File and document storage

## 🇲🇾 Malaysian Healthcare Features

### Cultural Intelligence
- **Prayer Times**: Automated medication scheduling adjustments
- **Malaysian Holidays**: Cultural event impact on healthcare
- **Multi-language**: Malay, English, Chinese, Tamil support
- **IC Validation**: Malaysian Identity Card processing

### Healthcare Compliance
- **PDPA Ready**: Personal Data Protection Act compliance
- **Audit Logging**: Complete healthcare data audit trail
- **Data Retention**: 7-year medical record retention
- **Healthcare Providers**: MOH and private integration ready

## 📊 Service Endpoints

### Development Environment
```
PostgreSQL:     localhost:5432
  Database:     medimate_dev
  Username:     postgres
  Password:     postgres123

Redis:          localhost:6379
  Password:     redis123

MinIO API:      http://localhost:9000
MinIO Console:  http://localhost:9001
  Username:     minioadmin
  Password:     minioadmin123

pgAdmin:        http://localhost:5050
  Email:        admin@medimate.local
  Password:     admin123

Grafana:        http://localhost:3001
  Username:     admin
  Password:     admin123
```

## 🛠️ Advanced Usage

### Environment-Specific Deployment
```bash
# Development (full stack with tools)
./scripts/docker-services.sh up -e dev

# Testing (optimized for CI/CD)
./scripts/docker-services.sh up -e test

# Production (security hardened)
./scripts/docker-services.sh up -e prod
```

### Service Management
```bash
# Start specific services
./scripts/docker-services.sh up -s postgres,redis

# View service logs
./scripts/docker-services.sh logs -s postgres -v

# Run health checks
./scripts/docker-services.sh health

# Backup data
./scripts/docker-services.sh backup

# Clean up (removes all data!)
./scripts/docker-services.sh clean -f
```

## 🏥 Healthcare Database Schema

### Core Tables
- `users`: Patient and caregiver profiles with cultural data
- `families`: Family circle management
- `medications`: Malaysian medication database
- `adherence_logs`: Medication tracking with cultural adjustments
- `healthcare_providers`: MOH and private provider integration
- `cultural_events`: Malaysian holidays and prayer times
- `consent_records`: PDPA compliance tracking

### Malaysian Functions
- `validate_malaysian_ic()`: IC number format validation
- `extract_birth_date_from_ic()`: Birth date from IC
- `extract_gender_from_ic()`: Gender determination
- `calculate_prayer_adjustment()`: Prayer time scheduling

## 💾 Storage Configuration

### MinIO Buckets
- `medimate-uploads`: General file uploads
- `medimate-avatars`: User profile pictures
- `medimate-documents`: Prescription documents (7-year retention)
- `medimate-backups`: System backups (90-day retention)
- `medimate-reports`: Healthcare reports (7-year retention)

### Data Compliance
- **Encryption**: AES-256 encryption at rest
- **Versioning**: Enabled for audit trails
- **Lifecycle**: Automated archival and deletion
- **CORS**: Web application integration

## 📈 Monitoring

### Prometheus Metrics
- Service health and performance
- Malaysian cultural event tracking
- Healthcare API response times
- Database connection monitoring

### Grafana Dashboards
- Healthcare overview with Malaysian context
- Service infrastructure monitoring
- Cultural event impact analysis
- PDPA compliance tracking

## 🔐 Security

### Healthcare Grade Security
- **Network Isolation**: Services in private networks
- **Secrets Management**: Docker secrets for production
- **SSL/TLS**: Production encryption ready
- **Access Control**: Role-based permissions
- **Audit Trail**: Complete PDPA compliance

### Malaysian Compliance
- **Data Residency**: Asia/Kuala_Lumpur timezone
- **PDPA Ready**: Personal data protection
- **Healthcare Regulations**: MOH integration standards
- **Cultural Sensitivity**: Respectful religious data handling

## 🧪 Testing

### Test Environment
```bash
# Start test environment
./scripts/docker-services.sh up -e test

# Run health validation
./scripts/docker-services.sh health

# Check test data
docker exec medimate_postgres_test psql -U test_user -d medimate_test -c "SELECT COUNT(*) FROM users;"
```

### Data Validation
```bash
# Validate Malaysian cultural data
docker exec medimate_postgres ./docker/postgres/health-check.sh

# Check prayer times data
docker exec medimate_postgres psql -U postgres -d medimate_dev -c "SELECT * FROM prayer_times LIMIT 5;"

# Verify IC validation functions
docker exec medimate_postgres psql -U postgres -d medimate_dev -c "SELECT validate_malaysian_ic('850215-14-1234');"
```

## 📚 File Structure

```
docker/
├── postgres/                   # PostgreSQL configuration
│   ├── init.sql               # Database initialization
│   ├── schema.sql             # Malaysian healthcare schema
│   ├── seed-data.sql          # Cultural and test data
│   └── health-check.sh        # Comprehensive health validation
├── redis/                      # Redis configuration
│   └── redis.conf             # Optimized for healthcare caching
├── minio/                      # MinIO configuration
│   └── init-buckets.sh        # Healthcare bucket setup
├── monitoring/                 # Prometheus + Grafana
│   ├── prometheus.yml         # Healthcare metrics collection
│   └── grafana/               # Malaysian healthcare dashboards
└── README.md                   # This file

compose files:
├── docker-compose.yml          # Base configuration
├── docker-compose.dev.yml     # Development overrides
├── docker-compose.test.yml    # Testing optimizations
└── docker-compose.prod.yml    # Production hardening
```

## 🔧 Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check Docker daemon
docker info

# Check port conflicts
netstat -tulpn | grep :5432
netstat -tulpn | grep :6379
netstat -tulpn | grep :9000
```

**Database connection issues:**
```bash
# Check PostgreSQL logs
./scripts/medimate-docker logs postgres

# Validate database health
docker exec medimate_postgres pg_isready -U postgres
```

**MinIO bucket issues:**
```bash
# Reinitialize buckets
docker exec medimate_minio_init /usr/bin/init-buckets.sh

# Check MinIO logs
./scripts/medimate-docker logs minio
```

**Malaysian cultural data missing:**
```bash
# Reload cultural data
docker exec medimate_postgres psql -U postgres -d medimate_dev -f /docker-entrypoint-initdb.d/03-seed-data.sql
```

### Health Check Commands
```bash
# Full system health check
./scripts/docker-services.sh health

# Individual service health
docker exec medimate_postgres ./docker/postgres/health-check.sh
docker exec medimate_redis redis-cli ping
docker exec medimate_minio curl -f http://localhost:9000/minio/health/live
```

## 📞 Support

For issues related to:
- **Docker Infrastructure**: Check service logs and health status
- **Malaysian Cultural Data**: Verify prayer times and cultural events
- **Healthcare Compliance**: Review PDPA and audit configurations
- **Database Schema**: Validate Malaysian healthcare functions

## 🎯 Next Steps

1. **API Integration**: Connect MediMate API to these services
2. **Mobile Development**: Use for React Native development
3. **Production Deployment**: Deploy with managed cloud services
4. **Monitoring Setup**: Configure alerting and notifications

---

🏥🇲🇾 **MediMate Malaysia - Healthcare Technology with Cultural Intelligence**