---
created: 2025-09-07T02:03:54Z
last_updated: 2025-09-07T02:03:54Z
version: 1.0
author: Claude Code PM System
---

# Project Style Guide

## Code Style Standards

### TypeScript/JavaScript Standards

#### Naming Conventions
```typescript
// Variables and functions: camelCase
const medicationSchedule = getMedicationSchedule();
const culturalAdjustments = calculatePrayerTimeAdjustments();

// Classes and interfaces: PascalCase
class MedicationService {}
interface FamilyMember {}
type CulturalEvent = 'ramadan' | 'chinese-new-year' | 'deepavali';

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const MALAYSIAN_PRAYER_TIMES_API_URL = 'https://api.islamicfinder.org';

// Database fields: snake_case
const user_id = result.user_id;
const created_at = result.created_at;

// API endpoints: kebab-case
'/api/v1/medication-tracking'
'/api/v1/cultural-adjustments'
```

#### Function Structure
```typescript
// Healthcare functions must be explicit and well-documented
async function calculateMedicationAdherence(
  userId: string,
  timeRange: DateRange
): Promise<AdherenceMetrics> {
  // Input validation (critical for healthcare data)
  if (!userId || !isValidUUID(userId)) {
    throw new ValidationError('Invalid user ID provided');
  }

  // Business logic with clear steps
  const medicationLogs = await getMedicationLogs(userId, timeRange);
  const scheduledDoses = await getScheduledDoses(userId, timeRange);
  
  return {
    adherenceRate: calculateAdherenceRate(medicationLogs, scheduledDoses),
    missedDoses: calculateMissedDoses(medicationLogs, scheduledDoses),
    culturalFactors: await analyzeCulturalImpact(medicationLogs)
  };
}
```

#### Error Handling Patterns
```typescript
// Healthcare-grade error handling
class HealthcareError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'low' | 'medium' | 'high' | 'critical'
  ) {
    super(message);
    this.name = 'HealthcareError';
  }
}

// Always handle errors gracefully with user-friendly messages
try {
  const result = await saveMedicationLog(medicationData);
} catch (error) {
  if (error instanceof HealthcareError && error.severity === 'critical') {
    // Critical healthcare errors require immediate alerting
    await alertHealthcareTeam(error);
  }
  
  // Log for debugging but show user-friendly message
  logger.error('Medication save failed', { error, userId: medicationData.userId });
  throw new UserFriendlyError('Unable to save medication. Please try again.');
}
```

### Malaysian Cultural Code Standards

#### Cultural Context Integration
```typescript
// Malaysian cultural data should be strongly typed
interface MalaysianCulturalContext {
  religion: 'islam' | 'christianity' | 'hinduism' | 'buddhism' | 'sikhism' | 'taoism' | 'other';
  ethnicity: 'malay' | 'chinese' | 'indian' | 'indigenous' | 'other';
  primaryLanguage: 'ms' | 'en' | 'zh' | 'ta';
  region: MalaysianState;
  prayerTimePreferences?: PrayerTimeSettings;
  festivalObservances: CulturalEvent[];
}

// Cultural adjustments must be explicit and respectful
async function adjustMedicationForCulture(
  medication: Medication,
  culturalContext: MalaysianCulturalContext
): Promise<CulturallyAdjustedMedication> {
  const adjustments: CulturalAdjustment[] = [];

  // Prayer time adjustments for Muslim users
  if (culturalContext.religion === 'islam' && culturalContext.prayerTimePreferences) {
    adjustments.push(await adjustForPrayerTimes(medication, culturalContext));
  }

  // Festival period adjustments
  for (const festival of culturalContext.festivalObservances) {
    const festivalAdjustment = await adjustForFestival(medication, festival);
    if (festivalAdjustment) {
      adjustments.push(festivalAdjustment);
    }
  }

  return {
    ...medication,
    culturalAdjustments: adjustments,
    adjustmentReason: 'Adjusted for Malaysian cultural practices'
  };
}
```

#### Multi-Language Support Pattern
```typescript
// Language handling must be consistent across the platform
interface LanguageSupport {
  ms: string; // Bahasa Malaysia (primary)
  en: string; // English (secondary)
  zh?: string; // Chinese (optional)
  ta?: string; // Tamil (optional)
}

const medicationReminders: Record<string, LanguageSupport> = {
  'medication-due': {
    ms: 'Masa untuk mengambil ubat {{medicationName}}',
    en: 'Time to take your {{medicationName}}',
    zh: '该服用 {{medicationName}} 了',
    ta: '{{medicationName}} மருந்து எடுக்க வேண்டிய நேரம்'
  }
};

function getLocalizedMessage(
  key: string, 
  language: SupportedLanguage, 
  variables?: Record<string, string>
): string {
  const template = medicationReminders[key]?.[language] || medicationReminders[key]?.en;
  if (!template) return key;
  
  return Object.entries(variables || {}).reduce(
    (message, [variable, value]) => message.replace(`{{${variable}}}`, value),
    template
  );
}
```

### Database Style Standards

#### Schema Naming
```sql
-- Table names: snake_case, plural
CREATE TABLE medication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    medication_id UUID NOT NULL REFERENCES medications(id),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_time TIMESTAMP WITH TIME ZONE,
    status medication_status NOT NULL,
    cultural_adjustments JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index naming: idx_table_columns_purpose
CREATE INDEX idx_medication_logs_user_status_time 
ON medication_logs (user_id, status, scheduled_time)
WHERE status IN ('missed', 'late');

-- Malaysian-specific indexes
CREATE INDEX idx_users_cultural_context_region 
ON users (cultural_context->>'religion', cultural_context->>'region')
WHERE cultural_context IS NOT NULL;
```

#### Data Integrity Standards
```sql
-- Healthcare data must have strict constraints
ALTER TABLE medication_logs 
ADD CONSTRAINT chk_medication_logs_time_logic 
CHECK (actual_time IS NULL OR actual_time >= scheduled_time - INTERVAL '2 hours');

-- Malaysian cultural data validation
ALTER TABLE users 
ADD CONSTRAINT chk_users_malaysian_region 
CHECK (
    cultural_context->>'region' IN (
        'kuala_lumpur', 'selangor', 'johor', 'penang', 'perak',
        'kedah', 'kelantan', 'terengganu', 'pahang', 'negeri_sembilan',
        'melaka', 'sabah', 'sarawak', 'putrajaya', 'labuan'
    )
);
```

### API Design Standards

#### RESTful API Patterns
```typescript
// API routes must be consistent and predictable
const apiRoutes = {
  // Resource-based URLs
  medications: '/api/v1/medications',
  medicationById: '/api/v1/medications/:id',
  
  // Family-specific endpoints
  familyMembers: '/api/v1/families/:familyId/members',
  familyMedications: '/api/v1/families/:familyId/medications',
  
  // Cultural endpoints
  culturalEvents: '/api/v1/cultural/events',
  prayerTimes: '/api/v1/cultural/prayer-times/:region',
  
  // Healthcare provider endpoints
  providerDashboard: '/api/v1/providers/:providerId/dashboard',
  providerPatients: '/api/v1/providers/:providerId/patients'
};

// Response format must be consistent
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: PaginationMeta;
    culturalContext?: MalaysianCulturalContext;
  };
}
```

#### Malaysian Healthcare API Standards
```typescript
// Healthcare provider integration must be secure and audited
async function integrateWithMOH(
  patientIC: string,
  consentToken: string,
  providerCredentials: ProviderCredentials
): Promise<MOHIntegrationResult> {
  // Audit trail for healthcare data access
  await auditLogger.log({
    action: 'MOH_DATA_ACCESS',
    patientIC: hash(patientIC), // Never log actual IC
    providerId: providerCredentials.providerId,
    timestamp: new Date(),
    consentToken: hash(consentToken)
  });

  // Always validate consent before accessing healthcare data
  const consentValid = await validateMOHConsent(patientIC, consentToken);
  if (!consentValid) {
    throw new HealthcareError('Invalid consent for MOH data access', 'CONSENT_INVALID', 'high');
  }

  // Implementation with proper error handling
  try {
    return await mohAPI.getPatientData(patientIC, consentToken, providerCredentials);
  } catch (error) {
    // Healthcare integration failures must be handled gracefully
    logger.warn('MOH integration unavailable, falling back to manual entry', { error });
    return createManualEntryFallback();
  }
}
```

### Frontend Style Standards

#### React Native Component Structure
```typescript
// Components must be strongly typed and culturally aware
interface MedicationCardProps {
  medication: Medication;
  culturalContext: MalaysianCulturalContext;
  onTaken: (medicationId: string) => void;
  onSkipped: (medicationId: string, reason: string) => void;
}

const MedicationCard: React.FC<MedicationCardProps> = ({
  medication,
  culturalContext,
  onTaken,
  onSkipped
}) => {
  // Cultural adaptation in UI components
  const localizedName = getLocalizedMedicationName(medication, culturalContext.primaryLanguage);
  const culturalReminder = getCulturalReminder(medication, culturalContext);
  
  return (
    <Card style={styles.medicationCard}>
      <Text style={styles.medicationName}>{localizedName}</Text>
      {culturalReminder && (
        <Text style={styles.culturalNote}>{culturalReminder}</Text>
      )}
      <View style={styles.actionButtons}>
        <Button onPress={() => onTaken(medication.id)} title="Sudah Ambil" />
        <Button onPress={() => onSkipped(medication.id, 'forgot')} title="Terlupa" />
      </View>
    </Card>
  );
};
```

#### Cultural UI Guidelines
```typescript
// Malaysian UI considerations
const malaysianUITheme = {
  colors: {
    primary: '#1976d2', // Professional blue
    secondary: '#dc004e', // Malaysian red
    islamic: '#0d7b3b', // Islamic green
    chinese: '#d4212d', // Chinese red
    indian: '#ff9800', // Saffron orange
  },
  
  fonts: {
    malay: 'Roboto', // Good Malay character support
    chinese: 'Noto Sans SC', // Simplified Chinese
    tamil: 'Noto Sans Tamil', // Tamil script
  },
  
  accessibility: {
    minimumTouchTarget: 44, // Elderly-friendly touch targets
    textScaling: true, // Support system text scaling
    highContrast: true, // Support high contrast mode
  }
};
```

### Testing Standards

#### Healthcare Testing Requirements
```typescript
// Healthcare functions must have comprehensive tests
describe('MedicationAdherenceCalculator', () => {
  describe('calculateAdherenceRate', () => {
    it('should calculate correct adherence rate for complete adherence', async () => {
      const medicationLogs = createMockMedicationLogs(10, 'taken');
      const scheduledDoses = createMockScheduledDoses(10);
      
      const result = await calculateAdherenceRate(medicationLogs, scheduledDoses);
      
      expect(result).toBe(1.0);
    });

    it('should handle cultural adjustments in adherence calculation', async () => {
      const ramadanMedicationLogs = createRamadanAdjustedLogs();
      const scheduledDoses = createMockScheduledDoses(30);
      
      const result = await calculateAdherenceRate(ramadanMedicationLogs, scheduledDoses);
      
      // Should account for Ramadan fasting adjustments
      expect(result).toBeGreaterThan(0.8);
    });

    it('should throw error for invalid input data', async () => {
      await expect(calculateAdherenceRate(null, [])).rejects.toThrow(ValidationError);
    });
  });
});

// Cultural feature testing
describe('MalaysianCulturalIntegration', () => {
  it('should adjust medication timing for Maghrib prayer', async () => {
    const medication = createMockMedication({ time: '19:00' });
    const culturalContext = createMockCulturalContext({ religion: 'islam' });
    
    const adjusted = await adjustMedicationForCulture(medication, culturalContext);
    
    expect(adjusted.culturalAdjustments).toContainEqual(
      expect.objectContaining({ type: 'prayer-time-avoidance' })
    );
  });
});
```

### Documentation Standards

#### Function Documentation
```typescript
/**
 * Calculates medication adherence rate with Malaysian cultural considerations
 * 
 * @param userId - UUID of the patient
 * @param timeRange - Date range for adherence calculation
 * @param culturalContext - Malaysian cultural context for adjustments
 * @returns Promise resolving to adherence metrics with cultural insights
 * 
 * @example
 * ```typescript
 * const adherence = await calculateMedicationAdherence(
 *   'user-123',
 *   { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
 *   { religion: 'islam', region: 'kuala_lumpur' }
 * );
 * console.log(`Adherence rate: ${adherence.adherenceRate * 100}%`);
 * ```
 * 
 * @throws {ValidationError} When userId is invalid
 * @throws {HealthcareError} When calculation fails critically
 */
async function calculateMedicationAdherence(
  userId: string,
  timeRange: DateRange,
  culturalContext?: MalaysianCulturalContext
): Promise<AdherenceMetrics> {
  // Implementation
}
```

### Security Standards

#### Healthcare Data Protection
```typescript
// All healthcare data must be encrypted at rest and in transit
class HealthDataEncryption {
  private static readonly ENCRYPTION_KEY = process.env.HEALTH_ENCRYPTION_KEY;
  
  static async encryptHealthData(data: HealthData): Promise<EncryptedData> {
    // Use AES-256-GCM for healthcare data
    const cipher = crypto.createCipher('aes-256-gcm', this.ENCRYPTION_KEY);
    const encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex') + cipher.final('hex');
    
    return {
      encrypted,
      authTag: cipher.getAuthTag().toString('hex'),
      timestamp: new Date().toISOString()
    };
  }
  
  // Never log actual health data
  static sanitizeForLogging(data: any): any {
    return {
      ...data,
      patientIC: data.patientIC ? '[REDACTED]' : undefined,
      medicationNames: data.medicationNames ? '[REDACTED]' : undefined,
      healthData: '[REDACTED]'
    };
  }
}
```

This style guide ensures consistent, secure, culturally-sensitive development practices across the MediMate platform while maintaining healthcare-grade quality and Malaysian cultural authenticity.