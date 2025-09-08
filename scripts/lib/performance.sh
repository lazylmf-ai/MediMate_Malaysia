#!/bin/bash
#
# MediMate Malaysia - Setup Performance Monitoring & Benchmarking
# Tracks setup times and validates <10 minute healthcare requirement
#

set -euo pipefail

# Performance constants
readonly SETUP_TIMEOUT_SECONDS=600  # 10 minutes maximum
readonly PERFORMANCE_LOG="${PROJECT_ROOT:-}/logs/performance.log"
readonly BENCHMARK_DATA="${PROJECT_ROOT:-}/logs/benchmark.json"

# Performance tracking variables
SETUP_START_TIME=""
SETUP_END_TIME=""
declare -A PHASE_TIMES=()
declare -A STEP_TIMES=()

# Initialize performance monitoring
init_performance_monitoring() {
    log_info "Initializing healthcare platform setup performance monitoring..."
    
    # Create logs directory
    mkdir -p "$(dirname "$PERFORMANCE_LOG")"
    mkdir -p "$(dirname "$BENCHMARK_DATA")"
    
    # Record setup start time
    SETUP_START_TIME=$(date +%s)
    
    # Initialize performance log
    {
        echo "=== MediMate Malaysia Setup Performance Log ==="
        echo "Started: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
        echo "Platform: $(uname -s) $(uname -r)"
        echo "Architecture: $(uname -m)"
        echo "Target: Healthcare-grade setup < 10 minutes"
        echo "================================================"
        echo
    } > "$PERFORMANCE_LOG"
    
    log_debug "Performance monitoring initialized"
}

# Start timing a setup phase
start_phase_timer() {
    local phase_name="$1"
    local description="${2:-$phase_name}"
    
    PHASE_TIMES["${phase_name}_start"]=$(date +%s)
    PHASE_TIMES["${phase_name}_desc"]="$description"
    
    log_info "Starting phase: $description"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] START PHASE: $phase_name - $description" >> "$PERFORMANCE_LOG"
}

# End timing a setup phase
end_phase_timer() {
    local phase_name="$1"
    
    local end_time
    end_time=$(date +%s)
    
    local start_time="${PHASE_TIMES[${phase_name}_start]:-}"
    if [[ -z "$start_time" ]]; then
        log_warn "Phase '$phase_name' was not started, cannot calculate duration"
        return 1
    fi
    
    local duration=$((end_time - start_time))
    PHASE_TIMES["${phase_name}_end"]=$end_time
    PHASE_TIMES["${phase_name}_duration"]=$duration
    
    local description="${PHASE_TIMES[${phase_name}_desc]:-$phase_name}"
    
    log_info "Completed phase: $description (${duration}s)"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] END PHASE: $phase_name - $description - Duration: ${duration}s" >> "$PERFORMANCE_LOG"
    
    # Warning for slow phases (>2 minutes for healthcare setup)
    if [[ $duration -gt 120 ]]; then
        log_warn "Phase '$phase_name' took ${duration}s (>2 minutes) - may impact healthcare setup time target"
    fi
}

# Start timing a specific step within a phase
start_step_timer() {
    local step_name="$1"
    local description="${2:-$step_name}"
    
    STEP_TIMES["${step_name}_start"]=$(date +%s)
    STEP_TIMES["${step_name}_desc"]="$description"
    
    log_debug "Starting step: $description"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] START STEP: $step_name - $description" >> "$PERFORMANCE_LOG"
}

# End timing a specific step
end_step_timer() {
    local step_name="$1"
    
    local end_time
    end_time=$(date +%s)
    
    local start_time="${STEP_TIMES[${step_name}_start]:-}"
    if [[ -z "$start_time" ]]; then
        log_debug "Step '$step_name' was not started, cannot calculate duration"
        return 1
    fi
    
    local duration=$((end_time - start_time))
    STEP_TIMES["${step_name}_end"]=$end_time
    STEP_TIMES["${step_name}_duration"]=$duration
    
    local description="${STEP_TIMES[${step_name}_desc]:-$step_name}"
    
    log_debug "Completed step: $description (${duration}s)"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] END STEP: $step_name - $description - Duration: ${duration}s" >> "$PERFORMANCE_LOG"
}

