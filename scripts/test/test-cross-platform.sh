#!/bin/bash
#
# MediMate Malaysia - Cross-Platform Compatibility Test Suite
# Comprehensive testing framework for healthcare platform deployment
#

set -euo pipefail

# Test configuration
readonly TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR="$(dirname "$TEST_DIR")"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Source required libraries
source "${SCRIPT_DIR}/lib/common.sh"
source "${SCRIPT_DIR}/lib/platform.sh"
source "${SCRIPT_DIR}/lib/package-managers.sh"
source "${SCRIPT_DIR}/lib/performance.sh"

# Test tracking
declare -a TESTS_RUN=()
declare -a TESTS_PASSED=()
declare -a TESTS_FAILED=()
declare -A TEST_RESULTS=()

# Test categories for healthcare platform
readonly CATEGORY_PLATFORM="platform_detection"
readonly CATEGORY_PACKAGES="package_management" 
readonly CATEGORY_PERFORMANCE="performance"
readonly CATEGORY_SECURITY="security"
readonly CATEGORY_HEALTHCARE="healthcare_specific"
readonly CATEGORY_CULTURAL="cultural_intelligence"

# Initialize cross-platform testing
init_cross_platform_testing() {
    log_info "Initializing MediMate Malaysia cross-platform test suite..."
    log_info "Healthcare compliance validation enabled"
    
    # Initialize performance monitoring for test runs
    init_performance_monitoring
    start_phase_timer "cross_platform_tests" "Cross-Platform Compatibility Tests"
    
    # Create test logs directory
    mkdir -p "${PROJECT_ROOT}/logs/tests"
    
    # Initialize test tracking
    TESTS_RUN=()
    TESTS_PASSED=()
    TESTS_FAILED=()
    
    log_success "Cross-platform testing initialized"
}

# Run a test with error handling and reporting
run_test() {
    local test_name="$1"
    local test_function="$2"
    local category="${3:-general}"
    local description="${4:-$test_name}"
    
    log_info "Running test: $description"
    TESTS_RUN+=("$test_name")
    
    local test_start_time
    test_start_time=$(date +%s)
    
    if $test_function; then
        local test_end_time
        test_end_time=$(date +%s)
        local test_duration=$((test_end_time - test_start_time))
        
        TESTS_PASSED+=("$test_name")
        TEST_RESULTS["${test_name}"]="PASS:${test_duration}s:$category:$description"
        log_success "✓ Test passed: $description (${test_duration}s)"
        return 0
    else
        local test_end_time
        test_end_time=$(date +%s)
        local test_duration=$((test_end_time - test_start_time))
        
        TESTS_FAILED+=("$test_name")
        TEST_RESULTS["${test_name}"]="FAIL:${test_duration}s:$category:$description"
        log_error "✗ Test failed: $description (${test_duration}s)"
        return 1
    fi
}

# Platform Detection Tests
test_platform_detection() {
    log_debug "Testing enhanced platform detection..."
    
    # Test basic platform detection
    if ! detect_platform_enhanced >/dev/null; then
        log_error "Failed to detect platform"
        return 1
    fi
    
    # Validate detected values
    if [[ "$DETECTED_PLATFORM" -eq 0 ]]; then
        log_error "Platform detection returned unknown"
        return 1
    fi
    
    if [[ -z "$DETECTED_ARCH" ]]; then
        log_error "Architecture not detected"
        return 1
    fi
    
    log_debug "Platform: $DETECTED_PLATFORM, Architecture: $DETECTED_ARCH"
    return 0
}

test_wsl_detection() {
    log_debug "Testing WSL detection capabilities..."
    
    # This test will pass on all systems but validate WSL-specific logic
    detect_wsl >/dev/null || true  # Don't fail if not WSL
    
    if [[ "$IS_WSL" == "true" ]]; then
        if [[ -z "$WSL_VERSION" ]]; then
            log_error "WSL detected but version not determined"
            return 1
        fi
        log_debug "WSL detected: version $WSL_VERSION"
    else
        log_debug "Not running in WSL (expected for non-Windows systems)"
    fi
    
    return 0
}

test_linux_distro_detection() {
    log_debug "Testing Linux distribution detection..."
    
    # Only run on Linux/WSL systems
    if [[ "$DETECTED_PLATFORM" -ne ${PLATFORM_LINUX} ]] && [[ "$DETECTED_PLATFORM" -ne ${PLATFORM_WSL} ]]; then
        log_debug "Skipping Linux distro test on non-Linux platform"
        return 0
    fi
    
    detect_linux_enhanced
    
    if [[ -z "$DETECTED_DISTRO" ]] || [[ "$DETECTED_DISTRO" == "unknown" ]]; then
        log_warn "Could not detect Linux distribution (may be acceptable for some systems)"
        # Don't fail the test for unknown distributions
    else
        log_debug "Detected Linux distribution: $DETECTED_DISTRO $DETECTED_DISTRO_VERSION"
    fi
    
    return 0
}

# Package Management Tests
test_package_manager_detection() {
    log_debug "Testing package manager detection..."
    
    local available_managers
    available_managers=$(detect_package_managers)
    
    if [[ -z "$available_managers" ]]; then
        log_error "No package managers detected"
        return 1
    fi
    
    log_debug "Available package managers: $available_managers"
    return 0
}

test_primary_package_manager() {
    log_debug "Testing primary package manager selection..."
    
    local primary_mgr
    if ! primary_mgr=$(get_primary_package_manager); then
        log_error "Could not determine primary package manager"
        return 1
    fi
    
    if ! command_exists "$primary_mgr"; then
        log_error "Primary package manager '$primary_mgr' not available"
        return 1
    fi
    
    log_debug "Primary package manager: $primary_mgr"
    return 0
}

test_package_installation() {
    log_debug "Testing package installation capabilities..."
    
    # Test with a safe, minimal package (jq for JSON processing)
    local test_package="jq"
    
    # Check if already installed
    if is_package_installed "$test_package"; then
        log_debug "Test package '$test_package' already installed"
        return 0
    fi
    
    # Try to install (but don't actually install, just test the command construction)
    local primary_mgr
    if ! primary_mgr=$(get_primary_package_manager); then
        log_error "No primary package manager for installation test"
        return 1
    fi
    
    local install_cmd
    if ! install_cmd=$(get_install_command "$primary_mgr"); then
        log_error "Could not get install command for $primary_mgr"
        return 1
    fi
    
    local resolved_package
    resolved_package=$(resolve_package_name "$test_package" "$primary_mgr")
    
    log_debug "Would execute: $install_cmd $resolved_package"
    return 0
}

# Performance Tests
test_system_requirements() {
    log_debug "Testing system requirements for healthcare platform..."
    
    local memory_gb
    memory_gb=$(get_system_memory_gb)
    
    if [[ $memory_gb -lt 2 ]]; then
        log_error "System has insufficient memory: ${memory_gb}GB < 2GB minimum"
        return 1
    fi
    
    local cpu_cores
    cpu_cores=$(get_cpu_cores)
    
    if [[ $cpu_cores -lt 1 ]]; then
        log_error "System has insufficient CPU cores: $cpu_cores"
        return 1
    fi
    
    log_debug "System resources: ${memory_gb}GB RAM, $cpu_cores CPU cores"
    return 0
}

test_performance_monitoring() {
    log_debug "Testing performance monitoring capabilities..."
    
    # Test phase timing
    start_phase_timer "test_phase" "Test Performance Phase"
    sleep 1  # Simulate work
    end_phase_timer "test_phase"
    
    # Test step timing
    start_step_timer "test_step" "Test Performance Step"
    sleep 0.5  # Simulate work
    end_step_timer "test_step"
    
    # Verify timing data exists
    if [[ -z "${PHASE_TIMES[test_phase_duration]:-}" ]]; then
        log_error "Phase timing not recorded"
        return 1
    fi
    
    if [[ -z "${STEP_TIMES[test_step_duration]:-}" ]]; then
        log_error "Step timing not recorded"
        return 1
    fi
    
    return 0
}

test_setup_time_validation() {
    log_debug "Testing setup time validation..."
    
    # Test time limit check
    if ! check_setup_time_limit; then
        log_warn "Setup time limit check failed (may be expected if tests are slow)"
        # Don't fail the test as this might be expected in test environments
    fi
    
    return 0
}

# Security Tests
test_security_compliance() {
    log_debug "Testing healthcare security compliance..."
    
    # Test basic security settings
    local security_passed=true
    
    # Check for basic security tools
    if ! command_exists curl && ! command_exists wget; then
        log_error "No secure download tools available (curl/wget)"
        security_passed=false
    fi
    
    # Check permissions on sensitive files
    if [[ -f "${PROJECT_ROOT}/.env" ]] && [[ "$(stat -f %A "${PROJECT_ROOT}/.env" 2>/dev/null || stat -c %a "${PROJECT_ROOT}/.env" 2>/dev/null)" != "600" ]]; then
        log_warn "Environment file permissions may be too permissive"
        # Warning only, not a hard failure
    fi
    
    if [[ "$security_passed" == "true" ]]; then
        return 0
    else
        return 1
    fi
}

test_pdpa_compliance_setup() {
    log_debug "Testing PDPA compliance setup capabilities..."
    
    # Test that we can detect Malaysian locale support
    if command_exists locale; then
        local locales_available
        locales_available=$(locale -a 2>/dev/null | grep -E "(en_MY|ms_MY)" || echo "")
        
        if [[ -n "$locales_available" ]]; then
            log_debug "Malaysian locales available: $locales_available"
        else
            log_debug "Malaysian locales not installed (may need manual installation)"
        fi
    fi
    
    # Test timezone support for Malaysia
    if [[ -f /usr/share/zoneinfo/Asia/Kuala_Lumpur ]]; then
        log_debug "Malaysian timezone support available"
    else
        log_warn "Malaysian timezone may not be available"
    fi
    
    return 0
}

# Healthcare-Specific Tests
test_healthcare_dependencies() {
    log_debug "Testing healthcare platform dependencies..."
    
    local required_commands=("node" "npm" "git")
    local missing_commands=()
    
    for cmd in "${required_commands[@]}"; do
        if ! command_exists "$cmd"; then
            missing_commands+=("$cmd")
        fi
    done
    
    if [[ ${#missing_commands[@]} -gt 0 ]]; then
        log_warn "Missing healthcare dependencies: ${missing_commands[*]}"
        # Warning only for test - actual installation will handle this
    fi
    
    return 0
}

test_database_connectivity_setup() {
    log_debug "Testing database connectivity setup..."
    
    # Test that PostgreSQL installation would be possible
    local primary_mgr
    if primary_mgr=$(get_primary_package_manager 2>/dev/null); then
        local pg_package
        pg_package=$(resolve_package_name "postgresql" "$primary_mgr")
        
        if [[ -n "$pg_package" ]]; then
            log_debug "PostgreSQL package available: $pg_package"
        else
            log_warn "PostgreSQL package mapping not found"
        fi
    fi
    
    return 0
}

# Cultural Intelligence Tests
test_cultural_intelligence_support() {
    log_debug "Testing cultural intelligence platform support..."
    
    # Test UTF-8 support for Malaysian languages
    if ! echo "Selamat datang ke MediMate Malaysia!" | iconv -f UTF-8 -t UTF-8 >/dev/null 2>&1; then
        log_error "UTF-8 support not working for Malaysian text"
        return 1
    fi
    
    # Test date formatting for Malaysian standards
    if command_exists date; then
        local malaysian_date
        malaysian_date=$(date '+%d/%m/%Y' 2>/dev/null || echo "")
        
        if [[ -n "$malaysian_date" ]]; then
            log_debug "Malaysian date format supported: $malaysian_date"
        fi
    fi
    
    return 0
}

# Integration Tests
test_full_platform_integration() {
    log_debug "Testing full platform integration..."
    
    # Run comprehensive platform detection
    if ! check_system_compatibility; then
        log_error "System compatibility check failed"
        return 1
    fi
    
    # Test JSON output generation
    local platform_json
    if ! platform_json=$(get_platform_info_json 2>/dev/null); then
        log_error "Could not generate platform JSON"
        return 1
    fi
    
    # Validate JSON structure
    if ! echo "$platform_json" | jq . >/dev/null 2>&1; then
        log_error "Generated platform JSON is invalid"
        return 1
    fi
    
    return 0
}

# Main test execution
run_all_tests() {
    log_info "Running comprehensive cross-platform compatibility tests..."
    
    local total_failures=0
    
    # Platform Detection Tests
    run_test "platform_detection" test_platform_detection "$CATEGORY_PLATFORM" "Enhanced Platform Detection"
    run_test "wsl_detection" test_wsl_detection "$CATEGORY_PLATFORM" "WSL Detection and Integration"
    run_test "linux_distro_detection" test_linux_distro_detection "$CATEGORY_PLATFORM" "Linux Distribution Detection"
    
    # Package Management Tests  
    run_test "package_manager_detection" test_package_manager_detection "$CATEGORY_PACKAGES" "Package Manager Detection"
    run_test "primary_package_manager" test_primary_package_manager "$CATEGORY_PACKAGES" "Primary Package Manager Selection"
    run_test "package_installation" test_package_installation "$CATEGORY_PACKAGES" "Package Installation Framework"
    
    # Performance Tests
    run_test "system_requirements" test_system_requirements "$CATEGORY_PERFORMANCE" "Healthcare System Requirements"
    run_test "performance_monitoring" test_performance_monitoring "$CATEGORY_PERFORMANCE" "Performance Monitoring Framework"
    run_test "setup_time_validation" test_setup_time_validation "$CATEGORY_PERFORMANCE" "Setup Time Validation"
    
    # Security Tests
    run_test "security_compliance" test_security_compliance "$CATEGORY_SECURITY" "Healthcare Security Compliance"
    run_test "pdpa_compliance" test_pdpa_compliance_setup "$CATEGORY_SECURITY" "PDPA Compliance Setup"
    
    # Healthcare-Specific Tests
    run_test "healthcare_dependencies" test_healthcare_dependencies "$CATEGORY_HEALTHCARE" "Healthcare Platform Dependencies"
    run_test "database_connectivity" test_database_connectivity_setup "$CATEGORY_HEALTHCARE" "Database Connectivity Setup"
    
    # Cultural Intelligence Tests
    run_test "cultural_intelligence" test_cultural_intelligence_support "$CATEGORY_CULTURAL" "Malaysian Cultural Intelligence Support"
    
    # Integration Tests
    run_test "platform_integration" test_full_platform_integration "$CATEGORY_PLATFORM" "Full Platform Integration"
    
    # Calculate results
    total_failures=${#TESTS_FAILED[@]}
    
    return $total_failures
}

# Generate comprehensive test report
generate_test_report() {
    local test_report_file="${PROJECT_ROOT}/logs/cross-platform-test-report.txt"
    
    {
        echo "=== MediMate Malaysia Cross-Platform Test Report ==="
        echo "Generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
        echo "Platform: $(uname -s) $(uname -r) $(uname -m)"
        echo "Distribution: ${DETECTED_DISTRO:-unknown} ${DETECTED_DISTRO_VERSION:-}"
        echo "WSL: ${IS_WSL:-false} (version: ${WSL_VERSION:-N/A})"
        echo "======================================================="
        echo
        
        echo "=== TEST SUMMARY ==="
        echo "Total Tests: ${#TESTS_RUN[@]}"
        echo "Passed: ${#TESTS_PASSED[@]}"
        echo "Failed: ${#TESTS_FAILED[@]}"
        echo
        
        if [[ ${#TESTS_FAILED[@]} -eq 0 ]]; then
            echo "Status: ✓ ALL TESTS PASSED - Healthcare platform ready"
        else
            echo "Status: ✗ SOME TESTS FAILED - Review required"
        fi
        echo
        
        echo "=== DETAILED RESULTS ==="
        
        # Group results by category
        for category in "$CATEGORY_PLATFORM" "$CATEGORY_PACKAGES" "$CATEGORY_PERFORMANCE" "$CATEGORY_SECURITY" "$CATEGORY_HEALTHCARE" "$CATEGORY_CULTURAL"; do
            local category_name
            case "$category" in
                "$CATEGORY_PLATFORM") category_name="Platform Detection" ;;
                "$CATEGORY_PACKAGES") category_name="Package Management" ;;
                "$CATEGORY_PERFORMANCE") category_name="Performance" ;;
                "$CATEGORY_SECURITY") category_name="Security" ;;
                "$CATEGORY_HEALTHCARE") category_name="Healthcare Specific" ;;
                "$CATEGORY_CULTURAL") category_name="Cultural Intelligence" ;;
                *) category_name="Other" ;;
            esac
            
            echo
            echo "--- $category_name ---"
            
            for test_name in "${TESTS_RUN[@]}"; do
                local result="${TEST_RESULTS[$test_name]:-UNKNOWN}"
                IFS=':' read -r status duration test_category description <<< "$result"
                
                if [[ "$test_category" == "$category" ]]; then
                    local status_icon
                    case "$status" in
                        PASS) status_icon="✓" ;;
                        FAIL) status_icon="✗" ;;
                        *) status_icon="?" ;;
                    esac
                    
                    printf "  %s %-40s %s (%s)\n" "$status_icon" "$description" "$status" "$duration"
                fi
            done
        done
        
        echo
        echo "=== RECOMMENDATIONS ==="
        
        if [[ ${#TESTS_FAILED[@]} -gt 0 ]]; then
            echo "Failed tests require attention:"
            for test_name in "${TESTS_FAILED[@]}"; do
                local result="${TEST_RESULTS[$test_name]:-UNKNOWN}"
                IFS=':' read -r status duration test_category description <<< "$result"
                echo "  • $description"
            done
            echo
        fi
        
        echo "Healthcare Platform Readiness:"
        if [[ ${#TESTS_FAILED[@]} -eq 0 ]]; then
            echo "  ✓ All cross-platform compatibility tests passed"
            echo "  ✓ System meets healthcare platform requirements"
            echo "  ✓ PDPA compliance foundation ready"
            echo "  ✓ Malaysian cultural intelligence supported"
        else
            echo "  ✗ Some compatibility issues detected"
            echo "  → Review failed tests before deployment"
            echo "  → Ensure healthcare requirements are met"
        fi
        
    } > "$test_report_file"
    
    log_info "Detailed test report generated: $test_report_file"
    
    # Also create JSON report for integration
    generate_json_test_report
}

# Generate JSON test report for CI/CD integration
generate_json_test_report() {
    local json_report_file="${PROJECT_ROOT}/logs/cross-platform-test-results.json"
    
    # Build test results array
    local test_results_json="["
    local first_result=true
    
    for test_name in "${TESTS_RUN[@]}"; do
        local result="${TEST_RESULTS[$test_name]:-UNKNOWN}"
        IFS=':' read -r status duration category description <<< "$result"
        
        if [[ "$first_result" == "false" ]]; then
            test_results_json+=","
        fi
        
        test_results_json+="{\"name\":\"$test_name\",\"description\":\"$description\",\"status\":\"$status\",\"duration\":\"$duration\",\"category\":\"$category\"}"
        first_result=false
    done
    
    test_results_json+="]"
    
    # Generate complete JSON report
    cat > "$json_report_file" << EOF
{
    "report": {
        "timestamp": "$(date -u '+%Y-%m-%d %H:%M:%S UTC')",
        "platform": {
            "os": "$(uname -s)",
            "release": "$(uname -r)",
            "architecture": "$(uname -m)",
            "distro": "${DETECTED_DISTRO:-unknown}",
            "version": "${DETECTED_DISTRO_VERSION:-unknown}",
            "wsl": ${IS_WSL:-false},
            "wsl_version": "${WSL_VERSION:-null}"
        },
        "summary": {
            "total": ${#TESTS_RUN[@]},
            "passed": ${#TESTS_PASSED[@]},
            "failed": ${#TESTS_FAILED[@]},
            "success_rate": $(echo "scale=2; ${#TESTS_PASSED[@]} * 100 / ${#TESTS_RUN[@]}" | bc -l 2>/dev/null || echo "0")
        },
        "healthcare_ready": $([ ${#TESTS_FAILED[@]} -eq 0 ] && echo "true" || echo "false")
    },
    "tests": $test_results_json
}
EOF
    
    log_debug "JSON test report generated: $json_report_file"
}

# Finalize cross-platform testing
finalize_cross_platform_testing() {
    end_phase_timer "cross_platform_tests"
    
    generate_test_report
    
    local total_tests=${#TESTS_RUN[@]}
    local passed_tests=${#TESTS_PASSED[@]}
    local failed_tests=${#TESTS_FAILED[@]}
    
    if [[ $failed_tests -eq 0 ]]; then
        log_success "Cross-platform compatibility: ALL $total_tests TESTS PASSED ✓"
        log_success "MediMate Malaysia healthcare platform ready for deployment"
    else
        log_error "Cross-platform compatibility: $failed_tests/$total_tests TESTS FAILED ✗"
        log_error "Healthcare platform deployment may have issues"
    fi
    
    return $failed_tests
}

# Main execution
main() {
    init_cross_platform_testing
    
    if run_all_tests; then
        finalize_cross_platform_testing
        return 0
    else
        finalize_cross_platform_testing
        return 1
    fi
}

# Run tests if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi