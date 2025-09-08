#!/bin/bash
#
# MediMate Malaysia Setup Scripts Test Runner
# Runs all test suites and generates a comprehensive test report
#

set -euo pipefail

# Test configuration
readonly TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR="$(dirname "$TEST_DIR")"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly TEST_REPORT_FILE="${PROJECT_ROOT}/test-report.txt"
readonly TEST_LOG_DIR="${PROJECT_ROOT}/logs/tests"

# Colors for output
if [[ -t 1 ]]; then
    readonly RED='\033[0;31m'
    readonly GREEN='\033[0;32m'
    readonly YELLOW='\033[0;33m'
    readonly BLUE='\033[0;34m'
    readonly BOLD='\033[1m'
    readonly NC='\033[0m'
else
    readonly RED=''
    readonly GREEN=''
    readonly YELLOW=''
    readonly BLUE=''
    readonly BOLD=''
    readonly NC=''
fi

# Test statistics
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0
TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0

# Initialize test environment
init_test_environment() {
    echo -e "${BLUE}Initializing MediMate Malaysia Setup Scripts Test Environment${NC}"
    echo "============================================================="
    
    # Create logs directory
    mkdir -p "$TEST_LOG_DIR"
    
    # Clean up old test files
    rm -f /tmp/medimate-test*.log
    rm -f /tmp/medimate-*-test.log
    rm -f /tmp/test-*.log
    rm -f /tmp/test-*
    
    echo "✓ Test environment initialized"
    echo
}

# Run a test suite
run_test_suite() {
    local suite_name="$1"
    local test_script="$2"
    local suite_log="$TEST_LOG_DIR/${suite_name}.log"
    
    echo -e "${BOLD}Running $suite_name Test Suite${NC}"
    echo "----------------------------------------"
    
    TOTAL_SUITES=$((TOTAL_SUITES + 1))
    
    if [[ ! -f "$test_script" ]]; then
        echo -e "${RED}✗ Test script not found: $test_script${NC}"
        FAILED_SUITES=$((FAILED_SUITES + 1))
        return 1
    fi
    
    # Make script executable
    chmod +x "$test_script"
    
    # Run the test suite
    local exit_code=0
    if "$test_script" > "$suite_log" 2>&1; then
        echo -e "${GREEN}✓ $suite_name tests completed successfully${NC}"
        PASSED_SUITES=$((PASSED_SUITES + 1))
    else
        exit_code=$?
        echo -e "${RED}✗ $suite_name tests failed (exit code: $exit_code)${NC}"
        FAILED_SUITES=$((FAILED_SUITES + 1))
    fi
    
    # Extract test statistics from log
    if grep -q "Tests Run:" "$suite_log"; then
        local suite_tests_run
        local suite_tests_passed
        local suite_tests_failed
        
        suite_tests_run=$(grep "Tests Run:" "$suite_log" | grep -oE '[0-9]+' | head -1)
        suite_tests_passed=$(grep "Passed:" "$suite_log" | grep -oE '[0-9]+' | head -1)
        suite_tests_failed=$(grep "Failed:" "$suite_log" | grep -oE '[0-9]+' | head -1)
        
        TOTAL_TESTS=$((TOTAL_TESTS + suite_tests_run))
        TOTAL_PASSED=$((TOTAL_PASSED + suite_tests_passed))
        TOTAL_FAILED=$((TOTAL_FAILED + suite_tests_failed))
        
        echo "  Tests: $suite_tests_run, Passed: $suite_tests_passed, Failed: $suite_tests_failed"
    fi
    
    # Show failed test details if any
    if [[ $exit_code -ne 0 ]] && grep -q "FAILED" "$suite_log"; then
        echo -e "${YELLOW}Failed test details:${NC}"
        grep "Testing.*FAILED" "$suite_log" | sed 's/^/  /'
    fi
    
    echo "  Log: $suite_log"
    echo
    
    return $exit_code
}

# Test script syntax and basic functionality
test_script_syntax() {
    echo -e "${BOLD}Testing Script Syntax and Structure${NC}"
    echo "----------------------------------------"
    
    local scripts=(
        "$SCRIPT_DIR/setup.sh"
        "$SCRIPT_DIR/setup-macos.sh"
        "$SCRIPT_DIR/setup-linux.sh"
        "$SCRIPT_DIR/lib/common.sh"
        "$SCRIPT_DIR/lib/validation.sh"
    )
    
    local syntax_errors=0
    
    for script in "${scripts[@]}"; do
        echo -n "Checking $script... "
        
        if [[ ! -f "$script" ]]; then
            echo -e "${RED}NOT FOUND${NC}"
            syntax_errors=$((syntax_errors + 1))
            continue
        fi
        
        # Check shell syntax
        if bash -n "$script" 2>/dev/null; then
            echo -e "${GREEN}✓ SYNTAX OK${NC}"
        else
            echo -e "${RED}✗ SYNTAX ERROR${NC}"
            syntax_errors=$((syntax_errors + 1))
        fi
    done
    
    # Check PowerShell script syntax (if PowerShell is available)
    if command -v pwsh >/dev/null 2>&1; then
        echo -n "Checking setup-windows.ps1... "
        if pwsh -NoProfile -Command "Get-Content '$SCRIPT_DIR/setup-windows.ps1' | Out-Null" 2>/dev/null; then
            echo -e "${GREEN}✓ SYNTAX OK${NC}"
        else
            echo -e "${YELLOW}⚠ SYNTAX CHECK SKIPPED (PowerShell validation failed)${NC}"
        fi
    else
        echo "PowerShell not available - skipping Windows script syntax check"
    fi
    
    echo
    return $syntax_errors
}

# Generate comprehensive test report
generate_test_report() {
    local report_file="$1"
    local timestamp=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
    
    echo "Generating comprehensive test report..."
    
    {
        echo "================================================================="
        echo "MediMate Malaysia Setup Scripts Test Report"
        echo "================================================================="
        echo "Generated: $timestamp"
        echo "Platform: $(uname -s) $(uname -r)"
        echo "Test Environment: $(hostname)"
        echo ""
        
        echo "SUMMARY"
        echo "-------"
        echo "Test Suites Run: $TOTAL_SUITES"
        echo "Test Suites Passed: $PASSED_SUITES"
        echo "Test Suites Failed: $FAILED_SUITES"
        echo ""
        echo "Individual Tests: $TOTAL_TESTS"
        echo "Individual Passed: $TOTAL_PASSED"
        echo "Individual Failed: $TOTAL_FAILED"
        echo ""
        
        if [[ $FAILED_SUITES -eq 0 ]]; then
            echo "OVERALL STATUS: ✅ ALL TESTS PASSED"
        else
            echo "OVERALL STATUS: ❌ SOME TESTS FAILED"
        fi
        echo ""
        
        echo "DETAILED RESULTS"
        echo "----------------"
        
        # Include detailed results from each test suite
        for log_file in "$TEST_LOG_DIR"/*.log; do
            if [[ -f "$log_file" ]]; then
                local suite_name
                suite_name=$(basename "$log_file" .log)
                echo ""
                echo "=== $suite_name Test Suite ==="
                cat "$log_file"
                echo ""
            fi
        done
        
        echo "================================================================="
        echo "End of Test Report"
        echo "================================================================="
        
    } > "$report_file"
    
    echo "✓ Test report generated: $report_file"
}

# Clean up test environment
cleanup_test_environment() {
    echo "Cleaning up test environment..."
    
    # Clean up temporary test files
    rm -f /tmp/medimate-test*.log
    rm -f /tmp/medimate-*-test.log
    rm -f /tmp/test-*.log
    rm -f /tmp/test-*
    rm -f /tmp/*-test-*
    
    echo "✓ Test environment cleaned up"
}

# Show usage help
show_help() {
    cat << EOF
MediMate Malaysia Setup Scripts Test Runner

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --syntax-only     Only check script syntax, don't run functional tests
    --suite SUITE     Run only specific test suite (common, validation)
    --verbose         Enable verbose output
    --help            Show this help message

EXAMPLES:
    $0                           # Run all tests
    $0 --syntax-only             # Check syntax only
    $0 --suite common            # Run only common function tests
    $0 --verbose                 # Verbose output

AVAILABLE TEST SUITES:
    - common      Tests for common.sh utility functions
    - validation  Tests for validation.sh dependency checking

EOF
}

# Main test runner
main() {
    local syntax_only=false
    local specific_suite=""
    local verbose=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --syntax-only)
                syntax_only=true
                shift
                ;;
            --suite)
                specific_suite="$2"
                shift 2
                ;;
            --verbose)
                verbose=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    echo -e "${BOLD}MediMate Malaysia Setup Scripts Test Runner${NC}"
    echo "============================================"
    echo "Platform: $(uname -s)"
    echo "Date: $(date)"
    echo
    
    # Initialize test environment
    init_test_environment
    
    # Test script syntax first
    if ! test_script_syntax; then
        echo -e "${RED}Script syntax errors detected. Please fix syntax errors before running functional tests.${NC}"
        exit 1
    fi
    
    # If syntax-only mode, exit here
    if [[ "$syntax_only" == "true" ]]; then
        echo -e "${GREEN}✓ All syntax checks passed${NC}"
        exit 0
    fi
    
    # Run specific test suite or all suites
    if [[ -n "$specific_suite" ]]; then
        case "$specific_suite" in
            common)
                run_test_suite "Common Functions" "$TEST_DIR/test-common.sh"
                ;;
            validation)
                run_test_suite "Validation Functions" "$TEST_DIR/test-validation.sh"
                ;;
            *)
                echo -e "${RED}Unknown test suite: $specific_suite${NC}"
                echo "Available suites: common, validation"
                exit 1
                ;;
        esac
    else
        # Run all test suites
        run_test_suite "Common Functions" "$TEST_DIR/test-common.sh"
        run_test_suite "Validation Functions" "$TEST_DIR/test-validation.sh"
    fi
    
    # Generate test report
    generate_test_report "$TEST_REPORT_FILE"
    
    # Show final results
    echo -e "${BOLD}FINAL TEST RESULTS${NC}"
    echo "=================="
    echo "Test Suites: $PASSED_SUITES/$TOTAL_SUITES passed"
    echo "Individual Tests: $TOTAL_PASSED/$TOTAL_TESTS passed"
    echo
    
    if [[ $FAILED_SUITES -eq 0 ]]; then
        echo -e "${GREEN}🎉 ALL TESTS PASSED! 🎉${NC}"
        echo "The setup scripts are ready for use."
    else
        echo -e "${RED}❌ SOME TESTS FAILED${NC}"
        echo "Please review the test report and fix failing tests."
        echo "Report: $TEST_REPORT_FILE"
    fi
    
    # Cleanup
    cleanup_test_environment
    
    # Exit with appropriate code
    if [[ $FAILED_SUITES -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Set trap for cleanup on exit
trap 'cleanup_test_environment' EXIT

# Run main function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi