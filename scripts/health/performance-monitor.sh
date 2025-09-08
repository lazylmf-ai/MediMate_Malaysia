#!/bin/bash
#
# Performance Monitoring System for MediMate Malaysia
# Comprehensive performance metrics collection and alerting
#

set -euo pipefail

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"
source "${SCRIPT_DIR}/../lib/performance.sh"

# Configuration
MONITORING_CONFIG_FILE="${SCRIPT_DIR}/../../config/monitoring-config.json"
METRICS_OUTPUT_DIR="${SCRIPT_DIR}/../../logs/metrics"
PERFORMANCE_LOG_FILE="${METRICS_OUTPUT_DIR}/performance-$(date +%Y%m%d).log"
ALERT_THRESHOLD_FILE="${SCRIPT_DIR}/../../config/alert-thresholds.json"

# Performance thresholds (can be overridden by config file)
CPU_THRESHOLD=${CPU_THRESHOLD:-80}
MEMORY_THRESHOLD=${MEMORY_THRESHOLD:-85}
DISK_THRESHOLD=${DISK_THRESHOLD:-90}
DB_RESPONSE_THRESHOLD=${DB_RESPONSE_THRESHOLD:-1000}  # milliseconds
API_RESPONSE_THRESHOLD=${API_RESPONSE_THRESHOLD:-2000}  # milliseconds
ALERT_EMAIL=${ALERT_EMAIL:-"admin@medimate.local"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Metrics storage
declare -A CURRENT_METRICS=()
declare -A ALERT_STATUS=()

# Function to display colored output
print_metric() {
    local level="$1"
    local category="$2"
    local message="$3"
    local value="${4:-}"
    local color
    
    case "$level" in
        "CRITICAL") color="$RED" ;;
        "WARNING") color="$YELLOW" ;;
        "NORMAL") color="$GREEN" ;;
        "INFO") color="$BLUE" ;;
        "DEBUG") color="$CYAN" ;;
        *) color="$NC" ;;
    esac
    
    local timestamp
    timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    
    if [[ -n "$value" ]]; then
        printf "${color}[%-8s]${NC} [%s] %-15s %s: %s\n" "$level" "$timestamp" "$category" "$message" "$value"
    else
        printf "${color}[%-8s]${NC} [%s] %-15s %s\n" "$level" "$timestamp" "$category" "$message"
    fi
    
    # Log to file
    echo "[$level] [$timestamp] [$category] $message${value:+: $value}" >> "$PERFORMANCE_LOG_FILE"
}

# Function to initialize monitoring
initialize_monitoring() {
    print_metric "INFO" "INIT" "Initializing performance monitoring system"
    
    # Create metrics directory
    mkdir -p "$METRICS_OUTPUT_DIR"
    
    # Load configuration if available
    if [[ -f "$MONITORING_CONFIG_FILE" ]]; then
        print_metric "INFO" "INIT" "Loading monitoring configuration" "$MONITORING_CONFIG_FILE"
        # Load custom thresholds from config file
        if command -v jq >/dev/null 2>&1; then
            CPU_THRESHOLD=$(jq -r '.thresholds.cpu // 80' "$MONITORING_CONFIG_FILE" 2>/dev/null || echo "$CPU_THRESHOLD")
            MEMORY_THRESHOLD=$(jq -r '.thresholds.memory // 85' "$MONITORING_CONFIG_FILE" 2>/dev/null || echo "$MEMORY_THRESHOLD")
            DISK_THRESHOLD=$(jq -r '.thresholds.disk // 90' "$MONITORING_CONFIG_FILE" 2>/dev/null || echo "$DISK_THRESHOLD")
        fi
    else
        print_metric "WARNING" "INIT" "Monitoring configuration not found, using defaults"
    fi
    
    print_metric "INFO" "INIT" "Performance thresholds set" "CPU:${CPU_THRESHOLD}% MEM:${MEMORY_THRESHOLD}% DISK:${DISK_THRESHOLD}%"
    
    # Initialize log file
    {
        echo "=== Performance Monitoring Session Started at $(date) ==="
        echo "Host: $(hostname)"
        echo "Platform: $(uname -s) $(uname -r)"
        echo "Thresholds: CPU=${CPU_THRESHOLD}% Memory=${MEMORY_THRESHOLD}% Disk=${DISK_THRESHOLD}%"
        echo "================================================"
    } >> "$PERFORMANCE_LOG_FILE"
}

# Function to collect system metrics
collect_system_metrics() {
    print_metric "DEBUG" "METRICS" "Collecting system performance metrics"
    
    # CPU Usage
    local cpu_usage
    if command -v top >/dev/null 2>&1; then
        if [[ "$(uname)" == "Darwin" ]]; then
            # macOS
            cpu_usage=$(top -l 1 -s 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
        else
            # Linux
            cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
        fi
    elif command -v iostat >/dev/null 2>&1; then
        cpu_usage=$(iostat -c 1 1 | tail -1 | awk '{print 100-$6}' 2>/dev/null || echo "0")
    else
        cpu_usage="0"
    fi
    
    # Remove non-numeric characters
    cpu_usage=$(echo "$cpu_usage" | sed 's/[^0-9.]//g')
    cpu_usage=${cpu_usage:-0}
    
    CURRENT_METRICS["cpu_usage"]="$cpu_usage"
    
    # Evaluate CPU threshold
    if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
        print_metric "CRITICAL" "CPU" "High CPU usage detected" "${cpu_usage}%"
        ALERT_STATUS["cpu"]="critical"
    elif (( $(echo "$cpu_usage > $(($CPU_THRESHOLD - 10))" | bc -l 2>/dev/null || echo "0") )); then
        print_metric "WARNING" "CPU" "Elevated CPU usage" "${cpu_usage}%"
        ALERT_STATUS["cpu"]="warning"
    else
        print_metric "NORMAL" "CPU" "CPU usage normal" "${cpu_usage}%"
        ALERT_STATUS["cpu"]="normal"
    fi
    
    # Memory Usage
    local memory_usage
    if command -v free >/dev/null 2>&1; then
        # Linux
        memory_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/($2)}')
    elif [[ "$(uname)" == "Darwin" ]]; then
        # macOS
        local mem_info
        mem_info=$(vm_stat | grep -E "(free|inactive|wired|compressed)")
        local pages_free pages_inactive pages_wired pages_compressed
        pages_free=$(echo "$mem_info" | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
        pages_inactive=$(echo "$mem_info" | grep "Pages inactive" | awk '{print $3}' | sed 's/\.//')
        pages_wired=$(echo "$mem_info" | grep "Pages wired down" | awk '{print $4}' | sed 's/\.//')
        pages_compressed=$(echo "$mem_info" | grep "Pages occupied by compressor" | awk '{print $5}' | sed 's/\.//')
        
        local page_size=4096
        local total_pages=$(( pages_free + pages_inactive + pages_wired + pages_compressed ))
        local used_pages=$(( pages_wired + pages_compressed ))
        
        if [[ $total_pages -gt 0 ]]; then
            memory_usage=$(echo "scale=1; $used_pages * 100 / $total_pages" | bc -l 2>/dev/null || echo "0")
        else
            memory_usage="0"
        fi
    else
        memory_usage="0"
    fi
    
    memory_usage=${memory_usage:-0}
    CURRENT_METRICS["memory_usage"]="$memory_usage"
    
    # Evaluate memory threshold
    if (( $(echo "$memory_usage > $MEMORY_THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
        print_metric "CRITICAL" "MEMORY" "High memory usage detected" "${memory_usage}%"
        ALERT_STATUS["memory"]="critical"
    elif (( $(echo "$memory_usage > $(($MEMORY_THRESHOLD - 10))" | bc -l 2>/dev/null || echo "0") )); then
        print_metric "WARNING" "MEMORY" "Elevated memory usage" "${memory_usage}%"
        ALERT_STATUS["memory"]="warning"
    else
        print_metric "NORMAL" "MEMORY" "Memory usage normal" "${memory_usage}%"
        ALERT_STATUS["memory"]="normal"
    fi
    
    # Disk Usage
    local disk_usage
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//' 2>/dev/null || echo "0")
    
    CURRENT_METRICS["disk_usage"]="$disk_usage"
    
    # Evaluate disk threshold
    if [[ $disk_usage -gt $DISK_THRESHOLD ]]; then
        print_metric "CRITICAL" "DISK" "High disk usage detected" "${disk_usage}%"
        ALERT_STATUS["disk"]="critical"
    elif [[ $disk_usage -gt $(($DISK_THRESHOLD - 10)) ]]; then
        print_metric "WARNING" "DISK" "Elevated disk usage" "${disk_usage}%"
        ALERT_STATUS["disk"]="warning"
    else
        print_metric "NORMAL" "DISK" "Disk usage normal" "${disk_usage}%"
        ALERT_STATUS["disk"]="normal"
    fi
    
    # Load Average
    if command -v uptime >/dev/null 2>&1; then
        local load_1min load_5min load_15min
        load_1min=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
        load_5min=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $2}' | sed 's/,//')
        load_15min=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $3}')
        
        CURRENT_METRICS["load_1min"]="$load_1min"
        CURRENT_METRICS["load_5min"]="$load_5min"
        CURRENT_METRICS["load_15min"]="$load_15min"
        
        print_metric "INFO" "LOAD" "System load averages" "1m:${load_1min} 5m:${load_5min} 15m:${load_15min}"
        
        # Check if load is high (assuming 4 CPU cores as baseline)
        local cpu_cores
        cpu_cores=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "4")
        local load_threshold=$(echo "$cpu_cores * 2" | bc -l)
        
        if (( $(echo "$load_1min > $load_threshold" | bc -l 2>/dev/null || echo "0") )); then
            print_metric "WARNING" "LOAD" "High system load detected" "1min: $load_1min (threshold: $load_threshold)"
        fi
    fi
}

# Function to collect Docker service metrics
collect_docker_metrics() {
    print_metric "DEBUG" "DOCKER" "Collecting Docker service metrics"
    
    if ! command -v docker >/dev/null 2>&1; then
        print_metric "WARNING" "DOCKER" "Docker not available for metrics collection"
        return 1
    fi
    
    # Get Docker stats for running containers
    local docker_stats
    docker_stats=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null || echo "")
    
    if [[ -n "$docker_stats" ]]; then
        print_metric "INFO" "DOCKER" "Container resource usage:"
        echo "$docker_stats" | while IFS= read -r line; do
            if [[ "$line" != *"CONTAINER"* && -n "$line" ]]; then
                print_metric "INFO" "DOCKER" "  $line"
            fi
        done
        
        # Check for unhealthy containers
        local unhealthy_containers
        unhealthy_containers=$(docker ps --filter health=unhealthy --format "{{.Names}}" 2>/dev/null || echo "")
        
        if [[ -n "$unhealthy_containers" ]]; then
            print_metric "CRITICAL" "DOCKER" "Unhealthy containers detected" "$unhealthy_containers"
            ALERT_STATUS["docker"]="critical"
        else
            ALERT_STATUS["docker"]="normal"
        fi
        
        # Container count
        local container_count
        container_count=$(docker ps -q | wc -l 2>/dev/null || echo "0")
        CURRENT_METRICS["container_count"]="$container_count"
        print_metric "INFO" "DOCKER" "Running containers" "$container_count"
        
    else
        print_metric "WARNING" "DOCKER" "No Docker containers running or stats unavailable"
    fi
}

