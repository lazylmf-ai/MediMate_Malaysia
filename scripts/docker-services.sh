#!/bin/bash
# MediMate Malaysia Docker Services Management Script
# Comprehensive service orchestration for healthcare platform

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
ENV_FILE="$PROJECT_DIR/.env"

# Default values
ENVIRONMENT="dev"
SERVICES=""
FORCE=false
VERBOSE=false
HEALTH_CHECK=true
BACKUP_BEFORE_STOP=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

log_header() {
    echo -e "${PURPLE}🏥 $1${NC}"
    echo "=================================="
}

# Help function
show_help() {
    echo "🏥 MediMate Malaysia Docker Services Management"
    echo ""
    echo "USAGE:"
    echo "  $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "COMMANDS:"
    echo "  up           Start services"
    echo "  down         Stop services"
    echo "  restart      Restart services"
    echo "  status       Show service status"
    echo "  logs         Show service logs"
    echo "  health       Run health checks"
    echo "  backup       Backup service data"
    echo "  restore      Restore service data"
    echo "  clean        Clean up volumes and networks"
    echo "  update       Update service images"
    echo "  setup        Initial setup for development"
    echo ""
    echo "OPTIONS:"
    echo "  -e, --env ENV        Environment (dev, test, prod) [default: dev]"
    echo "  -s, --service SVC    Specific service to manage"
    echo "  -f, --force          Force operation without confirmation"
    echo "  -v, --verbose        Verbose output"
    echo "  -h, --health         Skip health checks"
    echo "  -b, --backup         Backup data before stopping services"
    echo "      --help           Show this help"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 up -e dev                    # Start development environment"
    echo "  $0 down -s postgres -b          # Stop postgres with backup"
    echo "  $0 logs -s redis -v             # Show verbose Redis logs"
    echo "  $0 health                       # Run all health checks"
    echo "  $0 setup                        # Initial development setup"
    echo ""
    echo "MALAYSIAN HEALTHCARE FEATURES:"
    echo "  - Cultural data seeding (prayer times, holidays)"
    echo "  - PDPA compliance checking"
    echo "  - Healthcare provider mock APIs"
    echo "  - Malaysian medication database"
    echo ""
}

# Parse command line arguments
COMMAND=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--service)
            SERVICES="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--no-health)
            HEALTH_CHECK=false
            shift
            ;;
        -b|--backup)
            BACKUP_BEFORE_STOP=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            ;;
        *)
            if [[ -z "$COMMAND" ]]; then
                COMMAND="$1"
            else
                log_error "Multiple commands specified: $COMMAND and $1"
            fi
            shift
            ;;
    esac
done

# Validate command
if [[ -z "$COMMAND" ]]; then
    log_error "No command specified. Use --help for usage information."
fi

# Validate environment
case $ENVIRONMENT in
    dev|test|prod)
        ;;
    *)
        log_error "Invalid environment: $ENVIRONMENT. Use dev, test, or prod."
        ;;
esac

# Set compose files based on environment
COMPOSE_FILES="-f $COMPOSE_FILE"
if [[ -f "$PROJECT_DIR/docker-compose.$ENVIRONMENT.yml" ]]; then
    COMPOSE_FILES="$COMPOSE_FILES -f $PROJECT_DIR/docker-compose.$ENVIRONMENT.yml"
fi

# Docker compose command with environment
compose_cmd() {
    local cmd="docker compose $COMPOSE_FILES"
    if [[ -f "$ENV_FILE" ]]; then
        cmd="$cmd --env-file $ENV_FILE"
    fi
    if [[ "$VERBOSE" == "true" ]]; then
        cmd="$cmd --verbose"
    fi
    echo "$cmd $@"
}

# Execute docker compose command
execute_compose() {
    local cmd=$(compose_cmd "$@")
    log_info "Executing: $cmd"
    eval $cmd
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available"
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
    fi
    
    log_success "Prerequisites check passed"
}

