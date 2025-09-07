#!/bin/bash
#
# Common utility functions for MediMate Malaysia setup scripts
# Provides logging, error handling, and cross-platform utilities
#

# Colors for output (if terminal supports colors)
if [[ -t 1 ]]; then
    readonly RED='\033[0;31m'
    readonly GREEN='\033[0;32m'
    readonly YELLOW='\033[0;33m'
    readonly BLUE='\033[0;34m'
    readonly PURPLE='\033[0;35m'
    readonly CYAN='\033[0;36m'
    readonly WHITE='\033[0;37m'
    readonly BOLD='\033[1m'
    readonly NC='\033[0m' # No Color
else
    readonly RED=''
    readonly GREEN=''
    readonly YELLOW=''
    readonly BLUE=''
    readonly PURPLE=''
    readonly CYAN=''
    readonly WHITE=''
    readonly BOLD=''
    readonly NC=''
fi

# Logging configuration
LOG_LEVEL_DEBUG=0
LOG_LEVEL_INFO=1
LOG_LEVEL_WARN=2
LOG_LEVEL_ERROR=3

# Default log level (can be overridden)
CURRENT_LOG_LEVEL=${LOG_LEVEL_INFO}
LOG_FILE=""

# Initialize logging system
init_logging() {
    local verbose=$1
    local log_file=$2
    
    # Set log level from environment if provided, otherwise use verbose flag
    if [[ -n "${MEDIMATE_LOG_LEVEL:-}" ]]; then
        case "${MEDIMATE_LOG_LEVEL}" in
            debug) CURRENT_LOG_LEVEL=${LOG_LEVEL_DEBUG} ;;
            info)  CURRENT_LOG_LEVEL=${LOG_LEVEL_INFO} ;;
            warn)  CURRENT_LOG_LEVEL=${LOG_LEVEL_WARN} ;;
            error) CURRENT_LOG_LEVEL=${LOG_LEVEL_ERROR} ;;
        esac
    elif [[ "$verbose" == "true" ]]; then
        CURRENT_LOG_LEVEL=${LOG_LEVEL_DEBUG}
    else
        CURRENT_LOG_LEVEL=${LOG_LEVEL_INFO}
    fi
    
    LOG_FILE="$log_file"
    
    # Create log file and add header
    {
        echo "=== MediMate Malaysia Setup Log ==="
        echo "Started: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
        echo "Platform: $(uname -s) $(uname -r)"
        echo "User: $(whoami)"
        echo "Working Directory: $(pwd)"
        echo "======================================="
        echo
    } > "$LOG_FILE"
    
    log_debug "Logging initialized - level: ${CURRENT_LOG_LEVEL}, file: ${LOG_FILE}"
}

# Logging functions
log_debug() {
    [[ $CURRENT_LOG_LEVEL -le $LOG_LEVEL_DEBUG ]] || return 0
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    printf "${PURPLE}[DEBUG]${NC} %s\n" "$message" >&2
    [[ -n "$LOG_FILE" ]] && printf "[DEBUG] %s - %s\n" "$timestamp" "$message" >> "$LOG_FILE"
}

log_info() {
    [[ $CURRENT_LOG_LEVEL -le $LOG_LEVEL_INFO ]] || return 0
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    printf "${BLUE}[INFO]${NC} %s\n" "$message" >&2
    [[ -n "$LOG_FILE" ]] && printf "[INFO] %s - %s\n" "$timestamp" "$message" >> "$LOG_FILE"
}

log_warn() {
    [[ $CURRENT_LOG_LEVEL -le $LOG_LEVEL_WARN ]] || return 0
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    printf "${YELLOW}[WARN]${NC} %s\n" "$message" >&2
    [[ -n "$LOG_FILE" ]] && printf "[WARN] %s - %s\n" "$timestamp" "$message" >> "$LOG_FILE"
}

log_error() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    printf "${RED}[ERROR]${NC} %s\n" "$message" >&2
    [[ -n "$LOG_FILE" ]] && printf "[ERROR] %s - %s\n" "$timestamp" "$message" >> "$LOG_FILE"
}

log_success() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    printf "${GREEN}[SUCCESS]${NC} %s\n" "$message" >&2
    [[ -n "$LOG_FILE" ]] && printf "[SUCCESS] %s - %s\n" "$timestamp" "$message" >> "$LOG_FILE"
}

# Progress indicator for long-running operations
show_progress() {
    local message="$1"
    local current="$2"
    local total="$3"
    
    if [[ -n "$total" && "$total" -gt 0 ]]; then
        local percent=$((current * 100 / total))
        printf "\r${CYAN}[PROGRESS]${NC} %s [%d/%d] (%d%%)" "$message" "$current" "$total" "$percent"
    else
        printf "\r${CYAN}[PROGRESS]${NC} %s..." "$message"
    fi
    
    if [[ "$current" -eq "$total" ]]; then
        printf "\n"
    fi
}

# Platform detection
detect_platform() {
    local os_name
    os_name=$(uname -s)
    
    case "$os_name" in
        Darwin*)
            log_debug "Platform detected: macOS"
            return 1  # macOS
            ;;
        Linux*)
            log_debug "Platform detected: Linux"
            return 2  # Linux
            ;;
        CYGWIN*|MINGW*|MSYS*)
            log_debug "Platform detected: Windows (MSYS/MinGW)"
            return 3  # Windows
            ;;
        *)
            log_error "Unknown platform: $os_name"
            return 0  # Unknown
            ;;
    esac
}

# Architecture detection
detect_architecture() {
    local arch
    arch=$(uname -m)
    
    case "$arch" in
        x86_64|amd64)
            echo "x64"
            ;;
        i386|i686)
            echo "x86"
            ;;
        aarch64|arm64)
            echo "arm64"
            ;;
        armv7l)
            echo "arm"
            ;;
        *)
            log_warn "Unknown architecture: $arch, defaulting to x64"
            echo "x64"
            ;;
    esac
}

# Check if command exists
command_exists() {
    local cmd="$1"
    command -v "$cmd" >/dev/null 2>&1
}

# Check if running in CI/CD environment
is_ci_environment() {
    [[ -n "${CI:-}" ]] || [[ -n "${GITHUB_ACTIONS:-}" ]] || [[ -n "${JENKINS_URL:-}" ]]
}

# Prompt user for yes/no input
prompt_yes_no() {
    local question="$1"
    local default="${2:-n}"
    
    if [[ "$INTERACTIVE" == "false" ]] || is_ci_environment; then
        log_debug "Non-interactive mode, using default: $default"
        [[ "$default" =~ ^[Yy] ]]
        return $?
    fi
    
    while true; do
        if [[ "$default" =~ ^[Yy] ]]; then
            read -p "$question (Y/n): " -n 1 -r response
        else
            read -p "$question (y/N): " -n 1 -r response
        fi
        echo
        
        case "$response" in
            [Yy]*) return 0 ;;
            [Nn]*) return 1 ;;
            "") [[ "$default" =~ ^[Yy] ]] && return 0 || return 1 ;;
            *) echo "Please answer yes or no." ;;
        esac
    done
}

# Create directory with proper permissions
create_directory() {
    local dir_path="$1"
    local permissions="${2:-755}"
    
    if [[ ! -d "$dir_path" ]]; then
        log_debug "Creating directory: $dir_path"
        mkdir -p "$dir_path"
        chmod "$permissions" "$dir_path"
    else
        log_debug "Directory already exists: $dir_path"
    fi
}

# Download file with retry logic
download_file() {
    local url="$1"
    local output_path="$2"
    local max_retries="${3:-3}"
    local retry_delay="${4:-5}"
    
    for ((i=1; i<=max_retries; i++)); do
        log_debug "Downloading $url (attempt $i/$max_retries)"
        
        if command_exists curl; then
            if curl -fsSL -o "$output_path" "$url"; then
                log_debug "Successfully downloaded: $output_path"
                return 0
            fi
        elif command_exists wget; then
            if wget -q -O "$output_path" "$url"; then
                log_debug "Successfully downloaded: $output_path"
                return 0
            fi
        else
            log_error "Neither curl nor wget available for downloading"
            return 1
        fi
        
        log_warn "Download failed (attempt $i/$max_retries)"
        [[ $i -lt $max_retries ]] && sleep "$retry_delay"
    done
    
    log_error "Failed to download after $max_retries attempts: $url"
    return 1
}

# Execute command with error handling and logging
execute_command() {
    local cmd="$1"
    local description="${2:-Executing command}"
    local allow_failure="${3:-false}"
    
    log_debug "$description: $cmd"
    
    if [[ "$CURRENT_LOG_LEVEL" -eq "$LOG_LEVEL_DEBUG" ]]; then
        # Show command output in debug mode
        if eval "$cmd" 2>&1 | tee -a "$LOG_FILE"; then
            log_debug "Command succeeded: $cmd"
            return 0
        else
            local exit_code=$?
            if [[ "$allow_failure" == "true" ]]; then
                log_warn "Command failed but continuing: $cmd (exit code: $exit_code)"
                return 0
            else
                log_error "Command failed: $cmd (exit code: $exit_code)"
                return $exit_code
            fi
        fi
    else
        # Capture output to log file only
        if eval "$cmd" >> "$LOG_FILE" 2>&1; then
            log_debug "Command succeeded: $cmd"
            return 0
        else
            local exit_code=$?
            if [[ "$allow_failure" == "true" ]]; then
                log_warn "Command failed but continuing: $cmd (exit code: $exit_code)"
                return 0
            else
                log_error "Command failed: $cmd (exit code: $exit_code)"
                log_error "Check log file for details: $LOG_FILE"
                return $exit_code
            fi
        fi
    fi
}

# Track installation progress
track_progress() {
    local step="$1"
    local progress_file="${PROJECT_ROOT}/.setup-progress"
    
    echo "$step" >> "$progress_file"
    log_debug "Progress tracked: $step"
}

# Rollback installation
rollback_installation() {
    local progress_file="${PROJECT_ROOT}/.setup-progress"
    
    if [[ ! -f "$progress_file" ]]; then
        log_warn "No progress file found, cannot rollback"
        return 0
    fi
    
    log_info "Rolling back installation..."
    
    # Read steps in reverse order and attempt cleanup
    while IFS= read -r step; do
        case "$step" in
            "homebrew_installed")
                log_info "Skipping Homebrew rollback (system package manager)"
                ;;
            "docker_installed")
                log_info "Skipping Docker rollback (system application)"
                ;;
            "node_installed")
                log_info "Skipping Node.js rollback (system package)"
                ;;
            "npm_packages_installed")
                if [[ -f "${PROJECT_ROOT}/package.json" ]]; then
                    log_info "Removing npm packages..."
                    execute_command "cd '$PROJECT_ROOT' && rm -rf node_modules package-lock.json" "Removing npm packages" true
                fi
                ;;
            *)
                log_debug "Unknown rollback step: $step"
                ;;
        esac
    done < <(tac "$progress_file" 2>/dev/null || tail -r "$progress_file" 2>/dev/null)
    
    rm -f "$progress_file"
    log_info "Rollback completed"
}

# Validate command succeeded
validate_command_success() {
    local cmd="$1"
    local expected_output="${2:-}"
    local description="${3:-Command validation}"
    
    log_debug "$description: $cmd"
    
    local output
    output=$(eval "$cmd" 2>/dev/null)
    local exit_code=$?
    
    if [[ $exit_code -ne 0 ]]; then
        log_error "$description failed (exit code: $exit_code)"
        return 1
    fi
    
    if [[ -n "$expected_output" ]] && [[ "$output" != *"$expected_output"* ]]; then
        log_error "$description failed - unexpected output: $output"
        return 1
    fi
    
    log_debug "$description succeeded: $output"
    return 0
}

# Get system memory in GB
get_system_memory_gb() {
    local memory_gb=0
    
    if command_exists free; then
        # Linux
        memory_gb=$(free -g | awk '/^Mem:/ { print $2 }')
    elif [[ "$(uname -s)" == "Darwin" ]]; then
        # macOS
        local memory_bytes
        memory_bytes=$(sysctl -n hw.memsize 2>/dev/null || echo "0")
        memory_gb=$((memory_bytes / 1024 / 1024 / 1024))
    fi
    
    echo "$memory_gb"
}

# Check if system meets minimum requirements
check_system_requirements() {
    log_info "Checking system requirements..."
    
    local memory_gb
    memory_gb=$(get_system_memory_gb)
    
    if [[ "$memory_gb" -lt 4 ]]; then
        log_warn "System has ${memory_gb}GB RAM. Minimum 4GB recommended for development"
        if ! prompt_yes_no "Continue with limited memory?"; then
            log_error "Setup cancelled due to insufficient memory"
            return 1
        fi
    else
        log_debug "System memory: ${memory_gb}GB (sufficient)"
    fi
    
    # Check disk space
    local available_gb
    if command_exists df; then
        available_gb=$(df -BG . | tail -1 | awk '{print $4}' | tr -d 'G')
        if [[ "$available_gb" -lt 5 ]]; then
            log_warn "Available disk space: ${available_gb}GB. Minimum 5GB recommended"
            if ! prompt_yes_no "Continue with limited disk space?"; then
                log_error "Setup cancelled due to insufficient disk space"
                return 1
            fi
        else
            log_debug "Available disk space: ${available_gb}GB (sufficient)"
        fi
    fi
    
    return 0
}