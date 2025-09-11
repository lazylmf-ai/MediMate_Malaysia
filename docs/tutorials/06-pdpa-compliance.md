# PDPA Compliance - Malaysian Data Protection in Healthcare

## Introduction

The Personal Data Protection Act 2010 (PDPA) is Malaysia's primary data protection legislation that governs how personal data is collected, processed, used, and disclosed. In healthcare, PDPA compliance is critical for protecting patient privacy and avoiding legal penalties. This guide shows you how to build PDPA-compliant healthcare applications using the MediMate API.

## Understanding PDPA 2010 in Healthcare Context

### Key PDPA Principles

1. **General Principle** - Personal data processed lawfully and fairly
2. **Notice and Choice** - Data subjects informed of processing purposes
3. **Disclosure** - Personal data not disclosed without consent
4. **Security** - Reasonable security measures required
5. **Retention** - Data kept only as long as necessary
6. **Data Integrity** - Accurate and up-to-date data
7. **Access** - Data subjects can access their personal data

### Healthcare-Specific Considerations

Healthcare data has special protections under PDPA:

```javascript
import { MediMateMalaysia, PDPACompliance } from '@medimate/malaysia-sdk';

const client = new MediMateMalaysia({
  apiKey: 'mk_live_your_key_here',
  compliance: {
    pdpa_enabled: true,
    healthcare_context: true,
    consent_management: true,
    audit_logging: true
  }
});

// Check PDPA compliance status for patient data processing
const complianceCheck = await client.compliance.checkPDPACompliance({
  data_processing_purpose: 'medical_treatment',
  data_categories: ['health_records', 'personal_identifiers', 'contact_information'],
  patient_consent_status: 'explicit_consent',
  healthcare_provider_license: 'MOH-2024-001',
  data_retention_period: '7_years'
});

console.log('PDPA Compliance Status:', complianceCheck.data.compliance_status);
console.log('Required Actions:', complianceCheck.data.required_actions);
```

## Consent Management

### Implementing Explicit Consent

```python
from medimate_malaysia import MediMateMalaysia
from medicate_malaysia.models import ConsentRequest, DataProcessingPurpose, PDPAConsentStatus
import asyncio
from typing import List, Dict

async def implement_pdpa_consent_management(patient_id: str, processing_purposes: List[str]):
    async with MediMateMalaysia(api_key="mk_live_your_key") as client:
        # Create comprehensive consent request
        consent_request = ConsentRequest(
            patient_id=patient_id,
            processing_purposes=processing_purposes,
            data_categories=[
                'basic_personal_data',          # Name, IC, contact
                'sensitive_personal_data',      # Health records, medical history
                'special_personal_data',        # Genetic data, biometrics
                'financial_data',               # Insurance, billing
                'location_data'                 # Hospital visits, emergency location
            ],
            retention_periods={
                'basic_personal_data': '7_years_post_treatment',
                'sensitive_personal_data': '10_years_post_treatment',
                'special_personal_data': '15_years_post_treatment',
                'financial_data': '7_years_post_payment',
                'location_data': '1_year_post_visit'
            },
            third_party_sharing=[
                {
                    'party': 'insurance_providers',
                    'purpose': 'claim_processing',
                    'data_categories': ['health_records', 'financial_data'],
                    'consent_required': True
                },
                {
                    'party': 'government_health_ministry',
                    'purpose': 'public_health_reporting',
                    'data_categories': ['anonymized_health_data'],
                    'legal_basis': 'public_interest',
                    'consent_required': False
                },
                {
                    'party': 'research_institutions',
                    'purpose': 'medical_research',
                    'data_categories': ['anonymized_health_data'],
                    'consent_required': True,
                    'opt_in_required': True
                }
            ],
            patient_rights_explained=True,
            withdrawal_process_explained=True,
            consequences_of_refusal_explained=True
        )
        
        # Generate consent form with PDPA-compliant language
        consent_form = await client.compliance.generate_pdpa_consent_form_async(
            consent_request=consent_request,
            language='ms',  # Generate in Bahasa Malaysia
            include_english_translation=True,
            healthcare_specific=True
        )
        
        # Record consent decision
        consent_response = await client.compliance.record_consent_decision_async(
            patient_id=patient_id,
            consent_form_id=consent_form.form_id,
            consent_decisions={
                'medical_treatment': True,
                'data_retention': True,
                'insurance_sharing': True,
                'research_participation': False,  # Patient opted out
                'marketing_communications': False
            },
            consent_method='digital_signature',
            witness_information={
                'witness_present': True,
                'witness_type': 'healthcare_staff',
                'witness_id': 'nurse_001'
            },
            timestamp=await client.utility.get_server_timestamp_async(),
            ip_address=consent_request.client_ip,
            user_agent=consent_request.user_agent
        )
        
        # Set up automated consent renewal reminders
        await client.compliance.schedule_consent_renewal_async(
            patient_id=patient_id,
            consent_id=consent_response.consent_id,
            renewal_period='annual',
            reminder_settings={
                'advance_notice_days': 30,
                'reminder_channels': ['email', 'sms'],
                'language_preference': 'ms'
            }
        )
        
        return {
            'consent_recorded': True,
            'consent_id': consent_response.consent_id,
            'pdpa_compliant': consent_response.pdpa_compliance_verified,
            'data_processing_permissions': consent_response.granted_permissions,
            'audit_trail_created': consent_response.audit_trail_id
        }

# Example usage
processing_purposes = [
    'medical_diagnosis_and_treatment',
    'prescription_management',
    'appointment_scheduling',
    'insurance_claim_processing',
    'quality_improvement'
]

consent_result = asyncio.run(implement_pdpa_consent_management(
    patient_id='patient_123',
    processing_purposes=processing_purposes
))
```

