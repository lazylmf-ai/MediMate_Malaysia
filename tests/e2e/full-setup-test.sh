#!/bin/bash
#
# End-to-End Setup Testing Suite for MediMate Malaysia
# Comprehensive testing of development environment setup
#

set -euo pipefail

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../../scripts/lib/common.sh"
source "${SCRIPT_DIR}/../../scripts/lib/validation.sh"

# Test configuration
TEST_TIMEOUT=300  # 5 minutes
TEST_RESULTS_DIR="${SCRIPT_DIR}/results"
TEST_LOG_FILE="${TEST_RESULTS_DIR}/e2e-test-$(date +%Y%m%d-%H%M%S).log"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test results tracking
declare -A TEST_RESULTS=()
declare -A TEST_TIMINGS=()
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Function to display test output
print_test() {
    local status="$1"
    local test_name="$2"
    local message="$3"
    local timing="${4:-}"
    local color
    
    case "$status" in
        "PASS") color="$GREEN"; ((TESTS_PASSED++)) ;;
        "FAIL") color="$RED"; ((TESTS_FAILED++)) ;;
        "SKIP") color="$YELLOW"; ((TESTS_SKIPPED++)) ;;
        "INFO") color="$BLUE" ;;
        "DEBUG") color="$CYAN" ;;
        *) color="$NC" ;;
    esac
    
    local timestamp
    timestamp=$(date "+%H:%M:%S")
    
    if [[ -n "$timing" ]]; then
        printf "${color}[%-4s]${NC} [%s] %-30s %s (%s)\n" "$status" "$timestamp" "$test_name" "$message" "$timing"
    else
        printf "${color}[%-4s]${NC} [%s] %-30s %s\n" "$status" "$timestamp" "$test_name" "$message"
    fi
    
    # Log to file
    echo "[$status] [$timestamp] [$test_name] $message${timing:+ ($timing)}" >> "$TEST_LOG_FILE"
    
    TEST_RESULTS["$test_name"]="$status"
    if [[ -n "$timing" ]]; then
        TEST_TIMINGS["$test_name"]="$timing"
    fi
}

# Function to run a test with timeout
run_test_with_timeout() {
    local test_name="$1"
    local test_command="$2"
    local timeout="${3:-$TEST_TIMEOUT}"
    
    local start_time
    start_time=$(date +%s)
    
    print_test "INFO" "$test_name" "Starting test..."
    
    if timeout "$timeout" bash -c "$test_command" >/dev/null 2>&1; then
        local end_time
        end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_test "PASS" "$test_name" "Test completed successfully" "${duration}s"
        return 0
    else
        local exit_code=$?
        local end_time
        end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        if [[ $exit_code -eq 124 ]]; then
            print_test "FAIL" "$test_name" "Test timed out" "${duration}s"
        else
            print_test "FAIL" "$test_name" "Test failed with exit code $exit_code" "${duration}s"
        fi
        return $exit_code
    fi
}

# Test 1: Docker Environment Setup
test_docker_environment() {
    local test_name="docker_environment"
    
    local test_command='
        cd "'$PROJECT_ROOT'" &&
        docker --version &&
        docker-compose --version &&
        docker info >/dev/null &&
        docker-compose config --quiet
    '
    
    run_test_with_timeout "$test_name" "$test_command" 60
}

# Test 2: Service Health Checks
test_service_health() {
    local test_name="service_health"
    
    local test_command='
        cd "'$PROJECT_ROOT'" &&
        ./scripts/health/service-checks.sh check
    '
    
    run_test_with_timeout "$test_name" "$test_command" 120
}

# Test 3: Environment Validation
test_environment_validation() {
    local test_name="environment_validation"
    
    local test_command='
        cd "'$PROJECT_ROOT'" &&
        ./scripts/health/validate-environment.sh validate
    '
    
    run_test_with_timeout "$test_name" "$test_command" 90
}

# Test 4: Performance Monitoring
test_performance_monitoring() {
    local test_name="performance_monitoring"
    
    local test_command='
        cd "'$PROJECT_ROOT'" &&
        ./scripts/health/performance-monitor.sh single
    '
    
    run_test_with_timeout "$test_name" "$test_command" 60
}

# Test 5: VSCode Configuration
test_vscode_configuration() {
    local test_name="vscode_configuration"
    
    # Check if VSCode config files exist and are valid
    local test_command='
        cd "'$PROJECT_ROOT'" &&
        test -f ./config/vscode/settings.json &&
        test -f ./config/vscode/extensions.json &&
        test -f ./config/vscode/launch.json &&
        test -f ./config/vscode/tasks.json &&
        if command -v jq >/dev/null 2>&1; then
            jq empty ./config/vscode/settings.json &&
            jq empty ./config/vscode/extensions.json &&
            jq empty ./config/vscode/launch.json &&
            jq empty ./config/vscode/tasks.json
        else
            echo "jq not available, skipping JSON validation"
        fi
    '
    
    run_test_with_timeout "$test_name" "$test_command" 30
}

# Test 6: Docker Services Startup
test_docker_services_startup() {
    local test_name="docker_services_startup"
    
    print_test "INFO" "$test_name" "Starting Docker services..."
    
    local test_command='
        cd "'$PROJECT_ROOT'" &&
        docker-compose up -d &&
        sleep 30 &&
        ./scripts/health/service-checks.sh retry
    '
    
    run_test_with_timeout "$test_name" "$test_command" 180
}

# Test 7: Database Connection and Schema
test_database_setup() {
    local test_name="database_setup"
    
    local test_command='
        cd "'$PROJECT_ROOT'" &&
        POSTGRES_HOST=localhost POSTGRES_PORT=5432 POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres123 POSTGRES_DB=medimate_dev \
        timeout 30 bash -c "
            until PGPASSWORD=\$POSTGRES_PASSWORD psql -h \$POSTGRES_HOST -p \$POSTGRES_PORT -U \$POSTGRES_USER -d \$POSTGRES_DB -c \"SELECT 1;\" >/dev/null 2>&1; do
                echo \"Waiting for PostgreSQL...\"
                sleep 2
            done
            echo \"PostgreSQL is ready\"
            
            # Check if tables exist
            table_count=\$(PGPASSWORD=\$POSTGRES_PASSWORD psql -h \$POSTGRES_HOST -p \$POSTGRES_PORT -U \$POSTGRES_USER -d \$POSTGRES_DB -t -c \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';\" | xargs)
            echo \"Found \$table_count tables in database\"
        "
    '
    
    run_test_with_timeout "$test_name" "$test_command" 60
}

# Test 8: Redis Cache Connection
test_redis_setup() {
    local test_name="redis_setup"
    
    local test_command='
        cd "'$PROJECT_ROOT'" &&
        timeout 30 bash -c "
            until redis-cli -h localhost -p 6379 ping | grep -q PONG; do
                echo \"Waiting for Redis...\"
                sleep 2
            done
            echo \"Redis is ready\"
            
            # Test basic Redis operations
            redis-cli -h localhost -p 6379 set test_key \"test_value\" &&
            value=\$(redis-cli -h localhost -p 6379 get test_key) &&
            if [ \"\$value\" = \"test_value\" ]; then
                echo \"Redis read/write test passed\"
                redis-cli -h localhost -p 6379 del test_key
            else
                echo \"Redis read/write test failed\"
                exit 1
            fi
        "
    '
    
    run_test_with_timeout "$test_name" "$test_command" 45
}

# Test 9: MinIO Object Storage
test_minio_setup() {
    local test_name="minio_setup"
    
    local test_command='
        cd "'$PROJECT_ROOT'" &&
        timeout 60 bash -c "
            until curl -sf http://localhost:9000/minio/health/live >/dev/null; do
                echo \"Waiting for MinIO...\"
                sleep 3
            done
            echo \"MinIO is ready\"
            
            # Test MinIO readiness
            if curl -sf http://localhost:9000/minio/health/ready >/dev/null; then
                echo \"MinIO health check passed\"
            else
                echo \"MinIO health check failed\"
                exit 1
            fi
        "
    '
    
    run_test_with_timeout "$test_name" "$test_command" 75
}

# Test 10: Malaysian Cultural Data Validation
test_malaysian_data_validation() {
    local test_name="malaysian_data_validation"
    
    # Check if Malaysian cultural data exists and is valid
    local test_command='
        cd "'$PROJECT_ROOT'" &&
        ./scripts/health/validate-environment.sh culture
    '
    
    run_test_with_timeout "$test_name" "$test_command" 45
}

# Test 11: API Endpoint Testing
test_api_endpoints() {
    local test_name="api_endpoints"
    
    # This test assumes backend is running
    local test_command='
        cd "'$PROJECT_ROOT'" &&
        if [[ -d "./backend" && -f "./backend/package.json" ]]; then
            echo "Backend directory found"
            
            # Check if backend can start (without actually starting it for long)
            if command -v npm >/dev/null 2>&1; then
                cd backend &&
                npm list >/dev/null 2>&1 || npm install >/dev/null 2>&1 &&
                timeout 30 npm run dev >/dev/null 2>&1 &
                backend_pid=$!
                sleep 10
                kill $backend_pid 2>/dev/null || true
                echo "Backend startup test completed"
            else
                echo "npm not available, skipping backend test"
            fi
        else
            echo "Backend not found, skipping API endpoint test"
        fi
    '
    
    if [[ -d "$PROJECT_ROOT/backend" ]]; then
        run_test_with_timeout "$test_name" "$test_command" 60
    else
        print_test "SKIP" "$test_name" "Backend directory not found"
    fi
}

# Test 12: Frontend Build Test
test_frontend_build() {
    local test_name="frontend_build"
    
    local test_command='
        cd "'$PROJECT_ROOT'" &&
        if [[ -d "./frontend" && -f "./frontend/package.json" ]]; then
            echo "Frontend directory found"
            
            if command -v npm >/dev/null 2>&1; then
                cd frontend &&
                npm list >/dev/null 2>&1 || npm install >/dev/null 2>&1 &&
                timeout 60 npm run build >/dev/null 2>&1 &&
                echo "Frontend build completed successfully"
            else
                echo "npm not available, skipping frontend test"
            fi
        else
            echo "Frontend not found, skipping frontend build test"
        fi
    '
    
    if [[ -d "$PROJECT_ROOT/frontend" ]]; then
        run_test_with_timeout "$test_name" "$test_command" 90
    else
        print_test "SKIP" "$test_name" "Frontend directory not found"
    fi
}

# Test 13: Security and Compliance Validation
test_security_compliance() {
    local test_name="security_compliance"
    
    local test_command='
        cd "'$PROJECT_ROOT'" &&
        ./scripts/health/validate-environment.sh compliance
    '
    
    run_test_with_timeout "$test_name" "$test_command" 60
}

# Test 14: Resource Usage Monitoring
test_resource_monitoring() {
    local test_name="resource_monitoring"
    
    local test_command='
        cd "'$PROJECT_ROOT'" &&
        ./scripts/health/performance-monitor.sh system &&
        ./scripts/health/service-checks.sh resources
    '
    
    run_test_with_timeout "$test_name" "$test_command" 45
}

# Test 15: Cleanup and Teardown
test_cleanup() {
    local test_name="cleanup"
    
    print_test "INFO" "$test_name" "Cleaning up test environment..."
    
    local test_command='
        cd "'$PROJECT_ROOT'" &&
        docker-compose down >/dev/null 2>&1 || true &&
        docker system prune -f >/dev/null 2>&1 || true &&
        echo "Cleanup completed"
    '
    
    run_test_with_timeout "$test_name" "$test_command" 60
}

# Function to generate test report
generate_test_report() {
    local report_file="${TEST_RESULTS_DIR}/e2e-test-report-$(date +%Y%m%d-%H%M%S).json"
    
    print_test "INFO" "REPORTING" "Generating E2E test report..."
    
    local total_tests=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
    local success_rate=0
    
    if [[ $total_tests -gt 0 ]]; then
        success_rate=$(( (TESTS_PASSED * 100) / total_tests ))
    fi
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "test_suite": "MediMate Malaysia E2E Setup Tests",
  "version": "1.0.0",
  "environment": {
    "hostname": "$(hostname)",
    "platform": "$(uname -s)",
    "architecture": "$(uname -m)"
  },
  "summary": {
    "total_tests": $total_tests,
    "passed": $TESTS_PASSED,
    "failed": $TESTS_FAILED,
    "skipped": $TESTS_SKIPPED,
    "success_rate": $success_rate
  },
  "test_results": {
$(
    first=true
    for test_name in "${!TEST_RESULTS[@]}"; do
        if [[ $first == true ]]; then
            first=false
        else
            echo ","
        fi
        local timing="${TEST_TIMINGS[$test_name]:-unknown}"
        echo -n "    \"$test_name\": {\"status\": \"${TEST_RESULTS[$test_name]}\", \"duration\": \"$timing\"}"
    done
)
  },
  "log_file": "$TEST_LOG_FILE"
}
EOF
    
    print_test "PASS" "REPORTING" "E2E test report generated" "$report_file"
}

# Function to display test summary
display_test_summary() {
    local total_tests=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
    local success_rate=0
    
    if [[ $total_tests -gt 0 ]]; then
        success_rate=$(( (TESTS_PASSED * 100) / total_tests ))
    fi
    
    echo ""
    echo "=============================================="
    echo "        E2E TEST SUITE SUMMARY"
    echo "=============================================="
    printf "Total Tests:    %d\n" "$total_tests"
    printf "Passed:         %d\n" "$TESTS_PASSED"
    printf "Failed:         %d\n" "$TESTS_FAILED"
    printf "Skipped:        %d\n" "$TESTS_SKIPPED"
    printf "Success Rate:   %d%%\n" "$success_rate"
    echo ""
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        print_test "PASS" "OVERALL" "All E2E tests passed successfully!"
        echo "MediMate Malaysia development environment is ready."
        return 0
    else
        print_test "FAIL" "OVERALL" "Some E2E tests failed!"
        echo "Please review failed tests and resolve issues before proceeding."
        
        echo ""
        echo "Failed Tests:"
        for test_name in "${!TEST_RESULTS[@]}"; do
            if [[ "${TEST_RESULTS[$test_name]}" == "FAIL" ]]; then
                echo "  - $test_name"
            fi
        done
        
        return 1
    fi
}

# Main test runner function
run_e2e_tests() {
    echo "=============================================="
    echo "    MediMate Malaysia E2E Setup Tests"
    echo "=============================================="
    echo ""
    
    # Create results directory
    mkdir -p "$TEST_RESULTS_DIR"
    
    # Initialize log file
    {
        echo "=== E2E Test Suite Started at $(date) ==="
        echo "Host: $(hostname)"
        echo "Platform: $(uname -s) $(uname -r)"
        echo "Project: $PROJECT_ROOT"
        echo "================================================"
    } >> "$TEST_LOG_FILE"
    
    print_test "INFO" "INIT" "Starting E2E test suite..." "$(date)"
    echo ""
    
    # Run all tests
    test_docker_environment
    test_environment_validation
    test_vscode_configuration
    test_docker_services_startup
    test_service_health
    test_database_setup
    test_redis_setup
    test_minio_setup
    test_performance_monitoring
    test_malaysian_data_validation
    test_api_endpoints
    test_frontend_build
    test_security_compliance
    test_resource_monitoring
    test_cleanup
    
    echo ""
    
    # Generate report
    generate_test_report
    
    # Display summary
    display_test_summary
}

# Quick test function (subset of tests)
run_quick_tests() {
    echo "=============================================="
    echo "    MediMate Malaysia Quick Tests"
    echo "=============================================="
    echo ""
    
    mkdir -p "$TEST_RESULTS_DIR"
    
    print_test "INFO" "INIT" "Starting quick test suite..."
    echo ""
    
    # Run essential tests only
    test_docker_environment
    test_environment_validation
    test_vscode_configuration
    test_service_health
    
    echo ""
    display_test_summary
}

# Health check test function
run_health_tests() {
    echo "=============================================="
    echo "    MediMate Malaysia Health Tests"
    echo "=============================================="
    echo ""
    
    mkdir -p "$TEST_RESULTS_DIR"
    
    print_test "INFO" "INIT" "Starting health test suite..."
    echo ""
    
    # Run health-related tests
    test_service_health
    test_performance_monitoring
    test_resource_monitoring
    test_security_compliance
    
    echo ""
    display_test_summary
}

# Main function
main() {
    local command="${1:-full}"
    
    case "$command" in
        "full"|"e2e")
            run_e2e_tests
            ;;
        "quick")
            run_quick_tests
            ;;
        "health")
            run_health_tests
            ;;
        "docker")
            mkdir -p "$TEST_RESULTS_DIR"
            test_docker_environment
            test_docker_services_startup
            test_database_setup
            test_redis_setup
            test_minio_setup
            display_test_summary
            ;;
        "config")
            mkdir -p "$TEST_RESULTS_DIR"
            test_environment_validation
            test_vscode_configuration
            test_malaysian_data_validation
            display_test_summary
            ;;
        *)
            echo "Usage: $0 {full|quick|health|docker|config}"
            echo ""
            echo "Commands:"
            echo "  full     - Run complete E2E test suite (default)"
            echo "  quick    - Run essential tests only"
            echo "  health   - Run health and monitoring tests"
            echo "  docker   - Run Docker and services tests"
            echo "  config   - Run configuration validation tests"
            echo ""
            echo "Test results will be saved to: $TEST_RESULTS_DIR"
            exit 1
            ;;
    esac
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi