# MediMate Malaysia API Integration Layer

Complete API integration layer for MediMate Malaysia healthcare platform, providing comprehensive access to 60+ backend endpoints with Malaysian cultural intelligence, PDPA compliance, and enhanced performance optimization.

## 🏗️ Architecture Overview

```
frontend/src/api/
├── index.ts                     # Main API exports
├── endpoints.ts                 # Endpoint configuration
├── types.ts                     # TypeScript type definitions
├── client.ts                    # Enhanced HTTP client with retry/caching
├── services/
│   ├── healthService.ts         # System health & context
│   ├── culturalService.ts       # Cultural intelligence services
│   ├── patientService.ts        # Patient management with PDPA
│   ├── appointmentService.ts    # Cultural-aware appointments
│   ├── medicationService.ts     # Halal medication management
│   ├── realtimeService.ts       # WebSocket & notifications
│   ├── fhirService.ts          # HL7 FHIR R4 integration
│   ├── developerService.ts     # API keys & sandbox
│   ├── documentationService.ts  # API docs & guides
│   └── authService.ts          # Enhanced authentication
└── README.md                   # This documentation
```

## 🚀 Quick Start

```typescript
import { 
  healthService, 
  culturalService, 
  patientService,
  performanceMonitor,
  logger 
} from '@/api';

// Initialize performance monitoring
performanceMonitor.start();

// Check system health
const health = await healthService.getHealthStatus();
console.log('System status:', health.data?.status);

// Get prayer times with cultural context
const prayerTimes = await culturalService.getPrayerTimes('KUL');
console.log('Today\'s prayer times:', prayerTimes.data?.prayer_times);

// Create culturally-aware patient
const patient = await patientService.createPatient({
  personal_info: {
    name: 'Ahmad bin Abdullah',
    mykad_number: '800101-01-1234',
    date_of_birth: '1980-01-01',
    gender: 'male',
    race: 'Malay',
    religion: 'Islam',
    nationality: 'Malaysian'
  },
  cultural_preferences: {
    primary_language: 'ms',
    prayer_time_notifications: true,
    halal_medication_only: true
  },
  pdpa_consent: {
    data_processing: true,
    marketing: false,
    third_party_sharing: false,
    consent_date: new Date().toISOString()
  }
});
```

## 📡 API Services

### Health & System Service
```typescript
import { healthService } from '@/api';

// System health check
const health = await healthService.getHealthStatus();
const context = await healthService.getMalaysianContext();
const states = await healthService.getSupportedStates();
```

### Cultural Intelligence Service
```typescript
import { culturalService } from '@/api';

// Prayer times for Malaysian states
const prayers = await culturalService.getPrayerTimes('KUL', '2024-04-15');
const currentStatus = await culturalService.getCurrentPrayerStatus('KUL');

// Halal medication validation
const halalCheck = await culturalService.validateMedicationHalal({
  medication_name: 'Paracetamol 500mg',
  manufacturer: 'Duopharma Biotech',
  active_ingredients: ['paracetamol']
});

// Healthcare text translation
const translation = await culturalService.translateText({
  text: 'Take twice daily after meals',
  target_language: 'ms',
  source_language: 'en',
  context: { domain: 'prescription', urgency: 'medium' }
});

// Ramadan information
const ramadan = await culturalService.getRamadanInfo(2024);
const isRamadanPeriod = await culturalService.isRamadanPeriod();
```

### Patient Management Service
```typescript
import { patientService } from '@/api';

// List patients with filtering
const patients = await patientService.getPatients({
  page: 1,
  limit: 20,
  search: 'Ahmad',
  race: 'Malay'
});

// Get patient with cultural context
const patient = await patientService.getPatientById('patient-123');
const culturalContext = await patientService.getPatientCulturalContext('patient-123');

// Search by cultural preferences
const muslimPatients = await patientService.getPatientsWithCulturalPreferences({
  halalMedicationOnly: true,
  prayerTimeNotifications: true,
  preferredLanguage: 'ms'
});

// Get statistics
const stats = await patientService.getPatientStatistics();
```

### Appointment Service
```typescript
import { appointmentService } from '@/api';

// List appointments with prayer time context
const appointments = await appointmentService.getAppointments({
  date_from: '2024-04-01',
  date_to: '2024-04-30',
  include_prayer_conflicts: true
});

// Create culturally-aware appointment
const appointment = await appointmentService.createAppointment({
  patient_id: 'patient-123',
  provider_id: 'provider-456',
  appointment_date: '2024-04-15',
  appointment_time: '14:00',
  duration_minutes: 30,
  cultural_considerations: {
    avoid_prayer_times: true,
    ramadan_friendly: true,
    preferred_language: 'ms'
  }
});

// Get available time slots with cultural considerations
const slots = await appointmentService.getAvailableTimeSlots(
  'provider-456',
  '2024-04-15',
  30,
  'KUL'
);

// Get appointment suggestions
const suggestions = await appointmentService.getAppointmentSuggestions(
  'patient-123',
  'provider-456',
  '2024-04-15',
  'KUL'
);
```

### Medication Service
```typescript
import { medicationService } from '@/api';

// Search medications with halal filtering
const medications = await medicationService.searchMedications('paracetamol', {
  halalOnly: true,
  category: 'analgesic'
});

// Get halal-only medications
const halalMeds = await medicationService.getHalalMedications('antibiotic');

// Create medication schedule with cultural considerations
const schedule = await medicationService.createMedicationSchedule({
  medication_id: 'med-123',
  patient_id: 'patient-456',
  dosage: '500mg',
  frequency: 3,
  duration_days: 7,
  start_date: '2024-04-15',
  cultural_considerations: {
    avoid_prayer_times: true,
    ramadan_adjustments: true,
    preferred_language: 'ms'
  }
});

// Check medication interactions
const interactions = await medicationService.checkMedicationInteractions([
  'med-123',
  'med-456'
]);

// Get cultural recommendations
const recommendations = await medicationService.getCulturalMedicationRecommendations(
  {
    religion: 'Islam',
    halal_medication_only: true,
    primary_language: 'ms',
    ramadan_observant: true
  },
  'headache'
);
```

### Real-time Service
```typescript
import { realtimeService } from '@/api';

// Subscribe to notifications
await realtimeService.subscribeWithCulturalPreferences(
  'device-token-123',
  'ios',
  {
    appointment_reminder: true,
    medication_reminder: true,
    prayer_time: true,
    emergency_alert: true,
    family_update: true,
    cultural_event: true,
    language: 'ms',
    ramadan_adjustments: true
  }
);

// Connect to WebSocket dashboard
await realtimeService.connectToDashboard({
  onConnect: () => console.log('Connected to real-time dashboard'),
  onMessage: (message) => console.log('Received:', message),
  onError: (error) => console.error('WebSocket error:', error),
  culturalContext: {
    language: 'ms',
    stateCode: 'KUL',
    prayerTimeNotifications: true
  }
});

// Request notification permissions
const permission = await realtimeService.requestNotificationPermission();
```

### FHIR Integration Service
```typescript
import { fhirService } from '@/api';

// Search FHIR patients
const fhirPatients = await fhirService.searchPatients({
  identifier: '800101-01-1234', // MyKad number
  name: 'Ahmad Abdullah'
});

// Search by MyKad
const patientByMyKad = await fhirService.searchByMyKad('800101-01-1234');

// Create FHIR patient with Malaysian profile
const fhirPatient = await fhirService.createPatient({
  mykadNumber: '800101-01-1234',
  name: {
    family: 'Abdullah',
    given: ['Ahmad', 'bin']
  },
  gender: 'male',
  birthDate: '1980-01-01',
  race: 'Malay',
  religion: 'Islam'
});

// Validate MyKad with extracted information
const validation = fhirService.validateMyKadForFHIR('800101-01-1234');
```

### Developer Portal Service
```typescript
import { developerService } from '@/api';

// List API keys
const apiKeys = await developerService.getApiKeys();

// Create API key with cultural features
const newKey = await developerService.createApiKey({
  name: 'Hospital Integration',
  description: 'Integration for hospital management system',
  permissions: ['read_patients', 'cultural_services', 'prayer_times'],
  environment: 'production',
  cultural_features: {
    prayer_time_access: true,
    halal_validation_access: true,
    translation_access: true,
    cultural_calendar_access: true
  },
  malaysian_compliance: {
    pdpa_compliant: true,
    audit_trail: true
  }
});

// Generate sandbox data
const testPatients = await developerService.generateMalaysianPatients(25, {
  includeRaces: ['Malay', 'Chinese', 'Indian'],
  includeReligions: ['Islam', 'Buddhism', 'Christianity'],
  states: ['KUL', 'SGR', 'JHR'],
  languages: ['ms', 'en', 'zh', 'ta']
});

// Get usage statistics
const usage = await developerService.getApiKeyUsageStats('key-123');
```

## 🔧 Enhanced Features

### Automatic Token Refresh
```typescript
import { authService } from '@/api';

// Initialize authentication with cultural profile
const auth = await authService.initialize();

// Login with cultural preferences
const loginResult = await authService.login({
  email: 'ahmad@example.com',
  password: 'secure_password'
}, {
  fetchCulturalProfile: true,
  rememberMe: true
});

// OAuth login
const oauthResult = await authService.loginWithOAuth();

// Token refresh is automatic, but can be called manually
const refreshed = await authService.refreshToken();
```

### Performance Monitoring
```typescript
import { performanceMonitor, measureAsync, measureSync } from '@/utils/performance';

// Start monitoring
performanceMonitor.start();

// Measure API operations
const result = await measureAsync('prayer_time_query', async () => {
  return await culturalService.getPrayerTimes('KUL');
});

// Measure render operations
const component = measureSync('render_patient_list', () => {
  return <PatientList patients={patients} />;
});

// Get performance report
const report = await performanceMonitor.generatePerformanceReport();
console.log('Performance recommendations:', report.recommendations);
console.log('Cultural optimizations:', report.culturalOptimizations);
```

### Advanced Logging
```typescript
import { logger, apiLogger, culturalLogger, authLogger } from '@/utils/logger';

// General logging
logger.info('Application started');
logger.error('Database connection failed', error);

// Specialized logging
apiLogger.info('API request completed', { endpoint: '/patients', duration: 245 });
culturalLogger.info('Prayer times fetched', { state: 'KUL', cached: true });
authLogger.warn('Token refresh failed', { attempts: 3 });

// Performance logging
logger.performanceLog('patient_search', 180, { results: 25, cached: false });

// Cultural context logging
logger.culturalLog('halal_validation_requested', { medication: 'Paracetamol' });

// Set cultural context for all logs
logger.setCulturalContext({
  language: 'ms',
  stateCode: 'KUL',
  timezone: 'Asia/Kuala_Lumpur'
});
```

### Offline Support
```typescript
import { apiClient } from '@/api/client';

// API client automatically handles offline scenarios:
// 1. Caches GET requests for offline access
// 2. Queues write operations for when connection is restored
// 3. Provides performance metrics for cache hit rates

// Configure caching
const response = await apiClient.request('/patients', {
  cacheKey: 'patients_list',
  cacheTTL: 300000, // 5 minutes
  offlineSupport: true
});

// Check cache status
const performanceReport = apiClient.getPerformanceSummary();
console.log('Cache hit rate:', performanceReport.cacheHitRate);
```

## 🔒 Security & Compliance

### PDPA Compliance
- All patient data includes PDPA consent tracking
- Sensitive data is automatically masked in logs
- Audit trails are maintained for all data access
- Cultural preferences are protected with special handling

### Authentication Security
- Automatic token refresh with exponential backoff
- Biometric authentication support
- Session timeout and inactivity detection
- Secure token storage using Expo SecureStore

### Data Sanitization
- Automatic sensitive data masking in logs
- MyKad number protection
- Cultural preference data encryption
- API key and token protection

## 📊 Performance Optimization

### Caching Strategy
- **GET requests**: 5-minute cache for frequently accessed data
- **Prayer times**: 1-hour cache (updates daily)
- **Cultural data**: 24-hour cache for translations
- **Patient data**: 10-minute cache with invalidation on updates

### Network Optimization
- Request retry with exponential backoff
- Network quality detection and adaptation
- Request queuing for offline scenarios
- Response compression and payload optimization

### Cultural Feature Optimization
- Prayer time queries: <500ms target
- Halal validation: <1s target
- Translation services: <2s target
- Cultural calendar: 30-day cache

## 🌐 Cultural Intelligence

### Prayer Time Integration
```typescript
// Check prayer conflicts before scheduling
const conflict = await culturalService.checkPrayerConflict('KUL', appointmentTime);
if (conflict.data?.hasConflict) {
  console.log(`Conflicts with ${conflict.data.conflictingPrayer} prayer`);
  console.log(`Alternative time: ${conflict.data.alternativeTime}`);
}
```

### Halal Medication Validation
```typescript
// Validate medication for Muslim patients
const halalStatus = await culturalService.quickHalalCheck('Paracetamol 500mg');
if (halalStatus.data?.isHalal) {
  console.log('Medication is halal certified');
} else {
  console.log(`Status: ${halalStatus.data?.status}`);
}
```

### Multi-Language Support
```typescript
// Translate medical instructions
const translation = await culturalService.translateMedicalPhrase(
  'Take with food',
  'ms',
  'en'
);
console.log('Bahasa Malaysia:', translation.data?.translated_text);
```

### Ramadan Considerations
```typescript
// Adjust for Ramadan period
const ramadanStatus = await culturalService.isRamadanPeriod();
if (ramadanStatus.data?.isRamadan) {
  console.log('Ramadan adjustments active');
  console.log('Special considerations:', ramadanStatus.data?.specialConsiderations);
}
```

## 🚦 Error Handling

### Automatic Retry Logic
- Network failures: 3 retries with exponential backoff
- Token refresh: Automatic retry on 401 responses
- Cultural services: Fallback to cached data when available
- Offline queue: Automatic retry when connection restored

### Graceful Degradation
- Prayer times: Fall back to cached data or approximate times
- Translations: Show original text with translation pending
- Halal validation: Show "Unknown" status with manual verification option
- Cultural calendar: Use basic calendar without cultural events

## 📈 Monitoring & Analytics

### Performance Metrics
- API response times with percentiles
- Cache hit rates by endpoint
- Error rates and retry success rates
- Cultural feature usage analytics

### Cultural Analytics
- Prayer time integration usage
- Halal validation request patterns
- Translation service usage by language
- Cultural calendar event engagement

### Health Monitoring
- System health checks every 30 seconds
- Cultural service availability monitoring
- Database connection health
- Cache performance metrics

## 🔧 Configuration

### Environment Settings
```typescript
// Development
const config = {
  apiUrl: 'http://localhost:3000/api',
  logLevel: 'debug',
  enableCache: true,
  enablePerformanceMonitoring: true,
  culturalFeatures: {
    prayerTimes: true,
    halalValidation: true,
    translation: true
  }
};

// Production
const config = {
  apiUrl: 'https://api.medimate.my/v1',
  logLevel: 'info',
  enableCache: true,
  enableRemoteLogging: true,
  culturalFeatures: {
    prayerTimes: true,
    halalValidation: true,
    translation: true,
    culturalCalendar: true
  }
};
```

## 🧪 Testing

### Unit Tests
```typescript
import { culturalService } from '@/api';
import { mockPrayerTimesResponse } from '@/tests/mocks';

jest.mock('@/api/client');

describe('Cultural Service', () => {
  it('should fetch prayer times for KUL', async () => {
    const response = await culturalService.getPrayerTimes('KUL');
    expect(response.success).toBe(true);
    expect(response.data?.state_code).toBe('KUL');
  });
});
```

### Integration Tests
```typescript
describe('API Integration', () => {
  it('should handle authentication flow', async () => {
    const login = await authService.login(testCredentials);
    expect(login.success).toBe(true);
    
    const profile = await culturalService.fetchCulturalProfile();
    expect(profile.success).toBe(true);
  });
});
```

## 📚 API Reference

Complete API documentation is available through the documentation service:

```typescript
import { documentationService } from '@/api';

// Download Postman collection
const postman = await documentationService.downloadPostmanCollection();

// Get API summary
const summary = await documentationService.getApiDocumentationSummary();

// Get getting started guide
const guide = await documentationService.getGettingStartedGuide();
```

## 🤝 Contributing

When extending the API integration layer:

1. Follow the established service patterns
2. Include comprehensive TypeScript types
3. Add cultural context where relevant
4. Implement proper error handling and retries
5. Include performance monitoring
6. Add logging for debugging
7. Update documentation
8. Write tests for new functionality

## 📄 License

This API integration layer is part of the MediMate Malaysia healthcare platform, designed specifically for Malaysian healthcare providers with cultural intelligence and PDPA compliance.

---

**Built with Malaysian Healthcare Intelligence** 🇲🇾

For technical support or questions about Malaysian cultural features, contact the development team or refer to the comprehensive documentation available through the documentation service.