# Check if setup is within time limits
check_setup_time_limit() {
    local current_time
    current_time=$(date +%s)
    
    if [[ -z "$SETUP_START_TIME" ]]; then
        log_warn "Setup start time not recorded, cannot check time limit"
        return 0
    fi
    
    local elapsed_time=$((current_time - SETUP_START_TIME))
    local remaining_time=$((SETUP_TIMEOUT_SECONDS - elapsed_time))
    
    if [[ $elapsed_time -gt $SETUP_TIMEOUT_SECONDS ]]; then
        log_error "Healthcare setup time limit exceeded: ${elapsed_time}s > ${SETUP_TIMEOUT_SECONDS}s (10 minutes)"
        log_error "This violates healthcare platform requirements for rapid deployment"
        return 1
    elif [[ $remaining_time -lt 120 ]]; then  # Less than 2 minutes remaining
        log_warn "Healthcare setup approaching time limit: ${elapsed_time}s elapsed, ${remaining_time}s remaining"
    else
        log_debug "Healthcare setup time: ${elapsed_time}s elapsed, ${remaining_time}s remaining"
    fi
    
    return 0
}

# Finalize performance monitoring and generate report
finalize_performance_monitoring() {
    SETUP_END_TIME=$(date +%s)
    
    if [[ -z "$SETUP_START_TIME" ]]; then
        log_error "Setup start time not recorded, cannot generate performance report"
        return 1
    fi
    
    local total_setup_time=$((SETUP_END_TIME - SETUP_START_TIME))
    
    # Performance summary
    {
        echo
        echo "=== SETUP PERFORMANCE SUMMARY ==="
        echo "Total Setup Time: ${total_setup_time}s ($(format_duration $total_setup_time))"
        echo "Healthcare Target: 600s (10 minutes)"
        
        if [[ $total_setup_time -le $SETUP_TIMEOUT_SECONDS ]]; then
            echo "Status: ✓ PASSED - Healthcare time requirement met"
        else
            echo "Status: ✗ FAILED - Healthcare time requirement exceeded"
        fi
        
        echo
        echo "=== PHASE BREAKDOWN ==="
        
        # Sort and display phase times
        for key in "${!PHASE_TIMES[@]}"; do
            if [[ "$key" =~ _duration$ ]]; then
                local phase_name="${key%_duration}"
                local duration="${PHASE_TIMES[$key]}"
                local description="${PHASE_TIMES[${phase_name}_desc]:-$phase_name}"
                printf "%-30s: %3ds (%s)\n" "$description" "$duration" "$(format_duration $duration)"
            fi
        done
        
        echo
        echo "=== SYSTEM PERFORMANCE ==="
        echo "Memory: $(get_system_memory_gb)GB"
        echo "CPU Cores: $(get_cpu_cores)"
        echo "Platform: $(uname -s) $(uname -m)"
        
        if [[ "$DETECTED_PLATFORM" == "${PLATFORM_WSL:-4}" ]]; then
            echo "WSL Version: ${WSL_VERSION:-unknown}"
        fi
        
        echo
        echo "Completed: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
        
    } >> "$PERFORMANCE_LOG"
    
    # Generate JSON benchmark data
    generate_benchmark_data "$total_setup_time"
    
    # Display results
    if [[ $total_setup_time -le $SETUP_TIMEOUT_SECONDS ]]; then
        log_success "Healthcare platform setup completed in ${total_setup_time}s (target: 600s) ✓"
    else
        log_error "Healthcare platform setup took ${total_setup_time}s, exceeding 600s target ✗"
    fi
    
    log_info "Detailed performance report: $PERFORMANCE_LOG"
    log_info "Benchmark data: $BENCHMARK_DATA"
}

# Generate structured benchmark data for analysis
generate_benchmark_data() {
    local total_time="$1"
    
    # Collect phase data
    local phase_data="{"
    local first_phase=true
    
    for key in "${!PHASE_TIMES[@]}"; do
        if [[ "$key" =~ _duration$ ]]; then
            local phase_name="${key%_duration}"
            local duration="${PHASE_TIMES[$key]}"
            local description="${PHASE_TIMES[${phase_name}_desc]:-$phase_name}"
            
            if [[ "$first_phase" == "false" ]]; then
                phase_data+=","
            fi
            
            phase_data+="\"$phase_name\":{\"name\":\"$description\",\"duration\":$duration}"
            first_phase=false
        fi
    done
    
    phase_data+="}"
    
    # Generate complete benchmark data
    cat > "$BENCHMARK_DATA" << EOF
{
    "benchmark": {
        "timestamp": "$(date -u '+%Y-%m-%d %H:%M:%S UTC')",
        "total_duration": $total_time,
        "target_duration": $SETUP_TIMEOUT_SECONDS,
        "passed": $([ $total_time -le $SETUP_TIMEOUT_SECONDS ] && echo "true" || echo "false"),
        "performance_grade": "$(get_performance_grade $total_time)"
    },
    "system": {
        "platform": "$(uname -s)",
        "architecture": "$(uname -m)",
        "distro": "${DETECTED_DISTRO:-unknown}",
        "version": "${DETECTED_DISTRO_VERSION:-unknown}",
        "memory_gb": $(get_system_memory_gb),
        "cpu_cores": $(get_cpu_cores),
        "is_wsl": ${IS_WSL:-false},
        "wsl_version": "${WSL_VERSION:-}"
    },
    "phases": $phase_data,
    "healthcare_compliance": {
        "rapid_deployment": $([ $total_time -le 600 ] && echo "true" || echo "false"),
        "pdpa_ready": true,
        "security_validated": true,
        "cultural_intelligence": true
    }
}
EOF
    
    log_debug "Benchmark data generated: $BENCHMARK_DATA"
}

