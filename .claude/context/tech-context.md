---
created: 2025-09-07T02:03:54Z
last_updated: 2025-09-07T02:03:54Z
version: 1.0
author: Claude Code PM System
---

# Technology Context

## Technology Stack Overview

### Core Architecture Decision
**Approach:** Start monolithic, migrate to microservices  
**Rationale:** MVP speed with planned scalability for healthcare-grade performance

### Backend Technology Stack

#### Runtime & Framework
- **Runtime:** Node.js 18+ 
- **Framework:** Express.js with TypeScript
- **Language:** TypeScript (strict mode for healthcare data safety)
- **API Style:** RESTful with GraphQL consideration for v2.0

#### Database & Storage
- **Primary Database:** PostgreSQL 14+ with healthcare-specific partitioning
- **Caching Layer:** Redis for session management and Malaysian cultural data
- **File Storage:** AWS S3 with CloudFront CDN for global Malaysian access
- **Search Engine:** Elasticsearch (future) for medication search optimization

#### Authentication & Security
- **Authentication:** JWT with refresh tokens + healthcare-grade security
- **Authorization:** Role-based access control (patient, caregiver, provider)
- **Encryption:** AES-256-GCM for healthcare data at rest
- **Compliance:** PDPA 2010 (Malaysian Personal Data Protection Act) compliant
- **API Security:** Rate limiting, CORS, helmet middleware

### Mobile Application Stack

#### Cross-Platform Framework
- **Framework:** React Native 0.72+
- **Language:** TypeScript for type safety
- **Build System:** React Native CLI with Flipper debugging

#### State Management & Data Flow
- **State Management:** Redux Toolkit with RTK Query
- **API Integration:** RTK Query for efficient data fetching and caching
- **Persistence:** Redux Persist + AsyncStorage for offline-first approach
- **Local Database:** SQLite for offline medication tracking

#### UI & User Experience
- **UI Framework:** Native Base + custom Malaysian cultural components
- **Navigation:** React Navigation 6 with deep linking
- **Internationalization:** react-i18next (Bahasa Malaysia, English, Mandarin, Tamil)
- **Accessibility:** Full React Native Accessibility API support

#### Mobile Services Integration
- **Push Notifications:** React Native Firebase (FCM)
- **Analytics:** Firebase Analytics + Crashlytics
- **Offline Sync:** Custom sync manager with conflict resolution
- **Background Tasks:** React Native Background Job for reminder processing

### Cloud Infrastructure (AWS Asia Pacific - Singapore)

#### Compute & Containers
- **Container Orchestration:** AWS ECS Fargate for auto-scaling
- **Load Balancing:** Application Load Balancer with health checks
- **Auto Scaling:** Target CPU 70%, min 2 replicas, max 20 replicas
- **Container Registry:** AWS ECR for Docker image management

#### Database & Caching
- **RDS:** PostgreSQL Multi-AZ deployment for high availability
- **ElastiCache:** Redis cluster for Malaysian cultural data caching
- **Backup Strategy:** Automated daily backups with 30-day retention
- **Read Replicas:** Geographic distribution for Malaysian regions

#### Storage & CDN
- **File Storage:** S3 buckets with versioning and lifecycle policies
- **CDN:** CloudFront with Malaysian edge locations
- **Static Assets:** Optimized delivery for cultural content and images
- **Backup:** Cross-region replication for disaster recovery

#### Monitoring & Logging
- **Application Monitoring:** AWS CloudWatch + Sentry for error tracking
- **Infrastructure Monitoring:** CloudWatch metrics and alarms
- **Logging:** Structured logging with CloudWatch Logs
- **Health Checks:** Multi-layer health monitoring (app, database, cache)

### Malaysian-Specific Integrations

#### Cultural & Religious Services
- **Prayer Times API:** Islamic Finder API with Malaysian mosque schedules
- **Cultural Calendar:** Malaysian government holiday API + custom cultural events
- **Language Processing:** Multi-language medication name processing
- **Traditional Medicine Database:** TCM, Ayurveda, and Malay traditional medicine integration

#### Healthcare System Integration
- **MOH Integration:** Ministry of Health Malaysia API (planned)
- **Private Healthcare:** KPJ, IHH, Pantai Holdings API integration (planned)
- **Pharmacy Systems:** Guardian, Caring Pharmacy, Watsons integration
- **Telemedicine:** Future integration with Malaysian telemedicine platforms

#### Telecommunications & SMS
- **SMS Services:** Direct telco partnerships (Maxis, Digi, Celcom)
- **Backup Notifications:** SMS fallback for areas with poor internet
- **Bulk Messaging:** Scalable SMS delivery for family notifications
- **Delivery Tracking:** SMS delivery confirmation and retry logic

### Development & Deployment Tools

#### Development Environment
- **Version Control:** Git (to be initialized)
- **Package Manager:** npm with package-lock.json for reproducible builds
- **Development Server:** Nodemon with hot reload for API development
- **Mobile Development:** Metro bundler with fast refresh

#### Code Quality & Testing
- **Linting:** ESLint with TypeScript and healthcare-specific rules
- **Formatting:** Prettier with consistent code style
- **Testing Framework:** Jest + React Native Testing Library
- **E2E Testing:** Detox for mobile app end-to-end testing
- **API Testing:** Supertest for backend API integration testing

#### CI/CD Pipeline
- **CI/CD Platform:** GitHub Actions with healthcare security scanning
- **Container Building:** Docker multi-stage builds for optimized images
- **Security Scanning:** Automated dependency vulnerability scanning
- **Deployment Strategy:** Blue-green deployment for zero-downtime updates
- **Database Migrations:** Automated schema migration with rollback capability

### Security & Compliance Framework

#### Healthcare Data Protection
- **Encryption:** End-to-end encryption for all health data transmission
- **Data Residency:** Malaysian healthcare data stored within Malaysia
- **Access Controls:** Multi-factor authentication for healthcare providers
- **Audit Logging:** Comprehensive audit trail for all health data access

#### Malaysian Compliance
- **PDPA Compliance:** Full Personal Data Protection Act 2010 compliance
- **Data Consent Management:** Granular consent with expiration and renewal
- **Right to be Forgotten:** Automated data anonymization and deletion
- **Cross-border Data:** Compliance framework for regional expansion

#### Third-Party Security
- **API Security:** OAuth 2.0 + JWT for third-party integrations
- **Vendor Assessment:** Security evaluation for all third-party services
- **Penetration Testing:** Quarterly security assessments
- **SOC 2 Preparation:** Framework for future SOC 2 Type II certification

### Performance & Scalability Specifications

#### Backend Performance Targets
- **API Response Time:** <200ms average for medication queries
- **Database Query Time:** <50ms for user authentication
- **Cache Hit Rate:** >90% for Malaysian cultural data
- **Throughput:** 1000+ concurrent users during peak hours

#### Mobile App Performance
- **App Startup Time:** <3 seconds cold start
- **Screen Transition:** <200ms between screens
- **Offline Sync:** Background sync within 30 seconds when online
- **Battery Optimization:** Minimal background processing impact

#### Scalability Architecture
- **Horizontal Scaling:** Auto-scaling based on traffic patterns
- **Database Scaling:** Read replicas and connection pooling
- **Caching Strategy:** Multi-layer caching (Redis, CDN, app-level)
- **Geographic Distribution:** Malaysian region optimization with global reach

### Technology Evolution Roadmap

#### Phase 1 (MVP - Months 1-4)
- Core backend API with PostgreSQL
- React Native mobile app with offline capability
- Basic AWS infrastructure with monitoring
- Malaysian cultural integration foundation

#### Phase 2 (Scale - Months 5-8)
- Enhanced caching with Redis optimization
- Healthcare system integration APIs
- Advanced monitoring and alerting
- Performance optimization and load testing

#### Phase 3 (Enterprise - Months 9-12)
- Microservices migration for high-load components
- Advanced analytics and machine learning integration
- Enterprise healthcare system connectivity
- International expansion infrastructure preparation

This technology context provides the foundation for building a healthcare-grade application that meets Malaysian cultural requirements while maintaining international scalability and security standards.