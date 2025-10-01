---
name: education_hub
status: backlog
created: 2025-10-01T11:00:18Z
progress: 0%
prd: .claude/prds/education_hub.md
github: https://github.com/lazylmf-ai/MediMate_Malaysia/issues/29
---

# Epic: Education Hub

## Overview

Build a comprehensive patient education platform integrated into the existing MediMate React Native mobile application, providing culturally-adapted, multi-language health education content for elderly Malaysians managing chronic diseases. The implementation focuses on maximum reuse of existing infrastructure (medication management, cultural intelligence, family circle, offline sync) while adding a new content delivery and learning engagement system.

**Key Strategy:** Leverage existing MediMate React Native foundation (completed in core_med_management epic) and add a lightweight content management, recommendation, and gamification layer. Prioritize content curation over custom CMS development by using existing backend patterns.

## Architecture Decisions

### Core Technology Choices (Reuse Existing Stack)

**Frontend (Existing)**
- **React Native 0.72+**: Already production-ready from core_med_management epic
- **TypeScript**: Type-safe integration with existing services
- **Redux Toolkit**: Extend existing state management for education content
- **React Navigation**: Add education hub as new navigation stack
- **React Native MMKV**: Reuse for offline content caching

**Backend (Extend Existing)**
- **Node.js + Express**: Extend existing MediMate backend API
- **PostgreSQL**: Add education tables to existing database
- **Existing Authentication**: OAuth 2.0 already implemented
- **Existing Cultural Services**: Leverage prayer time, language, halal services
- **Existing Offline Sync**: Extend for education content

**Content Infrastructure (New)**
- **Content Storage**: AWS S3 for media (videos, images, PDFs)
- **CDN**: AWS CloudFront for fast content delivery
- **Video Processing**: AWS MediaConvert for transcoding
- **Search**: PostgreSQL full-text search (avoid Elasticsearch complexity for MVP)

### Design Patterns

**Content Delivery Pattern**
- REST API for content CRUD operations
- Lazy loading for content lists (pagination)
- Aggressive caching for frequently accessed content
- Prefetch recommended content in background

**Recommendation Pattern**
- Rule-based recommendation engine (avoid ML complexity for MVP)
- Medication-based matching: User medications → relevant content
- Condition-based matching: Detected conditions → educational modules
- Adherence-triggered interventions: Low adherence → motivational content

**Offline-First Pattern**
- Reuse existing offline sync mechanism from core_med_management
- Cache article text in MMKV (lightweight)
- Download videos on-demand with user confirmation
- Queue learning progress for sync when online

**Multi-Language Pattern**
- Store content in all 4 languages (MS, EN, ZH, TA) in database
- Serve content based on user's language preference
- Full-text search supports all languages
- Reuse existing i18n infrastructure

### Simplification Decisions

**What We're NOT Building (to reduce scope)**

1. **Custom CMS**: Use simple admin UI built on existing backend patterns instead of sophisticated CMS
2. **ML Recommendation Engine**: Use rule-based matching for MVP (can upgrade later)
3. **Live Video Streaming**: Pre-recorded videos only
4. **Community Features**: No forums or user-generated content (too risky for MVP)
5. **Provider Portal Extensions**: Providers recommend via existing telemedicine integration
6. **Advanced Analytics Dashboard**: Use existing analytics infrastructure
7. **Separate Content Database**: Integrate into existing PostgreSQL database

## Technical Approach

### Frontend Components (React Native)

**New Screen Components**
```
frontend/src/screens/education/
├── EducationHomeScreen.tsx          // Main hub with recommendations
├── ContentDetailScreen.tsx          // Article/video viewer
├── ContentSearchScreen.tsx          // Search and filters
├── QuizScreen.tsx                   // Interactive quiz interface
├── LearningProgressScreen.tsx      // Progress dashboard
└── CategoryBrowseScreen.tsx        // Browse by category
```

**Reusable UI Components**
```
frontend/src/components/education/
├── ContentCard.tsx                 // Preview card for articles/videos
├── RecommendationCarousel.tsx     // Horizontal scroll of recommended content
├── QuizQuestion.tsx               // Quiz question with multiple choice
├── ProgressIndicator.tsx          // Learning progress visualization
├── AchievementBadge.tsx           // Gamification badges
├── ContentFilters.tsx             // Search filters (type, language, topic)
└── DownloadManager.tsx            // Offline content download UI
```

**Integration Points with Existing Components**
- Extend `MedicationDetailScreen` to show inline educational content
- Add education recommendations to `HomeScreen` dashboard
- Integrate with existing `FamilyCircle` for content sharing
- Use existing `CulturalSchedulingEngine` for learning reminders

### Backend Services (Node.js + Express)

**New API Endpoints**
```typescript
// Content Management
GET    /api/education/content              // List content (with filters)
GET    /api/education/content/:id          // Get specific content
GET    /api/education/content/:id/related  // Get related content
POST   /api/education/content              // Create content (admin only)
PUT    /api/education/content/:id          // Update content (admin only)
DELETE /api/education/content/:id          // Delete content (admin only)

// Search & Discovery
GET    /api/education/search               // Full-text search
GET    /api/education/categories           // List categories
GET    /api/education/recommendations      // Personalized recommendations

// Learning Progress
POST   /api/education/progress/view        // Track content view
POST   /api/education/progress/complete    // Mark content complete
GET    /api/education/progress/user        // Get user progress
POST   /api/education/quiz/submit          // Submit quiz answers
GET    /api/education/achievements         // Get user achievements

// Sharing (Family Integration)
POST   /api/education/share                // Share content with family
GET    /api/education/shared               // Get shared content

// Offline Sync
GET    /api/education/sync                 // Batch content sync
POST   /api/education/download             // Request offline content
```

**Database Schema (PostgreSQL)**
```sql
-- Content table (stores all educational content)
CREATE TABLE education_content (
  id UUID PRIMARY KEY,
  type VARCHAR(20) NOT NULL, -- 'article', 'video', 'infographic', 'quiz'
  category VARCHAR(50) NOT NULL,

  -- Multi-language content (JSONB for flexibility)
  title JSONB NOT NULL, -- {ms: '', en: '', zh: '', ta: ''}
  description JSONB NOT NULL,
  content JSONB NOT NULL, -- Full article/video metadata

  -- Metadata
  tags TEXT[],
  related_medications TEXT[], -- Medication IDs
  related_conditions TEXT[], -- ICD-10 codes
  difficulty VARCHAR(20), -- 'beginner', 'intermediate', 'advanced'
  estimated_read_time INT, -- minutes

  -- Medical review
  medical_reviewer VARCHAR(255),
  review_date TIMESTAMP,

  -- Publishing
  published_at TIMESTAMP,
  updated_at TIMESTAMP,
  is_published BOOLEAN DEFAULT false,

  -- Analytics (denormalized for performance)
  view_count INT DEFAULT 0,
  completion_count INT DEFAULT 0,
  average_rating DECIMAL(3,2)
);

-- User progress tracking
CREATE TABLE education_user_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  content_id UUID REFERENCES education_content(id),

  viewed_at TIMESTAMP,
  completed_at TIMESTAMP,
  time_spent INT, -- seconds

  UNIQUE(user_id, content_id)
);

-- Quiz submissions
CREATE TABLE education_quiz_submissions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  quiz_id UUID REFERENCES education_content(id),

  answers JSONB, -- User's answers
  score INT, -- Percentage score
  passed BOOLEAN,
  submitted_at TIMESTAMP
);

-- User achievements
CREATE TABLE education_achievements (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  badge_id VARCHAR(50), -- 'diabetes_expert', '7_day_streak', etc.
  earned_at TIMESTAMP,

  UNIQUE(user_id, badge_id)
);

-- Content recommendations (cache)
CREATE TABLE education_recommendations (
  user_id UUID REFERENCES users(id),
  content_id UUID REFERENCES education_content(id),
  score INT, -- 0-100 relevance score
  reason VARCHAR(50), -- 'medication', 'condition', 'adherence', etc.
  generated_at TIMESTAMP,

  PRIMARY KEY(user_id, content_id)
);

-- Indexes for performance
CREATE INDEX idx_content_category ON education_content(category);
CREATE INDEX idx_content_published ON education_content(published_at) WHERE is_published = true;
CREATE INDEX idx_content_tags ON education_content USING GIN(tags);
CREATE INDEX idx_content_medications ON education_content USING GIN(related_medications);
CREATE INDEX idx_user_progress_user ON education_user_progress(user_id);
CREATE INDEX idx_recommendations_user ON education_recommendations(user_id, score DESC);

-- Full-text search (PostgreSQL)
ALTER TABLE education_content ADD COLUMN search_vector tsvector;
CREATE INDEX idx_content_search ON education_content USING GIN(search_vector);
```

**Key Services**
```typescript
// Content recommendation engine (rule-based)
class ContentRecommendationService {
  async getRecommendations(userId: string): Promise<Content[]> {
    // 1. Get user's medications
    const medications = await getMedicationsByUserId(userId);

    // 2. Match content by medication IDs
    const medicationContent = await getContentByMedications(medications);

    // 3. Detect chronic conditions from medications
    const conditions = detectConditionsFromMedications(medications);

    // 4. Match content by conditions
    const conditionContent = await getContentByConditions(conditions);

    // 5. Check adherence patterns
    const adherence = await getAdherenceRate(userId);
    if (adherence < 0.6) {
      // Low adherence: recommend motivational content
      const motivationalContent = await getMotivationalContent();
      return prioritize([medicationContent, conditionContent, motivationalContent]);
    }

    // 6. Return top 20 recommendations
    return prioritize([medicationContent, conditionContent]).slice(0, 20);
  }
}

// Gamification service
class GamificationService {
  async checkAchievements(userId: string): Promise<Badge[]> {
    const newBadges = [];

    // Check completion milestones
    const completedCount = await getCompletedContentCount(userId);
    if (completedCount >= 10 && !hasBadge(userId, 'learner_10')) {
      newBadges.push(await awardBadge(userId, 'learner_10'));
    }

    // Check quiz performance
    const quizzes = await getQuizSubmissions(userId);
    const passedQuizzes = quizzes.filter(q => q.passed).length;
    if (passedQuizzes >= 5 && !hasBadge(userId, 'quiz_master')) {
      newBadges.push(await awardBadge(userId, 'quiz_master'));
    }

    // Check learning streaks
    const streak = await getLearningStreak(userId);
    if (streak >= 7 && !hasBadge(userId, '7_day_streak')) {
      newBadges.push(await awardBadge(userId, '7_day_streak'));
    }

    return newBadges;
  }
}

// Offline sync service (extends existing)
class EducationSyncService {
  async syncOfflineContent(userId: string): Promise<void> {
    // 1. Get user's recommended content
    const recommended = await getRecommendations(userId);

    // 2. Download article text (lightweight)
    for (const content of recommended.filter(c => c.type === 'article')) {
      await cacheArticleOffline(content);
    }

    // 3. For videos, only download if explicitly requested
    const downloadedVideos = await getDownloadedVideos(userId);
    for (const video of downloadedVideos) {
      await downloadVideoForOffline(video);
    }
  }
}
```

### Infrastructure

**Content Storage & Delivery**
- **S3 Buckets:**
  - `medimatemy-education-content`: Articles (JSON), images, PDFs
  - `medimatemy-education-videos`: Original video files
  - `medimatemy-education-videos-processed`: Transcoded videos (multiple resolutions)
- **CloudFront Distribution:** Fast CDN for global content delivery
- **Video Processing Pipeline:**
  - Upload video → S3
  - Trigger Lambda → MediaConvert
  - Transcode to 480p, 720p, 1080p
  - Generate subtitles (AWS Transcribe for each language)
  - Store processed videos in S3

**Deployment**
- Reuse existing MediMate backend deployment (Kubernetes on AWS)
- Add education service as new container
- Scale independently from core medication services

**Monitoring**
- Extend existing monitoring for new endpoints
- Track content engagement metrics
- Monitor video CDN performance
- Alert on high error rates for content loading

## Implementation Strategy

### Development Phases

**Phase 1: Foundation & Content Infrastructure (Months 1-2)**

**Month 1: Backend Foundation**
- Week 1-2: Database schema design and migration
- Week 2-3: Content CRUD API endpoints
- Week 3-4: Recommendation engine (rule-based)
- Week 4: Admin UI for content creation

**Month 2: Frontend Foundation**
- Week 1-2: Education Hub navigation and screens
- Week 2-3: Content rendering (articles, videos)
- Week 3-4: Search and discovery UI
- Week 4: Integration with medication management module

**Phase 2: Learning Features & Content (Months 3-4)**

**Month 3: Interactive Learning**
- Week 1-2: Quiz system (backend + frontend)
- Week 2-3: Progress tracking and dashboard
- Week 3-4: Gamification (badges, achievements)
- Week 4: Family sharing integration

**Month 4: Content Creation & Polish**
- Week 1-2: Create first 50 content pieces (articles + videos)
- Week 2-3: Translation and medical review
- Week 3-4: Offline functionality
- Week 4: Performance optimization and testing

**Phase 3: Launch Preparation (Month 5)**

**Month 5: Testing & Launch**
- Week 1-2: QA testing (functionality, accessibility, multi-language)
- Week 2-3: Beta user testing and feedback
- Week 3: Bug fixes and refinements
- Week 4: Phased rollout (10% → 50% → 100%)

### Risk Mitigation

**Risk 1: Content Creation Capacity**
- **Mitigation:** Start with top 50 medications/conditions, expand weekly
- **Mitigation:** Leverage existing MOH public health materials
- **Mitigation:** Simplify video production (screencast + voiceover)

**Risk 2: Medical Accuracy & Liability**
- **Mitigation:** Mandatory medical professional review for all content
- **Mitigation:** Clear disclaimers on every content piece
- **Mitigation:** Regular quarterly content audits

**Risk 3: Low User Engagement**
- **Mitigation:** Personalization to increase relevance
- **Mitigation:** Push notifications for recommended content (not spammy)
- **Mitigation:** A/B testing different content formats
- **Mitigation:** Gamification to increase engagement

**Risk 4: Translation Quality**
- **Mitigation:** Professional medical translators (not machine translation)
- **Mitigation:** Bilingual medical professional review
- **Mitigation:** User feedback mechanism for translation issues

### Testing Approach

**Unit Testing**
- API endpoint tests (Jest + Supertest)
- Recommendation engine logic tests
- Quiz scoring logic tests
- React Native component tests (Jest + React Native Testing Library)

**Integration Testing**
- End-to-end content flow (create → publish → view)
- Recommendation accuracy tests
- Offline sync functionality tests
- Family sharing workflows

**Accessibility Testing**
- Screen reader compatibility (iOS VoiceOver, Android TalkBack)
- High contrast mode
- Large font support (14pt - 24pt)
- Keyboard navigation

**Multi-Language Testing**
- Content rendering in all 4 languages
- Search functionality in each language
- Right-to-left text support (if needed for Tamil)
- Cultural adaptation validation

**Performance Testing**
- Content loading time (<2s for articles, <5s for videos)
- Search response time (<500ms)
- Offline content access (<200ms)
- Video streaming performance (adaptive bitrate)

## Task Breakdown Preview

High-level task categories (targeting 8 tasks maximum):

- [ ] **Task 1: Content Infrastructure & Backend API** (Backend foundation, database schema, CRUD endpoints, recommendation engine)
- [ ] **Task 2: Frontend Education Hub UI** (React Native screens, navigation, content rendering, search interface)
- [ ] **Task 3: Interactive Learning System** (Quiz functionality, progress tracking, gamification, achievements)
- [ ] **Task 4: Offline & Sync Capability** (Extend offline sync for education content, download manager, caching)
- [ ] **Task 5: Integration Layer** (Medication module integration, family circle sharing, cultural intelligence hooks)
- [ ] **Task 6: Content Management & Admin Tools** (Admin UI for content creation, medical review workflow, publishing pipeline)
- [ ] **Task 7: Content Creation & Localization** (50+ content pieces in 4 languages, medical review, video production)
- [ ] **Task 8: Testing, Launch & Monitoring** (QA testing, beta program, phased rollout, analytics setup)

**Estimated Total Tasks:** 8 (optimized to leverage existing infrastructure)

## Dependencies

### External Dependencies

**Content Partnerships**
- Malaysian Ministry of Health (MOH): Public health content licensing
- Malaysian Medical Association (MMA): Medical reviewer network
- Medical associations: Disease-specific content (diabetes, heart disease, etc.)

**Technology Vendors**
- AWS: S3, CloudFront, MediaConvert, Transcribe
- Translation Services: Professional medical translation (MS, ZH, TA)
- Video Production: Contracted video production for educational videos

**Regulatory**
- Malaysian Medical Council: Health content guidelines approval
- Personal Data Protection Department: PDPA compliance for learning data

### Internal Dependencies

**Completed Work (from core_med_management epic)**
- ✅ React Native mobile app foundation (iOS 12+, Android 8+)
- ✅ Medication management module (medication data for recommendations)
- ✅ Adherence tracking module (trigger educational interventions)
- ✅ Cultural intelligence module (prayer times, language, halal services)
- ✅ Family Circle module (content sharing infrastructure)
- ✅ Offline sync engine (extend for education content)
- ✅ Authentication system (OAuth 2.0)
- ✅ Multi-language i18n framework (MS, EN, ZH, TA)
- ✅ Redux state management
- ✅ React Navigation

**New Work Required**
- Content recommendation engine (rule-based)
- Quiz system (backend + frontend)
- Gamification service (badges, achievements)
- Admin UI for content creation
- Video processing pipeline (AWS MediaConvert)
- Full-text search (PostgreSQL)

### Team Dependencies

**Backend Team**
- 2 developers, 2 months: Education API, recommendation engine, database schema

**Mobile Team**
- 2 developers, 3 months: Education Hub UI, quiz system, offline functionality

**Content Team**
- 2 medical writers: Create 50+ content pieces (articles)
- 3 translators: Translate content to MS, ZH, TA
- 5 volunteer doctors: Medical review and approval

**Design Team**
- 1 designer: UI/UX for education screens
- 1 video producer: Educational videos (screencasts + voiceover)

**QA Team**
- 2 QA engineers, 1 month: Testing (functionality, accessibility, multi-language)

## Success Criteria (Technical)

### Performance Benchmarks

**Response Times**
- Content list loading: < 1 second
- Article loading: < 2 seconds
- Video streaming start: < 5 seconds
- Search results: < 500ms
- Quiz submission: < 500ms
- Recommendation generation: < 1 second

**Scalability**
- Support 100,000+ concurrent users
- Handle 10,000+ content items
- Video streaming for 5,000 concurrent users
- 500 new content pieces per month (post-launch)

**Offline Performance**
- Cached content accessible within 200ms
- Seamless online/offline transitions
- Background sync when connectivity restored
- Support 7-day offline content access

### Quality Gates

**Code Quality**
- 80%+ unit test coverage for new code
- All API endpoints have integration tests
- TypeScript strict mode enabled
- ESLint with no errors
- Accessibility audit passes (Lighthouse score >90)

**Content Quality**
- 100% medical professional review for all content
- All content in 4 languages (MS, EN, ZH, TA)
- Plain language (Grade 6-8 reading level)
- All videos have subtitles in all 4 languages
- PDPA compliance for all user learning data

**User Experience**
- <3 taps to access any content
- Clear visual hierarchy (elderly-friendly)
- Large touch targets (minimum 44x44 points)
- High contrast mode available
- Font sizes adjustable (14pt - 24pt)

### Acceptance Criteria

**Functional Completeness**
- [ ] Users can browse content by category
- [ ] Users can search content in all 4 languages
- [ ] Users receive personalized recommendations based on medications
- [ ] Users can complete quizzes and receive scores
- [ ] Users can track learning progress with visual dashboard
- [ ] Users can download content for offline access
- [ ] Users can share content with family circle members
- [ ] Gamification badges are awarded for achievements
- [ ] Low adherence triggers educational interventions
- [ ] All content has medical disclaimer

**Integration**
- [ ] Education recommendations appear in medication detail view
- [ ] Adherence module triggers relevant educational content
- [ ] Cultural intelligence respects prayer times for learning reminders
- [ ] Family circle members can share and discuss content
- [ ] Provider portal (future) can assign learning modules

**Performance & Security**
- [ ] All performance benchmarks met
- [ ] PDPA compliance verified for learning data
- [ ] Content encrypted at rest and in transit
- [ ] Rate limiting on all public APIs
- [ ] User data anonymized for analytics

## Estimated Effort

### Overall Timeline: 5 months (400 hours)

**Critical Path Items:**
- Months 1-2: Backend and frontend foundation (160 hours)
- Month 3: Interactive learning features (80 hours)
- Month 4: Content creation and localization (80 hours)
- Month 5: Testing and launch (80 hours)

### Resource Requirements

**Engineering**
- 2 Backend Developers (2 months full-time)
- 2 Mobile Developers (3 months full-time)
- 1 DevOps Engineer (0.5 months for infrastructure setup)

**Content**
- 2 Medical Writers (3 months for 50+ content pieces)
- 3 Translators (2 months for multi-language content)
- 5 Volunteer Doctors (ongoing for medical review)

**Design**
- 1 UI/UX Designer (1 month for screens and flows)
- 1 Video Producer (2 months for educational videos)

**QA**
- 2 QA Engineers (1 month for comprehensive testing)

**Efficiency Multiplier:** 70% time savings through reuse of existing MediMate infrastructure (React Native foundation, backend APIs, offline sync, cultural intelligence, family circle, authentication).

### Budget Considerations

**Infrastructure Costs (Monthly)**
- AWS S3 storage: $200/month (10TB content)
- CloudFront CDN: $500/month (video streaming)
- MediaConvert transcoding: $300/month (video processing)
- Database storage: $100/month (content + user data)
- **Total:** ~$1,100/month

**Content Creation (One-Time)**
- Professional translation: $10,000 (50 articles × 3 languages × $65/article)
- Video production: $15,000 (20 videos × $750/video)
- Medical review: Volunteer (in-kind contribution)
- **Total:** ~$25,000

**Total 5-Month Cost:** ~$30,500 (infrastructure + content)

## Assumptions

**Technical Assumptions**
1. Existing MediMate React Native app is production-ready and stable
2. Backend API infrastructure can handle additional education endpoints
3. PostgreSQL full-text search is sufficient (no need for Elasticsearch)
4. Rule-based recommendation engine provides adequate personalization for MVP
5. AWS services (S3, CloudFront, MediaConvert) meet performance requirements

**Content Assumptions**
1. Malaysian doctors willing to volunteer for medical content review
2. Professional translators available for medical content localization
3. Content shelf life: 6-12 months before requiring updates
4. 50 content pieces sufficient for MVP launch
5. Users primarily consume articles and short videos (not live webinars)

**User Assumptions**
1. Users have defined language preference in profile
2. Users can read at Grade 6-8 level or have caregiver assistance
3. Users motivated to learn if content is relevant and accessible
4. Caregivers actively involved and will use education hub
5. Users have smartphones with internet access and data plans

**Business Assumptions**
1. Education hub is free for all users (no paywall)
2. Improved adherence from education justifies investment
3. Providers will recommend education hub to patients
4. Content creation sustainable with ongoing funding
5. User engagement correlates with adherence improvement

## Out of Scope (MVP)

**Not Included to Reduce Complexity**

1. **Advanced Features:**
   - ❌ ML-based personalization (using rule-based for MVP)
   - ❌ Live webinars or virtual classes
   - ❌ AI chatbot for health questions
   - ❌ User-generated content or forums
   - ❌ Advanced analytics dashboard

2. **Content Types:**
   - ❌ Pediatric health education
   - ❌ Mental health conditions
   - ❌ Surgical procedures
   - ❌ Pregnancy/maternal health
   - ❌ Acute infectious diseases

3. **Integration:**
   - ❌ Wearable device integration
   - ❌ Pharmacy system integration
   - ❌ Insurance company integration
   - ❌ Provider CME credits

4. **Technical:**
   - ❌ Custom CMS (using simple admin UI)
   - ❌ Separate content database
   - ❌ Real-time collaborative learning
   - ❌ AR/VR educational experiences

**Future Phases Considerations**
- Phase 2 (Months 7-12): Advanced personalization, community features, provider tools
- Phase 3 (Year 2+): Live content, AI coaching, expanded content scope

This epic focuses on delivering core educational value while maximizing reuse of existing MediMate infrastructure to achieve rapid time-to-market and high ROI.

## Tasks Created

- [ ] #30 - Content Infrastructure & Backend API (parallel: true, depends on: [])
- [ ] #31 - Frontend Education Hub UI (parallel: true, depends on: [30])
- [ ] #32 - Interactive Learning System (parallel: true, depends on: [30, 31])
- [ ] #33 - Offline & Sync Capability (parallel: true, depends on: [30, 31])
- [ ] #34 - Integration Layer (parallel: true, depends on: [30, 31, 32])
- [ ] #35 - Content Management & Admin Tools (parallel: true, depends on: [30])
- [ ] #36 - Content Creation & Localization (parallel: false, depends on: [35])
- [ ] #37 - Testing, Launch & Monitoring (parallel: false, depends on: [30, 31, 32, 33, 34, 36])

**Total tasks:** 8
**Parallel tasks:** 6 (031-036 can run in parallel after dependencies met)
**Sequential tasks:** 2 (037, 038 must run sequentially at the end)
**Estimated total effort:** 512 hours (~5 months with team of 4-6 developers)