# Function to collect database performance metrics
collect_database_metrics() {
    print_metric "DEBUG" "DATABASE" "Collecting database performance metrics"
    
    local host="${POSTGRES_HOST:-localhost}"
    local port="${POSTGRES_PORT:-5432}"
    local user="${POSTGRES_USER:-postgres}"
    local db="${POSTGRES_DB:-medimate_dev}"
    local password="${POSTGRES_PASSWORD:-postgres123}"
    
    # Test database response time
    local start_time end_time response_time
    start_time=$(date +%s%N)
    
    if PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$db" -t -c "SELECT 1;" >/dev/null 2>&1; then
        end_time=$(date +%s%N)
        response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        CURRENT_METRICS["db_response_time"]="$response_time"
        
        if [[ $response_time -gt $DB_RESPONSE_THRESHOLD ]]; then
            print_metric "WARNING" "DATABASE" "Slow database response time" "${response_time}ms"
            ALERT_STATUS["database"]="warning"
        else
            print_metric "NORMAL" "DATABASE" "Database response time normal" "${response_time}ms"
            ALERT_STATUS["database"]="normal"
        fi
        
        # Get database statistics
        local db_size connections transactions
        db_size=$(PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$db" -t -c "SELECT pg_size_pretty(pg_database_size('$db'));" 2>/dev/null | xargs || echo "unknown")
        connections=$(PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$db" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | xargs || echo "0")
        transactions=$(PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$db" -t -c "SELECT xact_commit + xact_rollback FROM pg_stat_database WHERE datname = '$db';" 2>/dev/null | xargs || echo "0")
        
        CURRENT_METRICS["db_size"]="$db_size"
        CURRENT_METRICS["db_connections"]="$connections"
        CURRENT_METRICS["db_transactions"]="$transactions"
        
        print_metric "INFO" "DATABASE" "Database statistics" "Size:${db_size} Connections:${connections} Transactions:${transactions}"
        
        # Check for high connection count (warning if >75% of max)
        local max_connections
        max_connections=$(PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$db" -t -c "SHOW max_connections;" 2>/dev/null | xargs || echo "100")
        local connection_threshold=$(( max_connections * 75 / 100 ))
        
        if [[ $connections -gt $connection_threshold ]]; then
            print_metric "WARNING" "DATABASE" "High connection count" "$connections/$max_connections (${connection_threshold} threshold)"
        fi
        
    else
        print_metric "CRITICAL" "DATABASE" "Database connection failed"
        ALERT_STATUS["database"]="critical"
    fi
}

# Function to collect Redis performance metrics
collect_redis_metrics() {
    print_metric "DEBUG" "REDIS" "Collecting Redis performance metrics"
    
    local host="${REDIS_HOST:-localhost}"
    local port="${REDIS_PORT:-6379}"
    
    # Test Redis response time
    local start_time end_time response_time
    start_time=$(date +%s%N)
    
    if redis-cli -h "$host" -p "$port" ping >/dev/null 2>&1; then
        end_time=$(date +%s%N)
        response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        CURRENT_METRICS["redis_response_time"]="$response_time"
        
        if [[ $response_time -gt 100 ]]; then
            print_metric "WARNING" "REDIS" "Slow Redis response time" "${response_time}ms"
        else
            print_metric "NORMAL" "REDIS" "Redis response time normal" "${response_time}ms"
        fi
        
        # Get Redis statistics
        local redis_info
        redis_info=$(redis-cli -h "$host" -p "$port" info 2>/dev/null || echo "")
        
        if [[ -n "$redis_info" ]]; then
            local memory_used clients keyspace_hits keyspace_misses
            memory_used=$(echo "$redis_info" | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r' || echo "unknown")
            clients=$(echo "$redis_info" | grep "connected_clients:" | cut -d: -f2 | tr -d '\r' || echo "0")
            keyspace_hits=$(echo "$redis_info" | grep "keyspace_hits:" | cut -d: -f2 | tr -d '\r' || echo "0")
            keyspace_misses=$(echo "$redis_info" | grep "keyspace_misses:" | cut -d: -f2 | tr -d '\r' || echo "0")
            
            CURRENT_METRICS["redis_memory"]="$memory_used"
            CURRENT_METRICS["redis_clients"]="$clients"
            CURRENT_METRICS["redis_hits"]="$keyspace_hits"
            CURRENT_METRICS["redis_misses"]="$keyspace_misses"
            
            print_metric "INFO" "REDIS" "Redis statistics" "Memory:${memory_used} Clients:${clients} Hits:${keyspace_hits} Misses:${keyspace_misses}"
            
            # Calculate hit ratio
            local total_operations=$(( keyspace_hits + keyspace_misses ))
            if [[ $total_operations -gt 0 ]]; then
                local hit_ratio
                hit_ratio=$(echo "scale=2; $keyspace_hits * 100 / $total_operations" | bc -l)
                CURRENT_METRICS["redis_hit_ratio"]="$hit_ratio"
                print_metric "INFO" "REDIS" "Cache hit ratio" "${hit_ratio}%"
                
                if (( $(echo "$hit_ratio < 80" | bc -l) )); then
                    print_metric "WARNING" "REDIS" "Low cache hit ratio" "${hit_ratio}%"
                fi
            fi
        fi
        
        ALERT_STATUS["redis"]="normal"
    else
        print_metric "CRITICAL" "REDIS" "Redis connection failed"
        ALERT_STATUS["redis"]="critical"
    fi
}

# Function to collect network metrics
collect_network_metrics() {
    print_metric "DEBUG" "NETWORK" "Collecting network performance metrics"
    
    # Test local network latency
    local start_time end_time latency
    start_time=$(date +%s%N)
    
    if ping -c 1 -W 1000 localhost >/dev/null 2>&1; then
        end_time=$(date +%s%N)
        latency=$(( (end_time - start_time) / 1000000 ))
        CURRENT_METRICS["network_latency_local"]="$latency"
        print_metric "NORMAL" "NETWORK" "Local network latency" "${latency}ms"
    else
        print_metric "WARNING" "NETWORK" "Local network test failed"
    fi
    
    # Test external connectivity
    start_time=$(date +%s%N)
    if curl -sf --max-time 5 https://www.google.com >/dev/null 2>&1; then
        end_time=$(date +%s%N)
        latency=$(( (end_time - start_time) / 1000000 ))
        CURRENT_METRICS["network_latency_external"]="$latency"
        
        if [[ $latency -gt 5000 ]]; then
            print_metric "WARNING" "NETWORK" "Slow external connectivity" "${latency}ms"
        else
            print_metric "NORMAL" "NETWORK" "External connectivity" "${latency}ms"
        fi
    else
        print_metric "WARNING" "NETWORK" "External connectivity test failed"
    fi
    
    # Check for network interface statistics (if available)
    if command -v netstat >/dev/null 2>&1; then
        local network_errors
        network_errors=$(netstat -i 2>/dev/null | awk 'NR>2 && $1!="lo" {errors+=$6+$10} END {print errors+0}' || echo "0")
        CURRENT_METRICS["network_errors"]="$network_errors"
        
        if [[ $network_errors -gt 100 ]]; then
            print_metric "WARNING" "NETWORK" "Network errors detected" "$network_errors"
        else
            print_metric "INFO" "NETWORK" "Network error count" "$network_errors"
        fi
    fi
}

# Function to trigger alerts
trigger_alert() {
    local alert_type="$1"
    local severity="$2"
    local message="$3"
    local metric_value="${4:-}"
    
    local alert_timestamp
    alert_timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    
    # Log alert
    local alert_log="${METRICS_OUTPUT_DIR}/alerts-$(date +%Y%m%d).log"
    echo "[$alert_timestamp] [$severity] [$alert_type] $message${metric_value:+ - Value: $metric_value}" >> "$alert_log"
    
    print_metric "$severity" "ALERT" "$alert_type alert triggered" "$message"
    
    # Send email alert (if configured and mail is available)
    if [[ -n "$ALERT_EMAIL" ]] && command -v mail >/dev/null 2>&1; then
        local subject="MediMate Performance Alert - $severity"
        local body="Alert Details:
Type: $alert_type
Severity: $severity
Time: $alert_timestamp
Message: $message
Value: ${metric_value:-N/A}
Host: $(hostname)

This is an automated alert from MediMate performance monitoring system."
        
        echo "$body" | mail -s "$subject" "$ALERT_EMAIL" 2>/dev/null || true
    fi
    
    # Webhook alert (if configured)
    if [[ -n "${ALERT_WEBHOOK_URL:-}" ]]; then
        local payload="{\"type\":\"$alert_type\",\"severity\":\"$severity\",\"message\":\"$message\",\"value\":\"$metric_value\",\"timestamp\":\"$alert_timestamp\",\"host\":\"$(hostname)\"}"
        curl -sf -X POST -H "Content-Type: application/json" -d "$payload" "$ALERT_WEBHOOK_URL" >/dev/null 2>&1 || true
    fi
}

# Function to check alert conditions
check_alert_conditions() {
    print_metric "DEBUG" "ALERTS" "Checking alert conditions"
    
    # Check for critical alerts
    for component in "${!ALERT_STATUS[@]}"; do
        if [[ "${ALERT_STATUS[$component]}" == "critical" ]]; then
            trigger_alert "$component" "CRITICAL" "Component is in critical state"
        elif [[ "${ALERT_STATUS[$component]}" == "warning" ]]; then
            trigger_alert "$component" "WARNING" "Component performance degraded"
        fi
    done
    
    # Custom alert conditions
    if [[ -n "${CURRENT_METRICS[cpu_usage]:-}" ]]; then
        local cpu_val="${CURRENT_METRICS[cpu_usage]}"
        if (( $(echo "$cpu_val > 95" | bc -l 2>/dev/null || echo "0") )); then
            trigger_alert "cpu" "CRITICAL" "CPU usage extremely high" "${cpu_val}%"
        fi
    fi
    
    if [[ -n "${CURRENT_METRICS[memory_usage]:-}" ]]; then
        local mem_val="${CURRENT_METRICS[memory_usage]}"
        if (( $(echo "$mem_val > 95" | bc -l 2>/dev/null || echo "0") )); then
            trigger_alert "memory" "CRITICAL" "Memory usage extremely high" "${mem_val}%"
        fi
    fi
    
    if [[ -n "${CURRENT_METRICS[disk_usage]:-}" ]]; then
        local disk_val="${CURRENT_METRICS[disk_usage]}"
        if [[ $disk_val -gt 95 ]]; then
            trigger_alert "disk" "CRITICAL" "Disk space critically low" "${disk_val}%"
        fi
    fi
}

# Function to generate metrics report
generate_metrics_report() {
    local report_file="${1:-metrics-report-$(date +%Y%m%d-%H%M%S).json}"
    
    print_metric "INFO" "REPORTING" "Generating metrics report" "$report_file"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hostname": "$(hostname)",
  "monitoring_version": "1.0.0",
  "system_metrics": {
$(
    first=true
    for metric in "${!CURRENT_METRICS[@]}"; do
        if [[ $first == true ]]; then
            first=false
        else
            echo ","
        fi
        echo -n "    \"$metric\": \"${CURRENT_METRICS[$metric]}\""
    done
)
  },
  "alert_status": {
$(
    first=true
    for component in "${!ALERT_STATUS[@]}"; do
        if [[ $first == true ]]; then
            first=false
        else
            echo ","
        fi
        echo -n "    \"$component\": \"${ALERT_STATUS[$component]}\""
    done
)
  },
  "thresholds": {
    "cpu": $CPU_THRESHOLD,
    "memory": $MEMORY_THRESHOLD,
    "disk": $DISK_THRESHOLD,
    "db_response": $DB_RESPONSE_THRESHOLD,
    "api_response": $API_RESPONSE_THRESHOLD
  }
}
EOF
    
    print_metric "NORMAL" "REPORTING" "Metrics report generated successfully"
}

# Function to run continuous monitoring
run_continuous_monitoring() {
    local interval="${1:-300}"  # 5 minutes default
    local duration="${2:-0}"    # 0 means infinite
    
    print_metric "INFO" "MONITOR" "Starting continuous monitoring" "Interval: ${interval}s, Duration: ${duration}s"
    
    local start_time end_time
    start_time=$(date +%s)
    
    while true; do
        print_metric "INFO" "MONITOR" "=== Performance Monitoring Cycle ==="
        
        # Collect all metrics
        collect_system_metrics
        collect_docker_metrics
        collect_database_metrics
        collect_redis_metrics
        collect_network_metrics
        
        # Check alert conditions
        check_alert_conditions
        
        # Generate report
        generate_metrics_report "${METRICS_OUTPUT_DIR}/current-metrics.json"
        
        print_metric "INFO" "MONITOR" "=== Monitoring Cycle Complete ==="
        
        # Check if duration limit reached
        if [[ $duration -gt 0 ]]; then
            end_time=$(date +%s)
            local elapsed=$(( end_time - start_time ))
            if [[ $elapsed -ge $duration ]]; then
                print_metric "INFO" "MONITOR" "Monitoring duration completed" "${duration}s"
                break
            fi
        fi
        
        print_metric "INFO" "MONITOR" "Waiting for next cycle" "${interval}s"
        sleep "$interval"
    done
}

# Function to run one-time monitoring
run_single_monitoring() {
    print_metric "INFO" "MONITOR" "Running single performance monitoring cycle"
    
    initialize_monitoring
    
    # Collect all metrics
    collect_system_metrics
    collect_docker_metrics
    collect_database_metrics
    collect_redis_metrics
    collect_network_metrics
    
    # Check alert conditions
    check_alert_conditions
    
    # Generate final report
    generate_metrics_report
    
    print_metric "NORMAL" "MONITOR" "Single monitoring cycle completed"
}

# Main function
main() {
    local command="${1:-single}"
    local param1="${2:-}"
    local param2="${3:-}"
    
    case "$command" in
        "single"|"once")
            initialize_monitoring
            run_single_monitoring
            ;;
        "continuous"|"daemon")
            initialize_monitoring
            run_continuous_monitoring "$param1" "$param2"
            ;;
        "system")
            initialize_monitoring
            collect_system_metrics
            ;;
        "docker")
            initialize_monitoring
            collect_docker_metrics
            ;;
        "database")
            initialize_monitoring
            collect_database_metrics
            ;;
        "redis")
            initialize_monitoring
            collect_redis_metrics
            ;;
        "network")
            initialize_monitoring
            collect_network_metrics
            ;;
        "report")
            generate_metrics_report "$param1"
            ;;
        *)
            echo "Usage: $0 {single|continuous|system|docker|database|redis|network|report} [options...]"
            echo ""
            echo "Commands:"
            echo "  single         - Run single monitoring cycle"
            echo "  continuous     - Run continuous monitoring (interval) (duration)"
            echo "  system         - Collect system metrics only"
            echo "  docker         - Collect Docker metrics only"
            echo "  database       - Collect database metrics only"
            echo "  redis          - Collect Redis metrics only"
            echo "  network        - Collect network metrics only"
            echo "  report         - Generate metrics report (filename)"
            echo ""
            echo "Examples:"
            echo "  $0 single                          # Run once"
            echo "  $0 continuous 300 3600            # Monitor every 5min for 1hr"
            echo "  $0 continuous 60                  # Monitor every 1min indefinitely"
            exit 1
            ;;
    esac
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi