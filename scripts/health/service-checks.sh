#!/bin/bash
#
# Service Health Check System for MediMate Malaysia
# Validates PostgreSQL, Redis, MinIO, and Docker services
#

set -euo pipefail

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"
source "${SCRIPT_DIR}/../lib/validation.sh"

# Configuration
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-30}
HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-5}
MAX_RETRIES=${MAX_RETRIES:-5}
DOCKER_COMPOSE_FILE="${SCRIPT_DIR}/../../docker-compose.yml"

# Service configuration
declare -A SERVICE_CONFIGS=(
    ["postgres"]="5432:postgres:SELECT 1"
    ["redis"]="6379::PING"
    ["minio"]="9000::GET /minio/health/live"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Health check results
declare -A HEALTH_RESULTS=()
declare -A PERFORMANCE_METRICS=()

# Function to display colored output
print_status() {
    local status="$1"
    local message="$2"
    local color
    
    case "$status" in
        "PASS") color="$GREEN" ;;
        "FAIL") color="$RED" ;;
        "WARN") color="$YELLOW" ;;
        "INFO") color="$BLUE" ;;
        *) color="$NC" ;;
    esac
    
    echo -e "${color}[${status}]${NC} $message"
}

# Function to check if Docker is running
check_docker_status() {
    print_status "INFO" "Checking Docker daemon status..."
    
    if ! command -v docker >/dev/null 2>&1; then
        print_status "FAIL" "Docker is not installed"
        return 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        print_status "FAIL" "Docker daemon is not running"
        return 1
    fi
    
    print_status "PASS" "Docker daemon is running"
    return 0
}

# Function to check Docker Compose services
check_docker_compose_services() {
    print_status "INFO" "Checking Docker Compose services status..."
    
    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        print_status "FAIL" "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        return 1
    fi
    
    cd "$(dirname "$DOCKER_COMPOSE_FILE")"
    
    local services
    services=$(docker-compose ps --services 2>/dev/null || echo "")
    
    if [[ -z "$services" ]]; then
        print_status "WARN" "No Docker Compose services found"
        return 1
    fi
    
    local all_healthy=true
    while IFS= read -r service; do
        if [[ -n "$service" ]]; then
            local status
            status=$(docker-compose ps -q "$service" 2>/dev/null | xargs -r docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
            
            case "$status" in
                "healthy")
                    print_status "PASS" "Service '$service' is healthy"
                    HEALTH_RESULTS["$service"]="healthy"
                    ;;
                "unhealthy")
                    print_status "FAIL" "Service '$service' is unhealthy"
                    HEALTH_RESULTS["$service"]="unhealthy"
                    all_healthy=false
                    ;;
                "starting")
                    print_status "WARN" "Service '$service' is starting"
                    HEALTH_RESULTS["$service"]="starting"
                    all_healthy=false
                    ;;
                *)
                    # Check if container is running
                    if docker-compose ps "$service" | grep -q "Up"; then
                        print_status "PASS" "Service '$service' is running (no health check defined)"
                        HEALTH_RESULTS["$service"]="running"
                    else
                        print_status "FAIL" "Service '$service' is not running"
                        HEALTH_RESULTS["$service"]="stopped"
                        all_healthy=false
                    fi
                    ;;
            esac
        fi
    done <<< "$services"
    
    if [[ "$all_healthy" == true ]]; then
        print_status "PASS" "All Docker Compose services are healthy"
        return 0
    else
        print_status "FAIL" "Some Docker Compose services are not healthy"
        return 1
    fi
}

# Function to check PostgreSQL health
check_postgres_health() {
    print_status "INFO" "Checking PostgreSQL database health..."
    
    local host="${POSTGRES_HOST:-localhost}"
    local port="${POSTGRES_PORT:-5432}"
    local user="${POSTGRES_USER:-postgres}"
    local db="${POSTGRES_DB:-medimate_dev}"
    local password="${POSTGRES_PASSWORD:-postgres123}"
    
    # Check if PostgreSQL is listening on the port
    if ! nc -z "$host" "$port" 2>/dev/null; then
        print_status "FAIL" "PostgreSQL is not listening on $host:$port"
        return 1
    fi
    
    # Check database connectivity and basic query
    local start_time
    start_time=$(date +%s%N)
    
    if PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$db" -t -c "SELECT 1;" >/dev/null 2>&1; then
        local end_time
        end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        print_status "PASS" "PostgreSQL is healthy (response time: ${response_time}ms)"
        PERFORMANCE_METRICS["postgres_response_time"]="$response_time"
        
        # Check database size and connection count
        local db_size
        db_size=$(PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$db" -t -c "SELECT pg_size_pretty(pg_database_size('$db'));" 2>/dev/null | xargs || echo "unknown")
        
        local connection_count
        connection_count=$(PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$db" -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs || echo "unknown")
        
        print_status "INFO" "Database size: $db_size, Active connections: $connection_count"
        PERFORMANCE_METRICS["postgres_db_size"]="$db_size"
        PERFORMANCE_METRICS["postgres_connections"]="$connection_count"
        
        return 0
    else
        print_status "FAIL" "PostgreSQL connection failed"
        return 1
    fi
}

# Function to check Redis health
check_redis_health() {
    print_status "INFO" "Checking Redis cache health..."
    
    local host="${REDIS_HOST:-localhost}"
    local port="${REDIS_PORT:-6379}"
    
    # Check if Redis is listening on the port
    if ! nc -z "$host" "$port" 2>/dev/null; then
        print_status "FAIL" "Redis is not listening on $host:$port"
        return 1
    fi
    
    # Check Redis connectivity and response
    local start_time
    start_time=$(date +%s%N)
    
    if redis-cli -h "$host" -p "$port" ping 2>/dev/null | grep -q "PONG"; then
        local end_time
        end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        print_status "PASS" "Redis is healthy (response time: ${response_time}ms)"
        PERFORMANCE_METRICS["redis_response_time"]="$response_time"
        
        # Check Redis info
        local memory_usage
        memory_usage=$(redis-cli -h "$host" -p "$port" info memory 2>/dev/null | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r' || echo "unknown")
        
        local connected_clients
        connected_clients=$(redis-cli -h "$host" -p "$port" info clients 2>/dev/null | grep "connected_clients:" | cut -d: -f2 | tr -d '\r' || echo "unknown")
        
        print_status "INFO" "Memory usage: $memory_usage, Connected clients: $connected_clients"
        PERFORMANCE_METRICS["redis_memory_usage"]="$memory_usage"
        PERFORMANCE_METRICS["redis_clients"]="$connected_clients"
        
        return 0
    else
        print_status "FAIL" "Redis ping failed"
        return 1
    fi
}

# Function to check MinIO health
check_minio_health() {
    print_status "INFO" "Checking MinIO object storage health..."
    
    local host="${MINIO_HOST:-localhost}"
    local port="${MINIO_PORT:-9000}"
    local endpoint="http://$host:$port"
    
    # Check if MinIO is listening on the port
    if ! nc -z "$host" "$port" 2>/dev/null; then
        print_status "FAIL" "MinIO is not listening on $host:$port"
        return 1
    fi
    
    # Check MinIO health endpoint
    local start_time
    start_time=$(date +%s%N)
    
    if curl -sf "$endpoint/minio/health/live" >/dev/null 2>&1; then
        local end_time
        end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        print_status "PASS" "MinIO is healthy (response time: ${response_time}ms)"
        PERFORMANCE_METRICS["minio_response_time"]="$response_time"
        
        # Check MinIO ready endpoint for more detailed health
        if curl -sf "$endpoint/minio/health/ready" >/dev/null 2>&1; then
            print_status "PASS" "MinIO is ready and operational"
            
            # Try to list buckets if credentials are available
            if [[ -n "${MINIO_ROOT_USER:-}" && -n "${MINIO_ROOT_PASSWORD:-}" ]]; then
                local bucket_count
                bucket_count=$(mc --json ls "minio" 2>/dev/null | wc -l || echo "unknown")
                print_status "INFO" "Available buckets: $bucket_count"
                PERFORMANCE_METRICS["minio_buckets"]="$bucket_count"
            fi
        else
            print_status "WARN" "MinIO is alive but not ready"
        fi
        
        return 0
    else
        print_status "FAIL" "MinIO health check failed"
        return 1
    fi
}

# Function to check system resources
check_system_resources() {
    print_status "INFO" "Checking system resource usage..."
    
    # Check disk space
    local disk_usage
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [[ "$disk_usage" -gt 90 ]]; then
        print_status "FAIL" "Disk usage is critical: ${disk_usage}%"
        return 1
    elif [[ "$disk_usage" -gt 80 ]]; then
        print_status "WARN" "Disk usage is high: ${disk_usage}%"
    else
        print_status "PASS" "Disk usage is normal: ${disk_usage}%"
    fi
    
    PERFORMANCE_METRICS["disk_usage"]="${disk_usage}%"
    
    # Check memory usage (if available)
    if command -v free >/dev/null 2>&1; then
        local mem_usage
        mem_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/($2)}')
        print_status "INFO" "Memory usage: ${mem_usage}%"
        PERFORMANCE_METRICS["memory_usage"]="${mem_usage}%"
    elif [[ "$(uname)" == "Darwin" ]]; then
        # macOS memory check
        local mem_pressure
        mem_pressure=$(memory_pressure 2>/dev/null | grep "System-wide memory free percentage" | awk '{print 100-$5}' | sed 's/%//' || echo "unknown")
        if [[ "$mem_pressure" != "unknown" ]]; then
            print_status "INFO" "Memory usage: ${mem_pressure}%"
            PERFORMANCE_METRICS["memory_usage"]="${mem_pressure}%"
        fi
    fi
    
    # Check CPU load (if available)
    if command -v uptime >/dev/null 2>&1; then
        local load_avg
        load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
        print_status "INFO" "Load average (1min): $load_avg"
        PERFORMANCE_METRICS["load_average"]="$load_avg"
    fi
    
    return 0
}

# Function to run all health checks
run_all_health_checks() {
    print_status "INFO" "Starting comprehensive health check..."
    echo "=========================================="
    
    local overall_status=0
    
    # Docker status check
    if ! check_docker_status; then
        overall_status=1
    fi
    
    echo ""
    
    # Docker Compose services check
    if ! check_docker_compose_services; then
        overall_status=1
    fi
    
    echo ""
    
    # Individual service checks
    if ! check_postgres_health; then
        overall_status=1
    fi
    
    echo ""
    
    if ! check_redis_health; then
        overall_status=1
    fi
    
    echo ""
    
    if ! check_minio_health; then
        overall_status=1
    fi
    
    echo ""
    
    # System resources check
    if ! check_system_resources; then
        overall_status=1
    fi
    
    echo ""
    echo "=========================================="
    
    # Display performance metrics summary
    if [[ ${#PERFORMANCE_METRICS[@]} -gt 0 ]]; then
        print_status "INFO" "Performance Metrics Summary:"
        for metric in "${!PERFORMANCE_METRICS[@]}"; do
            echo "  - $metric: ${PERFORMANCE_METRICS[$metric]}"
        done
        echo ""
    fi
    
    # Overall status
    if [[ $overall_status -eq 0 ]]; then
        print_status "PASS" "All health checks passed successfully!"
        echo "System is healthy and ready for development."
    else
        print_status "FAIL" "Some health checks failed!"
        echo "Please review the issues above before proceeding."
    fi
    
    return $overall_status
}

# Function to run health checks with retry logic
run_health_checks_with_retry() {
    local max_attempts="$MAX_RETRIES"
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        print_status "INFO" "Health check attempt $attempt of $max_attempts"
        
        if run_all_health_checks; then
            print_status "PASS" "Health checks completed successfully on attempt $attempt"
            return 0
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            print_status "WARN" "Health checks failed on attempt $attempt, retrying in $HEALTH_CHECK_INTERVAL seconds..."
            sleep "$HEALTH_CHECK_INTERVAL"
        fi
        
        ((attempt++))
    done
    
    print_status "FAIL" "Health checks failed after $max_attempts attempts"
    return 1
}

# Function to generate health check report
generate_health_report() {
    local report_file="${1:-health-report-$(date +%Y%m%d-%H%M%S).json}"
    
    print_status "INFO" "Generating health check report: $report_file"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "health_check_version": "1.0.0",
  "overall_status": "$(if run_all_health_checks >/dev/null 2>&1; then echo "healthy"; else echo "unhealthy"; fi)",
  "services": {
$(
    first=true
    for service in "${!HEALTH_RESULTS[@]}"; do
        if [[ $first == true ]]; then
            first=false
        else
            echo ","
        fi
        echo -n "    \"$service\": \"${HEALTH_RESULTS[$service]}\""
    done
)
  },
  "performance_metrics": {
$(
    first=true
    for metric in "${!PERFORMANCE_METRICS[@]}"; do
        if [[ $first == true ]]; then
            first=false
        else
            echo ","
        fi
        echo -n "    \"$metric\": \"${PERFORMANCE_METRICS[$metric]}\""
    done
)
  }
}
EOF
    
    print_status "PASS" "Health report generated: $report_file"
}

# Main function
main() {
    local command="${1:-check}"
    local report_file="${2:-}"
    
    case "$command" in
        "check")
            run_all_health_checks
            ;;
        "retry")
            run_health_checks_with_retry
            ;;
        "report")
            run_all_health_checks
            generate_health_report "$report_file"
            ;;
        "postgres")
            check_postgres_health
            ;;
        "redis")
            check_redis_health
            ;;
        "minio")
            check_minio_health
            ;;
        "docker")
            check_docker_status && check_docker_compose_services
            ;;
        "resources")
            check_system_resources
            ;;
        *)
            echo "Usage: $0 {check|retry|report|postgres|redis|minio|docker|resources} [report_file]"
            echo ""
            echo "Commands:"
            echo "  check      - Run all health checks once"
            echo "  retry      - Run health checks with retry logic"
            echo "  report     - Run checks and generate JSON report"
            echo "  postgres   - Check only PostgreSQL health"
            echo "  redis      - Check only Redis health" 
            echo "  minio      - Check only MinIO health"
            echo "  docker     - Check only Docker services"
            echo "  resources  - Check only system resources"
            exit 1
            ;;
    esac
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi