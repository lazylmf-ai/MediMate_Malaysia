#!/bin/bash
#
# Environment Validation Framework for MediMate Malaysia
# Comprehensive validation of development environment setup
#

set -euo pipefail

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"
source "${SCRIPT_DIR}/../lib/validation.sh"
source "${SCRIPT_DIR}/../lib/platform.sh"

# Configuration
VALIDATION_CONFIG_FILE="${SCRIPT_DIR}/../../config/validation-config.json"
MALAYSIA_CULTURAL_DATA_DIR="${SCRIPT_DIR}/../../data/malaysia"
BACKEND_CONFIG_DIR="${SCRIPT_DIR}/../../backend/src/config"
FRONTEND_CONFIG_DIR="${SCRIPT_DIR}/../../frontend/src/config"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Validation results tracking
declare -A VALIDATION_RESULTS=()
declare -A VALIDATION_DETAILS=()
VALIDATION_SCORE=0
TOTAL_VALIDATIONS=0

# Function to display colored output
print_validation() {
    local status="$1"
    local category="$2"
    local message="$3"
    local details="${4:-}"
    local color
    
    case "$status" in
        "PASS") color="$GREEN" ;;
        "FAIL") color="$RED" ;;
        "WARN") color="$YELLOW" ;;
        "INFO") color="$BLUE" ;;
        "SKIP") color="$CYAN" ;;
        *) color="$NC" ;;
    esac
    
    printf "${color}[%-4s]${NC} %-20s %s\n" "$status" "[$category]" "$message"
    
    if [[ -n "$details" ]]; then
        echo "       $details"
    fi
    
    # Track results
    VALIDATION_RESULTS["$category"]="$status"
    VALIDATION_DETAILS["$category"]="$message"
    
    ((TOTAL_VALIDATIONS++))
    if [[ "$status" == "PASS" ]]; then
        ((VALIDATION_SCORE++))
    fi
}

# Function to validate Docker environment
validate_docker_environment() {
    print_validation "INFO" "DOCKER" "Validating Docker environment..."
    
    # Check Docker installation
    if ! command -v docker >/dev/null 2>&1; then
        print_validation "FAIL" "DOCKER" "Docker is not installed"
        return 1
    fi
    
    # Check Docker version
    local docker_version
    docker_version=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)
    
    if version_compare "$docker_version" ">=" "20.10.0"; then
        print_validation "PASS" "DOCKER" "Docker version is compatible" "Version: $docker_version"
    else
        print_validation "WARN" "DOCKER" "Docker version may be outdated" "Version: $docker_version (recommended: >=20.10.0)"
    fi
    
    # Check Docker daemon
    if docker info >/dev/null 2>&1; then
        print_validation "PASS" "DOCKER" "Docker daemon is running"
    else
        print_validation "FAIL" "DOCKER" "Docker daemon is not running"
        return 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_validation "FAIL" "DOCKER" "Docker Compose is not installed"
        return 1
    fi
    
    local compose_version
    compose_version=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)
    
    if version_compare "$compose_version" ">=" "2.0.0"; then
        print_validation "PASS" "DOCKER" "Docker Compose version is compatible" "Version: $compose_version"
    else
        print_validation "WARN" "DOCKER" "Docker Compose version may be outdated" "Version: $compose_version (recommended: >=2.0.0)"
    fi
    
    return 0
}

# Function to validate development tools
validate_development_tools() {
    print_validation "INFO" "DEV_TOOLS" "Validating development tools..."
    
    local tools_status=0
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        local node_version
        node_version=$(node --version | sed 's/v//')
        
        if version_compare "$node_version" ">=" "18.0.0"; then
            print_validation "PASS" "DEV_TOOLS" "Node.js version is compatible" "Version: $node_version"
        else
            print_validation "WARN" "DEV_TOOLS" "Node.js version may be outdated" "Version: $node_version (recommended: >=18.0.0)"
        fi
    else
        print_validation "WARN" "DEV_TOOLS" "Node.js is not installed (required for frontend development)"
        tools_status=1
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        local npm_version
        npm_version=$(npm --version)
        print_validation "PASS" "DEV_TOOLS" "npm is available" "Version: $npm_version"
    else
        print_validation "WARN" "DEV_TOOLS" "npm is not available"
        tools_status=1
    fi
    
    # Check Python (for backend)
    if command -v python3 >/dev/null 2>&1; then
        local python_version
        python_version=$(python3 --version | awk '{print $2}')
        
        if version_compare "$python_version" ">=" "3.8.0"; then
            print_validation "PASS" "DEV_TOOLS" "Python version is compatible" "Version: $python_version"
        else
            print_validation "WARN" "DEV_TOOLS" "Python version may be outdated" "Version: $python_version (recommended: >=3.8.0)"
        fi
    else
        print_validation "WARN" "DEV_TOOLS" "Python3 is not installed (required for backend development)"
        tools_status=1
    fi
    
    # Check Git
    if command -v git >/dev/null 2>&1; then
        local git_version
        git_version=$(git --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)
        print_validation "PASS" "DEV_TOOLS" "Git is available" "Version: $git_version"
    else
        print_validation "FAIL" "DEV_TOOLS" "Git is not installed"
        tools_status=1
    fi
    
    # Check curl
    if command -v curl >/dev/null 2>&1; then
        print_validation "PASS" "DEV_TOOLS" "curl is available"
    else
        print_validation "WARN" "DEV_TOOLS" "curl is not available (may affect some scripts)"
    fi
    
    # Check jq (for JSON processing)
    if command -v jq >/dev/null 2>&1; then
        print_validation "PASS" "DEV_TOOLS" "jq is available"
    else
        print_validation "WARN" "DEV_TOOLS" "jq is not available (recommended for JSON processing)"
    fi
    
    return $tools_status
}

# Function to validate network connectivity
validate_network_connectivity() {
    print_validation "INFO" "NETWORK" "Validating network connectivity..."
    
    local network_status=0
    
    # Check internet connectivity
    if curl -sf --max-time 10 https://www.google.com >/dev/null 2>&1; then
        print_validation "PASS" "NETWORK" "Internet connectivity is available"
    else
        print_validation "FAIL" "NETWORK" "Internet connectivity is not available"
        network_status=1
    fi
    
    # Check Docker Hub connectivity
    if curl -sf --max-time 10 https://hub.docker.com >/dev/null 2>&1; then
        print_validation "PASS" "NETWORK" "Docker Hub is accessible"
    else
        print_validation "WARN" "NETWORK" "Docker Hub may not be accessible"
    fi
    
    # Check npm registry connectivity
    if curl -sf --max-time 10 https://registry.npmjs.org >/dev/null 2>&1; then
        print_validation "PASS" "NETWORK" "npm registry is accessible"
    else
        print_validation "WARN" "NETWORK" "npm registry may not be accessible"
    fi
    
    # Check PyPI connectivity
    if curl -sf --max-time 10 https://pypi.org >/dev/null 2>&1; then
        print_validation "PASS" "NETWORK" "PyPI is accessible"
    else
        print_validation "WARN" "NETWORK" "PyPI may not be accessible"
    fi
    
    return $network_status
}

# Function to validate file system permissions
validate_filesystem_permissions() {
    print_validation "INFO" "FILESYSTEM" "Validating file system permissions..."
    
    local fs_status=0
    
    # Check project directory permissions
    local project_dir
    project_dir="$(cd "${SCRIPT_DIR}/../.." && pwd)"
    
    if [[ -w "$project_dir" ]]; then
        print_validation "PASS" "FILESYSTEM" "Project directory is writable"
    else
        print_validation "FAIL" "FILESYSTEM" "Project directory is not writable" "$project_dir"
        fs_status=1
    fi
    
    # Check Docker socket permissions (Linux/macOS)
    if [[ -S "/var/run/docker.sock" ]]; then
        if [[ -r "/var/run/docker.sock" && -w "/var/run/docker.sock" ]]; then
            print_validation "PASS" "FILESYSTEM" "Docker socket permissions are correct"
        else
            print_validation "WARN" "FILESYSTEM" "Docker socket permissions may be restrictive"
        fi
    else
        print_validation "INFO" "FILESYSTEM" "Docker socket not found (may be using Docker Desktop)"
    fi
    
    # Check temp directory
    local temp_dir="${TMPDIR:-/tmp}"
    if [[ -w "$temp_dir" ]]; then
        print_validation "PASS" "FILESYSTEM" "Temporary directory is writable" "$temp_dir"
    else
        print_validation "WARN" "FILESYSTEM" "Temporary directory is not writable" "$temp_dir"
    fi
    
    # Check disk space
    local available_space
    if command -v df >/dev/null 2>&1; then
        available_space=$(df -h "$project_dir" | awk 'NR==2 {print $4}' | sed 's/[^0-9.]*//g')
        if [[ -n "$available_space" ]]; then
            local space_gb
            space_gb=$(echo "$available_space" | awk '{print int($1)}')
            if [[ $space_gb -gt 5 ]]; then
                print_validation "PASS" "FILESYSTEM" "Sufficient disk space available" "${available_space}GB"
            else
                print_validation "WARN" "FILESYSTEM" "Low disk space" "${available_space}GB (recommended: >5GB)"
            fi
        fi
    fi
    
    return $fs_status
}

# Function to validate environment variables
validate_environment_variables() {
    print_validation "INFO" "ENV_VARS" "Validating environment variables..."
    
    local env_status=0
    
    # Check for .env file
    local env_file="${SCRIPT_DIR}/../../.env"
    if [[ -f "$env_file" ]]; then
        print_validation "PASS" "ENV_VARS" ".env file exists"
        
        # Check for essential variables
        source "$env_file" 2>/dev/null || true
        
        # Database variables
        if [[ -n "${POSTGRES_DB:-}" ]]; then
            print_validation "PASS" "ENV_VARS" "PostgreSQL database configured" "$POSTGRES_DB"
        else
            print_validation "WARN" "ENV_VARS" "POSTGRES_DB not set"
        fi
        
        if [[ -n "${POSTGRES_USER:-}" ]]; then
            print_validation "PASS" "ENV_VARS" "PostgreSQL user configured" "$POSTGRES_USER"
        else
            print_validation "WARN" "ENV_VARS" "POSTGRES_USER not set"
        fi
        
        # Redis variables
        if [[ -n "${REDIS_PORT:-}" ]]; then
            print_validation "PASS" "ENV_VARS" "Redis port configured" "$REDIS_PORT"
        else
            print_validation "INFO" "ENV_VARS" "REDIS_PORT using default (6379)"
        fi
        
        # MinIO variables
        if [[ -n "${MINIO_ROOT_USER:-}" ]]; then
            print_validation "PASS" "ENV_VARS" "MinIO user configured"
        else
            print_validation "WARN" "ENV_VARS" "MINIO_ROOT_USER not set"
        fi
        
    else
        print_validation "WARN" "ENV_VARS" ".env file does not exist" "Create from .env.example if available"
        env_status=1
    fi
    
    # Check for sensitive environment variables in shell
    local sensitive_vars=("AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY" "DATABASE_URL" "REDIS_URL")
    for var in "${sensitive_vars[@]}"; do
        if [[ -n "${!var:-}" ]]; then
            print_validation "INFO" "ENV_VARS" "$var is set in environment"
        fi
    done
    
    return $env_status
}