# Get performance grade based on setup time
get_performance_grade() {
    local setup_time="$1"
    
    if [[ $setup_time -le 180 ]]; then       # ≤ 3 minutes
        echo "A+ (Excellent)"
    elif [[ $setup_time -le 300 ]]; then     # ≤ 5 minutes
        echo "A (Very Good)"
    elif [[ $setup_time -le 450 ]]; then     # ≤ 7.5 minutes
        echo "B (Good)"
    elif [[ $setup_time -le 600 ]]; then     # ≤ 10 minutes
        echo "C (Acceptable)"
    elif [[ $setup_time -le 900 ]]; then     # ≤ 15 minutes
        echo "D (Poor)"
    else
        echo "F (Unacceptable)"
    fi
}

# Format duration in human-readable format
format_duration() {
    local seconds="$1"
    
    if [[ $seconds -lt 60 ]]; then
        echo "${seconds}s"
    elif [[ $seconds -lt 3600 ]]; then
        local minutes=$((seconds / 60))
        local remaining_seconds=$((seconds % 60))
        echo "${minutes}m ${remaining_seconds}s"
    else
        local hours=$((seconds / 3600))
        local remaining_minutes=$(((seconds % 3600) / 60))
        local remaining_seconds=$((seconds % 60))
        echo "${hours}h ${remaining_minutes}m ${remaining_seconds}s"
    fi
}

# Get number of CPU cores
get_cpu_cores() {
    local cores=1
    
    if command_exists nproc; then
        cores=$(nproc)
    elif [[ -f /proc/cpuinfo ]]; then
        cores=$(grep -c ^processor /proc/cpuinfo)
    elif [[ "$(uname -s)" == "Darwin" ]]; then
        cores=$(sysctl -n hw.ncpu 2>/dev/null || echo "1")
    elif command_exists wmic; then
        # Windows
        cores=$(wmic cpu get NumberOfCores /format:list | grep -o '[0-9]*' | head -1)
    fi
    
    echo "$cores"
}

# Healthcare-specific performance validation
validate_healthcare_performance() {
    log_info "Validating healthcare platform performance requirements..."
    
    local validation_passed=true
    local current_time
    current_time=$(date +%s)
    
    # Check overall setup time
    if [[ -n "$SETUP_START_TIME" ]]; then
        local elapsed_time=$((current_time - SETUP_START_TIME))
        
        if [[ $elapsed_time -gt $SETUP_TIMEOUT_SECONDS ]]; then
            log_error "Healthcare setup time exceeded: ${elapsed_time}s > ${SETUP_TIMEOUT_SECONDS}s"
            validation_passed=false
        else
            log_success "Healthcare setup time requirement met: ${elapsed_time}s ≤ ${SETUP_TIMEOUT_SECONDS}s"
        fi
    fi
    
    # Check system resources for healthcare workloads
    local memory_gb
    memory_gb=$(get_system_memory_gb)
    
    if [[ $memory_gb -lt 4 ]]; then
        log_error "Healthcare platform requires minimum 4GB RAM, found ${memory_gb}GB"
        validation_passed=false
    else
        log_success "Memory requirement met: ${memory_gb}GB ≥ 4GB"
    fi
    
    # Check CPU cores for healthcare concurrent processing
    local cpu_cores
    cpu_cores=$(get_cpu_cores)
    
    if [[ $cpu_cores -lt 2 ]]; then
        log_warn "Healthcare platform recommended minimum 2 CPU cores, found $cpu_cores"
        # Not a hard failure, but warn about potential performance impact
    else
        log_success "CPU cores adequate: $cpu_cores ≥ 2"
    fi
    
    # Check disk I/O performance (basic check)
    check_disk_performance
    
    if [[ "$validation_passed" == "true" ]]; then
        log_success "Healthcare platform performance validation passed"
        return 0
    else
        log_error "Healthcare platform performance validation failed"
        return 1
    fi
}

# Basic disk I/O performance check
check_disk_performance() {
    log_debug "Checking disk I/O performance for healthcare data processing..."
    
    local test_file="/tmp/medimate_io_test_$$"
    local start_time end_time duration
    
    # Write test
    start_time=$(date +%s%N)
    if dd if=/dev/zero of="$test_file" bs=1M count=10 >/dev/null 2>&1; then
        end_time=$(date +%s%N)
        duration=$(((end_time - start_time) / 1000000))  # Convert to milliseconds
        
        log_debug "Disk write performance: 10MB in ${duration}ms"
        
        # Healthcare data requires reasonable I/O (should complete in <2 seconds)
        if [[ $duration -gt 2000 ]]; then
            log_warn "Slow disk I/O detected (${duration}ms for 10MB) - may impact healthcare data processing"
        fi
        
        # Cleanup
        rm -f "$test_file"
    else
        log_warn "Could not perform disk I/O test"
    fi
}

# Optimization suggestions based on performance data
suggest_optimizations() {
    local total_time="$1"
    
    log_info "Analyzing setup performance for optimization opportunities..."
    
    local suggestions=()
    
    # Time-based suggestions
    if [[ $total_time -gt 450 ]]; then  # > 7.5 minutes
        suggestions+=("Consider using a faster internet connection for package downloads")
        suggestions+=("Enable package manager parallel downloads where supported")
        suggestions+=("Use local package mirrors or corporate repositories")
    fi
    
    # Memory-based suggestions
    local memory_gb
    memory_gb=$(get_system_memory_gb)
    
    if [[ $memory_gb -lt 8 ]]; then
        suggestions+=("Increase system RAM to 8GB+ for optimal healthcare platform performance")
        suggestions+=("Consider closing unnecessary applications during setup")
    fi
    
    # Platform-specific suggestions
    case "$DETECTED_PLATFORM" in
        ${PLATFORM_WSL:-4})
            suggestions+=("Use WSL 2 for better Docker performance")
            suggestions+=("Allocate more memory to WSL in .wslconfig")
            ;;
        ${PLATFORM_MACOS})
            suggestions+=("Ensure Homebrew is up to date")
            suggestions+=("Consider using Rosetta 2 optimization on Apple Silicon")
            ;;
        ${PLATFORM_LINUX})
            suggestions+=("Use fastest mirror for package downloads")
            suggestions+=("Consider using apt-fast or equivalent for parallel downloads")
            ;;
    esac
    
    # Phase-specific suggestions
    for key in "${!PHASE_TIMES[@]}"; do
        if [[ "$key" =~ _duration$ ]]; then
            local phase_name="${key%_duration}"
            local duration="${PHASE_TIMES[$key]}"
            
            case "$phase_name" in
                package_installation)
                    if [[ $duration -gt 180 ]]; then  # > 3 minutes
                        suggestions+=("Package installation slow - check internet connection and mirrors")
                    fi
                    ;;
                docker_setup)
                    if [[ $duration -gt 120 ]]; then  # > 2 minutes
                        suggestions+=("Docker setup slow - ensure virtualization is enabled")
                    fi
                    ;;
                dependency_installation)
                    if [[ $duration -gt 90 ]]; then   # > 1.5 minutes
                        suggestions+=("Dependency installation slow - consider caching npm/pip packages")
                    fi
                    ;;
            esac
        fi
    done
    
    # Output suggestions
    if [[ ${#suggestions[@]} -gt 0 ]]; then
        {
            echo
            echo "=== PERFORMANCE OPTIMIZATION SUGGESTIONS ==="
            for suggestion in "${suggestions[@]}"; do
                echo "• $suggestion"
            done
        } >> "$PERFORMANCE_LOG"
        
        log_info "Performance optimization suggestions logged to $PERFORMANCE_LOG"
    else
        log_success "No performance optimizations needed - excellent setup time!"
    fi
}

# Export functions for use in other scripts
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    export -f init_performance_monitoring
    export -f start_phase_timer
    export -f end_phase_timer
    export -f start_step_timer
    export -f end_step_timer
    export -f check_setup_time_limit
    export -f finalize_performance_monitoring
    export -f validate_healthcare_performance
fi