### Consent Withdrawal and Management

```java
import my.medimate.malaysia.sdk.client.MediMateMalaysiaClient;
import my.medimate.malaysia.sdk.model.*;
import java.time.LocalDateTime;
import java.util.*;

public class PDPAConsentManager {
    private final MediMateMalaysiaClient client;
    
    public ConsentWithdrawalResult processConsentWithdrawal(
            String patientId,
            ConsentWithdrawalRequest withdrawalRequest) {
            
        try {
            // Validate withdrawal request
            ConsentValidationResult validation = client.getCompliance()
                .validateWithdrawalRequest(patientId, withdrawalRequest);
                
            if (!validation.isValid()) {
                return ConsentWithdrawalResult.failed(validation.getErrors());
            }
            
            // Get current consent status
            CurrentConsentStatus currentStatus = client.getCompliance()
                .getCurrentConsentStatus(patientId);
            
            // Process partial or full withdrawal
            WithdrawalProcessingResult processingResult = processWithdrawalByType(
                withdrawalRequest.getWithdrawalType(),
                withdrawalRequest.getSpecificPermissions(),
                currentStatus);
            
            // Update data processing permissions
            UpdatePermissionsResult permissionsUpdate = client.getCompliance()
                .updateDataProcessingPermissions(
                    patientId,
                    processingResult.getUpdatedPermissions());
            
            // Handle data deletion if required
            DataDeletionResult deletionResult = null;
            if (withdrawalRequest.isRequestDataDeletion()) {
                deletionResult = handleDataDeletion(patientId, withdrawalRequest);
            }
            
            // Create audit trail
            AuditTrailEntry auditEntry = client.getCompliance()
                .createConsentWithdrawalAudit(ConsentWithdrawalAudit.builder()
                    .patientId(patientId)
                    .withdrawalRequest(withdrawalRequest)
                    .processingResult(processingResult)
                    .permissionsUpdate(permissionsUpdate)
                    .dataDeletion(deletionResult)
                    .timestamp(LocalDateTime.now())
                    .processedBy(withdrawalRequest.getProcessedByUserId())
                    .build());
            
            // Notify relevant systems and stakeholders
            NotificationResult notifications = notifyWithdrawalStakeholders(
                patientId, 
                withdrawalRequest,
                processingResult);
            
            return ConsentWithdrawalResult.builder()
                .successful(true)
                .withdrawalId(processingResult.getWithdrawalId())
                .updatedPermissions(processingResult.getUpdatedPermissions())
                .dataDeleted(deletionResult != null ? deletionResult.getDeletedCategories() : Collections.emptyList())
                .auditTrailId(auditEntry.getId())
                .notifications(notifications)
                .effectiveDate(processingResult.getEffectiveDate())
                .patientCommunication(generatePatientCommunication(patientId, processingResult))
                .build();
                
        } catch (MediMateException e) {
            logger.error("Consent withdrawal processing failed: {}", e.getMessage());
            return ConsentWithdrawalResult.failed(Arrays.asList(e.getMessage()));
        }
    }
    
    private WithdrawalProcessingResult processWithdrawalByType(
            WithdrawalType type,
            List<String> specificPermissions,
            CurrentConsentStatus currentStatus) {
            
        switch (type) {
            case FULL_WITHDRAWAL:
                return processFullWithdrawal(currentStatus);
                
            case PARTIAL_WITHDRAWAL:
                return processPartialWithdrawal(specificPermissions, currentStatus);
                
            case PURPOSE_SPECIFIC_WITHDRAWAL:
                return processPurposeSpecificWithdrawal(specificPermissions, currentStatus);
                
            case THIRD_PARTY_SHARING_WITHDRAWAL:
                return processThirdPartyWithdrawal(specificPermissions, currentStatus);
                
            default:
                throw new IllegalArgumentException("Unsupported withdrawal type: " + type);
        }
    }
    
    private DataDeletionResult handleDataDeletion(
            String patientId,
            ConsentWithdrawalRequest request) {
            
        // Determine what data can be legally deleted
        DeletionEligibilityAnalysis eligibility = client.getCompliance()
            .analyzeDeletionEligibility(patientId, request.getDataCategories());
        
        List<String> deletedCategories = new ArrayList<>();
        List<String> retainedCategories = new ArrayList<>();
        Map<String, String> retentionReasons = new HashMap<>();
        
        for (DataDeletionRequest.Category category : request.getDataCategories()) {
            if (eligibility.canDelete(category)) {
                // Perform actual deletion
                DeletionResult categoryDeletion = client.getDataManagement()
                    .deletePatientDataCategory(patientId, category);
                    
                if (categoryDeletion.isSuccessful()) {
                    deletedCategories.add(category.name());
                } else {
                    retainedCategories.add(category.name());
                    retentionReasons.put(category.name(), categoryDeletion.getFailureReason());
                }
            } else {
                retainedCategories.add(category.name());
                retentionReasons.put(category.name(), eligibility.getRetentionReason(category));
            }
        }
        
        return DataDeletionResult.builder()
            .deletedCategories(deletedCategories)
            .retainedCategories(retainedCategories)
            .retentionReasons(retentionReasons)
            .legalBasisForRetention(eligibility.getLegalBases())
            .deletionTimestamp(LocalDateTime.now())
            .build();
    }
}
```

