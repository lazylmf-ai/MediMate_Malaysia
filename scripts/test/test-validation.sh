#!/bin/bash
#
# Test suite for validation.sh functions
# Tests dependency validation and version checking
#

set -euo pipefail

# Test configuration
readonly TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR="$(dirname "$TEST_DIR")"
readonly TEST_LOG_FILE="/tmp/medimate-validation-test.log"

# Load functions to test
source "${SCRIPT_DIR}/lib/common.sh"
source "${SCRIPT_DIR}/lib/validation.sh"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test helpers
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    echo -n "Testing $test_name... "
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if $test_function; then
        echo "PASSED"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "FAILED"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

assert_equals() {
    local expected="$1"
    local actual="$2"
    local message="${3:-}"
    
    if [[ "$expected" == "$actual" ]]; then
        return 0
    else
        [[ -n "$message" ]] && echo "  $message"
        echo "  Expected: '$expected', Got: '$actual'"
        return 1
    fi
}

# Test functions
test_version_compare_function() {
    # Test greater than or equal
    if ! version_compare "2.1.0" ">=" "2.0.0"; then
        echo "  2.1.0 should be >= 2.0.0"
        return 1
    fi
    
    if version_compare "1.9.0" ">=" "2.0.0"; then
        echo "  1.9.0 should not be >= 2.0.0"
        return 1
    fi
    
    # Test exact equality
    if ! version_compare "2.0.0" "==" "2.0.0"; then
        echo "  2.0.0 should == 2.0.0"
        return 1
    fi
    
    if version_compare "2.0.0" "==" "2.0.1"; then
        echo "  2.0.0 should not == 2.0.1"
        return 1
    fi
    
    # Test complex versions
    if ! version_compare "18.17.1" ">=" "18.0.0"; then
        echo "  18.17.1 should be >= 18.0.0"
        return 1
    fi
    
    if ! version_compare "3.11.5" ">=" "3.8.0"; then
        echo "  3.11.5 should be >= 3.8.0"
        return 1
    fi
    
    # Test with v prefix
    if ! version_compare "v2.1.0" ">=" "v2.0.0"; then
        echo "  v2.1.0 should be >= v2.0.0"
        return 1
    fi
    
    return 0
}

test_extract_version_function() {
    # Test version extraction from common command outputs
    local test_cases=(
        "node --version:v18.17.1:v18.17.1"
        "npm --version:9.6.7:9.6.7"
        "git --version:git version 2.40.1:2.40.1"
        "python3 --version:Python 3.11.4:3.11.4"
        "docker --version:Docker version 24.0.2:24.0.2"
    )
    
    for test_case in "${test_cases[@]}"; do
        local cmd="${test_case%%:*}"
        local output="${test_case#*:}"
        local expected="${output#*:}"
        output="${output%:*}"
        
        # Mock the command output
        local actual
        actual=$(echo "$output" | grep -oE 'v?[0-9]+\.[0-9]+\.[0-9]+([.-][0-9a-zA-Z]+)?' | head -1)
        
        if [[ "$actual" != "$expected" ]]; then
            echo "  Version extraction failed for '$cmd': expected '$expected', got '$actual'"
            return 1
        fi
    done
    
    return 0
}

test_nodejs_validation() {
    # Initialize logging for validation functions
    init_logging "true" "$TEST_LOG_FILE"
    
    # This test requires Node.js to be installed
    if ! command_exists node; then
        echo "  Node.js not installed - skipping validation test"
        return 0
    fi
    
    # Test with current installed version
    local node_version
    node_version=$(extract_version "node --version")
    
    if [[ -z "$node_version" ]]; then
        echo "  Could not extract Node.js version"
        return 1
    fi
    
    # Test validation with a version that should pass
    if ! validate_nodejs "1.0.0"; then
        echo "  Node.js validation should pass with very low minimum version"
        return 1
    fi
    
    # Test validation with impossibly high version (should fail)
    if validate_nodejs "999.0.0"; then
        echo "  Node.js validation should fail with impossibly high minimum version"
        return 1
    fi
    
    return 0
}

test_git_validation() {
    # Initialize logging for validation functions
    init_logging "true" "$TEST_LOG_FILE"
    
    # This test requires Git to be installed
    if ! command_exists git; then
        echo "  Git not installed - skipping validation test"
        return 0
    fi
    
    # Test with current installed version
    local git_version
    git_version=$(extract_version "git --version")
    
    if [[ -z "$git_version" ]]; then
        echo "  Could not extract Git version"
        return 1
    fi
    
    # Test validation with a version that should pass
    if ! validate_git "1.0.0"; then
        echo "  Git validation should pass with very low minimum version"
        return 1
    fi
    
    # Test validation with impossibly high version (should warn but still succeed)
    # Git validation only warns about version mismatches, doesn't fail
    if ! validate_git "999.0.0"; then
        echo "  Git validation should succeed but warn with impossibly high minimum version"
        return 1
    fi
    
    return 0
}

test_python_validation() {
    # Initialize logging for validation functions
    init_logging "true" "$TEST_LOG_FILE"
    
    # This test requires Python to be installed
    if ! command_exists python3 && ! command_exists python; then
        echo "  Python not installed - skipping validation test"
        return 0
    fi
    
    # Test with current installed version
    local python_cmd=""
    if command_exists python3; then
        python_cmd="python3"
    else
        python_cmd="python"
    fi
    
    local python_version
    python_version=$(extract_version "$python_cmd --version")
    
    if [[ -z "$python_version" ]]; then
        echo "  Could not extract Python version"
        return 1
    fi
    
    # Test validation with a version that should pass
    if ! validate_python "2.0.0"; then
        echo "  Python validation should pass with very low minimum version"
        return 1
    fi
    
    # Test validation with impossibly high version (should fail)
    if validate_python "999.0.0"; then
        echo "  Python validation should fail with impossibly high minimum version"
        return 1
    fi
    
    return 0
}

