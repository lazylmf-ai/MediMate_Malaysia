---
created: 2025-09-07T02:03:54Z
last_updated: 2025-09-07T02:03:54Z
version: 1.0
author: Claude Code PM System
---

# Project Structure

## Current Directory Layout

```
MediMate_cc/
├── .claude/                          # Claude Code PM System
│   ├── context/                      # Project context documentation
│   │   ├── README.md                 # Context system overview
│   │   ├── progress.md               # Current project status
│   │   ├── project-structure.md      # This file
│   │   └── [additional context files]
│   ├── rules/                        # PM system rules
│   └── scripts/                      # PM automation scripts
├── PRD.md                            # Product Requirements Document (70KB)
├── Tech Stack.md                     # Technical Implementation Guide (25KB)
└── CLAUDE.md                         # Claude Code configuration (341 bytes)
```

## Planned Architecture Structure

### Backend API Structure (Node.js + TypeScript)
```
backend/
├── src/
│   ├── controllers/                  # API route handlers
│   │   ├── auth.controller.ts
│   │   ├── medication.controller.ts
│   │   ├── family.controller.ts
│   │   ├── provider.controller.ts
│   │   └── cultural.controller.ts
│   ├── services/                     # Business logic layer
│   │   ├── medicationService.ts
│   │   ├── reminderService.ts
│   │   ├── familyService.ts
│   │   ├── culturalService.ts
│   │   └── healthcareService.ts
│   ├── models/                       # Database models
│   │   ├── User.ts
│   │   ├── Medication.ts
│   │   ├── Family.ts
│   │   ├── AdherenceLog.ts
│   │   └── HealthcareProvider.ts
│   ├── middleware/                   # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── pdpa.middleware.ts        # Malaysian PDPA compliance
│   │   └── cultural.middleware.ts
│   ├── utils/                        # Utility functions
│   │   ├── encryption.ts
│   │   ├── malayCalendar.ts
│   │   ├── prayerTimes.ts
│   │   └── notifications.ts
│   ├── config/                       # Configuration files
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── aws.ts
│   │   └── cultural.ts
│   ├── routes/                       # API route definitions
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── medications.routes.ts
│   │   │   │   ├── family.routes.ts
│   │   │   │   ├── providers.routes.ts
│   │   │   │   └── cultural.routes.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── types/                        # TypeScript type definitions
│   │   ├── auth.types.ts
│   │   ├── medication.types.ts
│   │   ├── cultural.types.ts
│   │   └── api.types.ts
│   ├── validators/                   # Input validation schemas
│   │   ├── auth.validator.ts
│   │   ├── medication.validator.ts
│   │   └── family.validator.ts
│   └── app.ts                        # Express app setup
├── tests/                            # Test files
│   ├── unit/
│   ├── integration/
│   ├── cultural/                     # Malaysian cultural feature tests
│   └── security/                     # Security and PDPA tests
├── docs/                             # API documentation
├── scripts/                          # Database and deployment scripts
├── docker-compose.yml
├── Dockerfile
└── package.json
```

### Mobile App Structure (React Native + TypeScript)
```
mobile/
├── src/
│   ├── components/                   # Reusable UI components
│   │   ├── common/
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   └── Loading/
│   │   ├── medication/
│   │   │   ├── MedicationCard/
│   │   │   ├── ReminderList/
│   │   │   └── AdherenceChart/
│   │   ├── family/
│   │   │   ├── FamilyMember/
│   │   │   ├── CaregiverDashboard/
│   │   │   └── FamilyInvite/
│   │   └── cultural/
│   │       ├── PrayerTimeWidget/
│   │       ├── FestivalBanner/
│   │       └── LanguageSelector/
│   ├── screens/                      # Screen components
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── OnboardingScreen.tsx
│   │   ├── medication/
│   │   │   ├── MedicationListScreen.tsx
│   │   │   ├── AddMedicationScreen.tsx
│   │   │   └── AdherenceScreen.tsx
│   │   ├── family/
│   │   │   ├── FamilyDashboardScreen.tsx
│   │   │   ├── CaregiverScreen.tsx
│   │   │   └── FamilySettingsScreen.tsx
│   │   └── settings/
│   │       ├── ProfileScreen.tsx
│   │       ├── CulturalSettingsScreen.tsx
│   │       └── PrivacyScreen.tsx
│   ├── navigation/                   # Navigation configuration
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── TabNavigator.tsx
│   ├── services/                     # API and external services
│   │   ├── api.service.ts
│   │   ├── medication.service.ts
│   │   ├── family.service.ts
│   │   ├── cultural.service.ts
│   │   └── notification.service.ts
│   ├── store/                        # Redux store configuration
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── medicationSlice.ts
│   │   │   ├── familySlice.ts
│   │   │   └── culturalSlice.ts
│   │   ├── api/
│   │   │   ├── authApi.ts
│   │   │   ├── medicationApi.ts
│   │   │   └── familyApi.ts
│   │   └── store.ts
│   ├── utils/                        # Utility functions
│   │   ├── storage.ts
│   │   ├── dates.ts
│   │   ├── cultural.ts
│   │   └── validation.ts
│   ├── hooks/                        # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useMedication.ts
│   │   ├── useFamily.ts
│   │   └── useCultural.ts
│   ├── constants/                    # App constants
│   │   ├── colors.ts
│   │   ├── strings.ts
│   │   ├── cultural.ts
│   │   └── api.ts
│   ├── types/                        # TypeScript type definitions
│   │   ├── navigation.types.ts
│   │   ├── user.types.ts
│   │   ├── medication.types.ts
│   │   └── cultural.types.ts
│   └── localization/                 # Multi-language support
│       ├── i18n.ts
│       ├── en.json
│       ├── ms.json                   # Bahasa Malaysia
│       ├── zh.json                   # Chinese
│       └── ta.json                   # Tamil
├── assets/                           # Static assets
│   ├── images/
│   ├── icons/
│   ├── fonts/
│   └── cultural/                     # Cultural-specific assets
├── __tests__/                        # Test files
│   ├── components/
│   ├── screens/
│   ├── services/
│   └── cultural/
├── android/                          # Android-specific code
├── ios/                             # iOS-specific code
├── metro.config.js
├── react-native.config.js
└── package.json
```

### Database Structure (PostgreSQL)
```
database/
├── migrations/                       # Database migration files
│   ├── 001_create_users_table.sql
│   ├── 002_create_families_table.sql
│   ├── 003_create_medications_table.sql
│   ├── 004_create_adherence_logs_table.sql
│   ├── 005_create_healthcare_providers_table.sql
│   ├── 006_create_cultural_events_table.sql
│   └── 007_create_indexes.sql
├── seeds/                           # Seed data
│   ├── malaysian_holidays.sql
│   ├── prayer_times_seeds.sql
│   ├── medication_database.sql
│   └── healthcare_providers.sql
├── functions/                       # PostgreSQL functions
│   ├── adherence_calculations.sql
│   ├── cultural_adjustments.sql
│   └── family_notifications.sql
└── views/                          # Database views
    ├── user_adherence_summary.sql
    ├── family_dashboard_view.sql
    └── provider_analytics_view.sql
```

### Infrastructure Structure
```
infrastructure/
├── aws/                            # AWS CloudFormation/Terraform
│   ├── ecs.yml                     # Container service
│   ├── rds.yml                     # PostgreSQL RDS
│   ├── elasticache.yml             # Redis cluster
│   ├── s3.yml                      # File storage
│   └── cloudfront.yml              # CDN
├── docker/                         # Docker configurations
│   ├── Dockerfile.backend
│   ├── Dockerfile.nginx
│   └── docker-compose.prod.yml
├── kubernetes/                     # Kubernetes manifests (future)
│   ├── backend-deployment.yml
│   ├── redis-deployment.yml
│   └── ingress.yml
└── monitoring/                     # Monitoring configuration
    ├── cloudwatch.yml
    ├── prometheus.yml
    └── grafana-dashboard.json
```

## File Organization Patterns

### Naming Conventions
- **Components:** PascalCase (`MedicationCard`, `FamilyDashboard`)
- **Files:** camelCase with descriptive names (`medicationService.ts`, `culturalUtils.ts`)
- **Directories:** kebab-case (`medication-management`, `cultural-integration`)
- **Database:** snake_case (`user_id`, `adherence_logs`)
- **API Routes:** kebab-case (`/api/v1/medications`, `/api/v1/cultural-events`)

### Module Organization
- **Feature-based grouping:** Related components grouped by functionality
- **Shared components:** Common UI elements in dedicated directories
- **Type definitions:** Centralized in `/types` directories
- **Utils:** Pure functions in `/utils` directories
- **Constants:** Configuration values in `/constants` directories

### Cultural Integration Organization
- **Malaysian-specific features** have dedicated directories
- **Multi-language support** centralized in `/localization`
- **Cultural utilities** separated from general utilities
- **Prayer time integration** as standalone service module

## Development Workflow Structure

### Branch Organization (Future Git Setup)
```
git-branches/
├── main                           # Production-ready code
├── develop                        # Integration branch
├── feature/                       # Feature development
│   ├── medication-tracking
│   ├── family-integration
│   ├── cultural-calendar
│   └── healthcare-provider-dashboard
├── hotfix/                        # Critical fixes
└── release/                       # Release preparation
```

### Configuration Management
- **Environment-specific configs** in dedicated files
- **Secrets management** via AWS Secrets Manager
- **Cultural settings** as configurable parameters
- **Malaysian compliance** settings centralized

This structure supports the comprehensive requirements outlined in the PRD while maintaining clean separation of concerns and scalability for the planned growth trajectory.