# Create environment file if it doesn't exist
ensure_env_file() {
    if [[ ! -f "$ENV_FILE" ]]; then
        log_info "Creating environment file: $ENV_FILE"
        cat > "$ENV_FILE" << EOF
# MediMate Malaysia - Environment Configuration
# Generated on $(date)

# Environment
NODE_ENV=$ENVIRONMENT
MALAYSIA_TIMEZONE=Asia/Kuala_Lumpur

# PostgreSQL Configuration
POSTGRES_DB=medimate_${ENVIRONMENT}
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_PORT=5432
POSTGRES_TEST_DB=medimate_test

# Redis Configuration  
REDIS_PORT=6379
REDIS_PASSWORD=redis123

# MinIO Configuration
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_DEFAULT_BUCKETS=medimate-uploads,medimate-avatars,medimate-documents

# pgAdmin Configuration (Development)
PGADMIN_PORT=5050
PGADMIN_EMAIL=admin@medimate.local
PGADMIN_PASSWORD=admin123

# Malaysian Cultural Features
CULTURAL_FEATURES_ENABLED=true
PRAYER_TIMES_ENABLED=true
MALAYSIAN_HOLIDAYS_ENABLED=true

# Healthcare Compliance
PDPA_COMPLIANCE_ENABLED=true
AUDIT_LOGGING_ENABLED=true
HEALTHCARE_PROVIDER_INTEGRATION=true

# Mock APIs (Development/Test)
MOCK_MOH_API_ENABLED=true
MOCK_PRAYER_API_ENABLED=true
EOF
        log_success "Environment file created"
    fi
}

# Wait for services to be healthy
wait_for_health() {
    local services_to_check="$1"
    local max_wait=300  # 5 minutes
    local check_interval=10
    local elapsed=0
    
    log_info "Waiting for services to become healthy..."
    
    while [[ $elapsed -lt $max_wait ]]; do
        local all_healthy=true
        
        for service in $services_to_check; do
            local health_status=$(docker inspect --format='{{.State.Health.Status}}' "medimate_${service}" 2>/dev/null || echo "no-health-check")
            
            case $health_status in
                "healthy")
                    log_success "$service is healthy"
                    ;;
                "starting")
                    log_info "$service is starting..."
                    all_healthy=false
                    ;;
                "unhealthy")
                    log_warning "$service is unhealthy"
                    all_healthy=false
                    ;;
                "no-health-check")
                    # Check if container is running for services without health checks
                    if docker inspect --format='{{.State.Running}}' "medimate_${service}" 2>/dev/null | grep -q true; then
                        log_success "$service is running (no health check)"
                    else
                        log_warning "$service is not running"
                        all_healthy=false
                    fi
                    ;;
                *)
                    log_warning "$service status unknown: $health_status"
                    all_healthy=false
                    ;;
            esac
        done
        
        if [[ "$all_healthy" == "true" ]]; then
            log_success "All services are healthy!"
            return 0
        fi
        
        sleep $check_interval
        elapsed=$((elapsed + check_interval))
        log_info "Elapsed time: ${elapsed}s / ${max_wait}s"
    done
    
    log_error "Services failed to become healthy within $max_wait seconds"
}

# Run health checks
run_health_checks() {
    log_header "Running Health Checks"
    
    # PostgreSQL health check
    if docker ps | grep -q medimate_postgres; then
        log_info "Running PostgreSQL health check..."
        if docker exec medimate_postgres /docker/postgres/health-check.sh 2>/dev/null; then
            log_success "PostgreSQL health check passed"
        else
            log_warning "PostgreSQL health check failed"
        fi
    fi
    
    # Redis health check
    if docker ps | grep -q medimate_redis; then
        log_info "Checking Redis..."
        if docker exec medimate_redis redis-cli ping 2>/dev/null | grep -q PONG; then
            log_success "Redis is responding"
        else
            log_warning "Redis is not responding"
        fi
    fi
    
    # MinIO health check
    if docker ps | grep -q medimate_minio; then
        log_info "Checking MinIO..."
        if docker exec medimate_minio curl -f http://localhost:9000/minio/health/live 2>/dev/null; then
            log_success "MinIO is healthy"
        else
            log_warning "MinIO health check failed"
        fi
    fi
    
    # Network connectivity check
    log_info "Checking service connectivity..."
    if docker network ls | grep -q medimate-network; then
        log_success "MediMate network is available"
    else
        log_warning "MediMate network not found"
    fi
}

# Backup service data
backup_services() {
    log_header "Backing Up Service Data"
    
    local backup_dir="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # PostgreSQL backup
    if docker ps | grep -q medimate_postgres; then
        log_info "Backing up PostgreSQL..."
        docker exec medimate_postgres pg_dumpall -U postgres > "$backup_dir/postgres_backup.sql"
        log_success "PostgreSQL backup saved to $backup_dir/postgres_backup.sql"
    fi
    
    # Redis backup
    if docker ps | grep -q medimate_redis; then
        log_info "Backing up Redis..."
        docker exec medimate_redis redis-cli BGSAVE
        docker cp medimate_redis:/data/dump.rdb "$backup_dir/redis_backup.rdb"
        log_success "Redis backup saved to $backup_dir/redis_backup.rdb"
    fi
    
    log_success "Backup completed in $backup_dir"
}

