---
created: 2025-09-07T02:03:54Z
last_updated: 2025-09-07T02:03:54Z
version: 1.0
author: Claude Code PM System
---

# System Patterns & Architectural Decisions

## Core Architectural Patterns

### 1. Monolithic to Microservices Evolution Pattern

#### Current Pattern (MVP Phase)
```typescript
// Monolithic structure with modular separation
interface MonolithicArchitecture {
  structure: "layered-monolith";
  layers: ["controllers", "services", "repositories", "models"];
  modules: ["auth", "medication", "family", "cultural", "provider"];
  separation: "by-feature-within-layers";
}
```

#### Future Pattern (Scale Phase)
```typescript
// Microservices decomposition strategy
interface MicroservicesEvolution {
  services: [
    "user-service",        // Authentication & profiles
    "medication-service",  // Drug database & tracking
    "notification-service", // Reminders & alerts
    "family-service",      // Caregiver features
    "cultural-service",    // Malaysian cultural intelligence
    "analytics-service",   // Adherence insights
    "provider-service"     // Healthcare dashboard
  ];
  communication: "REST + Event-driven";
  dataConsistency: "eventual-consistency";
}
```

### 2. Malaysian Cultural Intelligence Pattern

#### Cultural Adaptation Layer
```typescript
// Cultural intelligence as first-class concern
class CulturalIntelligencePattern {
  // Prayer time integration pattern
  async adjustForPrayerTimes(schedule: MedicationSchedule): Promise<AdjustedSchedule> {
    const prayerTimes = await this.getPrayerTimes(user.location);
    return this.avoidConflicts(schedule, prayerTimes, BUFFER_MINUTES);
  }

  // Festival-aware scheduling
  async adjustForFestivals(medication: Medication): Promise<FestivalAdjustment> {
    const culturalEvents = await this.getMalaysianEvents(dateRange);
    return this.applyFestivalRules(medication, culturalEvents);
  }

  // Multi-language medication processing
  async processMedicationName(name: string, language: SupportedLanguage): Promise<ProcessedMedication> {
    const translations = await this.getMedicationTranslations(name);
    const localContext = await this.getLocalMedicationContext(name, language);
    return this.enrichWithCulturalContext(translations, localContext);
  }
}
```

### 3. Family-Centric Data Pattern

#### Multi-User Family Management
```typescript
// Family circle with role-based access
interface FamilyDataPattern {
  family: {
    id: string;
    members: FamilyMember[];
    roles: ["patient", "primary-caregiver", "secondary-caregiver", "viewer"];
    permissions: RolePermissionMatrix;
    privacySettings: FamilyPrivacyConfig;
  };
  
  // Data access pattern
  accessControl: {
    patientData: "patient-owns";
    familyVisibility: "configurable-by-patient";
    emergencyOverride: "caregiver-access-when-critical";
    auditTrail: "all-access-logged";
  };
}

// Family notification cascade pattern
class FamilyNotificationPattern {
  async notifyFamily(event: MedicationEvent): Promise<NotificationResult> {
    const family = await this.getFamilyCircle(event.userId);
    const notificationRules = await this.getFamilyNotificationRules(family.id);
    
    return this.executeNotificationCascade({
      primary: family.primaryCaregivers,
      secondary: family.secondaryCaregivers,
      escalation: notificationRules.escalationPolicy,
      channels: ["push", "sms", "call"] // Malaysian preference order
    });
  }
}
```

### 4. Healthcare Provider Integration Pattern

#### Provider Dashboard Aggregation
```typescript
// Healthcare provider multi-patient pattern
class ProviderIntegrationPattern {
  // Patient aggregation for provider dashboard
  async getProviderDashboard(providerId: string): Promise<ProviderDashboard> {
    const patients = await this.getProviderPatients(providerId);
    const adherenceData = await this.aggregateAdherenceMetrics(patients);
    const riskStratification = await this.calculateRiskScores(patients);
    
    return {
      totalPatients: patients.length,
      adherenceOverview: adherenceData,
      highRiskPatients: riskStratification.high,
      culturalInsights: await this.getCulturalAdherencePatterns(patients)
    };
  }

  // Clinical decision support pattern
  async generateClinicalAlerts(providerId: string): Promise<ClinicalAlert[]> {
    const patients = await this.getProviderPatients(providerId);
    const adherencePatterns = await this.analyzeAdherencePatterns(patients);
    
    return adherencePatterns
      .filter(p => p.risk >= ALERT_THRESHOLD)
      .map(p => this.createClinicalAlert(p));
  }
}
```

### 5. Offline-First Data Synchronization Pattern

#### Conflict Resolution Strategy
```typescript
// Malaysian connectivity challenges handling
class OfflineFirstPattern {
  // Local-first medication tracking
  async logMedication(medicationLog: MedicationLog): Promise<void> {
    // Always store locally first
    await this.localDB.insert('medication_logs', medicationLog);
    
    // Queue for sync when online
    await this.syncQueue.add({
      operation: 'CREATE',
      table: 'medication_logs',
      data: medicationLog,
      priority: 'HIGH', // Health data gets priority
      timestamp: Date.now()
    });
  }

  // Conflict resolution for family data
  async resolveConflicts(localData: any, serverData: any): Promise<ResolvedData> {
    // Last-writer-wins for non-critical data
    if (localData.lastModified > serverData.lastModified) {
      return localData;
    }
    
    // Special handling for medication data (always prefer most recent log)
    if (localData.type === 'medication_log') {
      return this.resolveMedicationConflict(localData, serverData);
    }
    
    return serverData;
  }
}
```

### 6. Security & Compliance Patterns

#### PDPA-Compliant Data Handling
```typescript
// Malaysian Personal Data Protection Act compliance
class PDPACompliancePattern {
  // Consent management pattern
  async handleDataAccess(userId: string, dataType: DataType): Promise<AccessResult> {
    const consent = await this.getActiveConsent(userId, dataType);
    
    if (!consent || consent.expired) {
      return { 
        allowed: false, 
        reason: 'CONSENT_REQUIRED',
        renewalRequired: true 
      };
    }
    
    // Log access for audit trail (PDPA requirement)
    await this.auditLog.record({
      userId,
      dataType,
      accessReason: consent.purpose,
      timestamp: new Date()
    });
    
    return { allowed: true };
  }

  // Data anonymization pattern
  async anonymizeUserData(userId: string): Promise<AnonymizationResult> {
    // Replace PII with anonymous identifiers
    const anonymousId = await this.generateAnonymousId();
    
    // Keep aggregated data for population health insights
    await this.preserveAnonymizedInsights(userId, anonymousId);
    
    // Remove all personal identifiers
    await this.removePersonalData(userId);
    
    return { anonymousId, preservedInsights: true };
  }
}
```

### 7. Malaysian Healthcare System Integration Pattern

#### Multi-Provider Healthcare Data
```typescript
// Integration with Malaysian healthcare ecosystem
class HealthcareIntegrationPattern {
  // MOH (Ministry of Health) integration
  async syncWithMOH(patientIC: string, consentToken: string): Promise<MOHData> {
    try {
      const mohData = await this.mohAPI.getPatientData(patientIC, consentToken);
      return this.transformMOHData(mohData);
    } catch (error) {
      // Graceful degradation - app works without MOH integration
      this.logger.warn('MOH integration unavailable', { error });
      return this.createManualEntryFallback();
    }
  }

  // Private healthcare integration pattern
  async integratePrivateHealthcare(providerId: string): Promise<PrivateHealthcareData> {
    const integrations = {
      'KPJ': () => this.kpjAPI.getPatientData(providerId),
      'IHH': () => this.ihhAPI.fetchMedicationHistory(providerId),
      'Pantai': () => this.pantaiAPI.retrievePatientData(providerId)
    };

    // Try all available integrations
    const results = await Promise.allSettled(
      Object.entries(integrations).map(([system, fn]) => fn())
    );

    return this.consolidateHealthcareData(results);
  }
}
```

### 8. Cultural Event-Driven Architecture

#### Malaysian Cultural Event Processing
```typescript
// Event-driven cultural adaptations
class CulturalEventPattern {
  // Ramadan medication adjustment pattern
  async handleRamadanEvent(event: RamadanEvent): Promise<void> {
    const affectedUsers = await this.getMuslimUsers();
    
    for (const user of affectedUsers) {
      const medications = await this.getUserMedications(user.id);
      const adjustedSchedule = await this.adjustForRamadan(medications);
      
      await this.notifyUser(user.id, {
        type: 'RAMADAN_MEDICATION_ADJUSTMENT',
        adjustedSchedule,
        culturalContext: 'Adjusted for Ramadan fasting hours'
      });
    }
  }

  // Chinese New Year medication timing
  async handleChineseNewYear(event: CNYEvent): Promise<void> {
    const chineseUsers = await this.getUsersByCulture('chinese');
    const familyGatheringDays = event.familyGatheringDays;
    
    // Adjust medication reminders for family gathering schedules
    for (const user of chineseUsers) {
      await this.adjustForFamilyGatherings(user.id, familyGatheringDays);
    }
  }
}
```

### 9. Performance & Scalability Patterns

#### Malaysian Geography-Aware Caching
```typescript
// Malaysian region-specific optimization
class MalaysianCachePattern {
  // Cache prayer times by Malaysian state
  async cachePrayerTimesByRegion(): Promise<void> {
    const malaysianStates = [
      'KL', 'Selangor', 'Johor', 'Penang', 'Perak', 
      'Kedah', 'Kelantan', 'Terengganu', 'Pahang',
      'Negeri Sembilan', 'Melaka', 'Sabah', 'Sarawak'
    ];

    for (const state of malaysianStates) {
      const prayerTimes = await this.prayerTimeAPI.getTimes(state);
      await this.cache.set(`prayer:${state}:${today}`, prayerTimes, 86400);
    }
  }

  // Cultural calendar optimization
  async cacheMalaysianHolidays(): Promise<void> {
    const holidays = await this.getMalaysianHolidays(currentYear);
    const culturalEvents = await this.getCulturalEvents(currentYear);
    
    await this.cache.set('MY:holidays:' + currentYear, holidays, 31536000); // 1 year
    await this.cache.set('MY:cultural:' + currentYear, culturalEvents, 31536000);
  }
}
```

### 10. Error Handling & Resilience Patterns

#### Healthcare-Grade Error Handling
```typescript
// Critical health data protection
class HealthcareResiliencePattern {
  // Circuit breaker for critical services
  async callCriticalService(serviceCall: () => Promise<any>): Promise<any> {
    const circuitBreaker = this.getCircuitBreaker('critical-health-service');
    
    try {
      return await circuitBreaker.fire(serviceCall);
    } catch (error) {
      // Critical health operations must never fail silently
      await this.alertHealthcareCriticalFailure(error);
      throw new HealthcareCriticalError('Critical service unavailable', error);
    }
  }

  // Medication data integrity protection
  async saveMedicationLog(log: MedicationLog): Promise<void> {
    const transaction = await this.db.transaction();
    
    try {
      await transaction.insert('medication_logs', log);
      await transaction.insert('medication_audit', {
        operation: 'CREATE',
        data: log,
        timestamp: new Date()
      });
      
      await transaction.commit();
      
      // Backup to secondary storage for critical health data
      await this.backupToSecondaryStorage(log);
    } catch (error) {
      await transaction.rollback();
      // Health data failures require immediate attention
      await this.alertDataIntegrityFailure(error, log);
      throw error;
    }
  }
}
```

## Pattern Integration Strategy

These patterns work together to create a cohesive system that prioritizes:

1. **Malaysian Cultural Intelligence** - Deep integration of local customs and practices
2. **Family-Centric Healthcare** - Multi-generational care coordination
3. **Healthcare-Grade Security** - PDPA compliance and data protection
4. **Offline-First Reliability** - Works in Malaysian connectivity conditions
5. **Provider Integration** - Seamless healthcare ecosystem connectivity
6. **Scalable Architecture** - Growth from MVP to regional leader

Each pattern addresses specific Malaysian healthcare challenges while maintaining international software engineering best practices.