# Function to validate Malaysian cultural data
validate_malaysian_cultural_data() {
    print_validation "INFO" "CULTURE_DATA" "Validating Malaysian cultural data..."
    
    local cultural_status=0
    
    # Check if cultural data directory exists
    if [[ -d "$MALAYSIA_CULTURAL_DATA_DIR" ]]; then
        print_validation "PASS" "CULTURE_DATA" "Malaysian cultural data directory exists"
        
        # Check for specific cultural data files
        local cultural_files=(
            "states.json"
            "languages.json" 
            "ethnicities.json"
            "religions.json"
            "festivals.json"
        )
        
        for file in "${cultural_files[@]}"; do
            local file_path="$MALAYSIA_CULTURAL_DATA_DIR/$file"
            if [[ -f "$file_path" ]]; then
                # Validate JSON format
                if jq empty "$file_path" 2>/dev/null; then
                    local record_count
                    record_count=$(jq '. | length' "$file_path" 2>/dev/null || echo "0")
                    print_validation "PASS" "CULTURE_DATA" "$file is valid" "$record_count records"
                else
                    print_validation "FAIL" "CULTURE_DATA" "$file has invalid JSON format"
                    cultural_status=1
                fi
            else
                print_validation "WARN" "CULTURE_DATA" "$file is missing"
                cultural_status=1
            fi
        done
        
        # Check for healthcare-specific data
        local healthcare_files=(
            "hospitals.json"
            "clinics.json"
            "specialties.json"
        )
        
        for file in "${healthcare_files[@]}"; do
            local file_path="$MALAYSIA_CULTURAL_DATA_DIR/$file"
            if [[ -f "$file_path" ]]; then
                if jq empty "$file_path" 2>/dev/null; then
                    local record_count
                    record_count=$(jq '. | length' "$file_path" 2>/dev/null || echo "0")
                    print_validation "PASS" "CULTURE_DATA" "$file is valid" "$record_count records"
                else
                    print_validation "FAIL" "CULTURE_DATA" "$file has invalid JSON format"
                    cultural_status=1
                fi
            else
                print_validation "WARN" "CULTURE_DATA" "$file is missing (healthcare data)"
            fi
        done
        
    else
        print_validation "FAIL" "CULTURE_DATA" "Malaysian cultural data directory is missing" "$MALAYSIA_CULTURAL_DATA_DIR"
        cultural_status=1
    fi
    
    return $cultural_status
}

# Function to validate application configuration
validate_application_configuration() {
    print_validation "INFO" "APP_CONFIG" "Validating application configuration..."
    
    local app_status=0
    
    # Check backend configuration
    if [[ -d "$BACKEND_CONFIG_DIR" ]]; then
        print_validation "PASS" "APP_CONFIG" "Backend configuration directory exists"
        
        # Check for backend config files
        local backend_configs=("database.js" "redis.js" "storage.js" "app.js")
        for config in "${backend_configs[@]}"; do
            if [[ -f "$BACKEND_CONFIG_DIR/$config" ]]; then
                print_validation "PASS" "APP_CONFIG" "Backend $config exists"
            else
                print_validation "WARN" "APP_CONFIG" "Backend $config is missing"
            fi
        done
    else
        print_validation "WARN" "APP_CONFIG" "Backend configuration directory is missing"
        app_status=1
    fi
    
    # Check frontend configuration
    if [[ -d "$FRONTEND_CONFIG_DIR" ]]; then
        print_validation "PASS" "APP_CONFIG" "Frontend configuration directory exists"
    else
        print_validation "WARN" "APP_CONFIG" "Frontend configuration directory is missing"
    fi
    
    # Check package.json files
    local package_files=(
        "${SCRIPT_DIR}/../../package.json"
        "${SCRIPT_DIR}/../../frontend/package.json"
        "${SCRIPT_DIR}/../../backend/package.json"
    )
    
    for package_file in "${package_files[@]}"; do
        if [[ -f "$package_file" ]]; then
            if jq empty "$package_file" 2>/dev/null; then
                local package_name
                package_name=$(jq -r '.name // "unknown"' "$package_file")
                print_validation "PASS" "APP_CONFIG" "$(basename "$(dirname "$package_file")")/package.json is valid" "$package_name"
            else
                print_validation "FAIL" "APP_CONFIG" "$(basename "$(dirname "$package_file")")/package.json has invalid format"
                app_status=1
            fi
        else
            print_validation "WARN" "APP_CONFIG" "$(basename "$(dirname "$package_file")")/package.json is missing"
        fi
    done
    
    return $app_status
}

