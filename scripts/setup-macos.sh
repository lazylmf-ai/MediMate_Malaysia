#!/bin/bash
#
# MediMate Malaysia - macOS Development Environment Setup
# Platform-specific setup for macOS (Darwin) systems
#

set -euo pipefail

# Ensure we have the common functions loaded
if [[ -z "${SCRIPT_DIR:-}" ]]; then
    readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "${SCRIPT_DIR}/lib/common.sh"
    source "${SCRIPT_DIR}/lib/validation.sh"
fi

# macOS-specific configuration
readonly HOMEBREW_INSTALL_URL="https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh"
readonly MIN_MACOS_VERSION="10.15"  # Catalina

# Check macOS version compatibility
check_macos_version() {
    log_info "Checking macOS compatibility..."
    
    local macos_version
    macos_version=$(sw_vers -productVersion 2>/dev/null || echo "unknown")
    
    if [[ "$macos_version" == "unknown" ]]; then
        log_error "Could not determine macOS version"
        return 1
    fi
    
    log_debug "Detected macOS version: $macos_version"
    
    if ! version_compare "$macos_version" ">=" "$MIN_MACOS_VERSION"; then
        log_error "macOS version $macos_version is below minimum supported version $MIN_MACOS_VERSION"
        log_error "Please upgrade macOS before continuing"
        return 1
    fi
    
    log_success "macOS $macos_version is supported"
    
    # Check for Apple Silicon vs Intel
    local arch
    arch=$(detect_architecture)
    log_info "Architecture: $arch"
    
    if [[ "$arch" == "arm64" ]]; then
        log_info "Apple Silicon Mac detected - will use arm64 optimized packages"
    else
        log_info "Intel Mac detected - will use x64 packages"
    fi
    
    return 0
}

# Install Xcode Command Line Tools
install_xcode_tools() {
    log_info "Checking Xcode Command Line Tools..."
    
    if xcode-select -p >/dev/null 2>&1; then
        log_success "Xcode Command Line Tools are already installed"
        return 0
    fi
    
    log_info "Installing Xcode Command Line Tools..."
    log_info "This may take several minutes and will open a system dialog"
    
    # Trigger installation dialog
    xcode-select --install 2>/dev/null || true
    
    # Wait for installation to complete
    log_info "Waiting for Xcode Command Line Tools installation to complete..."
    while ! xcode-select -p >/dev/null 2>&1; do
        sleep 5
        printf "."
    done
    echo
    
    log_success "Xcode Command Line Tools installed successfully"
    track_progress "xcode_tools_installed"
    
    return 0
}

# Install Homebrew package manager
install_homebrew() {
    log_info "Checking Homebrew installation..."
    
    if command_exists brew; then
        log_success "Homebrew is already installed"
        
        # Update Homebrew
        log_info "Updating Homebrew..."
        execute_command "brew update" "Updating Homebrew formulae"
        
        return 0
    fi
    
    log_info "Installing Homebrew package manager..."
    
    if ! download_file "$HOMEBREW_INSTALL_URL" "/tmp/install-homebrew.sh"; then
        log_error "Failed to download Homebrew installation script"
        return 1
    fi
    
    # Run Homebrew installation
    if execute_command 'bash /tmp/install-homebrew.sh' "Installing Homebrew"; then
        log_success "Homebrew installed successfully"
        track_progress "homebrew_installed"
    else
        log_error "Homebrew installation failed"
        return 1
    fi
    
    # Add Homebrew to PATH for current session
    if [[ -f "/opt/homebrew/bin/brew" ]]; then
        # Apple Silicon Mac
        export PATH="/opt/homebrew/bin:$PATH"
        log_debug "Added Apple Silicon Homebrew to PATH"
    elif [[ -f "/usr/local/bin/brew" ]]; then
        # Intel Mac
        export PATH="/usr/local/bin:$PATH"
        log_debug "Added Intel Homebrew to PATH"
    fi
    
    # Verify installation
    if ! command_exists brew; then
        log_error "Homebrew installation verification failed"
        return 1
    fi
    
    log_success "Homebrew is ready to use"
    
    # Clean up
    rm -f /tmp/install-homebrew.sh
    
    return 0
}

# Install Node.js using Homebrew
install_nodejs_macos() {
    local node_version="${1:-18}"
    
    log_info "Installing Node.js $node_version via Homebrew..."
    
    # Install Node.js
    if execute_command "brew install node@$node_version" "Installing Node.js $node_version"; then
        log_success "Node.js $node_version installed successfully"
        track_progress "node_installed"
    else
        log_error "Node.js installation failed"
        return 1
    fi
    
    # Link the installed version
    execute_command "brew link node@$node_version --force" "Linking Node.js $node_version" true
    
    # Update npm to latest version
    log_info "Updating npm to latest version..."
    execute_command "npm install -g npm@latest" "Updating npm"
    
    # Verify installation
    if ! validate_nodejs "18.0.0"; then
        log_error "Node.js installation verification failed"
        return 1
    fi
    
    return 0
}

# Install Python using Homebrew
install_python_macos() {
    local python_version="${1:-3.11}"
    
    log_info "Installing Python $python_version via Homebrew..."
    
    # Install Python
    if execute_command "brew install python@$python_version" "Installing Python $python_version"; then
        log_success "Python $python_version installed successfully"
        track_progress "python_installed"
    else
        log_error "Python installation failed"
        return 1
    fi
    
    # Verify installation
    if ! validate_python "3.8.0"; then
        log_error "Python installation verification failed"
        return 1
    fi
    
    return 0
}

# Install Docker Desktop for Mac
install_docker_macos() {
    if [[ "$SKIP_DOCKER" == "true" ]]; then
        log_info "Skipping Docker installation (--skip-docker flag used)"
        return 0
    fi
    
    log_info "Checking Docker Desktop installation..."
    
    if command_exists docker && docker info >/dev/null 2>&1; then
        log_success "Docker Desktop is already installed and running"
        return 0
    fi
    
    log_info "Installing Docker Desktop for Mac..."
    
    # Install via Homebrew Cask
    if execute_command "brew install --cask docker" "Installing Docker Desktop"; then
        log_success "Docker Desktop installed successfully"
        track_progress "docker_installed"
    else
        log_error "Docker Desktop installation failed"
        return 1
    fi
    
    log_info "Please start Docker Desktop manually from Applications folder"
    log_info "Docker Desktop needs to be running for the development environment"
    
    if [[ "$INTERACTIVE" == "true" ]]; then
        if prompt_yes_no "Open Docker Desktop now?"; then
            execute_command "open /Applications/Docker.app" "Opening Docker Desktop" true
            
            log_info "Waiting for Docker Desktop to start..."
            local retries=30
            while [[ $retries -gt 0 ]] && ! docker info >/dev/null 2>&1; do
                sleep 2
                ((retries--))
                printf "."
            done
            echo
            
            if docker info >/dev/null 2>&1; then
                log_success "Docker Desktop is now running"
            else
                log_warn "Docker Desktop may still be starting up"
                log_info "Please wait for Docker Desktop to complete startup before continuing"
            fi
        fi
    fi
    
    return 0
}

# Install Git (usually pre-installed, but ensure latest version)
install_git_macos() {
    log_info "Checking Git installation..."
    
    if validate_git "2.30.0"; then
        log_success "Git is already installed and up to date"
        return 0
    fi
    
    log_info "Installing/updating Git via Homebrew..."
    
    if execute_command "brew install git" "Installing Git"; then
        log_success "Git installed/updated successfully"
        track_progress "git_installed"
    else
        log_error "Git installation failed"
        return 1
    fi
    
    # Verify installation
    if ! validate_git "2.30.0"; then
        log_error "Git installation verification failed"
        return 1
    fi
    
    return 0
}

# Install additional development tools for macOS
install_dev_tools_macos() {
    log_info "Installing additional development tools..."
    
    # List of useful development tools
    local tools=(
        "curl"              # HTTP client
        "wget"              # File downloader
        "jq"                # JSON processor
        "tree"              # Directory tree viewer
        "htop"              # System monitor
        "grep"              # Text search (GNU version)
        "gnu-sed"           # Text processor (GNU version)
        "coreutils"         # GNU core utilities
    )
    
    for tool in "${tools[@]}"; do
        if ! command_exists "${tool}"; then
            log_info "Installing $tool..."
            execute_command "brew install $tool" "Installing $tool" true
        else
            log_debug "$tool is already installed"
        fi
    done
    
    # Install Visual Studio Code if not present
    if ! command_exists code; then
        log_info "Installing Visual Studio Code..."
        execute_command "brew install --cask visual-studio-code" "Installing VS Code" true
    fi
    
    log_success "Development tools installation completed"
    
    return 0
}

# Configure macOS-specific development environment
configure_macos_environment() {
    log_info "Configuring macOS development environment..."
    
    # Create development directories
    local dev_dirs=(
        "$HOME/Development"
        "$HOME/Development/Projects"
        "$HOME/Development/Tools"
    )
    
    for dir in "${dev_dirs[@]}"; do
        create_directory "$dir"
    done
    
    # Configure shell environment
    local shell_config=""
    if [[ "$SHELL" == */zsh ]]; then
        shell_config="$HOME/.zshrc"
    elif [[ "$SHELL" == */bash ]]; then
        shell_config="$HOME/.bash_profile"
    fi
    
    if [[ -n "$shell_config" ]]; then
        log_info "Configuring shell environment: $shell_config"
        
        # Add Homebrew to PATH if not already present
        if ! grep -q "homebrew" "$shell_config" 2>/dev/null; then
            echo "" >> "$shell_config"
            echo "# Added by MediMate Malaysia setup" >> "$shell_config"
            
            if [[ -d "/opt/homebrew" ]]; then
                echo 'export PATH="/opt/homebrew/bin:$PATH"' >> "$shell_config"
            else
                echo 'export PATH="/usr/local/bin:$PATH"' >> "$shell_config"
            fi
            
            log_debug "Added Homebrew to PATH in $shell_config"
        fi
        
        # Add npm global packages to PATH
        if ! grep -q "npm.*global" "$shell_config" 2>/dev/null; then
            echo 'export PATH="$PATH:$(npm config get prefix)/bin"' >> "$shell_config"
            log_debug "Added npm global packages to PATH"
        fi
    fi
    
    # Configure Git if not already configured
    if ! git config --global user.name >/dev/null 2>&1; then
        if [[ "$INTERACTIVE" == "true" ]]; then
            echo
            read -p "Enter your Git username: " git_username
            read -p "Enter your Git email: " git_email
            
            git config --global user.name "$git_username"
            git config --global user.email "$git_email"
            
            log_success "Git configuration completed"
        else
            log_info "Git user configuration skipped in non-interactive mode"
            log_info "Please configure Git manually: git config --global user.name 'Your Name'"
        fi
    fi
    
    log_success "macOS environment configuration completed"
    
    return 0
}

# Main macOS setup function
setup_macos() {
    log_info "Starting macOS-specific setup..."
    
    # Check system requirements
    if ! check_system_requirements; then
        log_error "System requirements not met"
        return 1
    fi
    
    # Check macOS version
    if ! check_macos_version; then
        log_error "macOS version compatibility check failed"
        return 1
    fi
    
    # Install Xcode Command Line Tools
    if ! install_xcode_tools; then
        log_error "Xcode Command Line Tools installation failed"
        return 1
    fi
    
    # Install Homebrew
    if ! install_homebrew; then
        log_error "Homebrew installation failed"
        return 1
    fi
    
    # Install Node.js
    if ! install_nodejs_macos; then
        log_error "Node.js installation failed"
        return 1
    fi
    
    # Install Python
    if ! install_python_macos; then
        log_error "Python installation failed"
        return 1
    fi
    
    # Install Git
    if ! install_git_macos; then
        log_error "Git installation failed"
        return 1
    fi
    
    # Install Docker
    if ! install_docker_macos; then
        log_error "Docker installation failed"
        return 1
    fi
    
    # Install additional tools
    if ! install_dev_tools_macos; then
        log_warn "Some development tools installation failed, but continuing..."
    fi
    
    # Configure environment
    if ! configure_macos_environment; then
        log_warn "Environment configuration had issues, but continuing..."
    fi
    
    log_success "macOS setup completed successfully!"
    
    return 0
}

# Run macOS setup if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    setup_macos
fi