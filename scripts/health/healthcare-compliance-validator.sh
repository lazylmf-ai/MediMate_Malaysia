#!/bin/bash
#
# Healthcare Compliance Validation System for MediMate Malaysia
# Validates Malaysian healthcare regulations, PDPA, and medical standards
#

set -euo pipefail

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"
source "${SCRIPT_DIR}/../lib/validation.sh"

# Configuration
COMPLIANCE_CONFIG_DIR="${SCRIPT_DIR}/../../config/compliance"
DATA_DIR="${SCRIPT_DIR}/../../data/malaysia"
LOGS_DIR="${SCRIPT_DIR}/../../logs/compliance"
COMPLIANCE_REPORT_FILE="${LOGS_DIR}/compliance-report-$(date +%Y%m%d-%H%M%S).json"

# Malaysian healthcare compliance standards
declare -A COMPLIANCE_STANDARDS=(
    ["PDPA_2010"]="Personal Data Protection Act 2010"
    ["PHMC_STANDARDS"]="Private Healthcare Medical Council Standards"
    ["MOH_GUIDELINES"]="Ministry of Health Clinical Practice Guidelines"
    ["MSQH_STANDARDS"]="Malaysian Society for Quality in Health Standards"
    ["HIPAA_EQUIVALENT"]="Healthcare Information Privacy and Security"
    ["MEDICAL_DEVICE_ACT"]="Medical Device Act 2012"
    ["TRADITIONAL_MEDICINE"]="Traditional and Complementary Medicine Act 2016"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Compliance results tracking
declare -A COMPLIANCE_RESULTS=()
declare -A COMPLIANCE_DETAILS=()
COMPLIANCE_SCORE=0
TOTAL_CHECKS=0

# Function to display compliance output
print_compliance() {
    local status="$1"
    local category="$2"
    local message="$3"
    local details="${4:-}"
    local color
    
    case "$status" in
        "COMPLIANT") color="$GREEN" ;;
        "NON_COMPLIANT") color="$RED" ;;
        "WARNING") color="$YELLOW" ;;
        "INFO") color="$BLUE" ;;
        "REVIEW") color="$CYAN" ;;
        *) color="$NC" ;;
    esac
    
    printf "${color}[%-12s]${NC} %-20s %s\n" "$status" "[$category]" "$message"
    
    if [[ -n "$details" ]]; then
        echo "              $details"
    fi
    
    # Track results
    COMPLIANCE_RESULTS["$category"]="$status"
    COMPLIANCE_DETAILS["$category"]="$message"
    
    ((TOTAL_CHECKS++))
    if [[ "$status" == "COMPLIANT" ]]; then
        ((COMPLIANCE_SCORE++))
    fi
}

# Function to validate Personal Data Protection Act (PDPA) 2010 compliance
validate_pdpa_compliance() {
    print_compliance "INFO" "PDPA" "Validating Personal Data Protection Act 2010 compliance..."
    
    # Check for privacy policy and data handling procedures
    local privacy_config="${COMPLIANCE_CONFIG_DIR}/privacy-policy.json"
    local data_retention_config="${COMPLIANCE_CONFIG_DIR}/data-retention.json"
    
    if [[ -f "$privacy_config" ]]; then
        if jq empty "$privacy_config" 2>/dev/null; then
            # Check for required PDPA elements
            local consent_management
            consent_management=$(jq -r '.consent_management // "missing"' "$privacy_config")
            
            local data_subject_rights
            data_subject_rights=$(jq -r '.data_subject_rights // "missing"' "$privacy_config")
            
            local breach_notification
            breach_notification=$(jq -r '.breach_notification // "missing"' "$privacy_config")
            
            if [[ "$consent_management" != "missing" && "$data_subject_rights" != "missing" && "$breach_notification" != "missing" ]]; then
                print_compliance "COMPLIANT" "PDPA" "Privacy policy configuration includes PDPA requirements"
            else
                print_compliance "NON_COMPLIANT" "PDPA" "Privacy policy missing required PDPA elements" "Missing: consent management, data subject rights, or breach notification"
            fi
        else
            print_compliance "NON_COMPLIANT" "PDPA" "Privacy policy configuration has invalid JSON format"
        fi
    else
        print_compliance "NON_COMPLIANT" "PDPA" "Privacy policy configuration not found" "$privacy_config"
    fi
    
    # Check data retention policies
    if [[ -f "$data_retention_config" ]]; then
        print_compliance "COMPLIANT" "PDPA" "Data retention policy configuration exists"
    else
        print_compliance "WARNING" "PDPA" "Data retention policy not configured"
    fi
    
    # Check for data encryption requirements
    local encryption_config="${COMPLIANCE_CONFIG_DIR}/encryption.json"
    if [[ -f "$encryption_config" ]]; then
        local encryption_algorithms
        encryption_algorithms=$(jq -r '.algorithms[]? // empty' "$encryption_config" 2>/dev/null | wc -l)
        
        if [[ $encryption_algorithms -gt 0 ]]; then
            print_compliance "COMPLIANT" "PDPA" "Data encryption configuration defined"
        else
            print_compliance "WARNING" "PDPA" "Encryption algorithms not properly configured"
        fi
    else
        print_compliance "NON_COMPLIANT" "PDPA" "Data encryption configuration missing"
    fi
}

# Function to validate Ministry of Health (MOH) guidelines compliance
validate_moh_compliance() {
    print_compliance "INFO" "MOH_GUIDELINES" "Validating Ministry of Health guidelines compliance..."
    
    # Check for Malaysian healthcare data standards
    local healthcare_data_dir="$DATA_DIR"
    
    if [[ -d "$healthcare_data_dir" ]]; then
        # Validate healthcare specialties data
        local specialties_file="$healthcare_data_dir/healthcare-specialties.json"
        if [[ -f "$specialties_file" ]]; then
            if jq empty "$specialties_file" 2>/dev/null; then
                local specialty_count
                specialty_count=$(jq '. | length' "$specialties_file")
                
                if [[ $specialty_count -gt 0 ]]; then
                    print_compliance "COMPLIANT" "MOH_GUIDELINES" "Healthcare specialties data available" "$specialty_count specialties defined"
                    
                    # Check for required Malaysian medical specialties
                    local required_specialties=("CARD" "PEDI" "GYNE" "ORTH" "ENT")
                    local missing_specialties=()
                    
                    for specialty in "${required_specialties[@]}"; do
                        if ! jq -e ".[] | select(.specialty_code == \"$specialty\")" "$specialties_file" >/dev/null 2>&1; then
                            missing_specialties+=("$specialty")
                        fi
                    done
                    
                    if [[ ${#missing_specialties[@]} -eq 0 ]]; then
                        print_compliance "COMPLIANT" "MOH_GUIDELINES" "All essential medical specialties are defined"
                    else
                        print_compliance "WARNING" "MOH_GUIDELINES" "Some essential specialties missing" "${missing_specialties[*]}"
                    fi
                else
                    print_compliance "NON_COMPLIANT" "MOH_GUIDELINES" "Healthcare specialties data is empty"
                fi
            else
                print_compliance "NON_COMPLIANT" "MOH_GUIDELINES" "Healthcare specialties data has invalid JSON format"
            fi
        else
            print_compliance "NON_COMPLIANT" "MOH_GUIDELINES" "Healthcare specialties data not found"
        fi
        
        # Validate states and healthcare infrastructure
        local states_file="$healthcare_data_dir/states.json"
        if [[ -f "$states_file" ]]; then
            local states_with_hospitals
            states_with_hospitals=$(jq '[.[] | select(.major_hospitals | length > 0)] | length' "$states_file" 2>/dev/null || echo "0")
            
            if [[ $states_with_hospitals -ge 13 ]]; then # 13 states + 3 federal territories
                print_compliance "COMPLIANT" "MOH_GUIDELINES" "Healthcare infrastructure data available for all states"
            else
                print_compliance "WARNING" "MOH_GUIDELINES" "Incomplete healthcare infrastructure data" "$states_with_hospitals/16 states/territories"
            fi
        else
            print_compliance "NON_COMPLIANT" "MOH_GUIDELINES" "States healthcare data not found"
        fi
    else
        print_compliance "NON_COMPLIANT" "MOH_GUIDELINES" "Malaysian healthcare data directory not found"
    fi
}

# Function to validate Malaysian language and cultural compliance
validate_cultural_compliance() {
    print_compliance "INFO" "CULTURAL" "Validating Malaysian cultural and language compliance..."
    
    # Check for Malaysian language support
    local languages_file="$DATA_DIR/languages.json"
    if [[ -f "$languages_file" ]]; then
        if jq empty "$languages_file" 2>/dev/null; then
            # Check for official languages (Malay, English) and major languages (Chinese, Tamil)
            local official_languages=("ms" "en")
            local major_languages=("zh" "ta")
            local missing_languages=()
            
            for lang in "${official_languages[@]}" "${major_languages[@]}"; do
                if ! jq -e ".[] | select(.code == \"$lang\")" "$languages_file" >/dev/null 2>&1; then
                    missing_languages+=("$lang")
                fi
            done
            
            if [[ ${#missing_languages[@]} -eq 0 ]]; then
                print_compliance "COMPLIANT" "CULTURAL" "All major Malaysian languages are supported"
                
                # Check for medical terminology in local languages
                local languages_with_medical_terms
                languages_with_medical_terms=$(jq '[.[] | select(.medical_terms_available == true)] | length' "$languages_file")
                
                if [[ $languages_with_medical_terms -ge 4 ]]; then
                    print_compliance "COMPLIANT" "CULTURAL" "Medical terminology available in local languages"
                else
                    print_compliance "WARNING" "CULTURAL" "Limited medical terminology in local languages"
                fi
            else
                print_compliance "NON_COMPLIANT" "CULTURAL" "Missing essential Malaysian languages" "${missing_languages[*]}"
            fi
        else
            print_compliance "NON_COMPLIANT" "CULTURAL" "Languages data has invalid JSON format"
        fi
    else
        print_compliance "NON_COMPLIANT" "CULTURAL" "Malaysian languages data not found"
    fi
    
    # Check for cultural considerations in healthcare
    if jq -e '.[] | select(.cultural_considerations)' "$DATA_DIR/healthcare-specialties.json" >/dev/null 2>&1; then
        print_compliance "COMPLIANT" "CULTURAL" "Cultural considerations documented for healthcare services"
    else
        print_compliance "WARNING" "CULTURAL" "Cultural considerations not documented in healthcare services"
    fi
    
    # Validate state-specific data
    local states_file="$DATA_DIR/states.json"
    if [[ -f "$states_file" ]]; then
        local states_with_languages
        states_with_languages=$(jq '[.[] | select(.languages | length > 0)] | length' "$states_file" 2>/dev/null || echo "0")
        
        if [[ $states_with_languages -ge 13 ]]; then
            print_compliance "COMPLIANT" "CULTURAL" "Language preferences documented for all states"
        else
            print_compliance "WARNING" "CULTURAL" "Incomplete language preference data for states"
        fi
    fi
}

# Function to validate medical data security standards
validate_security_compliance() {
    print_compliance "INFO" "SECURITY" "Validating medical data security compliance..."
    
    # Check for SSL/TLS configuration
    if command -v openssl >/dev/null 2>&1; then
        print_compliance "COMPLIANT" "SECURITY" "OpenSSL available for encryption"
        
        # Check SSL configuration
        local ssl_config="${COMPLIANCE_CONFIG_DIR}/ssl.json"
        if [[ -f "$ssl_config" ]]; then
            local tls_version
            tls_version=$(jq -r '.minimum_tls_version // "unknown"' "$ssl_config" 2>/dev/null)
            
            if [[ "$tls_version" == "1.2" || "$tls_version" == "1.3" ]]; then
                print_compliance "COMPLIANT" "SECURITY" "TLS configuration meets security standards" "TLS $tls_version"
            else
                print_compliance "NON_COMPLIANT" "SECURITY" "TLS version does not meet security standards" "Current: $tls_version, Required: 1.2+"
            fi
        else
            print_compliance "WARNING" "SECURITY" "SSL/TLS configuration not found"
        fi
    else
        print_compliance "NON_COMPLIANT" "SECURITY" "OpenSSL not available for encryption"
    fi
    
    # Check for audit logging configuration
    local audit_config="${COMPLIANCE_CONFIG_DIR}/audit-logging.json"
    if [[ -f "$audit_config" ]]; then
        local audit_enabled
        audit_enabled=$(jq -r '.enabled // false' "$audit_config" 2>/dev/null)
        
        if [[ "$audit_enabled" == "true" ]]; then
            print_compliance "COMPLIANT" "SECURITY" "Audit logging is configured"
            
            # Check audit log retention
            local retention_days
            retention_days=$(jq -r '.retention_days // 0' "$audit_config" 2>/dev/null)
            
            if [[ $retention_days -ge 365 ]]; then
                print_compliance "COMPLIANT" "SECURITY" "Audit log retention meets compliance" "$retention_days days"
            else
                print_compliance "WARNING" "SECURITY" "Audit log retention may be insufficient" "$retention_days days (recommended: 365+)"
            fi
        else
            print_compliance "NON_COMPLIANT" "SECURITY" "Audit logging is not enabled"
        fi
    else
        print_compliance "NON_COMPLIANT" "SECURITY" "Audit logging configuration not found"
    fi
    
    # Check for access control configuration
    local access_control_config="${COMPLIANCE_CONFIG_DIR}/access-control.json"
    if [[ -f "$access_control_config" ]]; then
        local rbac_enabled
        rbac_enabled=$(jq -r '.role_based_access_control // false' "$access_control_config" 2>/dev/null)
        
        if [[ "$rbac_enabled" == "true" ]]; then
            print_compliance "COMPLIANT" "SECURITY" "Role-based access control configured"
        else
            print_compliance "NON_COMPLIANT" "SECURITY" "Role-based access control not configured"
        fi
    else
        print_compliance "NON_COMPLIANT" "SECURITY" "Access control configuration not found"
    fi
}

# Function to validate Malaysian medical device compliance
validate_medical_device_compliance() {
    print_compliance "INFO" "MEDICAL_DEVICE" "Validating Medical Device Act 2012 compliance..."
    
    # Check for medical device registration and classification
    local device_config="${COMPLIANCE_CONFIG_DIR}/medical-devices.json"
    if [[ -f "$device_config" ]]; then
        if jq empty "$device_config" 2>/dev/null; then
            local registered_devices
            registered_devices=$(jq '[.[] | select(.mda_registered == true)] | length' "$device_config" 2>/dev/null || echo "0")
            
            local total_devices
            total_devices=$(jq '. | length' "$device_config" 2>/dev/null || echo "0")
            
            if [[ $total_devices -eq 0 ]]; then
                print_compliance "INFO" "MEDICAL_DEVICE" "No medical devices configured"
            elif [[ $registered_devices -eq $total_devices ]]; then
                print_compliance "COMPLIANT" "MEDICAL_DEVICE" "All medical devices are MDA registered" "$registered_devices/$total_devices"
            else
                print_compliance "NON_COMPLIANT" "MEDICAL_DEVICE" "Some medical devices lack MDA registration" "$registered_devices/$total_devices registered"
            fi
        else
            print_compliance "NON_COMPLIANT" "MEDICAL_DEVICE" "Medical devices configuration has invalid JSON format"
        fi
    else
        print_compliance "INFO" "MEDICAL_DEVICE" "Medical devices configuration not found (may not be applicable)"
    fi
}

# Function to validate traditional and complementary medicine compliance
validate_tcm_compliance() {
    print_compliance "INFO" "TCM" "Validating Traditional and Complementary Medicine Act 2016 compliance..."
    
    # Check for TCM practitioner registration and standards
    local tcm_config="${COMPLIANCE_CONFIG_DIR}/tcm-practitioners.json"
    if [[ -f "$tcm_config" ]]; then
        local registered_practitioners
        registered_practitioners=$(jq '[.[] | select(.tcm_board_registered == true)] | length' "$tcm_config" 2>/dev/null || echo "0")
        
        if [[ $registered_practitioners -gt 0 ]]; then
            print_compliance "COMPLIANT" "TCM" "TCM practitioners are board registered" "$registered_practitioners practitioners"
        else
            print_compliance "WARNING" "TCM" "No TCM practitioners found or registration unclear"
        fi
    else
        print_compliance "INFO" "TCM" "TCM practitioners configuration not found (may not be applicable)"
    fi
    
    # Check for integration with conventional medicine standards
    if [[ -f "$DATA_DIR/healthcare-specialties.json" ]]; then
        local integrated_approach
        integrated_approach=$(jq -e '.[] | select(.name_en | contains("Traditional"))' "$DATA_DIR/healthcare-specialties.json" >/dev/null 2>&1 && echo "true" || echo "false")
        
        if [[ "$integrated_approach" == "true" ]]; then
            print_compliance "COMPLIANT" "TCM" "Integrated medicine approach documented"
        else
            print_compliance "INFO" "TCM" "Traditional medicine integration not explicitly documented"
        fi
    fi
}

# Function to validate emergency response compliance
validate_emergency_compliance() {
    print_compliance "INFO" "EMERGENCY" "Validating emergency response compliance..."
    
    # Check for emergency contact systems
    local emergency_config="${COMPLIANCE_CONFIG_DIR}/emergency-response.json"
    if [[ -f "$emergency_config" ]]; then
        local emergency_numbers
        emergency_numbers=$(jq -r '.emergency_contacts | length' "$emergency_config" 2>/dev/null || echo "0")
        
        if [[ $emergency_numbers -gt 0 ]]; then
            # Check for Malaysian emergency numbers (999, 994, 991)
            local has_999
            has_999=$(jq -e '.emergency_contacts[] | select(.number == "999")' "$emergency_config" >/dev/null 2>&1 && echo "true" || echo "false")
            
            if [[ "$has_999" == "true" ]]; then
                print_compliance "COMPLIANT" "EMERGENCY" "Malaysian emergency numbers configured"
            else
                print_compliance "WARNING" "EMERGENCY" "Malaysian emergency number (999) not found"
            fi
        else
            print_compliance "NON_COMPLIANT" "EMERGENCY" "Emergency contact system not configured"
        fi
    else
        print_compliance "NON_COMPLIANT" "EMERGENCY" "Emergency response configuration not found"
    fi
    
    # Check for hospital emergency department data
    if [[ -f "$DATA_DIR/states.json" ]]; then
        local hospitals_with_emergency
        hospitals_with_emergency=$(jq '[.[] | .major_hospitals[]] | length' "$DATA_DIR/states.json" 2>/dev/null || echo "0")
        
        if [[ $hospitals_with_emergency -gt 50 ]]; then # Reasonable threshold for Malaysia
            print_compliance "COMPLIANT" "EMERGENCY" "Comprehensive hospital network data available" "$hospitals_with_emergency hospitals"
        else
            print_compliance "WARNING" "EMERGENCY" "Limited hospital network data" "$hospitals_with_emergency hospitals"
        fi
    fi
}

# Function to generate compliance report
generate_compliance_report() {
    local report_file="${1:-$COMPLIANCE_REPORT_FILE}"
    
    print_compliance "INFO" "REPORTING" "Generating healthcare compliance report..."
    
    # Create logs directory
    mkdir -p "$(dirname "$report_file")"
    
    local compliance_rate=0
    if [[ $TOTAL_CHECKS -gt 0 ]]; then
        compliance_rate=$(( (COMPLIANCE_SCORE * 100) / TOTAL_CHECKS ))
    fi
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "compliance_framework": "Malaysian Healthcare Standards",
  "version": "1.0.0",
  "jurisdiction": "Malaysia",
  "applicable_acts": [
    "Personal Data Protection Act 2010",
    "Private Healthcare Facilities and Services Act 1998",
    "Medical Device Act 2012",
    "Traditional and Complementary Medicine Act 2016"
  ],
  "summary": {
    "total_checks": $TOTAL_CHECKS,
    "compliant_checks": $COMPLIANCE_SCORE,
    "compliance_rate": $compliance_rate,
    "overall_status": "$(if [[ $compliance_rate -ge 80 ]]; then echo "compliant"; elif [[ $compliance_rate -ge 60 ]]; then echo "partially_compliant"; else echo "non_compliant"; fi)"
  },
  "compliance_results": {
$(
    first=true
    for category in "${!COMPLIANCE_RESULTS[@]}"; do
        if [[ $first == true ]]; then
            first=false
        else
            echo ","
        fi
        echo -n "    \"$category\": {\"status\": \"${COMPLIANCE_RESULTS[$category]}\", \"details\": \"${COMPLIANCE_DETAILS[$category]}\"}"
    done
)
  },
  "recommendations": [
$(
    first=true
    for category in "${!COMPLIANCE_RESULTS[@]}"; do
        if [[ "${COMPLIANCE_RESULTS[$category]}" == "NON_COMPLIANT" || "${COMPLIANCE_RESULTS[$category]}" == "WARNING" ]]; then
            if [[ $first == true ]]; then
                first=false
            else
                echo ","
            fi
            echo -n "    \"Address $category compliance: ${COMPLIANCE_DETAILS[$category]}\""
        fi
    done
)
  ],
  "next_review_date": "$(date -d "+3 months" -u +%Y-%m-%dT%H:%M:%SZ)",
  "regulatory_contacts": {
    "ministry_of_health": "https://www.moh.gov.my",
    "medical_device_authority": "https://www.mda.gov.my",
    "personal_data_protection_department": "https://www.pdp.gov.my"
  }
}
EOF
    
    print_compliance "COMPLIANT" "REPORTING" "Compliance report generated successfully" "$report_file"
}

# Function to create compliance configuration templates
create_compliance_templates() {
    print_compliance "INFO" "SETUP" "Creating compliance configuration templates..."
    
    mkdir -p "$COMPLIANCE_CONFIG_DIR"
    
    # Privacy policy template
    cat > "$COMPLIANCE_CONFIG_DIR/privacy-policy.json" << 'EOF'
{
  "version": "1.0.0",
  "effective_date": "2024-01-01",
  "consent_management": {
    "enabled": true,
    "opt_in_required": true,
    "granular_consent": true,
    "withdrawal_mechanism": "user_dashboard"
  },
  "data_subject_rights": {
    "access_right": true,
    "correction_right": true,
    "deletion_right": true,
    "portability_right": true,
    "objection_right": true
  },
  "breach_notification": {
    "internal_notification_hours": 24,
    "authority_notification_hours": 72,
    "data_subject_notification": "required_for_high_risk"
  },
  "data_categories": [
    "personal_identification",
    "medical_records",
    "appointment_history",
    "payment_information",
    "communication_preferences"
  ],
  "retention_periods": {
    "medical_records_years": 7,
    "appointment_history_years": 3,
    "communication_logs_years": 1
  }
}
EOF
    
    # SSL configuration template
    cat > "$COMPLIANCE_CONFIG_DIR/ssl.json" << 'EOF'
{
  "minimum_tls_version": "1.2",
  "cipher_suites": [
    "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
    "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"
  ],
  "certificate_validation": true,
  "hsts_enabled": true,
  "hsts_max_age": 31536000
}
EOF
    
    # Audit logging template
    cat > "$COMPLIANCE_CONFIG_DIR/audit-logging.json" << 'EOF'
{
  "enabled": true,
  "retention_days": 2555,
  "log_level": "info",
  "events_to_log": [
    "user_authentication",
    "data_access",
    "data_modification",
    "system_configuration_changes",
    "security_events"
  ],
  "log_format": "structured_json",
  "encryption_at_rest": true,
  "integrity_protection": true
}
EOF
    
    # Emergency response template
    cat > "$COMPLIANCE_CONFIG_DIR/emergency-response.json" << 'EOF'
{
  "emergency_contacts": [
    {
      "service": "Police/Fire/Ambulance",
      "number": "999",
      "description": "General emergency services"
    },
    {
      "service": "Civil Defence",
      "number": "991",
      "description": "Natural disasters and civil emergencies"
    },
    {
      "service": "Poison Control",
      "number": "1-800-88-9999",
      "description": "Poison information center"
    }
  ],
  "escalation_procedures": {
    "medical_emergency": "immediate_999_call",
    "data_breach": "internal_team_plus_pdp_notification",
    "system_failure": "technical_team_escalation"
  },
  "response_times": {
    "critical_incidents_minutes": 5,
    "high_priority_minutes": 15,
    "medium_priority_minutes": 60
  }
}
EOF
    
    print_compliance "COMPLIANT" "SETUP" "Compliance configuration templates created" "$COMPLIANCE_CONFIG_DIR"
}

# Main compliance validation function
run_comprehensive_compliance_validation() {
    echo "=============================================="
    echo "    MediMate Malaysia Healthcare Compliance"
    echo "=============================================="
    echo ""
    
    print_compliance "INFO" "INIT" "Starting healthcare compliance validation..."
    echo ""
    
    # Create compliance configuration templates if they don't exist
    if [[ ! -d "$COMPLIANCE_CONFIG_DIR" ]]; then
        create_compliance_templates
        echo ""
    fi
    
    # Run all compliance validations
    validate_pdpa_compliance
    echo ""
    
    validate_moh_compliance
    echo ""
    
    validate_cultural_compliance
    echo ""
    
    validate_security_compliance
    echo ""
    
    validate_medical_device_compliance
    echo ""
    
    validate_tcm_compliance
    echo ""
    
    validate_emergency_compliance
    echo ""
    
    # Generate comprehensive report
    generate_compliance_report
    echo ""
}

# Function to display compliance summary
display_compliance_summary() {
    local compliance_rate=0
    if [[ $TOTAL_CHECKS -gt 0 ]]; then
        compliance_rate=$(( (COMPLIANCE_SCORE * 100) / TOTAL_CHECKS ))
    fi
    
    echo "=============================================="
    echo "        COMPLIANCE VALIDATION SUMMARY"
    echo "=============================================="
    printf "Total Checks:      %d\n" "$TOTAL_CHECKS"
    printf "Compliant:         %d\n" "$COMPLIANCE_SCORE"
    printf "Compliance Rate:   %d%%\n" "$compliance_rate"
    echo ""
    
    if [[ $compliance_rate -ge 80 ]]; then
        print_compliance "COMPLIANT" "OVERALL" "Healthcare compliance validation passed" "Ready for Malaysian healthcare operations"
    elif [[ $compliance_rate -ge 60 ]]; then
        print_compliance "WARNING" "OVERALL" "Partial compliance achieved" "Review non-compliant areas before production"
    else
        print_compliance "NON_COMPLIANT" "OVERALL" "Compliance validation failed" "Critical compliance issues must be resolved"
        return 1
    fi
    
    echo ""
    echo "Compliance report saved to: $COMPLIANCE_REPORT_FILE"
    
    return 0
}

# Main function
main() {
    local command="${1:-validate}"
    local report_file="${2:-}"
    
    case "$command" in
        "validate"|"check")
            run_comprehensive_compliance_validation
            if [[ -n "$report_file" ]]; then
                generate_compliance_report "$report_file"
            fi
            display_compliance_summary
            ;;
        "pdpa")
            validate_pdpa_compliance
            ;;
        "moh")
            validate_moh_compliance
            ;;
        "cultural")
            validate_cultural_compliance
            ;;
        "security")
            validate_security_compliance
            ;;
        "devices")
            validate_medical_device_compliance
            ;;
        "tcm")
            validate_tcm_compliance
            ;;
        "emergency")
            validate_emergency_compliance
            ;;
        "setup"|"templates")
            create_compliance_templates
            ;;
        "report")
            run_comprehensive_compliance_validation >/dev/null 2>&1
            generate_compliance_report "$report_file"
            echo "Compliance report generated: ${report_file:-$COMPLIANCE_REPORT_FILE}"
            ;;
        *)
            echo "Usage: $0 {validate|pdpa|moh|cultural|security|devices|tcm|emergency|setup|report} [report_file]"
            echo ""
            echo "Commands:"
            echo "  validate   - Run comprehensive compliance validation (default)"
            echo "  pdpa       - Validate Personal Data Protection Act compliance"
            echo "  moh        - Validate Ministry of Health guidelines compliance"
            echo "  cultural   - Validate Malaysian cultural and language compliance"
            echo "  security   - Validate medical data security compliance"
            echo "  devices    - Validate medical device compliance"
            echo "  tcm        - Validate traditional medicine compliance"
            echo "  emergency  - Validate emergency response compliance"
            echo "  setup      - Create compliance configuration templates"
            echo "  report     - Generate compliance report only"
            exit 1
            ;;
    esac
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi