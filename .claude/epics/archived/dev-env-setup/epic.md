---
name: dev-env-setup
status: completed
created: 2025-09-07T05:54:39Z
completed: 2025-09-08T11:31:22Z
progress: 100%
prd: .claude/prds/dev-env-setup.md
github: https://github.com/lazylmf-ai/MediMate_Malaysia/issues/1
---

# Epic: Development Environment Setup

## Overview

Create a comprehensive, one-command development environment setup for MediMate that reduces new developer onboarding from 2-3 days to under 30 minutes. The solution will use Docker Compose for service orchestration, shell scripts for platform-specific setup, and leverage existing npm ecosystem tools to minimize custom code.

**Key Strategy:** Maximize use of existing tools (Docker, npm scripts, popular CLI tools) rather than building custom solutions, focusing on intelligent configuration and orchestration.

## Architecture Decisions

### Core Technology Choices
- **Docker Compose:** Service orchestration for PostgreSQL, Redis, MinIO (S3), and mock services
- **NPM Scripts:** Primary interface for setup commands, leveraging existing ecosystem
- **Shell Scripts:** Platform-specific installation logic with fallback error handling
- **Configuration Templates:** Environment files with secure defaults and clear documentation
- **Health Check Integration:** Built-in service readiness validation using Docker health checks

### Design Patterns
- **Fail Fast:** Validate prerequisites before starting lengthy installations
- **Modular Setup:** Independent setup modules that can be run individually for debugging
- **Graceful Degradation:** Core development continues even if optional services fail
- **Configuration as Code:** All setup logic version-controlled and reproducible

### Infrastructure Approach
- **Local Services:** Docker containers mirroring production (PostgreSQL, Redis, MinIO)
- **Mock External APIs:** Dedicated mock service containers for Malaysian healthcare APIs
- **Development Tools:** Containerized code quality and security scanning tools
- **Cross-Platform:** Shell script detection for macOS/Windows/Linux with appropriate package managers

## Technical Approach

### Frontend Components
- **React Native Setup:** Leverage `@react-native-community/cli` with Malaysian localization pre-configured
- **Mobile Simulators:** Automated iOS Simulator and Android Emulator setup with test data
- **Development Server:** Metro bundler configuration with Malaysian cultural asset loading
- **Hot Reload:** Fast refresh configuration optimized for cultural feature development

### Backend Services
- **API Development:** Node.js with TypeScript hot reload using nodemon
- **Database Schema:** Automated PostgreSQL migration execution with Malaysian healthcare schema
- **Mock Services:** Express.js-based mock servers for MOH and private healthcare APIs
- **Security Middleware:** Pre-configured PDPA compliance validation and audit logging

### Infrastructure
- **Docker Compose Stack:** 
  - PostgreSQL with healthcare schema and Malaysian test data
  - Redis with cultural calendar and prayer time caching
  - MinIO for local S3-compatible file storage
  - Mock API services for healthcare providers
- **Network Configuration:** Internal Docker network with health checks and service discovery
- **Data Persistence:** Named volumes for development data persistence across restarts

## Implementation Strategy

### Development Phases (4-week timeline)
1. **Week 1:** Core infrastructure (Docker Compose, basic services)
2. **Week 2:** Malaysian cultural integration (test data, mock APIs)
3. **Week 3:** Developer experience (IDE configs, quality tools)
4. **Week 4:** Cross-platform testing and optimization

### Risk Mitigation
- **Platform Differences:** Detect OS and use appropriate package managers (Homebrew, Chocolatey, apt)
- **Dependency Conflicts:** Version pinning in package.json and Docker images
- **Network Issues:** Offline-capable setup with cached dependencies where possible
- **Resource Constraints:** Memory and disk usage monitoring with optimization suggestions

### Testing Approach
- **Automated Validation:** Health check scripts that verify all services are working
- **Cross-Platform Testing:** GitHub Actions matrix testing on macOS, Windows, Linux
- **Documentation Testing:** Scripts that validate documentation accuracy against actual setup

## Task Breakdown Preview

High-level task categories that will be created:
- [ ] **Setup Script Foundation:** Core automation script with platform detection and dependency validation
- [ ] **Docker Infrastructure:** Compose configuration for PostgreSQL, Redis, MinIO, and mock services
- [ ] **Malaysian Cultural Data:** Test data seeding with prayer times, holidays, medications, and multi-language content
- [ ] **Mobile Development Environment:** React Native setup with iOS/Android simulators and Malaysian localization
- [ ] **Backend Development Setup:** Node.js/TypeScript hot reload with healthcare security tools
- [ ] **Code Quality Integration:** ESLint, Prettier, Jest configuration with healthcare-specific rules and cultural test helpers
- [ ] **Developer Documentation:** Automated README generation and troubleshooting guides with common issue resolution
- [ ] **Cross-Platform Compatibility:** Windows and Linux support with platform-specific package management
- [ ] **Validation & Health Checks:** Service readiness validation and automated environment testing
- [ ] **IDE Configuration:** VSCode settings and extensions for optimal Malaysian healthcare development

## Dependencies

### External Service Dependencies
- **Docker Desktop:** Required for all local services (PostgreSQL, Redis, MinIO)
- **Node.js LTS:** Backend development and npm script execution
- **Platform Package Managers:** Homebrew (macOS), Chocolatey (Windows), apt (Linux)
- **Mobile Development Tools:** Xcode (iOS), Android Studio (Android simulators)

### Internal Team Dependencies
- **Malaysian Cultural Advisory:** Validation of prayer time calculations and cultural event data
- **Security Team:** PDPA compliance tool configurations and healthcare audit requirements
- **Mobile Team:** React Native best practices and Malaysian localization standards

### Prerequisite Work
- **Project Structure:** Basic repository structure with package.json and initial configurations
- **Cultural Data Sources:** Identified APIs and data sources for Malaysian cultural integration
- **Security Standards:** Defined healthcare compliance requirements and PDPA validation criteria

## Success Criteria (Technical)

### Performance Benchmarks
- **Setup Time:** Complete environment ready in <30 minutes on 8GB RAM machine
- **Service Startup:** All Docker services healthy within 2 minutes
- **Hot Reload:** Code changes reflected in <500ms for both mobile and backend
- **Test Execution:** Full test suite completes in <5 minutes

### Quality Gates
- **Setup Success Rate:** >95% first-time success across supported platforms
- **Service Health:** Automated health checks passing for all critical services
- **Cultural Data Integrity:** 100% of Malaysian features testable with realistic data
- **Security Validation:** PDPA compliance checks integrated and passing

### Acceptance Criteria
- New developer can complete setup and make first commit within 30 minutes
- All Malaysian cultural features (prayer times, holidays, languages) work locally
- Healthcare compliance tools catch PDPA violations during development
- Docker services mirror production configuration for deployment consistency

## Estimated Effort

### Overall Timeline: 4 weeks (160 hours)

**Critical Path Items:**
- Week 1: Docker Compose infrastructure setup (40 hours)
- Week 2: Malaysian cultural data integration (40 hours)
- Week 3: Developer experience and tooling (40 hours)
- Week 4: Cross-platform testing and optimization (40 hours)

### Resource Requirements
- **1 Senior DevOps Engineer:** Infrastructure and Docker expertise
- **1 Full-Stack Developer:** Node.js/React Native environment configuration  
- **0.25 Malaysian Cultural Advisor:** Cultural data validation and testing
- **Access to Malaysian Healthcare APIs:** For mock service development

**Risk Buffer:** 20% additional time allocation for cross-platform compatibility issues and healthcare compliance integration complexity.

## Tasks Created
- [ ] 001.md - Setup Script Foundation (parallel: true)
- [ ] 002.md - Docker Infrastructure (parallel: true)  
- [ ] 003.md - Malaysian Cultural Data (parallel: false, depends on: [002])
- [ ] 004.md - Mobile Development Environment (parallel: true, depends on: [001])
- [ ] 005.md - Backend Development Setup (parallel: true, depends on: [001])
- [ ] 006.md - Code Quality Integration (parallel: true, depends on: [001])
- [ ] 007.md - Cross-Platform Compatibility & Documentation (parallel: false, depends on: [001, 002, 004, 005, 006])
- [ ] 008.md - Validation & Health Checks (parallel: false, depends on: [001, 002, 003, 004, 005, 006])

Total tasks: 8
Parallel tasks: 5
Sequential tasks: 3
Estimated total effort: 140-176 hours

This epic focuses on leveraging existing tooling and Docker containerization to create a robust, repeatable development environment that specifically addresses MediMate's Malaysian healthcare platform requirements while minimizing custom code development.