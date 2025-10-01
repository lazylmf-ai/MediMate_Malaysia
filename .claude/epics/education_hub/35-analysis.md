---
issue: 35
title: Content Management & Admin Tools
analyzed: 2025-10-01T11:42:54Z
estimated_hours: 64
parallelization_factor: 2.7
---

# Parallel Work Analysis: Issue #35

## Overview
Build comprehensive CMS and admin tools for creating, reviewing, and publishing educational content. Includes medical review workflow, multi-language editor, publishing pipeline, analytics dashboard, and role-based access control.

## Parallel Streams

### Stream A: Content Editor & CRUD
**Scope**: Admin UI for content creation, editing, multi-language support
**Files**:
- `frontend/src/screens/admin/ContentListScreen.tsx`
- `frontend/src/screens/admin/ContentEditorScreen.tsx`
- `frontend/src/components/admin/RichTextEditor.tsx`
- `frontend/src/components/admin/LanguageTabBar.tsx`
- `frontend/src/components/admin/ContentMetadataForm.tsx`
- `backend/src/controllers/admin/EducationAdminController.ts`
- `backend/src/services/education/ContentManagementService.ts`
**Agent Type**: fullstack (or split: react-component-architect + backend-api-architect)
**Can Start**: after Task 30 database schema complete
**Estimated Hours**: 16
**Dependencies**: Task 30 (database schema, models)

**Deliverables**:
- Content list screen with search/filter
- Content editor with WYSIWYG for 4 languages
- Metadata form (category, tags, difficulty)
- CRUD API endpoints (create, read, update, delete)
- Draft save functionality

### Stream B: Review Workflow & Publishing
**Scope**: Medical review process, approval workflow, publishing pipeline
**Files**:
- `frontend/src/screens/admin/ReviewDashboardScreen.tsx`
- `frontend/src/screens/admin/ReviewContentScreen.tsx`
- `frontend/src/components/admin/PendingReviewCard.tsx`
- `frontend/src/components/admin/AssignedReviewCard.tsx`
- `frontend/src/components/admin/ContentPreview.tsx`
- `frontend/src/components/admin/CommentCard.tsx`
- `backend/src/services/education/ReviewWorkflowService.ts`
- `backend/database/migrations/010_education_admin.sql`
**Agent Type**: fullstack
**Can Start**: after database schema extended (parallel with Stream A)
**Estimated Hours**: 14
**Dependencies**: Database migration (review workflow tables)

**Deliverables**:
- Review dashboard (pending, assigned reviews)
- Review screen with comment system
- Workflow states: draft → in_review → approved → published
- Assign reviewer functionality
- Approve/request changes actions
- Email notifications for reviewers

### Stream C: Analytics Dashboard
**Scope**: Content performance metrics, engagement analytics
**Files**:
- `frontend/src/screens/admin/AnalyticsDashboardScreen.tsx`
- `frontend/src/components/admin/StatCard.tsx`
- `frontend/src/components/admin/TopContentCard.tsx`
- `backend/src/services/education/ContentAnalyticsService.ts`
**Agent Type**: fullstack (data-focused)
**Can Start**: after Task 30 analytics tables exist
**Estimated Hours**: 14
**Dependencies**: Task 30 (analytics infrastructure)

**Deliverables**:
- Analytics overview dashboard
- Key metrics: total content, views, completions, engagement
- Top performing content list
- Content by status pie chart
- Views by month line chart
- Per-content detailed analytics

### Stream D: Translation Management & Versioning
**Scope**: Translation status tracking, content versioning, audit trail
**Files**:
- `backend/src/services/education/TranslationManagementService.ts`
- `backend/src/services/education/ContentVersioningService.ts`
- `backend/database/migrations/010_education_admin.sql` (version tables)
- `frontend/src/components/admin/TranslationStatusIndicator.tsx`
**Agent Type**: backend-api-architect
**Can Start**: immediately (database design)
**Estimated Hours**: 10
**Dependencies**: none (defines schema)

**Deliverables**:
- Translation status table (missing, draft, review, approved)
- Content version history table
- Versioning service (track all changes)
- Audit trail (who changed what when)
- Translation progress indicator in UI

### Stream E: Role-Based Access Control
**Scope**: Admin authentication, permission system, route protection
**Files**:
- `backend/src/middleware/authorization.ts`
- `backend/src/routes/admin/education.ts`
- `frontend/src/screens/admin/LoginScreen.tsx`
**Agent Type**: backend-api-architect
**Can Start**: immediately
**Estimated Hours**: 10
**Dependencies**: existing authentication system

**Deliverables**:
- Role definitions (admin, content_creator, medical_reviewer)
- Route-level authorization middleware
- Permission checks on all admin endpoints
- Admin login flow (if separate from main app)
- Protected routes in frontend

## Coordination Points

### Shared Files
- **Database migration `010_education_admin.sql`**: Streams B & D both add tables
  - **Resolution**: Combine into single migration, coordinate schema design
- **Admin controllers**: Streams A, B, C all add endpoints
  - **Resolution**: Each stream owns their endpoints, no conflicts

### Sequential Requirements
1. **Database schema** (Stream D) should be designed before Streams A, B use it
2. **RBAC** (Stream E) needed before admin routes can be properly protected
3. **Content editor** (Stream A) is foundation for review workflow (Stream B)

### Integration Points
- Stream B (review workflow) depends on Stream A (content exists to review)
- Stream C (analytics) depends on content being created (Stream A)
- All streams use RBAC from Stream E

## Conflict Risk Assessment
- **Low Risk**: Streams work on different features (editor, review, analytics, etc.)
- **Medium Risk**: Database migration shared between B & D (coordination needed)
- **Low Risk**: Frontend screens are separate, no conflicts

## Parallelization Strategy

**Recommended Approach**: hybrid

**Phase 1** (10 hours):
- Launch Stream D (schema design) and Stream E (RBAC) first
- Define database structure and permissions
- Provides foundation for other streams

**Phase 2** (16 hours):
- Launch Stream A (content editor) after schema ready
- Launch Stream B (review workflow) in parallel with A
- Launch Stream C (analytics) in parallel with A & B
- All use schema/RBAC from Phase 1

## Expected Timeline

**With parallel execution:**
- Wall time: 26 hours (10 + 16)
- Total work: 64 hours
- Efficiency gain: 59%

**Without parallel execution:**
- Wall time: 64 hours (sequential)

**Critical path**: Stream D & E (10h) → Stream A (16h longest in Phase 2)

## Notes

### Content Editor Design
- Use react-quill or draft-js for rich text editing
- Support images, headings, lists, bold, italic
- Image upload to S3 with drag-and-drop
- Auto-save drafts every 30 seconds
- Preview mode to see how content renders

### Review Workflow
- Draft → Submit for Review → In Review → Approved → Published
- Reviewers can add comments on specific sections
- Request changes sends content back to draft state
- Approval allows content creator to publish
- Admin can publish directly (bypass review for urgent updates)

### Analytics Metrics
- Track view events when user opens content
- Track completion events when user finishes
- Calculate engagement rate: completions / views
- Track time spent on content
- Language-specific metrics (views by language)

### Translation Management
- Track translation status per language (MS, EN, ZH, TA)
- Flag when translation is missing or outdated
- Visual indicator: green (approved), yellow (draft), red (missing)
- Translation workflow: English first → translate → review translations

### Content Versioning
- Every save creates new version
- Version number increments automatically
- Store full content snapshot per version
- Track who made change and when
- Ability to restore previous version

### Role-Based Permissions
```
Admin:
  - Full access (create, edit, delete, publish)
  - Assign reviewers
  - View analytics

Content Creator:
  - Create, edit own content
  - Submit for review
  - View own analytics

Medical Reviewer:
  - View content for review
  - Add review comments
  - Approve or request changes
  - Cannot edit content directly
```

### Testing Strategy
- Unit tests for workflow state transitions
- Integration tests for full content lifecycle (create → review → publish)
- Test role-based access (ensure content_creator can't publish directly)
- Test versioning (create multiple versions, restore old version)
- Test analytics calculations (verify metrics are accurate)

### Bulk Operations
- Publish multiple content pieces at once
- Assign same reviewer to multiple pieces
- Archive/unpublish in bulk
- Export content list as CSV

### Dependency on Previous Tasks
- **Task 30**: Database schema, backend infrastructure
- **Minimal blocker**: Can develop admin tools in parallel with main app

### Performance Considerations
- Rich text editor should be optimized (debounce auto-save)
- Analytics queries need indexes for performance
- Content list should paginate (50 items per page)
- Lazy load charts on analytics dashboard

### Security Considerations
- Admin panel separate subdomain or route (/admin)
- Strong authentication required (2FA recommended)
- Audit log all admin actions
- Rate limit admin endpoints (prevent brute force)
- Validate all user input (prevent XSS, SQL injection)
