#!/bin/bash
#
# Validation functions for MediMate Malaysia setup
# Handles prerequisite checking and dependency validation
#

# Version comparison helper
version_compare() {
    local version1="$1"
    local operator="$2"
    local version2="$3"
    
    # Remove 'v' prefix if present
    version1="${version1#v}"
    version2="${version2#v}"
    
    # Use sort -V for version comparison if available
    if command -v sort >/dev/null 2>&1 && sort --version-sort </dev/null >/dev/null 2>&1; then
        case "$operator" in
            ">=")
                [[ "$(printf '%s\n%s' "$version1" "$version2" | sort -V | head -n1)" == "$version2" ]]
                ;;
            ">")
                [[ "$version1" != "$version2" ]] && version_compare "$version1" ">=" "$version2"
                ;;
            "<=")
                [[ "$(printf '%s\n%s' "$version1" "$version2" | sort -V | tail -n1)" == "$version2" ]]
                ;;
            "<")
                [[ "$version1" != "$version2" ]] && version_compare "$version1" "<=" "$version2"
                ;;
            "==")
                [[ "$version1" == "$version2" ]]
                ;;
            *)
                log_error "Invalid version comparison operator: $operator"
                return 1
                ;;
        esac
    else
        # Fallback to basic comparison (less reliable)
        case "$operator" in
            ">="|">")
                [[ "$version1" > "$version2" ]] || [[ "$version1" == "$version2" && "$operator" == ">=" ]]
                ;;
            "<="|"<")
                [[ "$version1" < "$version2" ]] || [[ "$version1" == "$version2" && "$operator" == "<=" ]]
                ;;
            "==")
                [[ "$version1" == "$version2" ]]
                ;;
            *)
                log_error "Invalid version comparison operator: $operator"
                return 1
                ;;
        esac
    fi
}

# Extract version number from command output
extract_version() {
    local cmd="$1"
    local pattern="${2:-}"
    
    local output
    if ! output=$(eval "$cmd" 2>/dev/null); then
        echo ""
        return 1
    fi
    
    if [[ -n "$pattern" ]]; then
        echo "$output" | grep -oE "$pattern" | head -1
    else
        # Default patterns for common version formats
        echo "$output" | grep -oE 'v?[0-9]+\.[0-9]+\.[0-9]+([.-][0-9a-zA-Z]+)?' | head -1
    fi
}

# Validate Node.js installation and version
validate_nodejs() {
    local min_version="${1:-18.0.0}"
    
    log_info "Validating Node.js installation..."
    
    if ! command_exists node; then
        log_error "Node.js is not installed"
        return 1
    fi
    
    local node_version
    node_version=$(extract_version "node --version")
    
    if [[ -z "$node_version" ]]; then
        log_error "Could not determine Node.js version"
        return 1
    fi
    
    log_debug "Found Node.js version: $node_version"
    
    if ! version_compare "$node_version" ">=" "$min_version"; then
        log_error "Node.js version $node_version is below minimum required version $min_version"
        return 1
    fi
    
    log_success "Node.js $node_version is installed and meets requirements"
    
    # Validate npm
    if ! command_exists npm; then
        log_error "npm is not installed"
        return 1
    fi
    
    local npm_version
    npm_version=$(extract_version "npm --version")
    log_debug "Found npm version: $npm_version"
    log_success "npm $npm_version is available"
    
    return 0
}

# Validate Docker installation
validate_docker() {
    local skip_docker="$1"
    
    if [[ "$skip_docker" == "true" ]]; then
        log_info "Skipping Docker validation (--skip-docker flag used)"
        return 0
    fi
    
    log_info "Validating Docker installation..."
    
    if ! command_exists docker; then
        log_error "Docker is not installed"
        log_error "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
        return 1
    fi
    
    local docker_version
    docker_version=$(extract_version "docker --version")
    
    if [[ -z "$docker_version" ]]; then
        log_error "Could not determine Docker version"
        return 1
    fi
    
    log_debug "Found Docker version: $docker_version"
    log_success "Docker $docker_version is installed"
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        log_warn "Docker daemon is not running"
        log_info "Please start Docker Desktop and try again"
        
        if prompt_yes_no "Continue without Docker validation?"; then
            log_warn "Continuing without Docker validation"
            return 0
        else
            return 1
        fi
    fi
    
    log_success "Docker daemon is running"
    
    # Validate Docker Compose
    local compose_cmd=""
    if command_exists docker-compose; then
        compose_cmd="docker-compose"
    elif docker compose version >/dev/null 2>&1; then
        compose_cmd="docker compose"
    else
        log_error "Docker Compose is not available"
        log_error "Please ensure Docker Desktop is properly installed"
        return 1
    fi
    
    local compose_version
    compose_version=$(extract_version "$compose_cmd version")
    log_success "Docker Compose $compose_version is available"
    
    return 0
}

