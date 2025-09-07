#!/bin/bash
#
# Test suite for common.sh functions
# Tests logging, platform detection, and utility functions
#

set -euo pipefail

# Test configuration
readonly TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR="$(dirname "$TEST_DIR")"
readonly TEST_LOG_FILE="/tmp/medimate-test.log"
readonly TEST_PROGRESS_FILE="/tmp/medimate-test-progress"

# Load functions to test
source "${SCRIPT_DIR}/lib/common.sh"

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

assert_true() {
    local condition="$1"
    local message="${2:-}"
    
    if $condition; then
        return 0
    else
        [[ -n "$message" ]] && echo "  $message"
        echo "  Condition failed: $condition"
        return 1
    fi
}

assert_command_exists() {
    local cmd="$1"
    local message="${2:-}"
    
    if command_exists "$cmd"; then
        return 0
    else
        [[ -n "$message" ]] && echo "  $message"
        echo "  Command not found: $cmd"
        return 1
    fi
}

# Test functions
test_logging_initialization() {
    local temp_log="/tmp/test-logging-init.log"
    
    # Test initialization
    init_logging "true" "$temp_log"
    
    # Check log file exists and has content
    if [[ ! -f "$temp_log" ]]; then
        echo "  Log file not created"
        return 1
    fi
    
    if ! grep -q "MediMate Malaysia Setup Log" "$temp_log"; then
        echo "  Log file missing header"
        return 1
    fi
    
    # Cleanup
    rm -f "$temp_log"
    return 0
}

test_logging_functions() {
    local temp_log="/tmp/test-logging-functions.log"
    
    # Use verbose mode (true) to enable debug logging
    init_logging "true" "$temp_log"
    
    # Test different log levels
    log_debug "Debug message"
    log_info "Info message"
    log_warn "Warning message" 
    log_error "Error message"
    log_success "Success message"
    
    # Check log file contains all messages (debug should be included with verbose=true)
    local messages=("Debug message" "Info message" "Warning message" "Error message" "Success message")
    
    for message in "${messages[@]}"; do
        if ! grep -q "$message" "$temp_log"; then
            echo "  Missing log message: $message"
            echo "  Log file contents:"
            cat "$temp_log" | sed 's/^/    /'
            rm -f "$temp_log"
            return 1
        fi
    done
    
    # Cleanup
    rm -f "$temp_log"
    return 0
}

test_platform_detection() {
    # Test platform detection
    detect_platform
    local result=$?
    
    # Should return a valid platform code (1-3)
    if [[ $result -lt 1 || $result -gt 3 ]]; then
        echo "  Invalid platform code: $result"
        return 1
    fi
    
    # Test specific platform detection
    local os_name
    os_name=$(uname -s)
    
    case "$os_name" in
        Darwin*)
            assert_equals "1" "$result" "macOS should return code 1"
            ;;
        Linux*)
            assert_equals "2" "$result" "Linux should return code 2"
            ;;
        CYGWIN*|MINGW*|MSYS*)
            assert_equals "3" "$result" "Windows should return code 3"
            ;;
        *)
            echo "  Unknown OS for testing: $os_name"
            return 1
            ;;
    esac
}

test_architecture_detection() {
    local arch
    arch=$(detect_architecture)
    
    # Should return a recognized architecture
    case "$arch" in
        x64|x86|arm64|arm)
            return 0
            ;;
        *)
            echo "  Unknown architecture: $arch"
            return 1
            ;;
    esac
}

test_command_exists() {
    # Test with known commands
    assert_true "command_exists bash" "bash should exist"
    
    # Test with non-existent command
    if command_exists "definitely_not_a_real_command_12345"; then
        echo "  command_exists should return false for non-existent commands"
        return 1
    fi
    
    return 0
}

test_version_comparison() {
    # Source validation.sh for version_compare function
    source "${SCRIPT_DIR}/lib/validation.sh"
    
    # Test basic version comparisons
    if ! version_compare "2.1.0" ">=" "2.0.0"; then
        echo "  2.1.0 should be >= 2.0.0"
        return 1
    fi
    
    if version_compare "1.9.0" ">=" "2.0.0"; then
        echo "  1.9.0 should not be >= 2.0.0"
        return 1
    fi
    
    if ! version_compare "3.8.10" ">=" "3.8.0"; then
        echo "  3.8.10 should be >= 3.8.0"
        return 1
    fi
    
    if ! version_compare "18.17.0" ">=" "18.0.0"; then
        echo "  18.17.0 should be >= 18.0.0"
        return 1
    fi
    
    return 0
}

test_directory_creation() {
    local test_dir="/tmp/medimate-test-dir"
    
    # Clean up any existing test directory
    rm -rf "$test_dir"
    
    # Test directory creation
    create_directory "$test_dir"
    
    if [[ ! -d "$test_dir" ]]; then
        echo "  Directory not created: $test_dir"
        return 1
    fi
    
    # Test that creating existing directory doesn't fail
    create_directory "$test_dir"
    
    if [[ ! -d "$test_dir" ]]; then
        echo "  Directory should still exist after second creation attempt"
        rm -rf "$test_dir"
        return 1
    fi
    
    # Cleanup
    rm -rf "$test_dir"
    return 0
}

