---
name: dev-env-setup
description: Comprehensive development environment setup for MediMate Malaysian healthcare platform
status: backlog
created: 2025-09-07T05:51:25Z
---

# PRD: Development Environment Setup

## Executive Summary

This PRD defines the requirements for creating a comprehensive, one-command development environment setup for the MediMate Malaysian healthcare platform. The setup will enable new developers to quickly spin up a fully functional development environment that mirrors production infrastructure, includes Malaysian cultural data, meets healthcare compliance requirements, and supports both mobile (React Native) and backend (Node.js/TypeScript) development.

**Value Proposition:** Reduce new developer onboarding from 2-3 days to under 30 minutes while ensuring consistent, secure, and culturally-aware development environments.

## Problem Statement

### Current Challenges
1. **Complex Multi-Stack Setup:** MediMate requires React Native, Node.js, PostgreSQL, Redis, and Malaysian-specific integrations
2. **Healthcare Compliance Complexity:** Developers need PDPA-compliant tooling and secure data handling from day one
3. **Cultural Data Requirements:** Malaysian prayer times, cultural events, and multi-language support need consistent test data
4. **Onboarding Friction:** Manual environment setup takes 2-3 days and is error-prone
5. **Environment Drift:** Different developer setups lead to "works on my machine" issues

### Why Now?
- **Team Scaling:** Need to onboard 6+ developers rapidly for MVP development
- **Healthcare Standards:** Must establish security and compliance patterns early
- **Malaysian Context:** Cultural intelligence requires specialized development data
- **Time-to-Market:** Reduce setup friction to accelerate development velocity

## User Stories

### Primary Personas

#### 1. New Full-Stack Developer (Ahmad - Senior)
**As a** senior full-stack developer joining MediMate  
**I want** to set up my complete development environment with one command  
**So that** I can start contributing to the Malaysian healthcare platform immediately  

**Acceptance Criteria:**
- [ ] Complete environment setup in under 30 minutes
- [ ] All services running (API, database, mobile app)
- [ ] Malaysian test data populated (prayer times, cultural events, medications)
- [ ] Code quality tools configured and working
- [ ] Healthcare compliance checks enabled

#### 2. Mobile Developer (Siti - Mid-level)  
**As a** React Native developer focusing on mobile features  
**I want** iOS and Android simulators configured with Malaysian localization  
**So that** I can develop and test cultural features effectively  

**Acceptance Criteria:**
- [ ] React Native development environment ready
- [ ] iOS/Android simulators installed and configured
- [ ] Malaysian language packs and cultural themes loaded
- [ ] Mock healthcare provider APIs available
- [ ] Offline-first development data synchronized

#### 3. Backend Developer (Kumar - Junior)
**As a** junior backend developer new to healthcare technology  
**I want** secure development practices enforced by default  
**So that** I can write PDPA-compliant code without deep security expertise  

**Acceptance Criteria:**
- [ ] Healthcare-grade security tools configured
- [ ] PDPA compliance linting and validation
- [ ] Secure environment variables management
- [ ] Healthcare data encryption enabled by default
- [ ] Audit logging configured for development

#### 4. DevOps Engineer (Lisa - Senior)
**As a** DevOps engineer responsible for deployment pipeline  
**I want** local environment to match production infrastructure exactly  
**So that** deployment issues are caught in development  

**Acceptance Criteria:**
- [ ] Docker containers mirror production setup
- [ ] AWS services locally emulated (S3, RDS, ElastiCache)
- [ ] Production-like security configurations
- [ ] Monitoring and logging tools configured
- [ ] CI/CD pipeline testable locally

### User Journey: New Developer Onboarding

1. **Day 1 - Setup:** Run single command, environment ready in 30 minutes
2. **Day 1 - Validation:** Successfully run full test suite, start local services
3. **Day 1 - Development:** Make first commit with proper security scanning
4. **Day 2 - Cultural Features:** Test Malaysian cultural adjustments locally
5. **Week 1 - Contribution:** Deploy first feature to staging environment