# Function to validate healthcare compliance requirements
validate_healthcare_compliance() {
    print_validation "INFO" "COMPLIANCE" "Validating healthcare compliance requirements..."
    
    local compliance_status=0
    
    # Check for security configurations
    local security_files=(
        "${SCRIPT_DIR}/../../config/security.json"
        "${SCRIPT_DIR}/../../backend/src/middleware/security.js"
    )
    
    for security_file in "${security_files[@]}"; do
        if [[ -f "$security_file" ]]; then
            print_validation "PASS" "COMPLIANCE" "Security configuration exists" "$(basename "$security_file")"
        else
            print_validation "WARN" "COMPLIANCE" "Security configuration missing" "$(basename "$security_file")"
        fi
    done
    
    # Check for privacy and data protection configurations
    local privacy_files=(
        "${SCRIPT_DIR}/../../config/privacy.json"
        "${SCRIPT_DIR}/../../docs/privacy-policy.md"
    )
    
    for privacy_file in "${privacy_files[@]}"; do
        if [[ -f "$privacy_file" ]]; then
            print_validation "PASS" "COMPLIANCE" "Privacy configuration exists" "$(basename "$privacy_file")"
        else
            print_validation "WARN" "COMPLIANCE" "Privacy configuration missing" "$(basename "$privacy_file")"
        fi
    done
    
    # Check for audit logging configuration
    local audit_files=(
        "${SCRIPT_DIR}/../../config/audit.json"
        "${SCRIPT_DIR}/../../logs"
    )
    
    for audit_file in "${audit_files[@]}"; do
        if [[ -e "$audit_file" ]]; then
            print_validation "PASS" "COMPLIANCE" "Audit configuration exists" "$(basename "$audit_file")"
        else
            print_validation "WARN" "COMPLIANCE" "Audit configuration missing" "$(basename "$audit_file")"
        fi
    done
    
    # Check SSL/TLS requirements
    if command -v openssl >/dev/null 2>&1; then
        print_validation "PASS" "COMPLIANCE" "OpenSSL available for encryption"
    else
        print_validation "WARN" "COMPLIANCE" "OpenSSL not available (required for HTTPS)"
        compliance_status=1
    fi
    
    return $compliance_status
}

# Function to run performance benchmarks
validate_performance_benchmarks() {
    print_validation "INFO" "PERFORMANCE" "Running performance validation benchmarks..."
    
    local perf_status=0
    
    # Test file I/O performance
    local start_time end_time duration
    start_time=$(date +%s%N)
    
    # Create a test file and measure write performance
    local test_file="/tmp/medimate_perf_test_$$"
    if dd if=/dev/zero of="$test_file" bs=1M count=10 2>/dev/null; then
        end_time=$(date +%s%N)
        duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        if [[ $duration -lt 1000 ]]; then
            print_validation "PASS" "PERFORMANCE" "File I/O performance is good" "${duration}ms for 10MB write"
        else
            print_validation "WARN" "PERFORMANCE" "File I/O performance is slow" "${duration}ms for 10MB write"
        fi
        
        rm -f "$test_file"
    else
        print_validation "WARN" "PERFORMANCE" "Could not test file I/O performance"
    fi
    
    # Test network performance (local)
    start_time=$(date +%s%N)
    if curl -sf --max-time 5 http://localhost:80 >/dev/null 2>&1 || true; then
        end_time=$(date +%s%N)
        duration=$(( (end_time - start_time) / 1000000 ))
        print_validation "INFO" "PERFORMANCE" "Local network response time" "${duration}ms"
    fi
    
    # Check system load
    if command -v uptime >/dev/null 2>&1; then
        local load_1min
        load_1min=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
        
        if (( $(echo "$load_1min < 2.0" | bc -l 2>/dev/null || echo "1") )); then
            print_validation "PASS" "PERFORMANCE" "System load is acceptable" "1-min load: $load_1min"
        else
            print_validation "WARN" "PERFORMANCE" "System load is high" "1-min load: $load_1min"
        fi
    fi
    
    return $perf_status
}

