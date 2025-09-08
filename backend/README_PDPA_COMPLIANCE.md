# PDPA Compliance & Audit Framework

## Overview

This implementation provides comprehensive Malaysian Personal Data Protection Act 2010 (PDPA) compliance for the MediMate healthcare system. The framework includes audit logging, consent management, data subject rights, breach management, and data anonymization capabilities.

## Architecture

### Core Components

1. **PDPA Audit Middleware** (`src/middleware/audit/pdpaAudit.ts`)
   - Real-time audit logging for all database operations
   - PDPA-specific context tracking (session, request, legal basis)
   - Compliance violation detection

2. **Compliance Service** (`src/services/compliance/pdpaComplianceService.ts`)
   - Consent management and tracking
   - Data subject rights processing
   - Breach incident management
   - Compliance reporting

3. **Data Anonymization** (`src/utils/anonymization/dataAnonymizer.ts`)
   - Malaysian healthcare-specific anonymization
   - K-anonymity and L-diversity algorithms
   - Medical utility preservation

4. **Privacy Rights Controller** (`src/controllers/privacy/privacyRightsController.ts`)
   - REST API endpoints for PDPA compliance
   - Data access, rectification, erasure requests
   - User consent management

5. **Database Schema** (`database/migrations/002_pdpa_compliance_audit.sql`)
   - Enhanced audit tables with PDPA fields
   - Data subject rights tracking tables
   - Breach management tables
   - Anonymization job tracking

## Database Schema

### Enhanced Tables

**audit_log** - Extended with PDPA fields:
- `session_id`, `request_id` - Request tracking
- `data_subject_id` - Links to affected user
- `data_categories` - Types of data processed
- `processing_purpose` - Purpose for processing
- `legal_basis` - PDPA legal justification
- `sensitive_data_flag` - Marks sensitive health data
- `retention_period_days` - Data retention period
- `breach_risk_level` - Risk assessment

**New PDPA Tables:**
- `consent_records` - Enhanced consent tracking
- `consent_renewals` - Consent renewal history
- `data_access_requests` - Data subject rights requests
- `data_erasure_log` - Data deletion/anonymization log
- `data_breach_incidents` - Breach tracking and management
- `breach_notifications` - Regulatory and user notifications
- `data_retention_policies` - Automated retention rules
- `anonymization_jobs` - Data anonymization tasks
- `compliance_reports` - Automated compliance reporting
- `compliance_violations` - Real-time violation detection

## API Endpoints

### Consent Management
```
POST   /api/privacy/consent           - Grant consent
DELETE /api/privacy/consent/:id       - Withdraw consent  
GET    /api/privacy/consent           - Get consent overview
```

### Data Subject Rights
```
POST   /api/privacy/access-request    - Submit data access request
GET    /api/privacy/access-request/:id - Check request status
POST   /api/privacy/data-portability/:id - Process portability request
POST   /api/privacy/data-erasure/:id  - Process erasure request
GET    /api/privacy/my-data           - Get user data summary
```

### Admin/DPO Functions
```
POST   /api/privacy/admin/anonymization     - Start anonymization job
GET    /api/privacy/admin/anonymization/:id - Check job status
```

### Public Information
```
GET    /api/privacy/rights            - PDPA rights information
GET    /api/privacy/policy            - Privacy policy
```

## Usage Examples

### 1. Recording Consent

```typescript
import PDPAComplianceService from './services/compliance/pdpaComplianceService';

const consent = await complianceService.recordConsent({
    userId: 'user-uuid',
    consentType: 'healthcare_data_processing',
    purposes: ['medical_care', 'appointment_scheduling'],
    dataCategories: ['health_data', 'personal_data'],
    consentMethod: 'digital',
    ipAddress: '127.0.0.1',
    expiryMonths: 24
});
```

### 2. Processing Data Access Request

```typescript
// Submit request
const request = await complianceService.submitDataAccessRequest({
    userId: 'user-uuid',
    requestType: 'access',
    requestDescription: 'I want to see all my medical data',
    requestedDataCategories: ['health_data', 'personal_data']
});

// Process portability request
const userData = await complianceService.processDataPortabilityRequest(request.id);
```

### 3. Data Anonymization

```typescript
import DataAnonymizer from './utils/anonymization/dataAnonymizer';

const config = {
    algorithm: 'k_anonymity',
    k_value: 5,
    preserveUtility: true,
    healthcareContext: true
};

const job = await dataAnonymizer.anonymizeForResearch(
    'medical_records',
    'user_id = $1',
    config
);
```

### 4. Audit Logging

```typescript
// Automatic audit logging via middleware
app.use(initializePDPAAudit);
app.use(auditDatabaseOperations);

// Manual audit logging
await logDataAccess(
    'medical_records',
    'SELECT',
    auditContext,
    recordId,
    null,
    null
);
```

## Malaysian Healthcare Compliance

### Data Categories
- **Personal Data**: IC numbers, names, contact information
- **Health Data**: Medical records, diagnoses, medications
- **Sensitive Personal Data**: Religious beliefs, race information
- **Behavioral Data**: App usage, adherence patterns

### Legal Bases
- **Consent**: Explicit user consent for optional features
- **Vital Interests**: Emergency medical care
- **Legal Obligation**: MOH reporting requirements  
- **Legitimate Interests**: System security, fraud prevention

### Retention Periods
- **Medical Records**: 7 years (Malaysian healthcare regulation)
- **Audit Logs**: 7 years (PDPA compliance)
- **Consent Records**: 7 years post-withdrawal
- **Breach Records**: Permanent retention

### Malaysian IC Anonymization
```typescript
// Original: 901201-14-1234
// Anonymized: 90XXXX-14-XXXX (preserves birth year and state code)
```

## Installation & Setup

### 1. Database Migration

```bash
# Run PDPA compliance migration
npm run db:pdpa:up

# Rollback if needed
npm run db:pdpa:down
```

### 2. Environment Variables

```bash
POSTGRES_DB=medimate_dev
ANONYMIZATION_SALT=your_secure_salt_key
PDPA_RETENTION_DAYS=2555  # 7 years
```

### 3. Integration with Express App

```typescript
import { createPrivacyRoutes } from './routes/privacyRoutes';
import { setDatabasePool } from './middleware/audit/pdpaAudit';

// Initialize database pool
const dbPool = new Pool(dbConfig);
setDatabasePool(dbPool);

// Add privacy routes
app.use('/api/privacy', createPrivacyRoutes(dbPool));
```

## Testing

### Run PDPA Compliance Tests
```bash
npm test -- --testNamePattern="PDPA Compliance"
```

### Test Coverage Areas
- Database migrations and schema
- Audit logging system
- Consent management
- Data subject rights processing
- Breach management
- Data anonymization
- API endpoints
- Integration workflows

## Compliance Features

### ✅ PDPA Section 30 - Right to Access
- API endpoint for data access requests
- 21-day response timeline tracking
- Identity verification workflow
- Comprehensive data export

### ✅ PDPA Section 31 - Right to Rectification
- Data correction request processing
- Audit trail for all changes
- Healthcare provider notification

### ✅ PDPA Section 32 - Right to Erasure
- Legal obligations checking
- Selective vs. complete erasure
- Anonymization as alternative
- Healthcare data retention compliance

### ✅ PDPA Section 33 - Right to Data Portability
- Structured data export (JSON/CSV)
- Malaysian healthcare context preservation
- Secure download mechanisms

### ✅ Breach Notification (PDPA Requirements)
- 72-hour regulatory notification
- Immediate user notification for high-risk breaches
- Risk assessment and containment tracking
- Regulatory body integration ready

### ✅ Audit and Logging
- Comprehensive audit trail (7-year retention)
- Real-time compliance violation detection
- Tamper-proof logging system
- Automated compliance reporting

## Security Considerations

- All audit logs are tamper-proof with integrity checking
- Sensitive data is encrypted at rest and in transit
- Anonymization preserves medical utility while protecting privacy
- Role-based access control for compliance functions
- Automated breach detection and response

## Regulatory Compliance

This implementation addresses:
- **Malaysian PDPA 2010**: All sections related to individual rights
- **Ministry of Health (MOH)**: Medical data retention requirements
- **Personal Data Protection Department (PDPD)**: Notification procedures
- **Malaysian Standards**: Healthcare data management standards

## Support and Documentation

For questions about PDPA compliance implementation:
- Technical Documentation: See code comments and test files
- Legal Compliance: Consult with Data Protection Officer
- Malaysian Regulations: Refer to PDPD guidance documents

---

**Note**: This implementation provides the technical framework for PDPA compliance. Legal review and validation should be conducted by qualified Malaysian data protection experts.