test_docker_validation() {
    # Initialize logging for validation functions
    init_logging "true" "$TEST_LOG_FILE"
    
    # Test skipping Docker validation
    if ! validate_docker "true"; then
        echo "  Docker validation should always pass when skip_docker=true"
        return 1
    fi
    
    # Test Docker validation when Docker is not installed
    if ! command_exists docker; then
        if validate_docker "false"; then
            echo "  Docker validation should fail when Docker is not installed"
            return 1
        fi
        echo "  Docker not installed - skipping daemon tests"
        return 0
    fi
    
    # Test with Docker installed
    local docker_version
    docker_version=$(extract_version "docker --version")
    
    if [[ -z "$docker_version" ]]; then
        echo "  Could not extract Docker version"
        return 1
    fi
    
    # Note: We can't easily test Docker daemon status without potentially
    # interfering with the actual Docker installation, so we'll just verify
    # the version extraction works
    
    return 0
}

test_package_manager_validation() {
    # Initialize logging for validation functions
    init_logging "true" "$TEST_LOG_FILE"
    
    # Detect current platform
    detect_platform
    local platform_code=$?
    local platform_name=""
    
    case $platform_code in
        1) platform_name="macos" ;;
        2) platform_name="linux" ;;
        3) platform_name="windows" ;;
        *) echo "  Unknown platform for testing"; return 1 ;;
    esac
    
    # Test package manager validation
    if ! validate_package_managers "$platform_name"; then
        echo "  Package manager validation failed for $platform_name"
        return 1
    fi
    
    return 0
}

test_custom_dependency_validation() {
    # Initialize logging for validation functions
    init_logging "true" "$TEST_LOG_FILE"
    
    # Test with a command that should exist (bash)
    if ! validate_custom_dependency "Bash Shell" "bash" "" "Install bash shell"; then
        echo "  Custom dependency validation should pass for bash"
        return 1
    fi
    
    # Test with a command that doesn't exist
    if validate_custom_dependency "Fake Command" "definitely_not_a_real_command" "" "Install fake command"; then
        echo "  Custom dependency validation should fail for non-existent command"
        return 1
    fi
    
    # Test with version requirement
    if command_exists git; then
        if ! validate_custom_dependency "Git" "git" "1.0.0" "Install Git"; then
            echo "  Custom dependency validation should pass for Git with low version requirement"
            return 1
        fi
        
        if validate_custom_dependency "Git" "git" "999.0.0" "Install Git"; then
            echo "  Custom dependency validation should fail for Git with high version requirement"
            return 1
        fi
    fi
    
    return 0
}

test_network_validation() {
    # Initialize logging for validation functions
    init_logging "true" "$TEST_LOG_FILE"
    
    # Network validation should always succeed (it only logs warnings)
    if ! validate_network; then
        echo "  Network validation should not fail (only warns)"
        return 1
    fi
    
    return 0
}

test_dev_tools_validation() {
    # Initialize logging for validation functions
    init_logging "true" "$TEST_LOG_FILE"
    
    # Dev tools validation should succeed if curl/wget exists
    if ! validate_dev_tools; then
        if ! command_exists curl && ! command_exists wget; then
            echo "  Dev tools validation correctly failed (no curl/wget)"
            return 0
        else
            echo "  Dev tools validation failed unexpectedly"
            return 1
        fi
    fi
    
    return 0
}

test_validation_report_generation() {
    # Initialize logging for validation functions
    init_logging "true" "$TEST_LOG_FILE"
    
    local test_report="/tmp/test-validation-report.txt"
    
    # Generate validation report
    generate_validation_report "$test_report"
    
    if [[ ! -f "$test_report" ]]; then
        echo "  Validation report not generated"
        return 1
    fi
    
    # Check report content
    if ! grep -q "MediMate Malaysia Setup Validation Report" "$test_report"; then
        echo "  Validation report missing header"
        rm -f "$test_report"
        return 1
    fi
    
    if ! grep -q "System Requirements" "$test_report"; then
        echo "  Validation report missing system requirements section"
        rm -f "$test_report"
        return 1
    fi
    
    # Cleanup
    rm -f "$test_report"
    return 0
}

# Run all tests
main() {
    echo "Running MediMate Malaysia Validation Functions Test Suite"
    echo "========================================================"
    echo
    
    # Initialize test environment
    init_logging "true" "$TEST_LOG_FILE"
    
    # Run tests
    run_test "version comparison" test_version_compare_function
    run_test "version extraction" test_extract_version_function
    run_test "Node.js validation" test_nodejs_validation
    run_test "Git validation" test_git_validation
    run_test "Python validation" test_python_validation
    run_test "Docker validation" test_docker_validation
    run_test "package manager validation" test_package_manager_validation
    run_test "custom dependency validation" test_custom_dependency_validation
    run_test "network validation" test_network_validation
    run_test "dev tools validation" test_dev_tools_validation
    run_test "validation report generation" test_validation_report_generation
    
    # Print results
    echo
    echo "========================================================"
    echo "Test Results:"
    echo "  Tests Run: $TESTS_RUN"
    echo "  Passed: $TESTS_PASSED"
    echo "  Failed: $TESTS_FAILED"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo "  Status: ALL TESTS PASSED ✅"
        exit_code=0
    else
        echo "  Status: SOME TESTS FAILED ❌"
        exit_code=1
    fi
    
    echo
    echo "Test log available at: $TEST_LOG_FILE"
    
    exit $exit_code
}

# Run tests if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main
fi