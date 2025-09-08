#!/bin/bash
#
# MediMate Malaysia - Ubuntu/Debian Specific Setup
# Distribution-specific optimizations and configurations for Ubuntu and Debian systems
#

set -euo pipefail

# Source common libraries
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"
source "${SCRIPT_DIR}/../lib/validation.sh"
source "${SCRIPT_DIR}/../lib/package-managers.sh"

# Ubuntu/Debian specific configuration
readonly UBUNTU_MIN_VERSION="20.04"
readonly DEBIAN_MIN_VERSION="10"

# Detect Ubuntu/Debian version
detect_ubuntu_version() {
    log_info "Detecting Ubuntu/Debian version..."
    
    if [[ -f /etc/os-release ]]; then
        source /etc/os-release
        
        if [[ "$ID" == "ubuntu" ]]; then
            echo "$VERSION_ID"
        elif [[ "$ID" == "debian" ]]; then
            echo "$VERSION_ID"  
        else
            echo "unknown"
        fi
    else
        echo "unknown"
    fi
}

# Check version compatibility
check_ubuntu_compatibility() {
    local version
    version=$(detect_ubuntu_version)
    
    if [[ "$version" == "unknown" ]]; then
        log_error "Could not detect Ubuntu/Debian version"
        return 1
    fi
    
    log_info "Detected version: $version"
    
    # Version comparison (basic for now)
    if version_compare "$version" ">=" "$UBUNTU_MIN_VERSION"; then
        log_success "Ubuntu/Debian version $version is supported"
        return 0
    else
        log_error "Ubuntu/Debian version $version is below minimum supported version"
        return 1
    fi
}

# Configure APT repositories for healthcare development
configure_apt_repositories() {
    log_info "Configuring APT repositories for healthcare development..."
    
    # Update package lists
    execute_command "sudo apt-get update" "Updating package lists"
    
    # Install required packages for repository management
    local repo_packages=(
        "software-properties-common"
        "apt-transport-https"
        "ca-certificates"
        "gnupg"
        "lsb-release"
        "curl"
        "wget"
    )
    
    if install_packages "${repo_packages[@]}"; then
        log_success "Repository management packages installed"
    else
        log_error "Failed to install repository management packages"
        return 1
    fi
    
    # Add NodeSource repository for latest Node.js
    log_info "Adding NodeSource repository..."
    if ! curl -fsSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | sudo apt-key add -; then
        log_warn "Failed to add NodeSource GPG key"
    fi
    
    # Add Docker repository
    log_info "Adding Docker repository..."
    if curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg 2>/dev/null; then
        local ubuntu_codename
        ubuntu_codename=$(lsb_release -cs)
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $ubuntu_codename stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        log_success "Docker repository added"
    else
        log_warn "Failed to add Docker repository"
    fi
    
    # Update package lists after adding repositories
    execute_command "sudo apt-get update" "Updating package lists with new repositories"
    
    return 0
}

# Install healthcare-specific dependencies
install_ubuntu_healthcare_deps() {
    log_info "Installing healthcare-specific dependencies for Ubuntu/Debian..."
    
    # Core development packages
    local dev_packages=(
        "build-essential"
        "pkg-config"
        "libssl-dev"
        "libffi-dev"
        "libxml2-dev"
        "libxslt1-dev"
        "zlib1g-dev"
        "libjpeg-dev"
        "libpng-dev"
        "libfreetype6-dev"
        "python3-dev"
        "python3-pip"
        "python3-venv"
    )
    
    # Healthcare and data processing specific
    local healthcare_packages=(
        "libpq-dev"          # PostgreSQL development headers
        "libmysqlclient-dev" # MySQL development headers
        "libsqlite3-dev"     # SQLite development headers
        "redis-tools"        # Redis CLI tools
        "imagemagick"        # Image processing
        "pandoc"             # Document conversion
        "wkhtmltopdf"        # HTML to PDF conversion
        "ghostscript"        # PDF processing
    )
    
    # Security and compliance tools
    local security_packages=(
        "gnupg2"
        "openssl"
        "ca-certificates-java"
        "libssl-dev"
        "fail2ban"
        "ufw"
    )
    
    log_info "Installing core development packages..."
    if ! install_packages "${dev_packages[@]}"; then
        log_error "Failed to install core development packages"
        return 1
    fi
    
    log_info "Installing healthcare-specific packages..."
    if ! install_packages "${healthcare_packages[@]}"; then
        log_warn "Some healthcare packages failed to install, continuing..."
    fi
    
    log_info "Installing security packages..."
    if ! install_packages "${security_packages[@]}"; then
        log_warn "Some security packages failed to install, continuing..."
    fi
    
    log_success "Ubuntu/Debian healthcare dependencies installed"
    return 0
}

# Configure Ubuntu-specific optimizations for healthcare workloads
configure_ubuntu_optimizations() {
    log_info "Configuring Ubuntu optimizations for healthcare workloads..."
    
    # Configure timezone for Malaysian healthcare
    log_info "Setting Malaysian timezone..."
    execute_command "sudo timedatectl set-timezone Asia/Kuala_Lumpur" "Setting timezone to Asia/Kuala_Lumpur"
    
    # Configure locale for Malaysian standards
    log_info "Configuring locale..."
    execute_command "sudo locale-gen en_US.UTF-8" "Generating en_US.UTF-8 locale" true
    execute_command "sudo update-locale LANG=en_US.UTF-8" "Setting default locale" true
    
    # Configure system limits for healthcare applications
    log_info "Configuring system limits for healthcare workloads..."
    sudo tee /etc/security/limits.d/99-healthcare.conf > /dev/null << 'EOF'
# Limits for healthcare application processes
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF
    
    # Configure sysctl for better performance
    log_info "Configuring kernel parameters..."
    sudo tee /etc/sysctl.d/99-healthcare.conf > /dev/null << 'EOF'
# Network optimizations for healthcare applications
net.core.somaxconn = 65536
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 3

# Memory optimizations for data processing
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF
    
    execute_command "sudo sysctl -p /etc/sysctl.d/99-healthcare.conf" "Applying kernel parameter changes" true
    
    # Configure firewall for development
    log_info "Configuring UFW firewall for development..."
    execute_command "sudo ufw --force reset" "Resetting firewall rules" true
    execute_command "sudo ufw default deny incoming" "Setting default deny incoming" true
    execute_command "sudo ufw default allow outgoing" "Setting default allow outgoing" true
    
    # Allow common development ports
    execute_command "sudo ufw allow 22/tcp comment 'SSH'" "Allowing SSH" true
    execute_command "sudo ufw allow 3000:3010/tcp comment 'Development servers'" "Allowing development server ports" true
    execute_command "sudo ufw allow 8000:8010/tcp comment 'Backend servers'" "Allowing backend server ports" true
    execute_command "sudo ufw allow 5432/tcp comment 'PostgreSQL'" "Allowing PostgreSQL" true
    execute_command "sudo ufw allow 6379/tcp comment 'Redis'" "Allowing Redis" true
    
    execute_command "sudo ufw --force enable" "Enabling firewall" true
    
    log_success "Ubuntu optimizations configured for healthcare workloads"
    return 0
}

# Install Node.js via NodeSource (Ubuntu-optimized)
install_nodejs_ubuntu() {
    local node_version="${1:-18}"
    
    log_info "Installing Node.js $node_version via NodeSource..."
    
    # Add NodeSource repository
    curl -fsSL "https://deb.nodesource.com/setup_${node_version}.x" | sudo -E bash -
    
    # Install Node.js
    if execute_command "sudo apt-get install -y nodejs" "Installing Node.js"; then
        # Verify and display versions
        local node_ver npm_ver
        node_ver=$(node --version)
        npm_ver=$(npm --version)
        
        log_success "Node.js $node_ver installed"
        log_success "npm $npm_ver installed"
        
        # Global npm packages directory setup
        log_info "Configuring npm global directory..."
        npm config set prefix "$HOME/.local"
        
        # Update npm to latest
        execute_command "npm install -g npm@latest" "Updating npm to latest version"
        
        return 0
    else
        log_error "Node.js installation failed"
        return 1
    fi
}

# Install Docker Engine (Ubuntu-optimized)
install_docker_ubuntu() {
    if [[ "${SKIP_DOCKER:-false}" == "true" ]]; then
        log_info "Skipping Docker installation"
        return 0
    fi
    
    log_info "Installing Docker Engine for Ubuntu..."
    
    # Remove old versions
    execute_command "sudo apt-get remove -y docker docker-engine docker.io containerd runc" "Removing old Docker versions" true
    
    # Install Docker Engine
    if execute_command "sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin" "Installing Docker Engine"; then
        # Start and enable Docker
        execute_command "sudo systemctl start docker" "Starting Docker service"
        execute_command "sudo systemctl enable docker" "Enabling Docker service"
        
        # Add user to docker group
        execute_command "sudo usermod -aG docker $USER" "Adding user to docker group"
        
        # Install Docker Compose (standalone for compatibility)
        log_info "Installing Docker Compose..."
        local compose_version
        compose_version=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
        
        if [[ -n "$compose_version" ]]; then
            execute_command "sudo curl -L \"https://github.com/docker/compose/releases/download/$compose_version/docker-compose-$(uname -s)-$(uname -m)\" -o /usr/local/bin/docker-compose" "Downloading Docker Compose"
            execute_command "sudo chmod +x /usr/local/bin/docker-compose" "Making Docker Compose executable"
        fi
        
        log_success "Docker Engine installed successfully"
        log_info "Note: Log out and back in for docker group membership to take effect"
        
        return 0
    else
        log_error "Docker installation failed"
        return 1
    fi
}

# Main Ubuntu setup function
setup_ubuntu() {
    log_info "Starting Ubuntu/Debian-specific setup..."
    
    # Check compatibility
    if ! check_ubuntu_compatibility; then
        log_error "Ubuntu/Debian compatibility check failed"
        return 1
    fi
    
    # Configure repositories
    if ! configure_apt_repositories; then
        log_error "Repository configuration failed"
        return 1
    fi
    
    # Install healthcare dependencies
    if ! install_ubuntu_healthcare_deps; then
        log_error "Healthcare dependencies installation failed"
        return 1
    fi
    
    # Install Node.js
    if ! install_nodejs_ubuntu; then
        log_error "Node.js installation failed"
        return 1
    fi
    
    # Install Docker
    if ! install_docker_ubuntu; then
        log_error "Docker installation failed"
        return 1
    fi
    
    # Configure optimizations
    if ! configure_ubuntu_optimizations; then
        log_warn "Some optimizations failed, but continuing..."
    fi
    
    log_success "Ubuntu/Debian setup completed successfully!"
    log_info "Please log out and back in for group changes to take effect"
    
    return 0
}

# Run Ubuntu setup if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    setup_ubuntu "$@"
fi