# Main command handlers
case $COMMAND in
    up)
        log_header "Starting MediMate Services ($ENVIRONMENT)"
        check_prerequisites
        ensure_env_file
        
        if [[ -n "$SERVICES" ]]; then
            execute_compose up -d $SERVICES
            if [[ "$HEALTH_CHECK" == "true" ]]; then
                wait_for_health "$SERVICES"
            fi
        else
            execute_compose --profile $ENVIRONMENT up -d
            if [[ "$HEALTH_CHECK" == "true" ]]; then
                case $ENVIRONMENT in
                    dev)
                        wait_for_health "postgres redis minio pgadmin"
                        ;;
                    test)
                        wait_for_health "postgres redis minio"
                        ;;
                    prod)
                        wait_for_health "postgres redis minio"
                        ;;
                esac
            fi
        fi
        
        log_success "Services started successfully!"
        
        if [[ "$ENVIRONMENT" == "dev" ]]; then
            echo ""
            log_info "Development services available:"
            echo "  PostgreSQL: localhost:5432"
            echo "  Redis: localhost:6379"
            echo "  MinIO API: http://localhost:9000"
            echo "  MinIO Console: http://localhost:9001"
            echo "  pgAdmin: http://localhost:5050"
        fi
        ;;
        
    down)
        log_header "Stopping MediMate Services ($ENVIRONMENT)"
        
        if [[ "$BACKUP_BEFORE_STOP" == "true" ]]; then
            backup_services
        fi
        
        if [[ -n "$SERVICES" ]]; then
            execute_compose stop $SERVICES
        else
            execute_compose --profile $ENVIRONMENT down
        fi
        
        log_success "Services stopped successfully!"
        ;;
        
    restart)
        log_header "Restarting MediMate Services ($ENVIRONMENT)"
        
        if [[ -n "$SERVICES" ]]; then
            execute_compose restart $SERVICES
            if [[ "$HEALTH_CHECK" == "true" ]]; then
                wait_for_health "$SERVICES"
            fi
        else
            execute_compose --profile $ENVIRONMENT restart
        fi
        
        log_success "Services restarted successfully!"
        ;;
        
    status)
        log_header "MediMate Services Status ($ENVIRONMENT)"
        execute_compose ps
        echo ""
        run_health_checks
        ;;
        
    logs)
        log_header "Service Logs ($ENVIRONMENT)"
        if [[ -n "$SERVICES" ]]; then
            execute_compose logs -f $SERVICES
        else
            execute_compose logs -f
        fi
        ;;
        
    health)
        run_health_checks
        ;;
        
    backup)
        backup_services
        ;;
        
    clean)
        log_header "Cleaning Up Docker Resources"
        
        if [[ "$FORCE" != "true" ]]; then
            read -p "This will remove all volumes and networks. Are you sure? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Operation cancelled"
                exit 0
            fi
        fi
        
        execute_compose down -v --remove-orphans
        docker network prune -f
        docker volume prune -f
        
        log_success "Cleanup completed!"
        ;;
        
    update)
        log_header "Updating Service Images"
        execute_compose pull
        execute_compose --profile $ENVIRONMENT up -d --remove-orphans
        log_success "Services updated!"
        ;;
        
    setup)
        log_header "MediMate Development Setup"
        check_prerequisites
        ensure_env_file
        
        log_info "Creating required directories..."
        mkdir -p "$PROJECT_DIR/data/postgres" "$PROJECT_DIR/data/redis" "$PROJECT_DIR/data/minio" "$PROJECT_DIR/backups"
        
        log_info "Building and starting services..."
        execute_compose --profile dev up -d --build
        
        log_info "Waiting for services to be ready..."
        wait_for_health "postgres redis minio"
        
        log_info "Running health checks..."
        run_health_checks
        
        log_success "🎉 MediMate development environment is ready!"
        echo ""
        log_info "Available services:"
        echo "  🗄️  PostgreSQL: localhost:5432 (user: postgres, password: postgres123)"
        echo "  🔄 Redis: localhost:6379"
        echo "  📦 MinIO: http://localhost:9000 (minioadmin/minioadmin123)"
        echo "  🎛️  pgAdmin: http://localhost:5050 (admin@medimate.local/admin123)"
        echo ""
        log_info "Next steps:"
        echo "  1. Run your MediMate API server"
        echo "  2. Start your mobile app development"
        echo "  3. Access pgAdmin to explore the Malaysian healthcare schema"
        echo "  4. Use MinIO console to manage file uploads"
        ;;
        
    *)
        log_error "Unknown command: $COMMAND. Use --help for usage information."
        ;;
esac