# Validate Git installation
validate_git() {
    local min_version="${1:-2.30.0}"
    
    log_info "Validating Git installation..."
    
    if ! command_exists git; then
        log_error "Git is not installed"
        return 1
    fi
    
    local git_version
    git_version=$(extract_version "git --version")
    
    if [[ -z "$git_version" ]]; then
        log_error "Could not determine Git version"
        return 1
    fi
    
    log_debug "Found Git version: $git_version"
    
    if ! version_compare "$git_version" ">=" "$min_version"; then
        log_warn "Git version $git_version is below recommended version $min_version"
        log_warn "Some features may not work correctly"
    else
        log_success "Git $git_version meets requirements"
    fi
    
    return 0
}

# Validate Python installation
validate_python() {
    local min_version="${1:-3.8.0}"
    
    log_info "Validating Python installation..."
    
    local python_cmd=""
    if command_exists python3; then
        python_cmd="python3"
    elif command_exists python; then
        python_cmd="python"
    else
        log_error "Python is not installed"
        return 1
    fi
    
    local python_version
    python_version=$(extract_version "$python_cmd --version")
    
    if [[ -z "$python_version" ]]; then
        log_error "Could not determine Python version"
        return 1
    fi
    
    log_debug "Found Python version: $python_version"
    
    if ! version_compare "$python_version" ">=" "$min_version"; then
        log_error "Python version $python_version is below minimum required version $min_version"
        return 1
    fi
    
    log_success "Python $python_version meets requirements"
    
    # Validate pip
    local pip_cmd=""
    if command_exists pip3; then
        pip_cmd="pip3"
    elif command_exists pip; then
        pip_cmd="pip"
    else
        log_error "pip is not installed"
        return 1
    fi
    
    local pip_version
    pip_version=$(extract_version "$pip_cmd --version")
    log_debug "Found pip version: $pip_version"
    log_success "pip is available"
    
    return 0
}

# Validate package managers based on platform
validate_package_managers() {
    local platform="$1"
    
    log_info "Validating package managers for platform: $platform"
    
    case "$platform" in
        "macos")
            if command_exists brew; then
                local brew_version
                brew_version=$(extract_version "brew --version")
                log_success "Homebrew $brew_version is installed"
            else
                log_warn "Homebrew is not installed"
                log_info "Homebrew will be installed automatically if needed"
            fi
            ;;
        "linux")
            if command_exists apt-get; then
                log_success "APT package manager is available"
            elif command_exists yum; then
                log_success "YUM package manager is available"
            elif command_exists pacman; then
                log_success "Pacman package manager is available"
            elif command_exists zypper; then
                log_success "Zypper package manager is available"
            else
                log_warn "No recognized package manager found"
                log_warn "Manual installation may be required"
            fi
            ;;
        "windows")
            if command_exists choco; then
                local choco_version
                choco_version=$(extract_version "choco --version")
                log_success "Chocolatey $choco_version is installed"
            else
                log_warn "Chocolatey is not installed"
                log_info "Chocolatey will be installed automatically if needed"
            fi
            
            if command_exists winget; then
                log_success "Windows Package Manager (winget) is available"
            fi
            ;;
        *)
            log_warn "Unknown platform for package manager validation: $platform"
            ;;
    esac
    
    return 0
}

# Validate development tools
validate_dev_tools() {
    log_info "Validating development tools..."
    
    local tools_status=0
    
    # Check for code editors (optional)
    if command_exists code; then
        log_success "Visual Studio Code is available"
    elif command_exists vim; then
        log_info "Vim is available as text editor"
    elif command_exists nano; then
        log_info "Nano is available as text editor"
    else
        log_warn "No code editor detected"
    fi
    
    # Check for curl or wget (required for downloads)
    if command_exists curl; then
        log_success "curl is available for downloads"
    elif command_exists wget; then
        log_success "wget is available for downloads"
    else
        log_error "Neither curl nor wget is available"
        tools_status=1
    fi
    
    # Check for unzip (often needed)
    if command_exists unzip; then
        log_success "unzip utility is available"
    else
        log_warn "unzip utility not found (may be needed for some installations)"
    fi
    
    return $tools_status
}

# Validate network connectivity
validate_network() {
    log_info "Validating network connectivity..."
    
    local test_urls=(
        "https://registry.npmjs.org"
        "https://github.com"
        "https://docker.com"
    )
    
    for url in "${test_urls[@]}"; do
        log_debug "Testing connectivity to: $url"
        
        if command_exists curl; then
            if curl -s --max-time 10 --head "$url" >/dev/null 2>&1; then
                log_debug "✓ $url is reachable"
            else
                log_warn "✗ $url is not reachable"
            fi
        elif command_exists wget; then
            if wget -q --timeout=10 --spider "$url" >/dev/null 2>&1; then
                log_debug "✓ $url is reachable"
            else
                log_warn "✗ $url is not reachable"
            fi
        else
            log_warn "Cannot test network connectivity (no curl or wget)"
            break
        fi
    done
    
    return 0
}

# Validate complete setup
validate_complete_setup() {
    log_info "Running complete setup validation..."
    
    local validation_status=0
    
    # Core prerequisites
    if ! validate_nodejs "18.0.0"; then
        validation_status=1
    fi
    
    if ! validate_git "2.30.0"; then
        validation_status=1
    fi
    
    if ! validate_python "3.8.0"; then
        validation_status=1
    fi
    
    if ! validate_docker "$SKIP_DOCKER"; then
        validation_status=1
    fi
    
    if ! validate_dev_tools; then
        validation_status=1
    fi
    
    # Platform-specific validation
    detect_platform
    local platform_code=$?
    local platform_name=""
    
    case $platform_code in
        1) platform_name="macos" ;;
        2) platform_name="linux" ;;
        3) platform_name="windows" ;;
    esac
    
    if ! validate_package_managers "$platform_name"; then
        validation_status=1
    fi
    
    # Optional validations (warnings only)
    validate_network
    
    # Check project structure
    if [[ ! -f "${PROJECT_ROOT}/package.json" ]]; then
        log_warn "package.json not found - this may be expected for initial setup"
    fi
    
    if [[ ! -d "${PROJECT_ROOT}/node_modules" ]]; then
        log_info "node_modules not found - run 'npm install' to install dependencies"
    fi
    
    if [[ $validation_status -eq 0 ]]; then
        log_success "All critical validations passed"
    else
        log_error "Some validations failed - check the errors above"
    fi
    
    return $validation_status
}

# Validate specific dependency with custom requirements
validate_custom_dependency() {
    local name="$1"
    local command="$2"
    local min_version="$3"
    local install_help="$4"
    
    log_info "Validating $name..."
    
    if ! command_exists "$command"; then
        log_error "$name is not installed"
        [[ -n "$install_help" ]] && log_info "$install_help"
        return 1
    fi
    
    if [[ -n "$min_version" ]]; then
        local version
        version=$(extract_version "$command --version" 2>/dev/null || extract_version "$command -v" 2>/dev/null)
        
        if [[ -n "$version" ]] && ! version_compare "$version" ">=" "$min_version"; then
            log_error "$name version $version is below minimum required version $min_version"
            [[ -n "$install_help" ]] && log_info "$install_help"
            return 1
        fi
        
        log_success "$name $version meets requirements"
    else
        log_success "$name is installed"
    fi
    
    return 0
}

# Generate validation report
generate_validation_report() {
    local output_file="${1:-validation-report.txt}"
    
    log_info "Generating validation report: $output_file"
    
    {
        echo "=== MediMate Malaysia Setup Validation Report ==="
        echo "Generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
        echo "Platform: $(uname -s) $(uname -r)"
        echo "Architecture: $(detect_architecture)"
        echo
        
        echo "=== System Requirements ==="
        echo "Memory: $(get_system_memory_gb)GB"
        if command_exists df; then
            echo "Disk Space: $(df -BG . | tail -1 | awk '{print $4}') available"
        fi
        echo
        
        echo "=== Core Dependencies ==="
        if command_exists node; then
            echo "Node.js: $(extract_version 'node --version')"
        else
            echo "Node.js: NOT INSTALLED"
        fi
        
        if command_exists npm; then
            echo "npm: $(extract_version 'npm --version')"
        else
            echo "npm: NOT INSTALLED"
        fi
        
        if command_exists git; then
            echo "Git: $(extract_version 'git --version')"
        else
            echo "Git: NOT INSTALLED"
        fi
        
        if command_exists python3 || command_exists python; then
            local python_cmd=""
            [[ -n "$(command -v python3)" ]] && python_cmd="python3" || python_cmd="python"
            echo "Python: $(extract_version '$python_cmd --version')"
        else
            echo "Python: NOT INSTALLED"
        fi
        
        if command_exists docker; then
            echo "Docker: $(extract_version 'docker --version')"
            if docker info >/dev/null 2>&1; then
                echo "Docker Daemon: RUNNING"
            else
                echo "Docker Daemon: NOT RUNNING"
            fi
        else
            echo "Docker: NOT INSTALLED"
        fi
        
        echo
        echo "=== Package Managers ==="
        command_exists brew && echo "Homebrew: $(extract_version 'brew --version')" || echo "Homebrew: NOT INSTALLED"
        command_exists choco && echo "Chocolatey: $(extract_version 'choco --version')" || echo "Chocolatey: NOT INSTALLED"
        command_exists apt-get && echo "APT: AVAILABLE" || echo "APT: NOT AVAILABLE"
        
        echo
        echo "=== Development Tools ==="
        command_exists code && echo "VS Code: AVAILABLE" || echo "VS Code: NOT AVAILABLE"
        command_exists curl && echo "curl: AVAILABLE" || echo "curl: NOT AVAILABLE"
        command_exists wget && echo "wget: AVAILABLE" || echo "wget: NOT AVAILABLE"
        command_exists unzip && echo "unzip: AVAILABLE" || echo "unzip: NOT AVAILABLE"
        
        echo
        echo "Report generated by MediMate Malaysia setup validation"
        
    } > "$output_file"
    
    log_success "Validation report saved to: $output_file"
}