#!/bin/bash
#
# MediMate Malaysia - CentOS/RHEL Specific Setup
# Distribution-specific optimizations and configurations for CentOS and RHEL systems
#

set -euo pipefail

# Source common libraries
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"
source "${SCRIPT_DIR}/../lib/validation.sh"
source "${SCRIPT_DIR}/../lib/package-managers.sh"

# CentOS/RHEL specific configuration
readonly CENTOS_MIN_VERSION="8"
readonly RHEL_MIN_VERSION="8"

# Detect CentOS/RHEL version
detect_centos_version() {
    log_info "Detecting CentOS/RHEL version..."
    
    if [[ -f /etc/os-release ]]; then
        source /etc/os-release
        
        if [[ "$ID" == "centos" ]] || [[ "$ID" == "rhel" ]] || [[ "$ID" == "rocky" ]] || [[ "$ID" == "almalinux" ]]; then
            echo "$VERSION_ID"
        else
            echo "unknown"
        fi
    else
        echo "unknown"
    fi
}

# Check version compatibility
check_centos_compatibility() {
    local version
    version=$(detect_centos_version)
    
    if [[ "$version" == "unknown" ]]; then
        log_error "Could not detect CentOS/RHEL version"
        return 1
    fi
    
    log_info "Detected version: $version"
    
    # Version comparison (basic for now)
    if version_compare "$version" ">=" "$CENTOS_MIN_VERSION"; then
        log_success "CentOS/RHEL version $version is supported"
        return 0
    else
        log_error "CentOS/RHEL version $version is below minimum supported version"
        return 1
    fi
}

# Configure package managers and repositories
configure_centos_repositories() {
    log_info "Configuring package managers and repositories for CentOS/RHEL..."
    
    # Determine package manager
    local pkg_manager="yum"
    if command_exists dnf; then
        pkg_manager="dnf"
    fi
    
    log_info "Using package manager: $pkg_manager"
    
    # Enable EPEL repository
    log_info "Enabling EPEL repository..."
    if execute_command "sudo $pkg_manager install -y epel-release" "Installing EPEL repository"; then
        log_success "EPEL repository enabled"
    else
        log_warn "EPEL installation failed, some packages may not be available"
    fi
    
    # Enable PowerTools/CRB repository (CentOS 8+)
    local version
    version=$(detect_centos_version)
    if [[ "$version" =~ ^[89] ]]; then
        log_info "Enabling PowerTools/CodeReady Builder repository..."
        if [[ "$pkg_manager" == "dnf" ]]; then
            execute_command "sudo dnf config-manager --set-enabled powertools" "Enabling PowerTools repository" true ||
            execute_command "sudo dnf config-manager --set-enabled crb" "Enabling CodeReady Builder repository" true
        else
            execute_command "sudo yum-config-manager --enable PowerTools" "Enabling PowerTools repository" true
        fi
    fi
    
    # Add NodeSource repository
    log_info "Adding NodeSource repository..."
    execute_command "sudo $pkg_manager install -y curl" "Installing curl"
    
    # Install NodeSource repository key and setup
    if curl -fsSL https://rpm.nodesource.com/pub/el/NODESOURCE-GPG-SIGNING-KEY-EL | sudo tee /etc/pki/rpm-gpg/NODESOURCE-GPG-SIGNING-KEY-EL >/dev/null; then
        log_success "NodeSource GPG key installed"
    else
        log_warn "Failed to install NodeSource GPG key"
    fi
    
    # Add Docker repository
    log_info "Adding Docker repository..."
    execute_command "sudo $pkg_manager install -y yum-utils" "Installing yum-utils"
    
    if [[ "$pkg_manager" == "dnf" ]]; then
        execute_command "sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo" "Adding Docker repository"
    else
        execute_command "sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo" "Adding Docker repository"
    fi
    
    # Update package cache
    execute_command "sudo $pkg_manager makecache" "Updating package cache"
    
    return 0
}

# Install healthcare-specific dependencies
install_centos_healthcare_deps() {
    log_info "Installing healthcare-specific dependencies for CentOS/RHEL..."
    
    # Determine package manager
    local pkg_manager="yum"
    if command_exists dnf; then
        pkg_manager="dnf"
    fi
    
    # Core development packages
    local dev_packages=(
        "gcc"
        "gcc-c++"
        "make"
        "kernel-devel"
        "openssl-devel"
        "libffi-devel"
        "libxml2-devel"
        "libxslt-devel"
        "zlib-devel"
        "libjpeg-turbo-devel"
        "libpng-devel"
        "freetype-devel"
        "python3"
        "python3-pip"
        "python3-devel"
    )
    
    # Healthcare and data processing specific
    local healthcare_packages=(
        "postgresql-devel"   # PostgreSQL development headers
        "mysql-devel"        # MySQL development headers (if available)
        "sqlite-devel"       # SQLite development headers
        "redis"              # Redis server and CLI tools
        "ImageMagick"        # Image processing
        "ImageMagick-devel"  # ImageMagick development headers
        "pandoc"             # Document conversion (from EPEL)
        "wkhtmltopdf"        # HTML to PDF conversion (from EPEL)
        "ghostscript"        # PDF processing
    )
    
    # Security and compliance tools
    local security_packages=(
        "gnupg2"
        "openssl"
        "ca-certificates"
        "fail2ban"
        "firewalld"
    )
    
    log_info "Installing core development packages..."
    if ! execute_command "sudo $pkg_manager groupinstall -y 'Development Tools'" "Installing Development Tools group"; then
        log_warn "Development Tools group installation failed, installing individual packages..."
        install_packages "${dev_packages[@]}"
    fi
    
    log_info "Installing individual development packages..."
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
    
    log_success "CentOS/RHEL healthcare dependencies installed"
    return 0
}

# Configure CentOS-specific optimizations
configure_centos_optimizations() {
    log_info "Configuring CentOS/RHEL optimizations for healthcare workloads..."
    
    # Configure timezone for Malaysian healthcare
    log_info "Setting Malaysian timezone..."
    execute_command "sudo timedatectl set-timezone Asia/Kuala_Lumpur" "Setting timezone to Asia/Kuala_Lumpur"
    
    # Configure locale
    log_info "Configuring locale..."
    execute_command "sudo localectl set-locale LANG=en_US.UTF-8" "Setting system locale" true
    
    # Configure SELinux for development (permissive mode)
    log_info "Configuring SELinux for development..."
    if command_exists getenforce && [[ "$(getenforce)" == "Enforcing" ]]; then
        log_warn "SELinux is in enforcing mode. Setting to permissive for development."
        execute_command "sudo setenforce 0" "Setting SELinux to permissive mode temporarily"
        
        # Make it permanent
        if [[ -f /etc/selinux/config ]]; then
            sudo sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
            log_info "SELinux set to permissive mode permanently"
        fi
    fi
    
    # Configure system limits
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
    log_info "Configuring firewalld for development..."
    execute_command "sudo systemctl start firewalld" "Starting firewalld" true
    execute_command "sudo systemctl enable firewalld" "Enabling firewalld" true
    
    # Allow common development ports
    execute_command "sudo firewall-cmd --permanent --add-service=ssh" "Allowing SSH" true
    execute_command "sudo firewall-cmd --permanent --add-port=3000-3010/tcp" "Allowing development server ports" true
    execute_command "sudo firewall-cmd --permanent --add-port=8000-8010/tcp" "Allowing backend server ports" true
    execute_command "sudo firewall-cmd --permanent --add-service=postgresql" "Allowing PostgreSQL" true
    execute_command "sudo firewall-cmd --permanent --add-port=6379/tcp" "Allowing Redis" true
    
    execute_command "sudo firewall-cmd --reload" "Reloading firewall configuration" true
    
    log_success "CentOS/RHEL optimizations configured for healthcare workloads"
    return 0
}

# Install Node.js via NodeSource (CentOS-optimized)
install_nodejs_centos() {
    local node_version="${1:-18}"
    
    log_info "Installing Node.js $node_version via NodeSource..."
    
    # Determine package manager
    local pkg_manager="yum"
    if command_exists dnf; then
        pkg_manager="dnf"
    fi
    
    # Install NodeSource repository
    execute_command "curl -fsSL https://rpm.nodesource.com/setup_${node_version}.x | sudo bash -" "Adding NodeSource repository"
    
    # Install Node.js
    if execute_command "sudo $pkg_manager install -y nodejs" "Installing Node.js"; then
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

# Install Docker Engine (CentOS-optimized)
install_docker_centos() {
    if [[ "${SKIP_DOCKER:-false}" == "true" ]]; then
        log_info "Skipping Docker installation"
        return 0
    fi
    
    log_info "Installing Docker Engine for CentOS/RHEL..."
    
    # Determine package manager
    local pkg_manager="yum"
    if command_exists dnf; then
        pkg_manager="dnf"
    fi
    
    # Remove old versions
    execute_command "sudo $pkg_manager remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine" "Removing old Docker versions" true
    
    # Install Docker Engine
    if execute_command "sudo $pkg_manager install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin" "Installing Docker Engine"; then
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

# Main CentOS setup function
setup_centos() {
    log_info "Starting CentOS/RHEL-specific setup..."
    
    # Check compatibility
    if ! check_centos_compatibility; then
        log_error "CentOS/RHEL compatibility check failed"
        return 1
    fi
    
    # Configure repositories
    if ! configure_centos_repositories; then
        log_error "Repository configuration failed"
        return 1
    fi
    
    # Install healthcare dependencies
    if ! install_centos_healthcare_deps; then
        log_error "Healthcare dependencies installation failed"
        return 1
    fi
    
    # Install Node.js
    if ! install_nodejs_centos; then
        log_error "Node.js installation failed"
        return 1
    fi
    
    # Install Docker
    if ! install_docker_centos; then
        log_error "Docker installation failed"
        return 1
    fi
    
    # Configure optimizations
    if ! configure_centos_optimizations; then
        log_warn "Some optimizations failed, but continuing..."
    fi
    
    log_success "CentOS/RHEL setup completed successfully!"
    log_info "Please log out and back in for group changes to take effect"
    log_info "Note: If SELinux was modified, a reboot may be required"
    
    return 0
}

# Run CentOS setup if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    setup_centos "$@"
fi