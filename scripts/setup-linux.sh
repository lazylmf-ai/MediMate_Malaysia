#!/bin/bash
#
# MediMate Malaysia - Linux Development Environment Setup
# Platform-specific setup for Linux distributions
#

set -euo pipefail

# Ensure we have the common functions loaded
if [[ -z "${SCRIPT_DIR:-}" ]]; then
    readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "${SCRIPT_DIR}/lib/common.sh"
    source "${SCRIPT_DIR}/lib/validation.sh"
fi

# Linux distribution detection
DISTRO=""
PACKAGE_MANAGER=""
INSTALL_CMD=""
UPDATE_CMD=""

# Detect Linux distribution and package manager
detect_linux_distro() {
    log_info "Detecting Linux distribution..."
    
    if [[ -f /etc/os-release ]]; then
        source /etc/os-release
        DISTRO="$ID"
        log_debug "Detected distribution: $DISTRO ($PRETTY_NAME)"
    elif [[ -f /etc/redhat-release ]]; then
        DISTRO="rhel"
        log_debug "Detected Red Hat-based distribution"
    elif [[ -f /etc/debian_version ]]; then
        DISTRO="debian"
        log_debug "Detected Debian-based distribution"
    else
        DISTRO="unknown"
        log_warn "Could not detect Linux distribution"
    fi
    
    # Set package manager commands based on distribution
    case "$DISTRO" in
        ubuntu|debian)
            PACKAGE_MANAGER="apt"
            INSTALL_CMD="apt-get install -y"
            UPDATE_CMD="apt-get update"
            log_debug "Using APT package manager"
            ;;
        fedora|rhel|centos)
            if command_exists dnf; then
                PACKAGE_MANAGER="dnf"
                INSTALL_CMD="dnf install -y"
                UPDATE_CMD="dnf update"
            else
                PACKAGE_MANAGER="yum"
                INSTALL_CMD="yum install -y"
                UPDATE_CMD="yum update"
            fi
            log_debug "Using $PACKAGE_MANAGER package manager"
            ;;
        arch|manjaro)
            PACKAGE_MANAGER="pacman"
            INSTALL_CMD="pacman -S --noconfirm"
            UPDATE_CMD="pacman -Sy"
            log_debug "Using Pacman package manager"
            ;;
        opensuse*)
            PACKAGE_MANAGER="zypper"
            INSTALL_CMD="zypper install -y"
            UPDATE_CMD="zypper refresh"
            log_debug "Using Zypper package manager"
            ;;
        *)
            log_error "Unsupported Linux distribution: $DISTRO"
            return 1
            ;;
    esac
    
    log_success "Distribution: $DISTRO, Package Manager: $PACKAGE_MANAGER"
    return 0
}

# Check if running with sufficient privileges
check_privileges() {
    if [[ $EUID -eq 0 ]]; then
        log_warn "Running as root - this is not recommended for development setup"
        if [[ "$INTERACTIVE" == "true" ]] && ! prompt_yes_no "Continue as root?"; then
            log_error "Setup cancelled"
            return 1
        fi
    fi
    
    # Check if user can sudo
    if ! sudo -n true 2>/dev/null; then
        log_info "Some installation steps require sudo privileges"
        if ! sudo true; then
            log_error "Cannot obtain sudo privileges"
            return 1
        fi
    fi
    
    log_success "Sufficient privileges available"
    return 0
}

# Update package manager
update_package_manager() {
    log_info "Updating package manager..."
    
    if execute_command "sudo $UPDATE_CMD" "Updating package lists"; then
        log_success "Package manager updated"
    else
        log_error "Package manager update failed"
        return 1
    fi
    
    return 0
}

# Install system dependencies
install_system_dependencies() {
    log_info "Installing system dependencies..."
    
    local base_packages=""
    
    case "$PACKAGE_MANAGER" in
        apt)
            base_packages="build-essential curl wget git python3 python3-pip software-properties-common apt-transport-https ca-certificates gnupg lsb-release"
            ;;
        dnf|yum)
            base_packages="curl wget git python3 python3-pip gcc gcc-c++ make"
            ;;
        pacman)
            base_packages="base-devel curl wget git python python-pip"
            ;;
        zypper)
            base_packages="curl wget git python3 python3-pip gcc gcc-c++ make"
            ;;
    esac
    
    if execute_command "sudo $INSTALL_CMD $base_packages" "Installing base system packages"; then
        log_success "System dependencies installed"
        track_progress "system_dependencies_installed"
    else
        log_error "System dependencies installation failed"
        return 1
    fi
    
    return 0
}

# Install Node.js using NodeSource repository
install_nodejs_linux() {
    local node_version="${1:-18}"
    
    log_info "Installing Node.js $node_version..."
    
    case "$PACKAGE_MANAGER" in
        apt)
            # Add NodeSource repository
            log_info "Adding NodeSource repository..."
            if ! download_file "https://deb.nodesource.com/setup_${node_version}.x" "/tmp/nodesource_setup.sh"; then
                log_error "Failed to download NodeSource setup script"
                return 1
            fi
            
            execute_command "sudo bash /tmp/nodesource_setup.sh" "Adding NodeSource repository"
            execute_command "sudo $INSTALL_CMD nodejs" "Installing Node.js"
            ;;
        dnf|yum)
            # Add NodeSource repository
            log_info "Adding NodeSource repository..."
            execute_command "sudo $INSTALL_CMD curl" "Installing curl"
            execute_command "curl -fsSL https://rpm.nodesource.com/setup_${node_version}.x | sudo bash -" "Adding NodeSource repository"
            execute_command "sudo $INSTALL_CMD nodejs npm" "Installing Node.js"
            ;;
        pacman)
            execute_command "sudo $INSTALL_CMD nodejs npm" "Installing Node.js"
            ;;
        zypper)
            execute_command "sudo $INSTALL_CMD nodejs18 npm18" "Installing Node.js"
            ;;
    esac
    
    # Update npm to latest version
    log_info "Updating npm to latest version..."
    execute_command "sudo npm install -g npm@latest" "Updating npm"
    
    # Verify installation
    if ! validate_nodejs "18.0.0"; then
        log_error "Node.js installation verification failed"
        return 1
    fi
    
    log_success "Node.js installed successfully"
    track_progress "node_installed"
    
    # Clean up
    rm -f /tmp/nodesource_setup.sh
    
    return 0
}

# Install Python (usually pre-installed, but ensure pip is available)
install_python_linux() {
    log_info "Configuring Python environment..."
    
    # Ensure Python 3 is the default python command
    if ! command_exists python && command_exists python3; then
        case "$PACKAGE_MANAGER" in
            apt)
                execute_command "sudo $INSTALL_CMD python-is-python3" "Setting python3 as default python" true
                ;;
            dnf|yum)
                execute_command "sudo alternatives --install /usr/bin/python python /usr/bin/python3 1" "Setting python3 as default python" true
                ;;
        esac
    fi
    
    # Ensure pip is installed and up to date
    log_info "Updating pip..."
    execute_command "python3 -m pip install --user --upgrade pip" "Updating pip"
    
    # Verify installation
    if ! validate_python "3.8.0"; then
        log_error "Python installation verification failed"
        return 1
    fi
    
    log_success "Python environment configured"
    track_progress "python_configured"
    
    return 0
}

# Install Docker Engine
install_docker_linux() {
    if [[ "$SKIP_DOCKER" == "true" ]]; then
        log_info "Skipping Docker installation (--skip-docker flag used)"
        return 0
    fi
    
    log_info "Installing Docker Engine..."
    
    case "$PACKAGE_MANAGER" in
        apt)
            # Remove old versions
            execute_command "sudo apt-get remove -y docker docker-engine docker.io containerd runc" "Removing old Docker versions" true
            
            # Add Docker's official GPG key
            execute_command "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg" "Adding Docker GPG key"
            
            # Add Docker repository
            local release
            release=$(lsb_release -cs)
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $release stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            execute_command "sudo $UPDATE_CMD" "Updating package lists"
            execute_command "sudo $INSTALL_CMD docker-ce docker-ce-cli containerd.io docker-compose-plugin" "Installing Docker Engine"
            ;;
        dnf|yum)
            execute_command "sudo $INSTALL_CMD yum-utils" "Installing yum-utils"
            execute_command "sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo" "Adding Docker repository"
            execute_command "sudo $INSTALL_CMD docker-ce docker-ce-cli containerd.io docker-compose-plugin" "Installing Docker Engine"
            ;;
        pacman)
            execute_command "sudo $INSTALL_CMD docker docker-compose" "Installing Docker"
            ;;
        zypper)
            execute_command "sudo $INSTALL_CMD docker docker-compose" "Installing Docker"
            ;;
    esac
    
    # Start and enable Docker service
    execute_command "sudo systemctl start docker" "Starting Docker service"
    execute_command "sudo systemctl enable docker" "Enabling Docker service"
    
    # Add current user to docker group
    execute_command "sudo usermod -aG docker $USER" "Adding user to docker group"
    
    log_success "Docker Engine installed successfully"
    log_info "Note: You may need to log out and back in for docker group membership to take effect"
    track_progress "docker_installed"
    
    return 0
}

# Install Git (update to latest version)
install_git_linux() {
    log_info "Checking Git installation..."
    
    case "$PACKAGE_MANAGER" in
        apt)
            # Add Git PPA for latest version
            execute_command "sudo add-apt-repository ppa:git-core/ppa -y" "Adding Git PPA" true
            execute_command "sudo $UPDATE_CMD" "Updating package lists" true
            execute_command "sudo $INSTALL_CMD git" "Installing/updating Git"
            ;;
        dnf|yum|pacman|zypper)
            execute_command "sudo $INSTALL_CMD git" "Installing/updating Git"
            ;;
    esac
    
    # Verify installation
    if ! validate_git "2.30.0"; then
        log_error "Git installation verification failed"
        return 1
    fi
    
    log_success "Git installed successfully"
    track_progress "git_installed"
    
    return 0
}

# Install additional development tools
install_dev_tools_linux() {
    log_info "Installing additional development tools..."
    
    local tools=""
    
    case "$PACKAGE_MANAGER" in
        apt)
            tools="jq tree htop unzip zip nano vim"
            ;;
        dnf|yum)
            tools="jq tree htop unzip zip nano vim"
            ;;
        pacman)
            tools="jq tree htop unzip zip nano vim"
            ;;
        zypper)
            tools="jq tree htop unzip zip nano vim"
            ;;
    esac
    
    execute_command "sudo $INSTALL_CMD $tools" "Installing development tools" true
    
    log_success "Development tools installation completed"
    
    return 0
}

# Configure Linux-specific development environment
configure_linux_environment() {
    log_info "Configuring Linux development environment..."
    
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
    if [[ "$SHELL" == */bash ]]; then
        shell_config="$HOME/.bashrc"
    elif [[ "$SHELL" == */zsh ]]; then
        shell_config="$HOME/.zshrc"
    else
        shell_config="$HOME/.profile"
    fi
    
    if [[ -n "$shell_config" ]] && [[ -f "$shell_config" ]]; then
        log_info "Configuring shell environment: $shell_config"
        
        # Add npm global packages to PATH
        if ! grep -q "npm.*global" "$shell_config" 2>/dev/null; then
            echo "" >> "$shell_config"
            echo "# Added by MediMate Malaysia setup" >> "$shell_config"
            echo 'export PATH="$PATH:$(npm config get prefix)/bin"' >> "$shell_config"
            log_debug "Added npm global packages to PATH"
        fi
        
        # Add user bin directory to PATH
        if ! grep -q "\$HOME/.local/bin" "$shell_config" 2>/dev/null; then
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$shell_config"
            log_debug "Added user bin directory to PATH"
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
    
    log_success "Linux environment configuration completed"
    
    return 0
}

# Main Linux setup function
setup_linux() {
    log_info "Starting Linux-specific setup..."
    
    # Detect distribution
    if ! detect_linux_distro; then
        log_error "Linux distribution detection failed"
        return 1
    fi
    
    # Check privileges
    if ! check_privileges; then
        log_error "Insufficient privileges"
        return 1
    fi
    
    # Check system requirements
    if ! check_system_requirements; then
        log_error "System requirements not met"
        return 1
    fi
    
    # Update package manager
    if ! update_package_manager; then
        log_error "Package manager update failed"
        return 1
    fi
    
    # Install system dependencies
    if ! install_system_dependencies; then
        log_error "System dependencies installation failed"
        return 1
    fi
    
    # Install Node.js
    if ! install_nodejs_linux; then
        log_error "Node.js installation failed"
        return 1
    fi
    
    # Configure Python
    if ! install_python_linux; then
        log_error "Python configuration failed"
        return 1
    fi
    
    # Install Git
    if ! install_git_linux; then
        log_error "Git installation failed"
        return 1
    fi
    
    # Install Docker
    if ! install_docker_linux; then
        log_error "Docker installation failed"
        return 1
    fi
    
    # Install additional tools
    if ! install_dev_tools_linux; then
        log_warn "Some development tools installation failed, but continuing..."
    fi
    
    # Configure environment
    if ! configure_linux_environment; then
        log_warn "Environment configuration had issues, but continuing..."
    fi
    
    log_success "Linux setup completed successfully!"
    
    return 0
}

# Run Linux setup if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    setup_linux
fi