# Function to generate validation report
generate_validation_report() {
    local report_file="${1:-validation-report-$(date +%Y%m%d-%H%M%S).json}"
    local report_dir
    report_dir="$(dirname "$report_file")"
    
    # Create report directory if it doesn't exist
    mkdir -p "$report_dir"
    
    print_validation "INFO" "REPORTING" "Generating validation report: $report_file"
    
    local success_rate
    if [[ $TOTAL_VALIDATIONS -gt 0 ]]; then
        success_rate=$(( (VALIDATION_SCORE * 100) / TOTAL_VALIDATIONS ))
    else
        success_rate=0
    fi
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "validation_version": "1.0.0",
  "environment": {
    "platform": "$(uname -s)",
    "architecture": "$(uname -m)",
    "hostname": "$(hostname)"
  },
  "summary": {
    "total_validations": $TOTAL_VALIDATIONS,
    "successful_validations": $VALIDATION_SCORE,
    "success_rate": $success_rate,
    "overall_status": "$(if [[ $success_rate -ge 80 ]]; then echo "healthy"; elif [[ $success_rate -ge 60 ]]; then echo "warning"; else echo "critical"; fi)"
  },
  "validation_results": {
$(
    first=true
    for category in "${!VALIDATION_RESULTS[@]}"; do
        if [[ $first == true ]]; then
            first=false
        else
            echo ","
        fi
        echo -n "    \"$category\": {\"status\": \"${VALIDATION_RESULTS[$category]}\", \"message\": \"${VALIDATION_DETAILS[$category]}\"}"
    done
)
  },
  "recommendations": [
$(
    first=true
    for category in "${!VALIDATION_RESULTS[@]}"; do
        if [[ "${VALIDATION_RESULTS[$category]}" == "FAIL" || "${VALIDATION_RESULTS[$category]}" == "WARN" ]]; then
            if [[ $first == true ]]; then
                first=false
            else
                echo ","
            fi
            echo -n "    \"Address $category issues: ${VALIDATION_DETAILS[$category]}\""
        fi
    done
)
  ]
}
EOF
    
    print_validation "PASS" "REPORTING" "Validation report generated successfully"
    
    # Display summary
    echo ""
    echo "=============================================="
    echo "           VALIDATION SUMMARY"
    echo "=============================================="
    printf "Total Validations: %d\n" "$TOTAL_VALIDATIONS"
    printf "Successful: %d\n" "$VALIDATION_SCORE"
    printf "Success Rate: %d%%\n" "$success_rate"
    echo ""
    
    if [[ $success_rate -ge 80 ]]; then
        print_validation "PASS" "OVERALL" "Environment validation passed" "Ready for development"
    elif [[ $success_rate -ge 60 ]]; then
        print_validation "WARN" "OVERALL" "Environment validation has warnings" "Review issues before proceeding"
    else
        print_validation "FAIL" "OVERALL" "Environment validation failed" "Critical issues must be resolved"
        return 1
    fi
}

# Main validation function
run_comprehensive_validation() {
    echo "=============================================="
    echo "    MediMate Malaysia Environment Validation"
    echo "=============================================="
    echo ""
    
    # Run all validation checks
    validate_docker_environment
    echo ""
    
    validate_development_tools
    echo ""
    
    validate_network_connectivity
    echo ""
    
    validate_filesystem_permissions
    echo ""
    
    validate_environment_variables
    echo ""
    
    validate_malaysian_cultural_data
    echo ""
    
    validate_application_configuration
    echo ""
    
    validate_healthcare_compliance
    echo ""
    
    validate_performance_benchmarks
    echo ""
}

# Main function
main() {
    local command="${1:-validate}"
    local report_file="${2:-}"
    
    case "$command" in
        "validate"|"check")
            run_comprehensive_validation
            if [[ -n "$report_file" ]]; then
                generate_validation_report "$report_file"
            else
                generate_validation_report
            fi
            ;;
        "report")
            run_comprehensive_validation
            generate_validation_report "$report_file"
            ;;
        "docker")
            validate_docker_environment
            ;;
        "tools")
            validate_development_tools
            ;;
        "network")
            validate_network_connectivity
            ;;
        "filesystem")
            validate_filesystem_permissions
            ;;
        "env")
            validate_environment_variables
            ;;
        "culture")
            validate_malaysian_cultural_data
            ;;
        "config")
            validate_application_configuration
            ;;
        "compliance")
            validate_healthcare_compliance
            ;;
        "performance")
            validate_performance_benchmarks
            ;;
        *)
            echo "Usage: $0 {validate|report|docker|tools|network|filesystem|env|culture|config|compliance|performance} [report_file]"
            echo ""
            echo "Commands:"
            echo "  validate     - Run comprehensive environment validation"
            echo "  report       - Run validation and generate detailed report"
            echo "  docker       - Validate Docker environment only"
            echo "  tools        - Validate development tools only"
            echo "  network      - Validate network connectivity only"
            echo "  filesystem   - Validate file system permissions only"
            echo "  env          - Validate environment variables only"
            echo "  culture      - Validate Malaysian cultural data only"
            echo "  config       - Validate application configuration only"
            echo "  compliance   - Validate healthcare compliance only"
            echo "  performance  - Run performance benchmarks only"
            exit 1
            ;;
    esac
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi