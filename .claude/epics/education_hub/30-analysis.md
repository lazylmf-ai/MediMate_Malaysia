---
issue: 30
title: Content Infrastructure & Backend API
analyzed: 2025-10-01T11:28:11Z
estimated_hours: 80
parallelization_factor: 3.5
---

# Parallel Work Analysis: Issue #30

## Overview
Build the complete backend infrastructure for Education Hub including PostgreSQL schema, REST APIs, recommendation engine, search functionality, and AWS S3 integration. This is a pure backend task with clear separation between database, service, and API layers.

## Parallel Streams

### Stream A: Database Schema & Migrations
**Scope**: PostgreSQL schema design, migrations, and indexes
**Files**:
- `backend/src/database/migrations/009_education_hub.sql`
- Database setup and validation scripts
**Agent Type**: database-optimizer
**Can Start**: immediately
**Estimated Hours**: 12
**Dependencies**: none

**Deliverables**:
- 5 tables: education_content, education_user_progress, education_quiz_submissions, education_achievements, education_recommendations
- Multi-language JSONB fields (MS, EN, ZH, TA)
- Full-text search vectors for all languages
- Performance indexes on frequently queried fields
- Foreign key constraints and validation

### Stream B: Data Models & Services
**Scope**: TypeScript models and core business logic services
**Files**:
- `backend/src/models/education/EducationContent.model.ts`
- `backend/src/models/education/UserProgress.model.ts`
- `backend/src/models/education/QuizSubmission.model.ts`
- `backend/src/models/education/Achievement.model.ts`
- `backend/src/services/education/ContentService.ts`
- `backend/src/services/education/ProgressTrackingService.ts`
- `backend/src/services/education/QuizService.ts`
**Agent Type**: backend-api-architect
**Can Start**: after Stream A completes (needs schema)
**Estimated Hours**: 26
**Dependencies**: Stream A

**Deliverables**:
- TypeScript models matching database schema
- ContentService with CRUD operations
- ProgressTrackingService for view/completion tracking
- QuizService with scoring logic
- Unit tests for all services (>80% coverage)

### Stream C: Search & Recommendation Engine
**Scope**: Full-text search and rule-based recommendation logic
**Files**:
- `backend/src/services/education/SearchService.ts`
- `backend/src/services/education/RecommendationService.ts`
**Agent Type**: backend-api-architect
**Can Start**: after Stream A completes (needs schema)
**Estimated Hours**: 32
**Dependencies**: Stream A

**Deliverables**:
- SearchService with PostgreSQL full-text search
- Multi-language query support (MS, EN, ZH, TA)
- RecommendationService with medication/condition matching
- ICD-10 condition detection from medications
- Adherence-based intervention triggers
- Performance optimization (<500ms search, <1s recommendations)
- Unit tests for both services

### Stream D: API Controllers & Routes
**Scope**: REST API endpoints, validation, error handling
**Files**:
- `backend/src/controllers/education/ContentController.ts`
- `backend/src/controllers/education/ProgressController.ts`
- `backend/src/controllers/education/SearchController.ts`
- `backend/src/controllers/education/RecommendationController.ts`
- `backend/src/routes/education.ts`
**Agent Type**: backend-api-architect
**Can Start**: after Stream B & C complete
**Estimated Hours**: 20
**Dependencies**: Streams B & C

**Deliverables**:
- 20+ API endpoints across 4 controllers
- Input validation and error handling
- Authentication middleware integration
- Swagger/OpenAPI documentation
- Integration tests for all endpoints

### Stream E: AWS S3 Integration
**Scope**: Media upload/download for educational content
**Files**:
- `backend/src/services/education/MediaStorageService.ts`
- AWS SDK integration
**Agent Type**: backend-api-architect
**Can Start**: immediately (independent of other streams)
**Estimated Hours**: 10
**Dependencies**: none

**Deliverables**:
- S3 bucket setup (medimatemy-education-content)
- MediaStorageService with upload/download methods
- Pre-signed URL generation for secure access
- File validation and size limits
- Integration tests with S3

## Coordination Points

### Shared Files
No direct file conflicts, but coordination needed on:
- **Type definitions**: Streams B, C, D all reference shared types
- **Database connection**: All streams use same connection pool
- **Authentication middleware**: Stream D integrates with existing auth

### Sequential Requirements
1. **Database schema MUST complete first** (Stream A) before Streams B & C can start
2. **Services MUST complete** (Streams B & C) before controllers (Stream D) can be implemented
3. **Stream E is independent** and can run in parallel with everything

### Integration Points
- Stream B (ContentService) will be called by Stream D (ContentController)
- Stream C (RecommendationService) needs access to medication/adherence APIs
- Stream D needs all services from B & C to implement controllers
- Stream E integrates into ContentService for media handling

## Conflict Risk Assessment
- **Low Risk**: Clear layer separation (database → services → controllers)
- **Low Risk**: Stream E is completely independent
- **Medium Risk**: Type definitions may evolve during Stream B/C implementation
- **Low Risk**: No frontend involvement, pure backend task

## Parallelization Strategy

**Recommended Approach**: hybrid

**Phase 1** (12 hours):
- Launch Stream A (database schema)
- Launch Stream E (S3 integration) in parallel

**Phase 2** (32 hours):
- Launch Stream B (models & services) after Stream A completes
- Launch Stream C (search & recommendations) in parallel with Stream B
- Stream E continues independently

**Phase 3** (20 hours):
- Launch Stream D (controllers & routes) after Streams B & C complete
- Integrate Stream E into ContentService

## Expected Timeline

**With parallel execution:**
- Wall time: 64 hours (12 + 32 + 20)
- Total work: 100 hours
- Efficiency gain: 36%

**Without parallel execution:**
- Wall time: 100 hours (sequential)

**Critical path**: Stream A → Stream C (32h) → Stream D (20h) = 64 hours

## Notes

### Performance Targets
- Search response: < 500ms
- Recommendation generation: < 1s
- Content pagination: < 1s

### Testing Strategy
- Unit tests: Each service independently (Streams B, C, E)
- Integration tests: Full API workflows (Stream D)
- Performance tests: Load testing after Stream D completes

### AWS Considerations
- S3 bucket must be created before Stream E implementation
- IAM roles needed for Lambda/EC2 access to S3
- Consider CloudFront CDN for content delivery (future enhancement)

### Dependency on Existing Systems
- Medication management API (for recommendations)
- Adherence tracking API (for intervention triggers)
- OAuth 2.0 authentication middleware
- Existing database migration system

### Risk Mitigation
- Stream A should include rollback migration scripts
- Stream C recommendation engine should handle missing medication data gracefully
- Stream D should implement rate limiting for search endpoints
- Stream E should validate file types and sizes to prevent abuse