## Requirements

### Functional Requirements

#### Core Setup Automation
- **F1:** Single command setup script (`npm run setup:dev` or `./scripts/setup.sh`)
- **F2:** Automatic dependency installation (Node.js, Python, Docker, mobile tools)
- **F3:** Database schema creation and migration execution
- **F4:** Malaysian cultural data seeding (prayer times, holidays, medications)
- **F5:** Environment variable configuration with secure defaults
- **F6:** Git hooks installation for code quality and security
- **F7:** IDE/Editor configuration files (VSCode, WebStorm settings)

#### Multi-Platform Support
- **F8:** macOS development environment (primary target)
- **F9:** Windows development environment (secondary)
- **F10:** Linux development environment (Docker-based)
- **F11:** Cloud-based development environment option (GitHub Codespaces)

#### Malaysian Healthcare Context
- **F12:** Malaysian medication database (sample data)
- **F13:** Cultural calendar integration with test events
- **F14:** Multi-language test data (Bahasa Malaysia, English, Mandarin, Tamil)
- **F15:** Prayer time calculation with test mosque data
- **F16:** Healthcare provider mock APIs (MOH, private hospitals)
- **F17:** PDPA compliance validation tools

#### Development Services
- **F18:** Local PostgreSQL database with healthcare schema
- **F19:** Redis cache with Malaysian cultural data
- **F20:** Mock SMS gateway for notification testing
- **F21:** Local S3-compatible storage (MinIO)
- **F22:** React Native development servers (Metro, Flipper)
- **F23:** API development server with hot reload
- **F24:** Healthcare data encryption/decryption utilities

#### Quality Assurance Tools
- **F25:** ESLint with healthcare-specific rules
- **F26:** Prettier with consistent Malaysian code style
- **F27:** TypeScript strict mode configuration
- **F28:** Jest testing framework with cultural test helpers
- **F29:** Security scanning tools (healthcare data protection)
- **F30:** Pre-commit hooks (linting, testing, security)

### Non-Functional Requirements

#### Performance
- **NF1:** Complete setup time under 30 minutes on standard hardware
- **NF2:** Local services start time under 2 minutes
- **NF3:** Hot reload response time under 500ms
- **NF4:** Test suite execution under 5 minutes

#### Security
- **NF5:** No sensitive data in environment configuration
- **NF6:** Healthcare-grade encryption enabled by default
- **NF7:** PDPA compliance validation on every commit
- **NF8:** Secure credential management (never plaintext)
- **NF9:** Audit trail for all healthcare data access

#### Reliability
- **NF10:** Setup success rate >95% across supported platforms
- **NF11:** Automated health checks for all services
- **NF12:** Graceful degradation when optional services fail
- **NF13:** Clear error messages with specific resolution steps

#### Maintainability
- **NF14:** Modular setup scripts for individual components
- **NF15:** Version pinning for all dependencies
- **NF16:** Documentation auto-generation from configuration
- **NF17:** Setup process logging for troubleshooting

## Success Criteria

### Primary Metrics
- **Developer Onboarding Time:** Reduce from 2-3 days to <30 minutes (90% improvement)
- **Setup Success Rate:** >95% successful first-time setup across platforms
- **Time to First Contribution:** <24 hours for new developers
- **Environment Consistency:** 100% of developers using identical tool versions

### Secondary Metrics  
- **Developer Satisfaction:** >4.5/5 rating for setup experience
- **Support Tickets:** <1 setup-related ticket per new developer
- **Cultural Feature Testing:** 100% of Malaysian features testable locally
- **Healthcare Compliance:** 0 PDPA violations in development environment

### Technical Metrics
- **Service Startup Time:** All services ready in <2 minutes
- **Test Coverage:** >90% for setup and configuration scripts
- **Documentation Coverage:** 100% of setup steps documented
- **Platform Support:** 100% success rate on macOS, >90% on Windows/Linux

## Constraints & Assumptions

### Technical Constraints
- **Platform Dependency:** React Native requires specific Xcode/Android Studio versions
- **Healthcare Security:** Cannot use public APIs for real healthcare data in development
- **Malaysian Services:** Prayer time and cultural APIs may have rate limits
- **Resource Requirements:** Docker containers may require 8GB+ RAM

### Timeline Constraints
- **MVP Dependency:** Must be complete before core development begins (Week 2)
- **Team Onboarding:** 6 developers need to be productive by Month 1
- **Cultural Integration:** Malaysian cultural features needed for Week 4 demo

### Resource Limitations
- **Malaysian Cultural Advisors:** Limited availability for test data validation
- **Healthcare API Access:** Sandbox environments may not be fully representative
- **Infrastructure Costs:** AWS LocalStack has limitations vs. real AWS services

### Assumptions
- **Developer Hardware:** Developers have modern machines (8GB+ RAM, SSD)
- **Network Access:** Reliable internet for initial dependency downloads
- **Platform Focus:** Primary development on macOS, secondary on Windows
- **Tool Familiarity:** Developers comfortable with command line tools

## Out of Scope

### Explicit Exclusions
- **Production Infrastructure:** Not setting up actual AWS/production services
- **Real Healthcare Data:** No real patient or medication data in development
- **Full EMR Integration:** Mock services only, not real hospital system connections
- **Performance Optimization:** Development environment optimized for functionality, not performance
- **Mobile Device Testing:** Physical device setup handled separately
- **Team Collaboration Tools:** Slack, Jira, etc. configured separately
- **Code Review Infrastructure:** GitHub/GitLab workflow setup separate

### Future Considerations
- **CI/CD Integration:** Will be addressed in separate deployment automation PRD
- **Staging Environment:** Separate from local development environment setup
- **Production Monitoring:** Development observability vs. production monitoring
- **International Expansion:** Focus on Malaysian context only initially

## Dependencies

### External Dependencies
- **Node.js LTS:** Required for backend development
- **React Native CLI:** Mobile development framework
- **Docker Desktop:** Container runtime for services
- **PostgreSQL:** Database engine
- **Redis:** Caching and session storage
- **Xcode (macOS):** iOS development and simulation
- **Android Studio:** Android development and simulation

### Internal Dependencies
- **Malaysian Cultural Data:** Calendar events, prayer times, cultural preferences
- **Healthcare Provider APIs:** Mock service definitions and test data
- **Medication Database:** Malaysian medication names and classifications
- **Security Frameworks:** PDPA compliance tools and encryption libraries
- **Code Quality Standards:** ESLint rules, Prettier configuration

### Team Dependencies
- **Cultural Advisory Board:** Validation of Malaysian cultural test data
- **Security Team:** Healthcare compliance requirements and audit standards
- **DevOps Team:** Production infrastructure patterns to mirror locally
- **Mobile Team:** React Native best practices and simulator configurations

### Infrastructure Dependencies
- **Domain Names:** Local development domains for service discovery
- **SSL Certificates:** Self-signed certificates for HTTPS development
- **Network Configuration:** Port assignments and service routing
- **Storage Volumes:** Persistent data storage for databases

## Implementation Approach

### Phase 1: Core Infrastructure (Week 1)
- Basic Node.js and React Native environment
- PostgreSQL and Redis setup
- Docker containerization
- Essential security tools

### Phase 2: Malaysian Integration (Week 2) 
- Cultural data integration
- Multi-language support
- Prayer time calculations
- Healthcare mock services

### Phase 3: Developer Experience (Week 3)
- IDE configurations
- Quality assurance tools
- Documentation generation
- Cross-platform compatibility

### Phase 4: Validation & Optimization (Week 4)
- Team testing and feedback
- Performance optimization
- Error handling improvement
- Documentation finalization

This comprehensive development environment setup will establish the foundation for rapid, secure, and culturally-aware development of the MediMate Malaysian healthcare platform.