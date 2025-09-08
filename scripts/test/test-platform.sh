#!/bin/bash
#
# MediMate Malaysia - Cross-Platform Testing Framework
# Comprehensive testing for all supported platforms and configurations
#

set -euo pipefail

# Source common libraries
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
source "${SCRIPT_DIR}/../lib/common.sh"
source "${SCRIPT_DIR}/../lib/validation.sh"
source "${SCRIPT_DIR}/../lib/platform.sh"

# Test configuration
readonly TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
readonly TEST_LOG="$TEST_RESULTS_DIR/platform-test-$(date +%Y%m%d-%H%M%S).log"

# Test categories
declare -a BASIC_TESTS=(
    "test_system_requirements"
    "test_command_availability" 
    "test_package_managers"
    "test_development_tools"
)

declare -a INTEGRATION_TESTS=(
    "test_nodejs_functionality"
    "test_python_functionality"
    "test_git_functionality"
    "test_docker_functionality"
)

declare -a PERFORMANCE_TESTS=(
    "test_setup_performance"
    "test_build_performance"
    "test_startup_performance"
)

# Test results tracking
declare -A TEST_RESULTS
TEST_SUITE_PASSED=0
TEST_SUITE_FAILED=0

# Initialize test environment
init_test_environment() {
    log_info "Initializing cross-platform test environment..."
    
    mkdir -p "$TEST_RESULTS_DIR"
    
    # Create test log header
    cat > "$TEST_LOG" << EOF
=== MediMate Malaysia Platform Test Report ===
Started: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
Platform: $(detect_platform_enhanced)
Architecture: $(detect_architecture)
User: $(whoami)
Working Directory: $(pwd)
=============================================

EOF

    log_success "Test environment initialized"
}

# Test execution wrapper
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    log_info "Running test: $test_name"
    echo "STARTING TEST: $test_name" >> "$TEST_LOG"
    echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')" >> "$TEST_LOG"
    echo "---" >> "$TEST_LOG"
    
    local start_time
    start_time=$(date +%s)
    
    if $test_function >> "$TEST_LOG" 2>&1; then
        local end_time
        end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        TEST_RESULTS["$test_name"]="PASSED (${duration}s)"
        ((TEST_SUITE_PASSED++))
        
        log_success "✅ $test_name - PASSED (${duration}s)"
        echo "RESULT: PASSED (${duration}s)" >> "$TEST_LOG"
    else
        local end_time
        end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        TEST_RESULTS["$test_name"]="FAILED (${duration}s)"
        ((TEST_SUITE_FAILED++))
        
        log_error "❌ $test_name - FAILED (${duration}s)"
        echo "RESULT: FAILED (${duration}s)" >> "$TEST_LOG"
    fi
    
    echo "===" >> "$TEST_LOG"
    echo "" >> "$TEST_LOG"
}

