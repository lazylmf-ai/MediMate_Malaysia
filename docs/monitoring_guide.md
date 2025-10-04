# MediMate Education Hub - Monitoring and Alerting Guide

## Table of Contents
1. [Overview](#overview)
2. [Monitoring Architecture](#monitoring-architecture)
3. [Key Metrics](#key-metrics)
4. [Dashboards](#dashboards)
5. [Alerting](#alerting)
6. [Real User Monitoring (RUM)](#real-user-monitoring-rum)
7. [Analytics](#analytics)
8. [Incident Response](#incident-response)
9. [Runbooks](#runbooks)
10. [Best Practices](#best-practices)

## Overview

The MediMate Education Hub monitoring and alerting infrastructure provides comprehensive observability into system health, user engagement, and business metrics. This guide covers all monitoring tools, dashboards, alerts, and procedures for maintaining a healthy production environment.

### Monitoring Stack

- **Application Performance Monitoring (APM):** AWS CloudWatch + CloudWatch Logs
- **Real User Monitoring (RUM):** AWS CloudWatch RUM (web) + Firebase Analytics (mobile)
- **Infrastructure Monitoring:** AWS CloudWatch for ECS, RDS, CloudFront
- **Analytics:** Google Analytics 4 for user behavior and engagement
- **Alerting:** CloudWatch Alarms → PagerDuty (critical) + Slack (warning/info)
- **Log Aggregation:** CloudWatch Logs with Insights queries

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interactions                        │
└───────────────┬─────────────────────────────────────────────────┘
                │
    ┌───────────┴────────────┐
    │                        │
┌───▼────┐            ┌──────▼──────┐
│  Web   │            │   Mobile    │
│ (RUM)  │            │ (Firebase)  │
└───┬────┘            └──────┬──────┘
    │                        │
    └───────────┬────────────┘
                │
        ┌───────▼────────┐
        │  Education Hub │
        │      API       │
        └───┬────────┬───┘
            │        │
    ┌───────▼──┐  ┌──▼──────────┐
    │CloudWatch│  │  Custom     │
    │  Metrics │  │  Metrics    │
    └───┬──────┘  └──┬──────────┘
        │            │
        └─────┬──────┘
              │
    ┌─────────▼──────────┐
    │  CloudWatch        │
    │  Dashboards        │
    └─────────┬──────────┘
              │
    ┌─────────▼──────────┐
    │  CloudWatch        │
    │  Alarms            │
    └─────┬──────┬───────┘
          │      │
    ┌─────▼──┐ ┌─▼──────┐
    │PagerDuty│ │ Slack  │
    └─────────┘ └────────┘
```

## Key Metrics

### 1. User Engagement Metrics

#### Daily/Weekly/Monthly Active Users (DAU/WAU/MAU)
- **What:** Unique users who accessed Education Hub in the time period
- **Target:** DAU > 500, WAU > 1,500, MAU > 3,000
- **Tracked via:** Custom CloudWatch metrics + GA4
- **Alert:** Info alert if DAU < 100

```typescript
// Publishing DAU metric
await userEngagementMetrics.trackDailyActiveUser(userId, {
  Environment: 'production',
  Language: userLanguage,
  DeviceType: deviceType
});
```

#### Session Duration
- **What:** Average time users spend per session
- **Target:** > 5 minutes
- **Tracked via:** RUM + Custom metrics
- **Alert:** Info alert if average < 2 minutes

#### Content Views per User
- **What:** Average number of content pieces viewed per session
- **Target:** > 3 content pieces per session
- **Tracked via:** Custom metrics + GA4
- **Alert:** Info alert if < 1.5

### 2. Content Performance Metrics

#### Content View Rate
- **What:** Percentage of users who view content
- **Target:** > 50% of active users
- **Tracked via:** GA4 + Custom metrics
- **Alert:** Info if < 30%

#### Content Completion Rate
- **What:** Percentage of started content that is completed
- **Target:** > 60%
- **Tracked via:** Custom metrics
- **Formula:** `(completions / views) * 100`

```typescript
// Track content view
await contentPerformanceMetrics.trackContentView(contentId, {
  ContentType: 'article',
  ContentCategory: 'diabetes',
  Language: 'ms'
});

// Track content completion
await contentPerformanceMetrics.trackContentCompletion(contentId, {
  ContentType: 'article',
  Language: 'ms'
});
```

#### Average Read Time
- **What:** Average time spent reading/watching content
- **Target:** Articles > 2 minutes, Videos > 70% of duration
- **Tracked via:** Custom metrics + GA4

### 3. Learning Metrics

#### Quiz Completion Rate
- **What:** Percentage of started quizzes that are completed
- **Target:** > 80%
- **Tracked via:** Custom metrics
- **Alert:** Info if < 50%

#### Quiz Pass Rate
- **What:** Percentage of completed quizzes that pass
- **Target:** > 70%
- **Tracked via:** Custom metrics
- **Alert:** Info if < 50% (may indicate quiz is too difficult)

#### Average Quiz Score
- **What:** Average score across all quiz attempts
- **Target:** > 75%
- **Tracked via:** Custom metrics

```typescript
// Track quiz completion
await learningActivityMetrics.trackQuizCompletion(quizId, {
  ContentType: 'article',
  Language: 'ms'
});

await learningActivityMetrics.trackQuizScore(scorePercentage, {
  ContentType: 'article',
  Language: 'ms'
});

if (passed) {
  await learningActivityMetrics.trackQuizPass({ Language: 'ms' });
}
```

### 4. Video Performance Metrics

#### Video Playback Success Rate
- **What:** Percentage of video starts that play without errors
- **Target:** > 95%
- **Tracked via:** Custom metrics
- **Alert:** Warning if < 90%, Critical if < 85%

```typescript
// Track video start
await videoPerformanceMetrics.trackVideoStart(videoId, {
  ContentType: 'video',
  Language: 'ms'
});

// Track video error (if occurs)
await videoPerformanceMetrics.trackVideoError(videoId, {
  ContentType: 'video',
  Language: 'ms'
});
```

#### Video Completion Rate
- **What:** Percentage of started videos that are watched to completion
- **Target:** > 60%
- **Tracked via:** Custom metrics + GA4

#### Average Watch Time
- **What:** Average duration users watch videos
- **Target:** > 70% of video duration
- **Tracked via:** Custom metrics + GA4

### 5. Technical Performance Metrics

#### API Response Time
- **What:** Time for API to respond to requests
- **Targets:**
  - p50 < 500ms
  - p95 < 1000ms
  - p99 < 2000ms
- **Tracked via:** CloudWatch (ALB metrics) + Custom metrics
- **Alert:** Warning if p95 > 2000ms, Critical if p95 > 3000ms

```typescript
// Track API call duration
const startTime = Date.now();
// ... API processing ...
const duration = Date.now() - startTime;

await apiPerformanceMetrics.trackAPICall('/education/v1/content', duration, {
  Environment: 'production'
});
```

#### Error Rate
- **What:** Percentage of API requests that return errors
- **Target:** < 0.1%
- **Tracked via:** CloudWatch (ALB) + Custom metrics
- **Alert:** Warning if > 0.5%, Critical if > 1%

#### Database Query Performance
- **What:** Time for database queries to execute
- **Target:** p95 < 500ms
- **Tracked via:** Custom metrics
- **Alert:** Warning if p95 > 500ms

#### Mobile App Crash Rate
- **What:** App crashes per 1000 sessions
- **Target:** < 1 per 1000 sessions
- **Tracked via:** Firebase Crashlytics
- **Alert:** Warning if > 5, Critical if > 10

### 6. Recommendation Engine Metrics

#### Recommendation Click-Through Rate (CTR)
- **What:** Percentage of recommendations clicked
- **Target:** > 15%
- **Tracked via:** GA4 + Custom metrics
- **Alert:** Info if < 10%

```typescript
// Track recommendation click
await recommendationMetrics.trackRecommendationClick(position, {
  ContentType: 'article',
  Language: 'ms'
});
```

#### Recommendation Relevance Score
- **What:** User-rated relevance of recommendations (1-10)
- **Target:** > 7.0
- **Tracked via:** Custom metrics
- **Alert:** Info if < 6.0

### 7. Offline Usage Metrics

#### Offline Download Success Rate
- **What:** Percentage of downloads that complete successfully
- **Target:** > 95%
- **Tracked via:** Custom metrics + Firebase

#### Sync Success Rate
- **What:** Percentage of sync operations that succeed
- **Target:** > 95%
- **Tracked via:** Custom metrics
- **Alert:** Warning if < 90%

## Dashboards

### 1. CloudWatch Dashboard (Production Overview)

**Location:** AWS Console → CloudWatch → Dashboards → `MediMate-EducationHub-Production`

**File:** `infrastructure/monitoring/cloudwatch_dashboard.json`

**Key Widgets:**
- API Response Time (p50, p95, p99)
- API Error Rate
- Content API Performance
- Database Query Performance
- Active Users (DAU, WAU, MAU)
- Content Engagement Metrics
- Video Playback Metrics
- CDN Performance
- Memory and CPU Utilization
- Error Types Distribution
- Mobile App Crash Rate
- Offline Usage Metrics
- Language Distribution
- Search Performance
- Recommendation Engine Performance
- Recent Error Logs
- Authentication System Health

**Refresh:** Auto-refresh every 5 minutes

### 2. Google Analytics 4 Dashboard

**Location:** GA4 Console → Reports → Education Hub Custom Reports

**File:** `infrastructure/analytics/analytics_dashboard.json`

**Sections:**
1. **Overview:** DAU, WAU, MAU, total content views
2. **User Engagement:** Session duration, content views per user, completion rates, return user rate
3. **Content Performance:** Most viewed content, completion rates by type/category, read time, ratings
4. **Learning Outcomes:** Quiz attempts, completion rate, pass rate, average scores, achievements
5. **Video Performance:** Video starts, completion rate, success rate, watch time, errors
6. **Recommendations:** CTR, relevance score, performance by type
7. **Offline Usage:** Downloads, playbacks, offline usage rate, sync success
8. **Technical Performance:** Response times, error rates, crash rate, search performance
9. **User Feedback:** Ratings, bug reports, feature requests

**Export:** Daily/Weekly/Monthly automated reports to product team

### 3. Real-Time Monitoring Dashboard

**Purpose:** Monitor live traffic and detect issues immediately

**Key Metrics (1-minute intervals):**
- Active sessions (real-time)
- Requests per second
- Error rate (last 5 minutes)
- p99 response time
- Active video streams
- Current crash rate

## Alerting

### Alert Severity Levels

#### P0 - Critical (PagerDuty + Slack)
**Response Time:** 15 minutes

**Alerts:**
- `api_error_rate_critical` - Error rate > 1%
- `api_completely_down` - No healthy ECS tasks
- `authentication_system_failure` - Auth failure rate > 50%
- `database_connection_failure` - DB connection errors > 10
- `memory_utilization_critical` - Memory > 90%

**Notification Channels:**
- PagerDuty (on-call engineer)
- Slack #medimate-alerts-critical (@oncall @channel)

#### P1 - Warning (Slack + Email)
**Response Time:** 1 hour

**Alerts:**
- `api_error_rate_warning` - Error rate > 0.5%
- `api_response_time_slow` - p95 > 2 seconds
- `video_playback_failure_rate` - Video errors > 5%
- `cdn_cache_hit_rate_low` - Cache hit rate < 80%
- `mobile_crash_rate_high` - Crashes > 5 per 1000 sessions
- `database_query_slow` - p95 query time > 500ms
- `search_performance_degraded` - Search time > 500ms
- `cpu_utilization_high` - CPU > 80%
- `sync_conflicts_elevated` - Sync conflicts > 10/hour

**Notification Channels:**
- Slack #medimate-alerts-warning (@oncall)
- Email to oncall@medimate.my

#### P2/P3 - Info (Email only)
**Response Time:** 24 hours

**Alerts:**
- `daily_active_users_low` - DAU < 100
- `content_engagement_low` - View rate < 30%
- `quiz_completion_rate_low` - Completion < 20%
- `recommendation_click_rate_low` - CTR < 15%

**Notification Channels:**
- Email to product-team@medimate.my

### Alert Configuration

**File:** `infrastructure/monitoring/alerts_config.yaml`

**Example Alert Definition:**
```yaml
- name: api_error_rate_critical
  description: API error rate exceeds critical threshold (1%)
  metric: MediMate/EducationHub/ErrorRate
  threshold: 1.0
  comparison: GreaterThanThreshold
  evaluation_periods: 2
  period: 300
  statistic: Average
  actions:
    - pagerduty_critical
    - slack_critical
  runbook: runbooks/api_error_rate.md
```

### Composite Alarms

**Purpose:** Combine multiple signals to reduce false positives

```yaml
- name: education_hub_health_degraded
  description: Multiple health indicators showing degradation
  alarm_rule: >
    ALARM(api_error_rate_warning) OR
    ALARM(api_response_time_slow) OR
    ALARM(video_playback_failure_rate)
  actions:
    - slack_warning
    - email_oncall
```

### Scheduled Reports

**Daily Usage Summary:**
- Schedule: 9 AM MYT daily
- Metrics: DAU, content views, quiz attempts, video playbacks, error rate, avg response time
- Recipients: product-team@medimate.my

**Weekly Engagement Report:**
- Schedule: 10 AM MYT every Monday
- Metrics: WAU, content completion rate, quiz pass rate, recommendation CTR, video success rate, avg session duration, language distribution
- Recipients: product-team@medimate.my, leadership@medimate.my

## Real User Monitoring (RUM)

### Web RUM (AWS CloudWatch RUM)

**Configuration File:** `infrastructure/monitoring/rum_config.js`

**Setup:**
```javascript
import { AwsRum } from 'aws-rum-web';

const awsRum = new AwsRum(
  'medimate-education-hub',
  '1.0.0',
  'https://dataplane.rum.ap-southeast-1.amazonaws.com',
  {
    sessionSampleRate: 1.0,
    telemetries: ['performance', 'errors', 'http', 'interaction'],
    allowCookies: true,
    enableXRay: true
  }
);
```

**Tracked Automatically:**
- Page load performance (LCP, FID, CLS, FCP, TTFB)
- JavaScript errors
- HTTP requests to Education Hub API
- User interactions (clicks, scrolls)

**Custom Events:**
```javascript
// Track content view
awsRum.recordEvent('content_view', {
  content_id: '123',
  content_type: 'article',
  content_category: 'diabetes'
});
```

### Mobile RUM (Firebase Analytics)

**Configuration File:** `infrastructure/monitoring/rum_config.js`

**Setup (React Native):**
```javascript
import analytics from '@react-native-firebase/analytics';

// Track screen view
await analytics().logScreenView({
  screen_name: 'ContentDetail',
  screen_class: 'ContentDetailScreen'
});

// Track custom event
await analytics().logEvent('content_view', {
  content_id: '123',
  content_type: 'article'
});
```

**Tracked Automatically:**
- Screen views
- App opens/updates
- Crashes (via Crashlytics)
- User engagement
- Session duration

## Analytics

### Google Analytics 4 Event Tracking

**Configuration File:** `infrastructure/analytics/ga4_events.ts`

**Implementation:**
```typescript
import { initializeGA4Tracker } from './infrastructure/analytics/ga4_events';

// Initialize tracker
const ga4 = initializeGA4Tracker('G-XXXXXXXXXX', false);

// Track content view
ga4.trackContentView({
  content_id: '123',
  content_name: 'Managing Diabetes',
  content_type: 'article',
  content_category: 'diabetes',
  content_language: 'ms',
  is_recommended: true,
  recommendation_position: 1
});

// Track quiz completion
ga4.trackQuizCompletion({
  quiz_id: '456',
  quiz_name: 'Diabetes Quiz',
  score: 85,
  total_questions: 10,
  correct_answers: 8,
  time_taken_seconds: 120,
  passed: true,
  pass_threshold: 70
});
```

**Event Categories:**
- Content Discovery (search, view, recommendations)
- Content Consumption (completion, time spent)
- Learning Activities (quiz, achievements, streaks)
- Video Events (start, progress, completion, errors)
- Engagement (recommendations, sharing, ratings)
- Offline Usage (downloads, playback, sync)
- User Preferences (language, settings)
- Errors and Performance

### Custom Metrics

**Configuration File:** `infrastructure/analytics/custom_metrics.ts`

**Usage:**
```typescript
import {
  userEngagementMetrics,
  contentPerformanceMetrics,
  learningActivityMetrics
} from './infrastructure/analytics/custom_metrics';

// Track DAU
await userEngagementMetrics.trackDailyActiveUser(userId, {
  Environment: 'production',
  Language: 'ms',
  DeviceType: 'mobile'
});

// Track content view
await contentPerformanceMetrics.trackContentView(contentId, {
  ContentType: 'article',
  ContentCategory: 'diabetes'
});

// Track quiz completion
await learningActivityMetrics.trackQuizCompletion(quizId, {
  ContentType: 'article'
});
```

## Incident Response

### Incident Severity Definitions

**P0 (Critical):**
- Education Hub completely down
- Data breach or security vulnerability
- Authentication system failure
- **Response Time:** 15 minutes
- **Escalation:** Engineering Manager (30 min), CTO (1 hour)

**P1 (High):**
- Major feature broken (video playback, search)
- API error rate > 5%
- Affecting > 50% of users
- **Response Time:** 1 hour
- **Escalation:** Engineering Manager (2 hours)

**P2 (Medium):**
- Minor feature broken
- Affecting < 50% of users
- Workaround available
- **Response Time:** 4 hours

**P3 (Low):**
- Cosmetic issues
- Feature enhancement
- Documentation issues
- **Response Time:** 24 hours

### Incident Response Process

1. **Alert Received**
   - Acknowledge in PagerDuty/Slack
   - Create incident channel (#incident-YYYY-MM-DD-description)
   - Post initial status message

2. **Assess Severity**
   - Determine impact (users affected, features broken)
   - Classify severity (P0-P3)
   - Identify relevant runbook

3. **Investigate**
   - Follow runbook procedures
   - Check dashboards, logs, metrics
   - Identify root cause

4. **Resolve**
   - Apply fix (rollback, scale, config change)
   - Verify resolution
   - Monitor for stability

5. **Communicate**
   - Update stakeholders every 10-30 minutes
   - Post resolution message
   - Schedule post-mortem (P0/P1)

6. **Post-Mortem**
   - Document timeline
   - Perform 5 Whys root cause analysis
   - Create action items
   - Update runbooks

### Communication Templates

**Initial Alert:**
```
:rotating_light: INCIDENT: [Brief Description]

Severity: P0/P1/P2
Status: INVESTIGATING
Impact: [User impact]
Start Time: [TIME]

Actions in progress:
- [Action 1]
- [Action 2]

Next update in 10 minutes.
```

**Resolution:**
```
:white_check_mark: RESOLVED: [Brief Description]

Duration: [X minutes]
Root Cause: [Summary]
Resolution: [What was done]

Service is now operational. Monitoring for stability.
Post-mortem scheduled for [DATE/TIME].
```

## Runbooks

Operational runbooks for common incidents are located in `infrastructure/monitoring/runbooks/`:

### Available Runbooks

1. **[API Error Rate](../infrastructure/monitoring/runbooks/api_error_rate.md)** - High API error rate (P0/P1)
2. **[API Down](../infrastructure/monitoring/runbooks/api_down.md)** - Education Hub completely down (P0)
3. **[Video Playback Issues](../infrastructure/monitoring/runbooks/video_playback.md)** - High video failure rate (P1)
4. **Database Connection Issues** - Database connectivity problems (P0)
5. **Slow API Performance** - Degraded API response times (P1)
6. **CDN Performance** - CloudFront/CDN issues (P1)
7. **Mobile Crashes** - Elevated mobile app crash rate (P1)
8. **Search Performance** - Search queries slow or failing (P2)
9. **Sync Conflicts** - Offline sync issues (P2)

### Runbook Structure

Each runbook contains:
- **Severity and alert name**
- **Symptoms** - How to identify the issue
- **Immediate actions** - First 5-15 minutes
- **Investigation steps** - How to diagnose root cause
- **Resolution steps** - Scenario-specific fixes
- **Verification** - How to confirm resolution
- **Communication templates**
- **Post-incident actions**
- **Related runbooks**
- **Contacts**

## Best Practices

### 1. Monitoring

- **Set realistic thresholds** based on historical data
- **Use percentiles** (p95, p99) instead of averages for latency
- **Monitor user experience** not just infrastructure
- **Track business metrics** alongside technical metrics
- **Use composite alarms** to reduce false positives

### 2. Alerting

- **Avoid alert fatigue** - only alert on actionable issues
- **Use appropriate severity levels** - don't over-page
- **Include runbook links** in all alerts
- **Test alerts regularly** - ensure they fire correctly
- **Review and tune** thresholds quarterly

### 3. Dashboards

- **Group related metrics** together
- **Use appropriate visualizations** (line charts for trends, pie charts for distribution)
- **Show thresholds** on charts (warning/critical lines)
- **Add comparison periods** (vs previous day/week)
- **Keep dashboards simple** - one dashboard per audience

### 4. Incident Response

- **Follow the runbook** - don't improvise in emergencies
- **Communicate frequently** - over-communication is better than under
- **Document everything** - timestamps, actions, observations
- **Always do post-mortems** for P0/P1 incidents
- **Focus on prevention** - improve systems to avoid recurrence

### 5. Analytics

- **Track conversion funnels** (view → completion → quiz → pass)
- **Segment by dimensions** (language, device, content type)
- **A/B test features** and measure impact
- **Review metrics weekly** with product team
- **Use data to drive decisions** - not gut feelings

### 6. Privacy and Compliance

- **Anonymize IP addresses** in analytics
- **Don't track PII** (email, IC number, phone)
- **Provide opt-out** for analytics
- **Follow PDPA requirements** for data retention
- **Document data collection** in privacy policy

## Appendix

### Useful Commands

**Check current error rate:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace MediMate/EducationHub \
  --metric-name ErrorRate \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

**View recent error logs:**
```bash
aws logs tail /aws/ecs/medimate-education-hub \
  --since 1h \
  --filter-pattern "ERROR"
```

**Check ECS service health:**
```bash
aws ecs describe-services \
  --cluster medimate-production \
  --services education-hub-api \
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}'
```

### Contacts

- **On-call Engineer:** Check PagerDuty rotation
- **Engineering Manager:** eng-manager@medimate.my
- **DevOps Lead:** devops-lead@medimate.my
- **Product Manager:** product@medimate.my
- **CTO:** cto@medimate.my
- **AWS Support:** Enterprise support (Priority: Business-critical)

### Additional Resources

- [AWS CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [Google Analytics 4 Documentation](https://support.google.com/analytics/answer/10089681)
- [Firebase Analytics Documentation](https://firebase.google.com/docs/analytics)
- [PagerDuty Best Practices](https://www.pagerduty.com/resources/learn/incident-response-best-practices/)
- [SRE Book - Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