test_progress_tracking() {
    local temp_progress="/tmp/.setup-progress"
    rm -f "$temp_progress"
    
    # Override PROJECT_ROOT for testing
    local orig_project_root="${PROJECT_ROOT:-}"
    PROJECT_ROOT="/tmp"
    
    # Test progress tracking
    track_progress "test_step_1"
    track_progress "test_step_2"
    
    if [[ ! -f "$temp_progress" ]]; then
        echo "  Progress file not created: $temp_progress"
        # Restore PROJECT_ROOT
        [[ -n "$orig_project_root" ]] && PROJECT_ROOT="$orig_project_root" || unset PROJECT_ROOT
        return 1
    fi
    
    if ! grep -q "test_step_1" "$temp_progress"; then
        echo "  Progress step 1 not recorded"
        rm -f "$temp_progress"
        # Restore PROJECT_ROOT
        [[ -n "$orig_project_root" ]] && PROJECT_ROOT="$orig_project_root" || unset PROJECT_ROOT
        return 1
    fi
    
    if ! grep -q "test_step_2" "$temp_progress"; then
        echo "  Progress step 2 not recorded"
        rm -f "$temp_progress"
        # Restore PROJECT_ROOT
        [[ -n "$orig_project_root" ]] && PROJECT_ROOT="$orig_project_root" || unset PROJECT_ROOT
        return 1
    fi
    
    # Cleanup
    rm -f "$temp_progress"
    
    # Restore PROJECT_ROOT
    [[ -n "$orig_project_root" ]] && PROJECT_ROOT="$orig_project_root" || unset PROJECT_ROOT
    
    return 0
}

test_system_memory_detection() {
    local memory_gb
    memory_gb=$(get_system_memory_gb)
    
    # Memory should be a positive number
    if [[ ! "$memory_gb" =~ ^[0-9]+$ ]] || [[ "$memory_gb" -lt 1 ]]; then
        echo "  Invalid memory detection: $memory_gb"
        return 1
    fi
    
    return 0
}

test_execute_command() {
    local temp_log="/tmp/test-execute-command.log"
    init_logging "true" "$temp_log"
    
    # Test successful command
    if ! execute_command "echo 'test command'" "Testing echo command"; then
        echo "  Execute command failed for simple echo"
        rm -f "$temp_log"
        return 1
    fi
    
    # Test failed command with allow_failure=false (default)
    if execute_command "false" "Testing false command" "false"; then
        echo "  Execute command should have failed for 'false' command"
        rm -f "$temp_log"
        return 1
    fi
    
    # Test failed command with allow_failure=true
    if ! execute_command "false" "Testing false command with allow failure" "true"; then
        echo "  Execute command should succeed with allow_failure=true"
        rm -f "$temp_log"
        return 1
    fi
    
    # Cleanup
    rm -f "$temp_log"
    return 0
}

test_ci_environment_detection() {
    # Save original environment
    local orig_ci="${CI:-}"
    local orig_github_actions="${GITHUB_ACTIONS:-}"
    
    # Test non-CI environment
    unset CI GITHUB_ACTIONS
    if is_ci_environment; then
        echo "  Should not detect CI environment when variables are unset"
        return 1
    fi
    
    # Test CI environment detection
    export CI="true"
    if ! is_ci_environment; then
        echo "  Should detect CI environment when CI=true"
        return 1
    fi
    
    # Test GitHub Actions detection
    unset CI
    export GITHUB_ACTIONS="true"
    if ! is_ci_environment; then
        echo "  Should detect CI environment when GITHUB_ACTIONS=true"
        return 1
    fi
    
    # Restore original environment
    [[ -n "$orig_ci" ]] && export CI="$orig_ci" || unset CI
    [[ -n "$orig_github_actions" ]] && export GITHUB_ACTIONS="$orig_github_actions" || unset GITHUB_ACTIONS
    
    return 0
}

# Run all tests
main() {
    echo "Running MediMate Malaysia Common Functions Test Suite"
    echo "===================================================="
    echo
    
    # Initialize test environment
    init_logging "true" "$TEST_LOG_FILE"
    
    # Run tests
    run_test "logging initialization" test_logging_initialization
    run_test "logging functions" test_logging_functions
    run_test "platform detection" test_platform_detection
    run_test "architecture detection" test_architecture_detection
    run_test "command existence check" test_command_exists
    run_test "version comparison" test_version_comparison
    run_test "directory creation" test_directory_creation
    run_test "progress tracking" test_progress_tracking
    run_test "system memory detection" test_system_memory_detection
    run_test "command execution" test_execute_command
    run_test "CI environment detection" test_ci_environment_detection
    
    # Print results
    echo
    echo "===================================================="
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
    
    # Cleanup
    rm -f "$TEST_PROGRESS_FILE"
    
    exit $exit_code
}

# Run tests if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main
fi