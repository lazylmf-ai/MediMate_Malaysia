# MediMate Malaysia - Technical Implementation Guide

## 1. Architecture Decision Framework

### 1.1 Microservices vs Monolithic Architecture
**Decision: Start Monolithic, Migrate to Microservices**

```javascript
// Phase 1: Monolithic (MVP - Months 1-6)
MediMate-API/
├── authentication/
├── medication-management/
├── reminder-system/
├── family-circle/
├── healthcare-provider/
└── shared-utilities/

// Phase 2: Microservices (Months 6-12)
├── user-service (authentication, profiles)
├── medication-service (drug database, tracking)
├── notification-service (reminders, alerts)
├── family-service (caregiver features)
├── analytics-service (adherence insights)
├── provider-service (healthcare dashboard)
└── cultural-service (prayer times, calendar)
```

**Rationale:**
- **MVP Speed:** Monolithic allows faster initial development with Claude Code
- **Future Scale:** Microservices enable independent scaling of high-load components
- **Team Size:** Monolithic suitable for small team, microservices when team grows

### 1.2 Technology Stack

#### Core Backend Stack
```javascript
// Node.js + Express + TypeScript
const techStack = {
  runtime: 'Node.js 18+',
  framework: 'Express.js with TypeScript',
  database: 'PostgreSQL 14+ with Redis caching',
  authentication: 'JWT with refresh tokens',
  fileStorage: 'AWS S3 with CloudFront CDN',
  messaging: 'AWS SQS + SNS for notifications',
  monitoring: 'AWS CloudWatch + Sentry',
  deployment: 'Docker containers on AWS ECS'
};
```

#### Mobile App Stack
```javascript
// React Native with TypeScript
const mobileStack = {
  framework: 'React Native 0.72+',
  language: 'TypeScript',
  stateManagement: 'Redux Toolkit + RTK Query',
  navigation: 'React Navigation 6',
  ui: 'Native Base + custom components',
  offline: 'Redux Persist + SQLite',
  notifications: 'React Native Firebase',
  analytics: 'Firebase Analytics + Crashlytics'
};
```

## 2. Database Design & Scaling Strategy

### 2.1 PostgreSQL Schema Design

```sql
-- Core User Schema
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ic_number VARCHAR(12) UNIQUE, -- Malaysian IC format
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(15),
    preferred_language VARCHAR(5) DEFAULT 'ms',
    cultural_profile JSONB, -- Religion, meal times, prayer schedules
    family_id UUID REFERENCES families(id),
    role VARCHAR(20) DEFAULT 'patient', -- patient, caregiver, both
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Family Circle Management
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_name VARCHAR(100),
    family_code VARCHAR(8) UNIQUE, -- For invitations
    settings JSONB, -- Notification preferences, privacy settings
    created_at TIMESTAMP DEFAULT NOW()
);

-- Medication Management
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    medication_name VARCHAR(200),
    dosage VARCHAR(100),
    frequency VARCHAR(50), -- daily, twice_daily, weekly, etc.
    schedule_times TIME[], -- Array of times to take medication
    cultural_adjustments JSONB, -- Prayer time avoidance, meal timing
    active BOOLEAN DEFAULT true,
    prescribed_by VARCHAR(200), -- Doctor/Healthcare provider name
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Adherence Tracking
CREATE TABLE adherence_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id UUID REFERENCES medications(id),
    user_id UUID REFERENCES users(id),
    scheduled_time TIMESTAMP,
    actual_time TIMESTAMP,
    status VARCHAR(20), -- taken, missed, late, early
    notes TEXT,
    location_taken VARCHAR(100), -- home, work, travel
    family_verified BOOLEAN DEFAULT false,
    healthcare_provider_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Healthcare Provider Integration
CREATE TABLE healthcare_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(200),
    provider_type VARCHAR(50), -- hospital, clinic, pharmacy
    registration_number VARCHAR(50), -- Malaysian professional registration
    contact_info JSONB,
    subscription_tier VARCHAR(20), -- basic, professional, enterprise
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cultural Calendar Integration
CREATE TABLE cultural_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(100),
    event_type VARCHAR(50), -- islamic, chinese, indian, christian, national
    event_date DATE,
    affects_medication BOOLEAN DEFAULT false,
    adjustment_rules JSONB, -- How to adjust medication timing
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.2 Database Partitioning Strategy

```sql
-- User partitioning by Malaysian states for performance
CREATE TABLE users_kl PARTITION OF users FOR VALUES IN ('KL');
CREATE TABLE users_selangor PARTITION OF users FOR VALUES IN ('Selangor');
CREATE TABLE users_penang PARTITION OF users FOR VALUES IN ('Penang');
CREATE TABLE users_johor PARTITION OF users FOR VALUES IN ('Johor');

-- Adherence data partitioning by time for analytics performance
CREATE TABLE adherence_logs_2024_q1 PARTITION OF adherence_logs 
FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE adherence_logs_2024_q2 PARTITION OF adherence_logs 
FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- Indexing strategy for Malaysian healthcare queries
CREATE INDEX idx_adherence_provider_date ON adherence_logs 
(healthcare_provider_id, created_at) WHERE status IN ('missed', 'late');

CREATE INDEX idx_family_notifications ON users 
(family_id) WHERE role = 'caregiver';

CREATE INDEX idx_medication_schedule ON medications 
(user_id, active, schedule_times) WHERE active = true;
```

### 2.3 Caching Strategy with Redis

```javascript
// Malaysian-specific caching patterns
class CacheStrategy {
  // Cache prayer times for major Malaysian cities
  async cachePrayerTimes() {
    const cities = ['KL', 'Johor', 'Penang', 'Sabah', 'Sarawak'];
    for (const city of cities) {
      const prayerTimes = await getPrayerTimes(city);
      await redis.setex(`prayer:${city}:${today}`, 86400, JSON.stringify(prayerTimes));
    }
  }
  
  // Cache medication database for faster lookup
  async cacheMedicationDB() {
    // Cache top 1000 most prescribed medications in Malaysia
    const topMeds = await db.query(`
      SELECT * FROM medications 
      WHERE country = 'MY' 
      ORDER BY prescription_frequency DESC 
      LIMIT 1000
    `);
    await redis.setex('medications:top:MY', 3600, JSON.stringify(topMeds));
  }

  // Cache family notification preferences
  async cacheFamilySettings(familyId) {
    const settings = await db.query(`
      SELECT notification_preferences FROM families WHERE id = $1
    `, [familyId]);
    await redis.setex(`family:${familyId}:settings`, 1800, JSON.stringify(settings));
  }
}
```

## 3. Mobile App Technical Architecture

### 3.1 React Native Advanced Setup

```javascript
// App.js - Production-ready setup
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ErrorBoundary } from 'react-error-boundary';

// Malaysian-specific configuration
const malaysianConfig = {
  defaultLanguage: 'ms', // Bahasa Malaysia
  supportedLanguages: ['ms', 'en', 'zh', 'ta'],
  defaultTimezone: 'Asia/Kuala_Lumpur',
  culturalCalendar: 'malaysian',
  prayerTimeProvider: 'islamic-finder',
  currencyFormat: 'MYR',
  dateFormat: 'DD/MM/YYYY'
};

const App = () => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Provider store={store}>
        <PersistGate loading={<SplashScreen />} persistor={persistor}>
          <MalaysianCulturalProvider config={malaysianConfig}>
            <OfflineProvider>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </OfflineProvider>
          </MalaysianCulturalProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
};
```

### 3.2 Offline-First Implementation

```javascript
// Advanced offline sync for Malaysian connectivity challenges
class OfflineSyncManager {
  constructor() {
    this.syncQueue = [];
    this.conflictResolver = new ConflictResolver();
    this.retryPolicy = new ExponentialBackoff();
  }
  
  async handleMedicationTracking(medicationData) {
    // Always store locally first
    await SQLite.insertMedicationLog(medicationData);
    
    // Queue for sync when online
    this.syncQueue.push({
      type: 'MEDICATION_TAKEN',
      data: medicationData,
      timestamp: Date.now(),
      priority: 'HIGH' // Health data gets priority
    });
    
    // Immediate family notification (works offline via SMS)
    if (medicationData.familyNotification && !navigator.onLine) {
      await this.sendOfflineFamilyNotification(medicationData);
    }
  }
  
  async sendOfflineFamilyNotification(data) {
    // Use SMS as backup when internet unavailable
    const smsService = new TwilioSMSService();
    const message = this.generateFamilyNotificationSMS(data);
    await smsService.send(data.familyPhoneNumber, message);
  }

  async syncWhenOnline() {
    if (!navigator.onLine) return;
    
    // Sort by priority and timestamp
    this.syncQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority === 'HIGH' ? -1 : 1;
      }
      return a.timestamp - b.timestamp;
    });

    // Sync in batches
    while (this.syncQueue.length > 0) {
      const batch = this.syncQueue.splice(0, 10);
      try {
        await this.syncBatch(batch);
      } catch (error) {
        // Add failed items back to queue with retry count
        batch.forEach(item => {
          item.retryCount = (item.retryCount || 0) + 1;
          if (item.retryCount < 3) {
            this.syncQueue.push(item);
          }
        });
      }
    }
  }
}
```

### 3.3 Cultural Intelligence Components

```javascript
// Malaysian Cultural Integration Components
class CulturalIntelligenceManager {
  constructor() {
    this.prayerTimeAPI = new IslamicFinderAPI();
    this.holidayCalendar = new MalaysianHolidayCalendar();
    this.languageProcessor = new MultiLanguageProcessor();
  }

  async adjustMedicationForPrayerTimes(medication, userLocation) {
    const prayerTimes = await this.prayerTimeAPI.getTimes(userLocation);
    const adjustedSchedule = [];

    medication.scheduleTimes.forEach(time => {
      // Avoid scheduling during prayer times
      const adjustedTime = this.avoidPrayerConflict(time, prayerTimes);
      adjustedSchedule.push(adjustedTime);
    });

    return {
      ...medication,
      scheduleTimes: adjustedSchedule,
      culturalAdjustments: {
        prayerTimesConsidered: true,
        adjustmentReason: 'Scheduled to avoid prayer times',
        originalTimes: medication.scheduleTimes
      }
    };
  }

  async checkRamadanAdjustments(medication) {
    const isRamadan = await this.holidayCalendar.isRamadan();
    if (!isRamadan) return medication;

    // Adjust medication times for fasting
    const iftar = await this.prayerTimeAPI.getIftarTime();
    const suhoor = await this.prayerTimeAPI.getSuhoorTime();

    return {
      ...medication,
      ramadanSchedule: {
        iftarDose: iftar,
        suhoorDose: suhoor,
        specialInstructions: 'Adjusted for Ramadan fasting'
      }
    };
  }

  generateMultilingualReminder(medication, language) {
    const templates = {
      ms: `Masa untuk mengambil ubat ${medication.name}. Dos: ${medication.dosage}`,
      en: `Time to take your ${medication.name}. Dosage: ${medication.dosage}`,
      zh: `该服用 ${medication.name} 了。剂量：${medication.dosage}`,
      ta: `${medication.name} மருந்து எடுக்க வேண்டிய நேரம். அளவு: ${medication.dosage}`
    };

    return templates[language] || templates.en;
  }
}
```

## 4. Healthcare System Integration

### 4.1 Malaysian Healthcare API Integration

```javascript
// MOH (Ministry of Health) API Integration
class MOHIntegration {
  constructor() {
    this.apiBase = process.env.MOH_API_BASE;
    this.credentials = {
      clientId: process.env.MOH_CLIENT_ID,
      clientSecret: process.env.MOH_CLIENT_SECRET
    };
  }
  
  // Integration with Malaysian public healthcare
  async syncWithPublicHealthcare(patientIC, consentToken) {
    try {
      // Authenticate with MOH systems
      const authToken = await this.authenticateWithMOH();
      
      // Get patient prescription data (with consent)
      const prescriptions = await axios.get(
        `${this.apiBase}/patients/${patientIC}/prescriptions`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Consent-Token': consentToken,
            'X-Facility-Code': 'MEDIMATE_APP'
          }
        }
      );
      
      // Transform MOH data to our format
      return this.transformMOHPrescriptions(prescriptions.data);
      
    } catch (error) {
      // Graceful degradation - app works without MOH integration
      logger.warn('MOH integration unavailable, continuing with manual entry');
      return { source: 'manual', prescriptions: [] };
    }
  }
  
  // Send adherence reports back to healthcare providers
  async reportAdherenceToProviders(patientData) {
    const report = {
      patientId: patientData.ic,
      adherenceRate: patientData.adherenceRate,
      missedDoses: patientData.missedDoses,
      concerns: patientData.flaggedConcerns,
      reportDate: new Date().toISOString(),
      culturalFactors: patientData.culturalAdjustments
    };
    
    await this.sendToMOH(report);
    await this.sendToRegisteredPharmacists(report);
  }

  transformMOHPrescriptions(mohData) {
    return mohData.prescriptions.map(prescription => ({
      medicationName: prescription.drug_name,
      dosage: prescription.strength,
      frequency: this.convertMOHFrequency(prescription.frequency),
      instructions: prescription.instructions_malay,
      prescribingDoctor: prescription.doctor_name,
      facility: prescription.facility_name,
      dateIssued: prescription.issue_date,
      malaysianDrugCode: prescription.drug_code
    }));
  }
}

// Private Healthcare Integration
class PrivateHealthcareAPI {
  // Integration with major private hospital groups
  async integrateWithKPJ(patientId) {
    const kpjAPI = new KPJHealthcareAPI();
    return await kpjAPI.getPatientPrescriptions(patientId);
  }
  
  async integrateWithIHH(patientId) {
    const ihhAPI = new IHHHealthcareAPI();
    return await ihhAPI.fetchMedicationHistory(patientId);
  }
  
  async integrateWithPantai(patientId) {
    const pantaiAPI = new PantaiHoldingsAPI();
    return await pantaiAPI.retrievePatientData(patientId);
  }
}
```

## 5. Security & Compliance Implementation

### 5.1 PDPA (Personal Data Protection Act) Compliance

```javascript
class PDPAComplianceManager {
  async handleDataConsent(userId, dataTypes) {
    const consent = {
      userId,
      dataTypes, // ['health', 'location', 'family', 'communications']
      consentDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      purposes: [
        'medication_adherence_tracking',
        'family_notifications',
        'healthcare_provider_reporting',
        'cultural_adjustment_optimization'
      ],
      rightsInformed: {
        accessRight: true,
        correctionRight: true,
        deletionRight: true,
        portabilityRight: true
      },
      consentLanguage: 'ms', // User's preferred language
      digitalSignature: await this.generateConsentSignature(userId)
    };
    
    await ConsentRepository.store(consent);
    await this.scheduleConsentRenewal(consent);
    return consent;
  }
  
  async handleDataDeletion(userId) {
    // Right to be forgotten implementation
    const deletionTasks = [
      this.anonymizeHealthData(userId),
      this.removePersonalIdentifiers(userId),
      this.notifyDataProcessors(userId),
      this.updateFamilyConnections(userId),
      this.notifyHealthcareProviders(userId)
    ];
    
    await Promise.all(deletionTasks);
    
    // Audit trail (required by PDPA)
    await AuditLog.record({
      action: 'DATA_DELETION',
      userId,
      timestamp: new Date(),
      completedTasks: deletionTasks.length,
      legalBasis: 'USER_REQUEST_RIGHT_TO_BE_FORGOTTEN'
    });
  }

  async anonymizeHealthData(userId) {
    // Replace PII with anonymous identifiers while preserving analytics value
    const anonymousId = await this.generateAnonymousId();
    
    await db.query(`
      UPDATE adherence_logs 
      SET user_id = $1, 
          notes = 'ANONYMIZED',
          location_taken = 'ANONYMIZED'
      WHERE user_id = $2
    `, [anonymousId, userId]);
    
    // Keep aggregate data for population health insights
    await db.query(`
      INSERT INTO anonymous_adherence_patterns 
      (anonymous_id, adherence_rate, cultural_factors, age_range)
      SELECT $1, AVG(adherence_rate), cultural_factors, age_range
      FROM user_adherence_summary WHERE user_id = $2
    `, [anonymousId, userId]);
  }
}

// Healthcare-grade encryption
class HealthDataEncryption {
  async encryptHealthData(data, userId) {
    // AES-256-GCM encryption for health data
    const key = await this.deriveUserKey(userId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      encryptionTimestamp: new Date().toISOString()
    };
  }

  async decryptHealthData(encryptedData, userId) {
    const key = await this.deriveUserKey(userId);
    const decipher = crypto.createDecipher('aes-256-gcm', key, 
      Buffer.from(encryptedData.iv, 'base64'));
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData.encrypted, 'base64')),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
  }
}
```

## 6. Scalability & Performance

### 6.1 Auto-scaling Configuration

```yaml
# AWS ECS Service Definition
version: '3.8'
services:
  medimate-api:
    image: medimate/api:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 30s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        max_attempts: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - MOH_API_KEY=${MOH_API_KEY}
      - PRAYER_TIME_API_KEY=${PRAYER_TIME_API_KEY}
    
  # Auto-scaling policy
  auto_scaling:
    target_cpu_percent: 70
    min_replicas: 2
    max_replicas: 20
    scale_up_cooldown: 300s
    scale_down_cooldown: 300s
```

### 6.2 Database Performance Optimization

```sql
-- Optimizations for Malaysian healthcare queries
-- Index for fast adherence lookups by healthcare provider
CREATE INDEX CONCURRENTLY idx_adherence_provider_status 
ON adherence_logs (healthcare_provider_id, status, created_at)
WHERE status IN ('missed', 'late');

-- Partial index for active medications only
CREATE INDEX CONCURRENTLY idx_active_medications 
ON medications (user_id, medication_name) 
WHERE active = true;

-- Index for family notification queries
CREATE INDEX CONCURRENTLY idx_family_notifications 
ON users (family_id) INCLUDE (phone_number, notification_preferences)
WHERE role = 'caregiver';

-- Performance monitoring function
CREATE OR REPLACE FUNCTION monitor_adherence_performance()
RETURNS TABLE(avg_response_time numeric, query_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(total_time)::numeric(10,2) as avg_response_time,
    COUNT(*) as query_count
  FROM pg_stat_statements 
  WHERE query LIKE '%adherence_logs%'
  AND calls > 100;
END;
$$ LANGUAGE plpgsql;

-- Malaysian-specific query optimizations
CREATE MATERIALIZED VIEW malaysian_adherence_insights AS
SELECT 
    DATE_TRUNC('week', created_at) as week,
    COUNT(*) as total_doses,
    COUNT(*) FILTER (WHERE status = 'taken') as successful_doses,
    COUNT(*) FILTER (WHERE status = 'missed') as missed_doses,
    AVG(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as adherence_rate,
    EXTRACT(DOW FROM created_at) as day_of_week,
    cultural_factors
FROM adherence_logs al
JOIN users u ON al.user_id = u.id
WHERE u.country = 'MY'
GROUP BY week, day_of_week, cultural_factors;

-- Refresh materialized view daily
CREATE OR REPLACE FUNCTION refresh_malaysian_insights()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY malaysian_adherence_insights;
END;
$$ LANGUAGE plpgsql;
```

## 7. Development Workflow & CI/CD

### 7.1 Development Environment Setup

```bash
#!/bin/bash
# Development environment setup script

# Install dependencies
npm install

# Setup local PostgreSQL with Malaysian test data
createdb medimate_dev
psql medimate_dev < scripts/malaysia_seed_data.sql

# Setup Redis for caching
redis-server --daemonize yes

# Setup environment variables
cp .env.example .env.local

# Install mobile development tools
npm install -g @react-native-community/cli
cd mobile && npm install

# Setup Malaysian cultural data
node scripts/populate-cultural-calendar.js
node scripts/populate-prayer-times.js

echo "Development environment ready!"
echo "Run 'npm run dev' to start the API server"
echo "Run 'npm run mobile:android' to start the mobile app"
```

### 7.2 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: MediMate Malaysia CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: medimate_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run Malaysian cultural tests
      run: npm run test:cultural

    - name: Run security tests
      run: npm run test:security

    - name: Run integration tests
      run: npm run test:integration
      env:
        DATABASE_URL: postgresql://postgres:testpass@localhost:5432/medimate_test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to AWS ECS
      run: |
        aws ecs update-service \
          --cluster medimate-cluster \
          --service medimate-api \
          --force-new-deployment
```

## 8. Monitoring & Analytics

### 8.1 Application Monitoring

```javascript
// Comprehensive monitoring setup
class MonitoringSystem {
  constructor() {
    this.metrics = new PrometheusMetrics();
    this.logger = new StructuredLogger();
    this.alerting = new AlertManager();
  }

  // Healthcare-specific metrics
  trackMedicationAdherence() {
    this.metrics.histogram('medication_adherence_rate', {
      buckets: [0.5, 0.7, 0.8, 0.9, 0.95, 1.0],
      labels: ['user_type', 'cultural_group', 'age_range']
    });
  }

  trackCulturalAdjustments() {
    this.metrics.counter('cultural_adjustments_made', {
      labels: ['adjustment_type', 'religion', 'effectiveness']
    });
  }

  trackHealthcareProviderEngagement() {
    this.metrics.gauge('active_healthcare_providers', {
      labels: ['provider_type', 'region', 'subscription_tier']
    });
  }

  // Malaysian-specific error tracking
  trackErrors(error, context) {
    this.logger.error('Application Error', {
      error: error.message,
      stack: error.stack,
      context,
      country: 'MY',
      culturalContext: context.culturalFactors,
      timestamp: new Date().toISOString()
    });

    // Alert for critical healthcare errors
    if (context.isCritical) {
      this.alerting.sendAlert({
        severity: 'high',
        message: 'Critical healthcare error in Malaysian system',
        details: { error, context }
      });
    }
  }
}
```

This technical implementation guide provides a comprehensive foundation for building MediMate Malaysia with Malaysian cultural intelligence, healthcare system integration, and scalable architecture designed specifically for the Malaysian market.