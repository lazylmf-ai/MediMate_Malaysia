#!/bin/bash
#
# MediMate Malaysia Development Environment Setup
# Main entry point for cross-platform setup automation
#
# Usage: ./scripts/setup.sh [options]
# Options:
#   --verbose     Enable verbose output
#   --skip-docker Skip Docker installation
#   --production  Setup for production environment
#   --help        Show help message
#

set -euo pipefail

# Script configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${PROJECT_ROOT}/setup.log"

# Source common functions
source "${SCRIPT_DIR}/lib/common.sh"
source "${SCRIPT_DIR}/lib/validation.sh"

# Default configuration
VERBOSE=false
SKIP_DOCKER=false
PRODUCTION=false
INTERACTIVE=true

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose)
                VERBOSE=true
                shift
                ;;
            --skip-docker)
                SKIP_DOCKER=true
                shift
                ;;
            --production)
                PRODUCTION=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            --non-interactive)
                INTERACTIVE=false
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Show help message
show_help() {
    cat << EOF
MediMate Malaysia Development Environment Setup

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --verbose         Enable verbose output and detailed logging
    --skip-docker     Skip Docker Desktop installation
    --production      Setup for production environment (stricter validation)
    --non-interactive Run in non-interactive mode (for CI/CD)
    --help           Show this help message

EXAMPLES:
    $0                           # Interactive setup with all defaults
    $0 --verbose                 # Detailed output for debugging
    $0 --skip-docker --verbose   # Skip Docker, verbose output
    $0 --non-interactive         # Automated setup for CI/CD

ENVIRONMENT VARIABLES:
    MEDIMATE_CONFIG_FILE    Path to custom configuration file
    MEDIMATE_LOG_LEVEL      Log level (debug, info, warn, error)
    MEDIMATE_SKIP_PROMPTS   Skip all interactive prompts

For more information, see: docs/setup-guide.md
EOF
}

# Main setup orchestration
main() {
    parse_arguments "$@"
    
    # Initialize logging
    init_logging "$VERBOSE" "$LOG_FILE"
    
    log_info "Starting MediMate Malaysia development environment setup"
    log_info "Project root: $PROJECT_ROOT"
    log_info "Configuration: verbose=$VERBOSE, skip-docker=$SKIP_DOCKER, production=$PRODUCTION"
    
    # Load configuration
    load_configuration
    
    # Platform detection
    detect_platform
    local platform=$?
    
    case $platform in
        1) # macOS
            log_info "Detected platform: macOS"
            if ! source "${SCRIPT_DIR}/setup-macos.sh"; then
                log_error "macOS setup failed"
                exit 1
            fi
            ;;
        2) # Linux
            log_info "Detected platform: Linux"
            if ! source "${SCRIPT_DIR}/setup-linux.sh"; then
                log_error "Linux setup failed"
                exit 1
            fi
            ;;
        3) # Windows (via Git Bash or WSL)
            log_info "Detected platform: Windows"
            log_info "Launching PowerShell script for Windows setup"
            if command -v powershell >/dev/null 2>&1; then
                powershell -ExecutionPolicy Bypass -File "${SCRIPT_DIR}/setup-windows.ps1"
            elif command -v pwsh >/dev/null 2>&1; then
                pwsh -ExecutionPolicy Bypass -File "${SCRIPT_DIR}/setup-windows.ps1"
            else
                log_error "PowerShell not found. Please install PowerShell or run from WSL"
                exit 1
            fi
            ;;
        *)
            log_error "Unsupported platform detected"
            log_error "Supported platforms: macOS, Linux, Windows (with PowerShell)"
            exit 1
            ;;
    esac
    
    # Post-setup validation
    log_info "Running post-setup validation"
    if ! validate_complete_setup; then
        log_error "Setup validation failed"
        log_error "Check ${LOG_FILE} for detailed error information"
        exit 1
    fi
    
    # Success message
    log_success "MediMate Malaysia development environment setup completed successfully!"
    log_info "Next steps:"
    log_info "  1. Review the setup log: ${LOG_FILE}"
    log_info "  2. Start the development server: npm run dev"
    log_info "  3. Check the documentation: docs/setup-guide.md"
    
    if [[ "$INTERACTIVE" == "true" ]]; then
        echo
        read -p "Would you like to start the development server now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Starting development server..."
            cd "$PROJECT_ROOT" && npm run dev
        fi
    fi
}

# Load configuration from file or environment
load_configuration() {
    local config_file="${MEDIMATE_CONFIG_FILE:-${SCRIPT_DIR}/config/setup.config.json}"
    
    if [[ -f "$config_file" ]]; then
        log_debug "Loading configuration from: $config_file"
        # Configuration will be loaded by platform-specific scripts
    else
        log_debug "No configuration file found, using defaults"
    fi
    
    # Override with environment variables
    if [[ -n "${MEDIMATE_SKIP_PROMPTS:-}" ]]; then
        INTERACTIVE=false
        log_debug "Non-interactive mode enabled via environment variable"
    fi
}

# Cleanup on exit
cleanup() {
    local exit_code=$?
    
    if [[ $exit_code -ne 0 ]]; then
        log_error "Setup failed with exit code: $exit_code"
        log_error "Check the log file for details: $LOG_FILE"
        
        # Attempt rollback for critical failures
        if [[ -f "${PROJECT_ROOT}/.setup-progress" ]]; then
            log_info "Attempting rollback of partial installation..."
            rollback_installation
        fi
    fi
    
    # Clean up temporary files
    rm -f "${PROJECT_ROOT}/.setup-progress" 2>/dev/null || true
}

# Set trap for cleanup
trap cleanup EXIT

# Run main function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi