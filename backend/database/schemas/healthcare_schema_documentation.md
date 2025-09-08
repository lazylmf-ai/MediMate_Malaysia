# MediMate Malaysia Healthcare Database Schema Documentation

## Overview

This document describes the comprehensive healthcare database schema extension for MediMate Malaysia, designed with Malaysian cultural intelligence, PDPA compliance, and healthcare-grade security standards.

## Schema Architecture

### Core Design Principles

1. **Malaysian Cultural Intelligence**: Full integration with Islamic prayer times, cultural holidays, dietary restrictions, and multi-language support (Bahasa Malaysia, English, Chinese, Tamil)

2. **PDPA Compliance**: Complete audit trails, consent management, data retention policies, and privacy controls

3. **Healthcare Security**: Confidentiality levels, role-based access control, and healthcare data classification

4. **Performance Optimization**: Strategic indexing for Malaysian healthcare query patterns

## Table Structure

### 1. Medical Records System

#### `medical_records`
- **Purpose**: Comprehensive medical records with Malaysian healthcare context
- **Key Features**:
  - Multi-language clinical notes support
  - Cultural factors tracking (language used, religious considerations)
  - PDPA-compliant confidentiality levels
  - Integration with Malaysian IC validation
  - Provider licensing integration

**Cultural Intelligence Fields**:
```sql
cultural_factors JSONB DEFAULT '{
  "language_used": "en",
  "cultural_sensitivities": [],
  "religious_considerations": [],
  "dietary_restrictions_noted": []
}'
```

#### `medical_conditions`
- **Purpose**: Chronic disease management with Malaysian terminology
- **Key Features**:
  - Condition names in 4 languages (EN, MS, ZH, TA)
  - Cultural impact assessment
  - Family history integration
  - Monitoring frequency tracking

**Multi-language Support**:
```sql
condition_name VARCHAR(200) NOT NULL,
condition_name_ms VARCHAR(200), -- Bahasa Malaysia
condition_name_zh VARCHAR(200), -- Chinese
condition_name_ta VARCHAR(200)  -- Tamil
```

#### `medical_documents`
- **Purpose**: Secure document storage with PDPA compliance
- **Key Features**:
  - 7-year retention policy (PDPA requirement)
  - File integrity verification (SHA-256 hashing)
  - OCR text extraction for searchability
  - Confidentiality level classification

### 2. Emergency Response System

#### `emergency_contacts`
- **Purpose**: Cultural-aware emergency contact management
- **Key Features**:
  - Medical decision authority tracking
  - Healthcare proxy designation
  - Cultural notes and language preferences
  - Proximity-based notification logic

**Malaysian Cultural Context**:
```sql
cultural_notes TEXT, -- Religious considerations, cultural preferences
preferred_language VARCHAR(5) DEFAULT 'ms',
location_proximity VARCHAR(20) CHECK (location_proximity IN (
  'same_household', 'local', 'distant', 'overseas'
))
```

### 3. Vaccination and Immunization System

#### `vaccination_records`
- **Purpose**: Malaysian National Immunization Program integration
- **Key Features**:
  - MOH vaccine coding system
  - Halal certification tracking
  - WHO recognition for travel
  - Digital certificate integration

**Malaysian Integration**:
```sql
malaysia_vaccine_code VARCHAR(20), -- MOH vaccine coding
immunization_program VARCHAR(100), -- National Immunization Program
halal_certified BOOLEAN DEFAULT FALSE,
who_recognized BOOLEAN DEFAULT FALSE
```

### 4. Appointment Scheduling System

#### `appointment_types`
- **Purpose**: Culturally-aware appointment scheduling
- **Key Features**:
  - Prayer time avoidance options
  - Fasting period considerations
  - Cultural holiday impact assessment
  - Multi-language appointment descriptions

#### `appointments`
- **Purpose**: Comprehensive appointment management
- **Key Features**:
  - Cultural scheduling adjustments
  - Malaysian calendar integration
  - Gender preference accommodation
  - Multi-modal reminder system

**Cultural Scheduling**:
```sql
cultural_adjustments JSONB DEFAULT '{
  "prayer_time_avoidance": false,
  "fasting_consideration": false,
  "cultural_interpreter_needed": false,
  "gender_preference": null
}'
```

### 5. Insurance and Payment System

#### `insurance_providers`
- **Purpose**: Malaysian insurance ecosystem integration
- **Key Features**:
  - Takaful (Islamic insurance) support
  - Bank Negara Malaysia regulation compliance
  - Shariah-compliant options
  - Multi-cultural customer service

#### `user_insurance_coverage`
- **Purpose**: Comprehensive coverage tracking
- **Key Features**:
  - Government scheme integration (1Malaysia, MySejahtera)
  - Employer coverage tracking
  - Cultural benefits management
  - PDPA-compliant data handling

## Indexing Strategy

### Performance-Optimized Indexes

1. **Healthcare Query Patterns**:
   ```sql
   CREATE INDEX idx_medical_records_user_date ON medical_records (user_id, visit_date DESC);
   CREATE INDEX idx_appointments_provider_date ON appointments (provider_id, appointment_date, appointment_time);
   ```

2. **Cultural Intelligence Queries**:
   ```sql
   CREATE INDEX idx_medical_records_cultural ON medical_records USING GIN (cultural_factors);
   CREATE INDEX idx_appointments_cultural ON appointments USING GIN (cultural_adjustments);
   ```

3. **Malaysian Healthcare Workflows**:
   ```sql
   CREATE INDEX idx_vaccination_program ON vaccination_records (immunization_program, vaccine_source);
   CREATE INDEX idx_emergency_contacts_medical_authority ON emergency_contacts 
     (user_id, medical_decision_authority) WHERE medical_decision_authority = TRUE;
   ```

## Security and Compliance

### PDPA Compliance Features

1. **Audit Trails**: All healthcare data modifications logged
2. **Consent Management**: Granular consent tracking per data category
3. **Data Retention**: Automated 7-year retention with secure deletion
4. **Access Controls**: Role-based permissions with healthcare context

### Data Classification Levels

- **PUBLIC**: General health education content
- **STANDARD**: Basic medical records
- **SENSITIVE**: Mental health, reproductive health
- **RESTRICTED**: Genetic information, psychiatric records

### Role-Based Access Control

```sql
-- Application role (full access)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES TO medimate_app;

-- Analytics role (read-only aggregated data)
GRANT SELECT ON adherence_summaries, medical_conditions TO medimate_analytics;

-- Healthcare provider role (limited clinical access)
GRANT SELECT ON medical_records, appointments TO medimate_healthcare;
```

## Cultural Intelligence Integration

### Multi-Language Support

All user-facing content available in:
- **English** (en): Primary medical terminology
- **Bahasa Malaysia** (ms): National language
- **Chinese** (zh): Major ethnic community
- **Tamil** (ta): Indian community support

### Religious and Cultural Considerations

1. **Islamic Features**:
   - Prayer time conflict avoidance
   - Ramadan fasting adjustments
   - Halal medication preferences
   - Takaful insurance integration

2. **Multi-Cultural Support**:
   - Cultural holiday calendar integration
   - Dietary restriction management
   - Gender preference accommodation
   - Traditional medicine acknowledgment

### Malaysian Healthcare Integration

1. **Regulatory Compliance**:
   - Malaysian Medical Council integration
   - MOH vaccination program alignment
   - Bank Negara insurance regulation

2. **Government Schemes**:
   - MySejahtera integration
   - 1Malaysia healthcare scheme
   - National immunization program

## Migration and Rollback

### Forward Migration
```bash
psql -d medimate_dev -f backend/database/migrations/001_healthcare_extension.sql
```

### Rollback Migration
```bash
psql -d medimate_dev -f backend/database/migrations/001_healthcare_extension_rollback.sql
```

### Seed Data Loading
```bash
psql -d medimate_dev -f backend/database/seeds/001_healthcare_extension_seed.sql
```

## API Integration Points

### TypeScript Models
- Complete type definitions in `backend/models/healthcare.models.ts`
- Malaysian cultural context interfaces
- PDPA-compliant API response structures

### Healthcare Security Middleware
- Request sanitization with healthcare context
- Malaysian IC validation
- Cultural data classification
- PDPA audit logging

## Performance Considerations

### Query Optimization
- Composite indexes for common Malaysian healthcare workflows
- GIN indexes for JSONB cultural data queries
- Partial indexes for active record filtering

### Scalability Features
- Horizontal partitioning ready for user_id
- Read replica support for analytics queries
- Efficient pagination for large datasets

## Monitoring and Maintenance

### Health Metrics
- Query performance monitoring
- Cultural data accuracy validation
- PDPA compliance verification
- Security audit trail review

### Maintenance Tasks
- Automated data retention cleanup
- Index optimization for Malaysian query patterns
- Cultural calendar updates (holidays, prayer times)
- Insurance provider data synchronization

## Future Enhancements

### Phase 2 Roadmap
- HL7 FHIR compatibility layer
- MOH system integration APIs
- Real-time WebSocket notifications
- Advanced analytics dashboards

### Malaysian Healthcare Evolution
- Emerging government health initiatives
- New cultural community integrations
- Enhanced traditional medicine support
- Cross-border healthcare coordination

---

*This documentation is maintained as part of the MediMate Malaysia healthcare database schema. For technical implementation details, refer to the migration files and TypeScript models.*