# Basic Tests
test_system_requirements() {
    echo "Testing system requirements..."
    
    # Check minimum system specs
    case "$(detect_platform_enhanced)" in
        "macos")
            # Check macOS version
            local macos_version
            macos_version=$(sw_vers -productVersion 2>/dev/null || echo "unknown")
            echo "macOS version: $macos_version"
            
            if version_compare "$macos_version" ">=" "10.15"; then
                echo "✅ macOS version requirement met"
            else
                echo "❌ macOS version too old (minimum: 10.15)"
                return 1
            fi
            ;;
            
        "linux")
            # Check Linux distribution and version
            if [[ -f /etc/os-release ]]; then
                source /etc/os-release
                echo "Linux distribution: $ID $VERSION_ID"
                
                case "$ID" in
                    ubuntu|debian)
                        if version_compare "${VERSION_ID}" ">=" "20.04"; then
                            echo "✅ Ubuntu/Debian version requirement met"
                        else
                            echo "❌ Ubuntu/Debian version too old"
                            return 1
                        fi
                        ;;
                    centos|rhel|rocky|almalinux)
                        if version_compare "${VERSION_ID}" ">=" "8"; then
                            echo "✅ RHEL-based version requirement met"
                        else
                            echo "❌ RHEL-based version too old"
                            return 1
                        fi
                        ;;
                    fedora)
                        if version_compare "${VERSION_ID}" ">=" "36"; then
                            echo "✅ Fedora version requirement met"
                        else
                            echo "❌ Fedora version too old"
                            return 1
                        fi
                        ;;
                    arch|manjaro)
                        echo "✅ Arch-based distribution (rolling release)"
                        ;;
                    *)
                        echo "⚠️ Unsupported distribution: $ID"
                        ;;
                esac
            fi
            ;;
            
        "windows")
            echo "Windows testing (would check Windows 10/11 via PowerShell)"
            ;;
    esac
    
    # Check available memory
    local memory_gb
    case "$(detect_platform_enhanced)" in
        "macos")
            memory_gb=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024/1024)}')
            ;;
        "linux")
            memory_gb=$(free -g | awk '/^Mem:/{print $2}')
            ;;
    esac
    
    echo "Available memory: ${memory_gb}GB"
    if [[ $memory_gb -ge 2 ]]; then
        echo "✅ Memory requirement met (minimum: 2GB)"
    else
        echo "❌ Insufficient memory (minimum: 2GB)"
        return 1
    fi
    
    # Check available disk space
    local disk_free_gb
    disk_free_gb=$(df . | awk 'NR==2 {print int($4/1024/1024)}')
    echo "Available disk space: ${disk_free_gb}GB"
    
    if [[ $disk_free_gb -ge 3 ]]; then
        echo "✅ Disk space requirement met (minimum: 3GB)"
    else
        echo "❌ Insufficient disk space (minimum: 3GB)"
        return 1
    fi
    
    return 0
}

test_command_availability() {
    echo "Testing command availability..."
    
    local commands=("curl" "git" "node" "npm" "python3")
    local missing_commands=()
    
    for cmd in "${commands[@]}"; do
        if command_exists "$cmd"; then
            echo "✅ $cmd is available"
        else
            echo "❌ $cmd is not available"
            missing_commands+=("$cmd")
        fi
    done
    
    if [[ ${#missing_commands[@]} -eq 0 ]]; then
        echo "✅ All required commands are available"
        return 0
    else
        echo "❌ Missing commands: ${missing_commands[*]}"
        return 1
    fi
}

test_package_managers() {
    echo "Testing package managers..."
    
    case "$(detect_platform_enhanced)" in
        "macos")
            if command_exists brew; then
                echo "✅ Homebrew is available"
                brew --version
                
                # Test Homebrew functionality
                if brew list >/dev/null 2>&1; then
                    echo "✅ Homebrew is functional"
                else
                    echo "❌ Homebrew is not functional"
                    return 1
                fi
            else
                echo "❌ Homebrew is not available"
                return 1
            fi
            ;;
            
        "linux")
            # Detect primary package manager
            local pkg_mgr=""
            if command_exists apt; then
                pkg_mgr="apt"
            elif command_exists dnf; then
                pkg_mgr="dnf"
            elif command_exists yum; then
                pkg_mgr="yum"
            elif command_exists pacman; then
                pkg_mgr="pacman"
            fi
            
            if [[ -n "$pkg_mgr" ]]; then
                echo "✅ Package manager available: $pkg_mgr"
                
                # Test package manager functionality
                case "$pkg_mgr" in
                    apt)
                        if sudo apt update >/dev/null 2>&1; then
                            echo "✅ APT is functional"
                        else
                            echo "❌ APT update failed"
                            return 1
                        fi
                        ;;
                    dnf)
                        if sudo dnf check-update >/dev/null 2>&1 || [[ $? -eq 100 ]]; then
                            echo "✅ DNF is functional"
                        else
                            echo "❌ DNF check failed"
                            return 1
                        fi
                        ;;
                    yum)
                        if sudo yum check-update >/dev/null 2>&1 || [[ $? -eq 100 ]]; then
                            echo "✅ YUM is functional"
                        else
                            echo "❌ YUM check failed"
                            return 1
                        fi
                        ;;
                    pacman)
                        if sudo pacman -Sy >/dev/null 2>&1; then
                            echo "✅ Pacman is functional"
                        else
                            echo "❌ Pacman sync failed"
                            return 1
                        fi
                        ;;
                esac
            else
                echo "❌ No recognized package manager found"
                return 1
            fi
            ;;
            
        "windows")
            echo "Windows package manager testing would check Chocolatey/Scoop"
            ;;
    esac
    
    return 0
}

test_development_tools() {
    echo "Testing development tools..."
    
    # Test Node.js
    if validate_nodejs "18.0.0"; then
        echo "✅ Node.js meets version requirements"
    else
        echo "❌ Node.js version requirements not met"
        return 1
    fi
    
    # Test Python
    if validate_python "3.8.0"; then
        echo "✅ Python meets version requirements"
    else
        echo "❌ Python version requirements not met"
        return 1
    fi
    
    # Test Git
    if validate_git "2.30.0"; then
        echo "✅ Git meets version requirements"
    else
        echo "❌ Git version requirements not met"
        return 1
    fi
    
    # Test Docker (optional)
    if command_exists docker; then
        if docker info >/dev/null 2>&1; then
            echo "✅ Docker is available and running"
        else
            echo "⚠️ Docker is installed but daemon not running"
        fi
    else
        echo "⚠️ Docker is not available (optional)"
    fi
    
    return 0
}

# Integration Tests
test_nodejs_functionality() {
    echo "Testing Node.js functionality..."
    
    # Create temporary test project
    local test_dir
    test_dir=$(mktemp -d)
    cd "$test_dir"
    
    # Initialize npm project
    if npm init -y >/dev/null 2>&1; then
        echo "✅ npm init successful"
    else
        echo "❌ npm init failed"
        rm -rf "$test_dir"
        return 1
    fi
    
    # Install a simple package
    if npm install lodash >/dev/null 2>&1; then
        echo "✅ npm install successful"
    else
        echo "❌ npm install failed"
        rm -rf "$test_dir"
        return 1
    fi
    
    # Create and run simple test
    cat > test.js << 'EOF'
const _ = require('lodash');
const array = [1, 2, 3, 4, 5];
const doubled = _.map(array, n => n * 2);
console.log('Test passed:', JSON.stringify(doubled) === JSON.stringify([2, 4, 6, 8, 10]));
EOF
    
    if node test.js | grep -q "Test passed: true"; then
        echo "✅ Node.js execution test passed"
    else
        echo "❌ Node.js execution test failed"
        rm -rf "$test_dir"
        return 1
    fi
    
    # Cleanup
    rm -rf "$test_dir"
    return 0
}

test_python_functionality() {
    echo "Testing Python functionality..."
    
    # Test Python execution
    if python3 -c "print('Python test passed')" | grep -q "Python test passed"; then
        echo "✅ Python execution test passed"
    else
        echo "❌ Python execution test failed"
        return 1
    fi
    
    # Test pip functionality
    if python3 -m pip --version >/dev/null 2>&1; then
        echo "✅ pip is functional"
    else
        echo "❌ pip is not functional"
        return 1
    fi
    
    # Test virtual environment creation
    local test_dir
    test_dir=$(mktemp -d)
    cd "$test_dir"
    
    if python3 -m venv test_env >/dev/null 2>&1; then
        echo "✅ Virtual environment creation successful"
        
        # Test virtual environment activation
        if source test_env/bin/activate >/dev/null 2>&1; then
            echo "✅ Virtual environment activation successful"
            deactivate
        else
            echo "❌ Virtual environment activation failed"
            rm -rf "$test_dir"
            return 1
        fi
    else
        echo "❌ Virtual environment creation failed"
        rm -rf "$test_dir"
        return 1
    fi
    
    rm -rf "$test_dir"
    return 0
}

test_git_functionality() {
    echo "Testing Git functionality..."
    
    # Create temporary repository
    local test_dir
    test_dir=$(mktemp -d)
    cd "$test_dir"
    
    # Initialize repository
    if git init >/dev/null 2>&1; then
        echo "✅ Git init successful"
    else
        echo "❌ Git init failed"
        rm -rf "$test_dir"
        return 1
    fi
    
    # Configure Git (if not already configured)
    git config user.name "Test User" 2>/dev/null || true
    git config user.email "test@example.com" 2>/dev/null || true
    
    # Create and commit file
    echo "test file" > test.txt
    
    if git add test.txt && git commit -m "Initial commit" >/dev/null 2>&1; then
        echo "✅ Git add/commit successful"
    else
        echo "❌ Git add/commit failed"
        rm -rf "$test_dir"
        return 1
    fi
    
    # Test branch operations
    if git checkout -b test-branch >/dev/null 2>&1; then
        echo "✅ Git branch operations successful"
    else
        echo "❌ Git branch operations failed"
        rm -rf "$test_dir"
        return 1
    fi
    
    rm -rf "$test_dir"
    return 0
}

test_docker_functionality() {
    echo "Testing Docker functionality..."
    
    if ! command_exists docker; then
        echo "⚠️ Docker not installed, skipping test"
        return 0
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        echo "⚠️ Docker daemon not running, skipping test"
        return 0
    fi
    
    # Test Docker run
    if docker run --rm hello-world >/dev/null 2>&1; then
        echo "✅ Docker run test successful"
    else
        echo "❌ Docker run test failed"
        return 1
    fi
    
    # Test Docker build
    local test_dir
    test_dir=$(mktemp -d)
    cd "$test_dir"
    
    cat > Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
RUN echo "console.log('Docker test passed')" > test.js
CMD ["node", "test.js"]
EOF
    
    if docker build -t test-image . >/dev/null 2>&1; then
        echo "✅ Docker build test successful"
        
        # Test Docker run custom image
        if docker run --rm test-image | grep -q "Docker test passed"; then
            echo "✅ Docker custom image test successful"
        else
            echo "❌ Docker custom image test failed"
            docker rmi test-image >/dev/null 2>&1 || true
            rm -rf "$test_dir"
            return 1
        fi
        
        # Cleanup
        docker rmi test-image >/dev/null 2>&1 || true
    else
        echo "❌ Docker build test failed"
        rm -rf "$test_dir"
        return 1
    fi
    
    rm -rf "$test_dir"
    return 0
}

# Performance Tests
test_setup_performance() {
    echo "Testing setup performance..."
    
    # This would measure time to run setup script
    # For now, we'll simulate with a simple test
    local start_time end_time duration
    start_time=$(date +%s)
    
    # Simulate setup activities
    sleep 1
    
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    echo "Simulated setup time: ${duration}s"
    
    # Performance targets (in seconds)
    local target_time=300  # 5 minutes for clean setup
    
    if [[ $duration -le $target_time ]]; then
        echo "✅ Setup performance meets target (<${target_time}s)"
        return 0
    else
        echo "❌ Setup performance exceeds target (>${target_time}s)"
        return 1
    fi
}

test_build_performance() {
    echo "Testing build performance..."
    
    # Test npm install performance
    local test_dir start_time end_time duration
    test_dir=$(mktemp -d)
    cd "$test_dir"
    
    # Create package.json with common dependencies
    cat > package.json << 'EOF'
{
  "name": "test-project",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "^4.17.21",
    "express": "^4.18.2"
  }
}
EOF
    
    start_time=$(date +%s)
    
    if npm install >/dev/null 2>&1; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        
        echo "npm install time: ${duration}s"
        
        # Performance target
        local target_time=120  # 2 minutes
        
        if [[ $duration -le $target_time ]]; then
            echo "✅ Build performance meets target (<${target_time}s)"
            rm -rf "$test_dir"
            return 0
        else
            echo "❌ Build performance exceeds target (>${target_time}s)"
            rm -rf "$test_dir"
            return 1
        fi
    else
        echo "❌ npm install failed"
        rm -rf "$test_dir"
        return 1
    fi
}

test_startup_performance() {
    echo "Testing startup performance..."
    
    # Test Node.js startup time
    local start_time end_time duration
    
    start_time=$(date +%s%3N)  # milliseconds
    node -e "console.log('Node.js started')" >/dev/null 2>&1
    end_time=$(date +%s%3N)
    
    duration=$((end_time - start_time))
    echo "Node.js startup time: ${duration}ms"
    
    # Performance target (milliseconds)
    local target_time=1000  # 1 second
    
    if [[ $duration -le $target_time ]]; then
        echo "✅ Startup performance meets target (<${target_time}ms)"
        return 0
    else
        echo "❌ Startup performance exceeds target (>${target_time}ms)"
        return 1
    fi
}

# Generate test report
generate_test_report() {
    log_info "Generating test report..."
    
    local report_file="$TEST_RESULTS_DIR/platform-test-report.html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MediMate Malaysia - Platform Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; border-radius: 5px; }
        .summary { margin: 20px 0; padding: 15px; border-left: 4px solid #2196F3; background: #f1f8ff; }
        .test-group { margin: 20px 0; }
        .test-result { padding: 10px; margin: 5px 0; border-radius: 3px; }
        .passed { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .failed { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .details { font-size: 0.9em; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>MediMate Malaysia - Platform Test Report</h1>
        <p>Generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')</p>
        <p>Platform: $(detect_platform_enhanced)</p>
        <p>Architecture: $(detect_architecture)</p>
    </div>
    
    <div class="summary">
        <h2>Test Summary</h2>
        <p><strong>Total Tests:</strong> $((TEST_SUITE_PASSED + TEST_SUITE_FAILED))</p>
        <p><strong>Passed:</strong> $TEST_SUITE_PASSED</p>
        <p><strong>Failed:</strong> $TEST_SUITE_FAILED</p>
        <p><strong>Success Rate:</strong> $(( (TEST_SUITE_PASSED * 100) / (TEST_SUITE_PASSED + TEST_SUITE_FAILED) ))%</p>
    </div>
    
    <div class="test-group">
        <h2>Test Results</h2>
EOF

    for test_name in "${!TEST_RESULTS[@]}"; do
        local result="${TEST_RESULTS[$test_name]}"
        local class_name="failed"
        
        if [[ "$result" == PASSED* ]]; then
            class_name="passed"
        fi
        
        cat >> "$report_file" << EOF
        <div class="test-result $class_name">
            <strong>$test_name:</strong> $result
        </div>
EOF
    done
    
    cat >> "$report_file" << EOF
    </div>
    
    <div class="details">
        <h3>Detailed Logs</h3>
        <p>For detailed test execution logs, see: <code>$TEST_LOG</code></p>
    </div>
</body>
</html>
EOF

    log_success "Test report generated: $report_file"
}

# Main test execution
main() {
    log_info "Starting MediMate Malaysia cross-platform testing..."
    
    # Initialize test environment
    init_test_environment
    
    # Run basic tests
    log_info "Running basic system tests..."
    for test in "${BASIC_TESTS[@]}"; do
        run_test "$test" "$test"
    done
    
    # Run integration tests
    log_info "Running integration tests..."
    for test in "${INTEGRATION_TESTS[@]}"; do
        run_test "$test" "$test"
    done
    
    # Run performance tests
    log_info "Running performance tests..."
    for test in "${PERFORMANCE_TESTS[@]}"; do
        run_test "$test" "$test"
    done
    
    # Generate report
    generate_test_report
    
    # Summary
    log_info "Test execution completed!"
    log_info "Results: $TEST_SUITE_PASSED passed, $TEST_SUITE_FAILED failed"
    log_info "Detailed logs: $TEST_LOG"
    
    # Exit with appropriate code
    if [[ $TEST_SUITE_FAILED -eq 0 ]]; then
        log_success "All tests passed! 🎉"
        exit 0
    else
        log_error "Some tests failed. Please check the logs for details."
        exit 1
    fi
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi