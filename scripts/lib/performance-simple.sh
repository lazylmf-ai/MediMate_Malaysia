#!/bin/bash
#
# MediMate Malaysia - Simple Performance Monitoring (Bash 3.x Compatible)
# Tracks setup times for healthcare platform requirements
#

set -euo pipefail

# Performance constants
readonly SETUP_TIMEOUT_SECONDS=600  # 10 minutes maximum
PERFORMANCE_LOG="${PROJECT_ROOT:-}/logs/performance.log"
BENCHMARK_DATA="${PROJECT_ROOT:-}/logs/benchmark.json"

# Performance tracking variables
SETUP_START_TIME=""
SETUP_END_TIME=""
CURRENT_PHASE_START=""
CURRENT_STEP_START=""

# Initialize performance monitoring
init_performance_monitoring() {
    log_info "Initializing healthcare platform setup performance monitoring..."
    
    # Create logs directory
    mkdir -p "$(dirname "$PERFORMANCE_LOG")"
    
    # Record setup start time
    SETUP_START_TIME=$(date +%s)
    
    # Initialize performance log
    {
        echo "=== MediMate Malaysia Setup Performance Log ==="
        echo "Started: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
        echo "Platform: $(uname -s) $(uname -r)"
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
    
    CURRENT_PHASE_START=$(date +%s)
    
    log_info "Starting phase: $description"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] START PHASE: $phase_name - $description" >> "$PERFORMANCE_LOG"
}

# End timing a setup phase
end_phase_timer() {
    local phase_name="$1"
    
    if [[ -z "$CURRENT_PHASE_START" ]]; then
        log_warn "Phase '$phase_name' was not started"
        return 1
    fi
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - CURRENT_PHASE_START))
    
    log_info "Completed phase: $phase_name (${duration}s)"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] END PHASE: $phase_name - Duration: ${duration}s" >> "$PERFORMANCE_LOG"
    
    # Warning for slow phases
    if [[ $duration -gt 120 ]]; then
        log_warn "Phase '$phase_name' took ${duration}s (>2 minutes) - may impact healthcare setup time target"
    fi
    
    CURRENT_PHASE_START=""
}

# Start timing a specific step
start_step_timer() {
    local step_name="$1"
    local description="${2:-$step_name}"
    
    CURRENT_STEP_START=$(date +%s)
    
    log_debug "Starting step: $description"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] START STEP: $step_name - $description" >> "$PERFORMANCE_LOG"
}

# End timing a specific step
end_step_timer() {
    local step_name="$1"
    
    if [[ -z "$CURRENT_STEP_START" ]]; then
        log_debug "Step '$step_name' was not started"
        return 1
    fi
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - CURRENT_STEP_START))
    
    log_debug "Completed step: $step_name (${duration}s)"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] END STEP: $step_name - Duration: ${duration}s" >> "$PERFORMANCE_LOG"
    
    CURRENT_STEP_START=""
}

# Check if setup is within time limits
check_setup_time_limit() {
    local current_time
    current_time=$(date +%s)
    
    if [[ -z "$SETUP_START_TIME" ]]; then
        log_warn "Setup start time not recorded"
        return 0
    fi
    
    local elapsed_time=$((current_time - SETUP_START_TIME))
    local remaining_time=$((SETUP_TIMEOUT_SECONDS - elapsed_time))
    
    if [[ $elapsed_time -gt $SETUP_TIMEOUT_SECONDS ]]; then
        log_error "Healthcare setup time limit exceeded: ${elapsed_time}s > ${SETUP_TIMEOUT_SECONDS}s"
        return 1
    elif [[ $remaining_time -lt 120 ]]; then
        log_warn "Healthcare setup approaching time limit: ${elapsed_time}s elapsed"
    fi
    
    return 0
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
        echo "${hours}h ${remaining_minutes}m"
    fi
}

# Get performance grade
get_performance_grade() {
    local setup_time="$1"
    
    if [[ $setup_time -le 180 ]]; then
        echo "A+ (Excellent)"
    elif [[ $setup_time -le 300 ]]; then
        echo "A (Very Good)"
    elif [[ $setup_time -le 450 ]]; then
        echo "B (Good)"
    elif [[ $setup_time -le 600 ]]; then
        echo "C (Acceptable)"
    else
        echo "F (Needs Improvement)"
    fi
}

# Finalize performance monitoring
finalize_performance_monitoring() {
    SETUP_END_TIME=$(date +%s)
    
    if [[ -z "$SETUP_START_TIME" ]]; then
        log_error "Setup start time not recorded"
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
        
        echo "Performance Grade: $(get_performance_grade $total_setup_time)"
        echo "Completed: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
        
    } >> "$PERFORMANCE_LOG"
    
    # Display results
    if [[ $total_setup_time -le $SETUP_TIMEOUT_SECONDS ]]; then
        log_success "Healthcare platform setup completed in ${total_setup_time}s ✓"
    else
        log_error "Healthcare platform setup took ${total_setup_time}s, exceeding target ✗"
    fi
    
    log_info "Performance report: $PERFORMANCE_LOG"
}

# Healthcare performance validation
validate_healthcare_performance() {
    log_info "Validating healthcare platform performance requirements..."
    
    local validation_passed=true
    
    # Check overall setup time
    if [[ -n "$SETUP_START_TIME" ]]; then
        local current_time
        current_time=$(date +%s)
        local elapsed_time=$((current_time - SETUP_START_TIME))
        
        if [[ $elapsed_time -gt $SETUP_TIMEOUT_SECONDS ]]; then
            log_error "Healthcare setup time exceeded: ${elapsed_time}s > ${SETUP_TIMEOUT_SECONDS}s"
            validation_passed=false
        fi
    fi
    
    # Check system resources
    local memory_gb
    memory_gb=$(get_system_memory_gb)
    
    if [[ $memory_gb -lt 4 ]]; then
        log_error "Healthcare platform requires minimum 4GB RAM, found ${memory_gb}GB"
        validation_passed=false
    fi
    
    if [[ "$validation_passed" == "true" ]]; then
        log_success "Healthcare platform performance validation passed"
        return 0
    else
        log_error "Healthcare platform performance validation failed"
        return 1
    fi
}

# Placeholder optimization suggestions
suggest_optimizations() {
    local total_time="$1"
    
    if [[ $total_time -gt 450 ]]; then
        log_info "Performance suggestions:"
        log_info "• Consider faster internet connection for downloads"
        log_info "• Close unnecessary applications during setup"
    fi
}

# Export functions for compatibility
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    export -f init_performance_monitoring 2>/dev/null || true
    export -f start_phase_timer 2>/dev/null || true
    export -f end_phase_timer 2>/dev/null || true
    export -f finalize_performance_monitoring 2>/dev/null || true
fi