## Data Security and Encryption

### Implementing PDPA-Compliant Security Measures

```csharp
using MediMate.Malaysia.SDK.Security;
using MediMate.Malaysia.SDK.Compliance;
using System.Security.Cryptography;

public class PDPASecurityService
{
    private readonly IMediMateMalaysiaClient _client;
    private readonly IEncryptionService _encryptionService;
    
    public async Task<SecureDataProcessingResult> ProcessPatientDataSecurelyAsync(
        PatientDataProcessingRequest request)
    {
        // Validate PDPA compliance before processing
        var complianceValidation = await _client.Compliance.ValidateProcessingRequestAsync(
            request.PatientId,
            request.ProcessingPurpose,
            request.DataCategories);
            
        if (!complianceValidation.IsCompliant)
        {
            throw new PDPAComplianceException(
                $"Processing request violates PDPA: {string.Join(", ", complianceValidation.Violations)}");
        }
        
        // Apply data minimization principle
        var minimizedRequest = await ApplyDataMinimizationAsync(request);
        
        // Encrypt sensitive data
        var encryptedData = await EncryptSensitiveDataAsync(minimizedRequest.PatientData);
        
        // Process with security controls
        var processingResult = await ProcessWithSecurityControlsAsync(
            minimizedRequest,
            encryptedData);
        
        // Log access for audit trail
        await CreateSecurityAuditLogAsync(request, processingResult);
        
        return processingResult;
    }
    
    private async Task<EncryptedPatientData> EncryptSensitiveDataAsync(PatientData data)
    {
        var encryptedFields = new Dictionary<string, EncryptedField>();
        
        // Encrypt different data categories with appropriate methods
        foreach (var dataField in data.Fields)
        {
            EncryptionMethod method = DetermineEncryptionMethod(dataField.Category);
            
            switch (dataField.Category)
            {
                case DataCategory.PersonalIdentifiers:
                    // IC numbers, passport numbers - highest encryption
                    encryptedFields[dataField.Name] = await _encryptionService.EncryptAsync(
                        dataField.Value,
                        EncryptionLevel.Maximum,
                        method);
                    break;
                    
                case DataCategory.HealthRecords:
                    // Medical records - high encryption with medical compliance
                    encryptedFields[dataField.Name] = await _encryptionService.EncryptMedicalDataAsync(
                        dataField.Value,
                        EncryptionLevel.High,
                        MedicalDataType.HealthRecord);
                    break;
                    
                case DataCategory.ContactInformation:
                    // Phone, email - standard encryption
                    encryptedFields[dataField.Name] = await _encryptionService.EncryptAsync(
                        dataField.Value,
                        EncryptionLevel.Standard,
                        method);
                    break;
                    
                case DataCategory.FinancialData:
                    // Payment info - financial-grade encryption
                    encryptedFields[dataField.Name] = await _encryptionService.EncryptFinancialDataAsync(
                        dataField.Value,
                        FinancialEncryptionStandard.PCI_DSS);
                    break;
                    
                case DataCategory.BiometricData:
                    // Biometrics - irreversible hashing
                    encryptedFields[dataField.Name] = await _encryptionService.HashBiometricDataAsync(
                        dataField.Value,
                        BiometricHashAlgorithm.SHA3_512);
                    break;
            }
        }
        
        return new EncryptedPatientData
        {
            PatientId = data.PatientId,
            EncryptedFields = encryptedFields,
            EncryptionMetadata = new EncryptionMetadata
            {
                EncryptionTimestamp = DateTime.UtcNow,
                EncryptionVersion = "PDPAv2024.1",
                KeyRotationSchedule = TimeSpan.FromDays(90),
                ComplianceStandards = new[] { "PDPA2010", "ISO27001", "HL7FHIR" }
            }
        };
    }
    
    private async Task<SecureDataProcessingResult> ProcessWithSecurityControlsAsync(
        PatientDataProcessingRequest request,
        EncryptedPatientData encryptedData)
    {
        var securityControls = new SecurityControlsConfiguration
        {
            AccessControls = new AccessControlConfiguration
            {
                RequireMultiFactorAuthentication = true,
                RequireRoleBasedAccess = true,
                RequireSessionTimeout = TimeSpan.FromMinutes(30),
                RequireIPWhitelist = request.ProcessingPurpose == "remote_access"
            },
            DataTransmissionControls = new TransmissionControlConfiguration
            {
                RequireTLSMinimumVersion = "1.3",
                RequireEndToEndEncryption = true,
                RequireCertificatePinning = true,
                ProhibitDataCaching = true
            },
            ProcessingControls = new ProcessingControlConfiguration
            {
                RequireDataMinimization = true,
                RequirePurposeLimitation = true,
                RequireStorageLimitation = true,
                RequireAccuracyValidation = true
            }
        };
        
        // Apply security controls during processing
        var controlledProcessor = new SecurityControlledProcessor(securityControls);
        
        var result = await controlledProcessor.ProcessAsync(
            request,
            encryptedData,
            async (processedData) => {
                // Decrypt only necessary fields for processing
                var decryptedFields = await DecryptRequiredFieldsAsync(
                    encryptedData, 
                    request.RequiredFields);
                
                // Process the data
                var processResult = await _client.Healthcare.ProcessPatientDataAsync(
                    request.PatientId,
                    decryptedFields,
                    request.ProcessingPurpose);
                
                // Re-encrypt any new data generated
                if (processResult.GeneratedData?.Any() == true)
                {
                    processResult.GeneratedData = await EncryptSensitiveDataAsync(
                        processResult.GeneratedData);
                }
                
                return processResult;
            });
        
        return new SecureDataProcessingResult
        {
            ProcessingId = Guid.NewGuid().ToString(),
            ProcessingResult = result,
            SecurityControlsApplied = securityControls,
            EncryptionMetadata = encryptedData.EncryptionMetadata,
            PDPAComplianceVerified = true,
            AuditTrailId = await CreateProcessingAuditTrailAsync(request, result)
        };
    }
    
    private async Task CreateSecurityAuditLogAsync(
        PatientDataProcessingRequest request,
        SecureDataProcessingResult result)
    {
        var auditLog = new PDPASecurityAuditLog
        {
            AuditId = Guid.NewGuid().ToString(),
            PatientId = request.PatientId,
            ProcessingPurpose = request.ProcessingPurpose,
            DataCategoriesAccessed = request.DataCategories,
            AccessedBy = request.RequestedBy,
            AccessTimestamp = DateTime.UtcNow,
            AccessMethod = request.AccessMethod,
            SecurityControlsApplied = result.SecurityControlsApplied,
            EncryptionUsed = result.EncryptionMetadata,
            ProcessingDuration = result.ProcessingResult.Duration,
            DataMinimizationApplied = result.SecurityControlsApplied.ProcessingControls.RequireDataMinimization,
            LegalBasisForProcessing = request.LegalBasis,
            ConsentReference = request.ConsentId,
            IPAddress = request.ClientIPAddress,
            UserAgent = request.UserAgent,
            GeolocationRestriction = DetermineGeolocationRestriction(request),
            RetentionPeriod = DetermineRetentionPeriod(request.ProcessingPurpose),
            AutoDeletionScheduled = result.AutoDeletionScheduled
        };
        
        await _client.Compliance.CreateSecurityAuditLogAsync(auditLog);
        
        // Alert on suspicious access patterns
        await CheckForSuspiciousAccessPatternsAsync(request.PatientId, auditLog);
    }
}
```

## Data Subject Rights Implementation

### Access and Portability Rights

```javascript
// Implementing PDPA data subject rights
class PDPADataSubjectRights {
  constructor(client) {
    this.client = client;
  }
  
  async processDataAccessRequest(patientId, accessRequest) {
    // Verify patient identity for data access request
    const identityVerification = await this.client.compliance.verifyPatientIdentity({
      patient_id: patientId,
      verification_method: accessRequest.verification_method,
      identity_documents: accessRequest.identity_documents,
      biometric_verification: accessRequest.biometric_data
    });
    
    if (!identityVerification.data.verified) {
      throw new Error(`Identity verification failed: ${identityVerification.data.failure_reason}`);
    }
    
    // Get all personal data held about the patient
    const personalDataInventory = await this.client.compliance.getPersonalDataInventory({
      patient_id: patientId,
      include_all_categories: true,
      include_processing_history: true,
      include_third_party_shares: true
    });
    
    // Prepare data for access request
    const accessPackage = await this.prepareDataAccessPackage(
      personalDataInventory.data,
      accessRequest.preferred_format,
      accessRequest.language_preference
    );
    
    // Create audit trail for access request
    await this.client.compliance.createDataAccessAudit({
      patient_id: patientId,
      access_request_id: accessRequest.request_id,
      data_categories_accessed: personalDataInventory.data.categories,
      verification_method: accessRequest.verification_method,
      delivery_method: accessRequest.delivery_method,
      timestamp: new Date().toISOString()
    });
    
    return {
      access_request_id: accessRequest.request_id,
      patient_data_package: accessPackage,
      verification_completed: true,
      delivery_method: accessRequest.delivery_method,
      expiry_date: this.calculateExpiryDate(),
      audit_reference: accessPackage.audit_reference
    };
  }
  
  async processDataPortabilityRequest(patientId, portabilityRequest) {
    // Validate portability request
    const portabilityValidation = await this.client.compliance.validatePortabilityRequest({
      patient_id: patientId,
      target_system: portabilityRequest.target_system,
      data_categories: portabilityRequest.requested_categories
    });
    
    if (!portabilityValidation.data.valid) {
      throw new Error(`Portability request invalid: ${portabilityValidation.data.reasons}`);
    }
    
    // Extract portable data in standardized format
    const portableData = await this.client.compliance.extractPortableData({
      patient_id: patientId,
      categories: portabilityRequest.requested_categories,
      format: portabilityRequest.target_format, // HL7 FHIR, JSON, XML
      include_metadata: true,
      anonymize_third_party_data: true
    });
    
    // Generate secure transfer package
    const transferPackage = await this.generateSecureTransferPackage(
      portableData.data,
      portabilityRequest.target_system,
      portabilityRequest.security_requirements
    );
    
    return {
      portability_request_id: portabilityRequest.request_id,
      transfer_package: transferPackage,
      target_system_verified: portabilityValidation.data.target_system_verified,
      data_format: portabilityRequest.target_format,
      security_measures: transferPackage.security_measures,
      transfer_instructions: transferPackage.instructions
    };
  }
  
  async processDataRectificationRequest(patientId, rectificationRequest) {
    // Validate rectification request
    const currentData = await this.client.patients.get(patientId);
    const proposedChanges = rectificationRequest.proposed_changes;
    
    const validationResults = [];
    
    for (const change of proposedChanges) {
      const fieldValidation = await this.client.compliance.validateDataRectification({
        patient_id: patientId,
        field_name: change.field_name,
        current_value: currentData.data[change.field_name],
        proposed_value: change.proposed_value,
        supporting_evidence: change.supporting_evidence
      });
      
      validationResults.push({
        field: change.field_name,
        validation: fieldValidation.data,
        approved: fieldValidation.data.approved,
        reason: fieldValidation.data.reason
      });
    }
    
    // Apply approved changes
    const approvedChanges = validationResults.filter(r => r.approved);
    const appliedChanges = [];
    
    for (const change of approvedChanges) {
      const updateResult = await this.client.patients.update(patientId, {
        [change.field]: change.validation.approved_value,
        rectification_audit: {
          requested_by: rectificationRequest.requested_by,
          request_date: rectificationRequest.request_date,
          evidence_provided: change.validation.evidence_accepted
        }
      });
      
      if (updateResult.success) {
        appliedChanges.push(change);
        
        // Notify downstream systems of data changes
        await this.notifyDataRectification({
          patient_id: patientId,
          field_changed: change.field,
          old_value: change.validation.previous_value,
          new_value: change.validation.approved_value
        });
      }
    }
    
    return {
      rectification_request_id: rectificationRequest.request_id,
      requested_changes: proposedChanges.length,
      approved_changes: approvedChanges.length,
      applied_changes: appliedChanges.length,
      rejected_changes: validationResults.filter(r => !r.approved),
      audit_reference: await this.createRectificationAudit(patientId, validationResults)
    };
  }
  
  async prepareDataAccessPackage(personalData, format, language) {
    const package = {
      patient_identification: {
        id: personalData.patient_id,
        verification_status: 'verified',
        data_categories: personalData.categories
      },
      personal_data: {},
      processing_activities: [],
      third_party_sharing: [],
      retention_information: {},
      patient_rights_information: {}
    };
    
    // Organize data by category
    for (const category of personalData.categories) {
      const categoryData = await this.client.compliance.getCategoryData({
        patient_id: personalData.patient_id,
        category: category,
        include_source_information: true,
        include_processing_history: true
      });
      
      package.personal_data[category] = {
        data: categoryData.data.records,
        collection_date: categoryData.data.collection_date,
        source: categoryData.data.source,
        purpose: categoryData.data.collection_purpose,
        legal_basis: categoryData.data.legal_basis
      };
    }
    
    // Include processing activities
    package.processing_activities = await this.client.compliance.getProcessingActivities(
      personalData.patient_id
    );
    
    // Include third-party sharing information
    package.third_party_sharing = await this.client.compliance.getThirdPartySharing(
      personalData.patient_id
    );
    
    // Include retention information
    package.retention_information = await this.client.compliance.getRetentionInformation(
      personalData.patient_id
    );
    
    // Include patient rights information
    package.patient_rights_information = await this.client.compliance.getPatientRightsInformation(
      language
    );
    
    // Format according to request
    if (format === 'pdf') {
      return await this.generatePDFPackage(package, language);
    } else if (format === 'structured_data') {
      return await this.generateStructuredDataPackage(package);
    } else {
      return package; // Default JSON format
    }
  }
}
```

## PDPA Compliance Monitoring and Reporting

### Automated Compliance Monitoring

```python
import asyncio
from typing import List, Dict, Any
from datetime import datetime, timedelta
from medimate_malaysia import MediMateMalaysia
from medimate_malaysia.models import ComplianceMonitoringConfig, PDPAViolation

class PDPAComplianceMonitor:
    def __init__(self, client: MediMateMalaysia):
        self.client = client
        self.monitoring_active = False
        
    async def start_continuous_monitoring(self, config: ComplianceMonitoringConfig):
        """Start continuous PDPA compliance monitoring"""
        self.monitoring_active = True
        
        monitoring_tasks = [
            self.monitor_consent_compliance(),
            self.monitor_data_retention_compliance(),
            self.monitor_security_compliance(),
            self.monitor_access_patterns(),
            self.monitor_third_party_sharing(),
            self.monitor_data_subject_requests()
        ]
        
        await asyncio.gather(*monitoring_tasks)
    
    async def monitor_consent_compliance(self):
        """Monitor consent-related compliance issues"""
        while self.monitoring_active:
            try:
                # Check for expired consents
                expired_consents = await self.client.compliance.get_expired_consents_async(
                    check_date=datetime.now(),
                    advance_warning_days=30
                )
                
                for consent in expired_consents:
                    await self.handle_consent_expiry(consent)
                
                # Check for withdrawn consents not properly processed
                unprocessed_withdrawals = await self.client.compliance.get_unprocessed_withdrawals_async()
                
                for withdrawal in unprocessed_withdrawals:
                    await self.escalate_withdrawal_processing(withdrawal)
                
                # Check for missing consent for new processing activities
                missing_consents = await self.client.compliance.audit_consent_coverage_async()
                
                for missing in missing_consents:
                    await self.alert_missing_consent(missing)
                
                await asyncio.sleep(3600)  # Check hourly
                
            except Exception as e:
                await self.log_monitoring_error('consent_compliance', e)
                await asyncio.sleep(300)  # Wait 5 minutes before retry
    
    async def monitor_data_retention_compliance(self):
        """Monitor data retention policy compliance"""
        while self.monitoring_active:
            try:
                # Identify data that should be deleted
                retention_violations = await self.client.compliance.identify_retention_violations_async()
                
                for violation in retention_violations:
                    if violation.severity == 'critical':
                        # Immediate deletion required
                        await self.schedule_immediate_deletion(violation)
                    elif violation.severity == 'high':
                        # Deletion required within 30 days
                        await self.schedule_deletion_within_30_days(violation)
                    else:
                        # Review required
                        await self.schedule_retention_review(violation)
                
                # Check for data that needs archiving
                archiving_candidates = await self.client.compliance.identify_archiving_candidates_async()
                
                for candidate in archiving_candidates:
                    await self.schedule_data_archiving(candidate)
                
                await asyncio.sleep(86400)  # Check daily
                
            except Exception as e:
                await self.log_monitoring_error('retention_compliance', e)
                await asyncio.sleep(3600)  # Wait 1 hour before retry
    
    async def monitor_security_compliance(self):
        """Monitor security-related compliance"""
        while self.monitoring_active:
            try:
                # Check encryption compliance
                unencrypted_data = await self.client.compliance.find_unencrypted_sensitive_data_async()
                
                for data_item in unencrypted_data:
                    await self.schedule_emergency_encryption(data_item)
                
                # Check access control compliance
                access_violations = await self.client.compliance.audit_access_controls_async()
                
                for violation in access_violations:
                    await self.handle_access_violation(violation)
                
                # Check data transmission security
                transmission_violations = await self.client.compliance.audit_data_transmissions_async()
                
                for violation in transmission_violations:
                    await self.handle_transmission_violation(violation)
                
                await asyncio.sleep(1800)  # Check every 30 minutes
                
            except Exception as e:
                await self.log_monitoring_error('security_compliance', e)
                await asyncio.sleep(600)  # Wait 10 minutes before retry
    
    async def generate_compliance_report(self, report_period: str) -> Dict[str, Any]:
        """Generate comprehensive PDPA compliance report"""
        
        if report_period == 'monthly':
            start_date = datetime.now() - timedelta(days=30)
        elif report_period == 'quarterly':
            start_date = datetime.now() - timedelta(days=90)
        elif report_period == 'annually':
            start_date = datetime.now() - timedelta(days=365)
        else:
            raise ValueError("Invalid report period")
        
        # Gather compliance metrics
        consent_metrics = await self.client.compliance.get_consent_metrics_async(
            start_date=start_date,
            end_date=datetime.now()
        )
        
        data_processing_metrics = await self.client.compliance.get_processing_metrics_async(
            start_date=start_date,
            end_date=datetime.now()
        )
        
        security_metrics = await self.client.compliance.get_security_metrics_async(
            start_date=start_date,
            end_date=datetime.now()
        )
        
        data_subject_requests_metrics = await self.client.compliance.get_dsr_metrics_async(
            start_date=start_date,
            end_date=datetime.now()
        )
        
        violations = await self.client.compliance.get_violations_summary_async(
            start_date=start_date,
            end_date=datetime.now()
        )
        
        # Calculate compliance scores
        overall_score = self.calculate_overall_compliance_score(
            consent_metrics,
            data_processing_metrics,
            security_metrics,
            data_subject_requests_metrics,
            violations
        )
        
        # Generate recommendations
        recommendations = await self.generate_compliance_recommendations(
            consent_metrics,
            data_processing_metrics,
            security_metrics,
            violations
        )
        
        return {
            'report_period': report_period,
            'generation_date': datetime.now().isoformat(),
            'overall_compliance_score': overall_score,
            'metrics': {
                'consent_compliance': consent_metrics,
                'data_processing': data_processing_metrics,
                'security': security_metrics,
                'data_subject_requests': data_subject_requests_metrics
            },
            'violations': violations,
            'recommendations': recommendations,
            'certification_status': await self.check_certification_status(),
            'regulatory_updates': await self.get_relevant_regulatory_updates()
        }
    
    async def schedule_immediate_deletion(self, violation: Dict):
        """Schedule immediate data deletion for critical retention violations"""
        deletion_request = {
            'patient_id': violation['patient_id'],
            'data_categories': violation['data_categories'],
            'deletion_reason': 'retention_policy_violation',
            'urgency': 'immediate',
            'legal_basis': violation['legal_requirement']
        }
        
        deletion_id = await self.client.compliance.schedule_data_deletion_async(deletion_request)
        
        await self.client.compliance.create_compliance_alert_async({
            'type': 'critical_retention_violation',
            'patient_id': violation['patient_id'],
            'violation_details': violation,
            'remediation_action': 'immediate_deletion_scheduled',
            'deletion_id': deletion_id,
            'alert_recipients': ['compliance_officer', 'data_protection_officer']
        })
    
    def calculate_overall_compliance_score(
        self, 
        consent_metrics: Dict,
        processing_metrics: Dict,
        security_metrics: Dict,
        dsr_metrics: Dict,
        violations: Dict
    ) -> float:
        """Calculate overall PDPA compliance score (0-100)"""
        
        # Weight different aspects of compliance
        consent_score = consent_metrics['compliance_percentage'] * 0.25
        processing_score = processing_metrics['compliance_percentage'] * 0.20
        security_score = security_metrics['compliance_percentage'] * 0.30
        dsr_score = dsr_metrics['compliance_percentage'] * 0.15
        
        # Penalty for violations
        violation_penalty = min(violations['total_violations'] * 2, 20)  # Max 20% penalty
        
        overall_score = consent_score + processing_score + security_score + dsr_score - violation_penalty
        
        return max(0, min(100, overall_score))  # Ensure score is between 0-100
```

## Best Practices for PDPA Implementation

### Implementation Guidelines

1. **Privacy by Design**:
   - Build PDPA compliance into system architecture
   - Implement data minimization from the start
   - Design for consent management and withdrawal

2. **Technical Measures**:
   - Strong encryption for all personal data
   - Access controls with role-based permissions
   - Audit logging for all data processing activities
   - Automated data retention and deletion

3. **Organizational Measures**:
   - Designate a Data Protection Officer
   - Regular staff training on PDPA requirements
   - Clear policies and procedures
   - Regular compliance audits

4. **Patient Communication**:
   - Clear, understandable privacy notices
   - Multi-language support for consent forms
   - Easy-to-use rights management interfaces
   - Transparent breach notification procedures

### Implementation Checklist

- [ ] Consent management system implementation
- [ ] Data encryption and security measures
- [ ] Access control and authentication systems
- [ ] Audit logging and monitoring
- [ ] Data subject rights management
- [ ] Retention policy implementation
- [ ] Third-party data sharing controls
- [ ] Breach detection and notification systems
- [ ] Staff training and awareness programs
- [ ] Regular compliance assessments and audits

## Legal Requirements and Penalties

### PDPA 2010 Penalties

Non-compliance with PDPA can result in:
- **Criminal prosecution** with fines up to RM300,000 or imprisonment up to 2 years
- **Civil liability** for damages caused by breach
- **Regulatory sanctions** including license revocation
- **Reputational damage** and loss of patient trust

### Healthcare-Specific Obligations

Healthcare providers must also comply with:
- **Medical Act 1971** - Professional medical standards
- **Private Healthcare Facilities and Services Act 1998** - Healthcare facility regulations
- **Telemedicine Act 1997** - Digital healthcare services
- **Malaysian Medical Council** guidelines

## Resources

- [Personal Data Protection Act 2010](https://www.pdp.gov.my/jpdpv2/acts-regulations/) - Official PDPA text
- [Personal Data Protection Department](https://www.pdp.gov.my) - Malaysian data protection regulator
- [Malaysian Medical Council](https://www.mmc.gov.my) - Medical professional standards
- [Ministry of Health Malaysia](https://www.moh.gov.my) - Healthcare regulations

---

**PDPA compliance is not just a legal requirement but a fundamental aspect of patient trust in healthcare. Implementing comprehensive data protection measures ensures patient privacy while enabling quality healthcare delivery in Malaysia's digital health ecosystem.**