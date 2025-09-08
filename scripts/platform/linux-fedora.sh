#!/bin/bash
#
# MediMate Malaysia - Fedora Specific Setup
# Distribution-specific optimizations and configurations for Fedora systems
#

set -euo pipefail

# Source common libraries
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"
source "${SCRIPT_DIR}/../lib/validation.sh"
source "${SCRIPT_DIR}/../lib/package-managers.sh"

# Fedora specific configuration
readonly FEDORA_MIN_VERSION="36"

# Detect Fedora version
detect_fedora_version() {
    log_info "Detecting Fedora version..."
    
    if [[ -f /etc/fedora-release ]]; then
        grep -oP 'Fedora Linux \K[0-9]+' /etc/fedora-release || echo "unknown"
    elif [[ -f /etc/os-release ]]; then
        source /etc/os-release
        if [[ "$ID" == "fedora" ]]; then
            echo "$VERSION_ID"
        else
            echo "unknown"
        fi
    else
        echo "unknown"
    fi
}

# Check version compatibility
check_fedora_compatibility() {
    local version
    version=$(detect_fedora_version)
    
    if [[ "$version" == "unknown" ]]; then
        log_error "Could not detect Fedora version"
        return 1
    fi
    
    log_info "Detected Fedora version: $version"
    
    if version_compare "$version" ">=" "$FEDORA_MIN_VERSION"; then
        log_success "Fedora version $version is supported"
        return 0
    else
        log_error "Fedora version $version is below minimum supported version $FEDORA_MIN_VERSION"
        return 1
    fi
}

# Configure DNF and repositories
configure_fedora_repositories() {
    log_info "Configuring DNF and repositories for Fedora..."
    
    # Configure DNF for better performance
    log_info "Optimizing DNF configuration..."
    sudo tee -a /etc/dnf/dnf.conf > /dev/null << 'EOF'

# Performance optimizations for healthcare development
max_parallel_downloads=10
fastestmirror=True
deltarpm=True
EOF
    
    # Update system packages
    execute_command "sudo dnf update -y" "Updating system packages"
    
    # Enable RPM Fusion repositories for additional software
    log_info "Enabling RPM Fusion repositories..."
    execute_command "sudo dnf install -y https://mirrors.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm" "Installing RPM Fusion Free" true
    execute_command "sudo dnf install -y https://mirrors.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm" "Installing RPM Fusion Non-Free" true
    
    # Add NodeSource repository
    log_info "Adding NodeSource repository..."
    execute_command "sudo dnf install -y curl" "Installing curl"
    
    # Add Docker repository
    log_info "Adding Docker repository..."
    execute_command "sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo" "Adding Docker repository"
    
    # Update package cache
    execute_command "sudo dnf makecache" "Updating package cache"
    
    return 0
}

# Install healthcare-specific dependencies
install_fedora_healthcare_deps() {
    log_info "Installing healthcare-specific dependencies for Fedora..."
    
    # Core development packages (Fedora has excellent development groups)
    log_info "Installing development tools and libraries..."
    execute_command "sudo dnf groupinstall -y 'Development Tools' 'Development Libraries'" "Installing development groups"
    
    # Additional development packages
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
        "python3-virtualenv"
    )
    
    # Healthcare and data processing specific
    local healthcare_packages=(
        "libpq-devel"        # PostgreSQL development headers
        "mysql-devel"        # MySQL development headers
        "sqlite-devel"       # SQLite development headers
        "redis"              # Redis server and CLI tools
        "ImageMagick"        # Image processing
        "ImageMagick-devel"  # ImageMagick development headers
        "pandoc"             # Document conversion
        "wkhtmltopdf"        # HTML to PDF conversion
        "ghostscript"        # PDF processing
        "poppler-utils"      # PDF utilities
    )
    
    # Security and compliance tools
    local security_packages=(
        "gnupg2"
        "openssl"
        "ca-certificates"
        "fail2ban"
        "firewalld"
        "policycoreutils-python-utils"  # SELinux tools
    )
    
    # Multimedia and graphics (useful for healthcare applications)
    local multimedia_packages=(
        "ffmpeg"
        "ffmpeg-devel"
        "gstreamer1-plugins-base"
        "gstreamer1-plugins-good"
        "gstreamer1-plugins-bad-free"
        "gstreamer1-plugins-ugly"
    )
    
    log_info "Installing additional development packages..."
    if ! install_packages "${dev_packages[@]}"; then
        log_warn "Some development packages failed to install, continuing..."
    fi
    
    log_info "Installing healthcare-specific packages..."
    if ! install_packages "${healthcare_packages[@]}"; then
        log_warn "Some healthcare packages failed to install, continuing..."
    fi
    
    log_info "Installing security packages..."
    if ! install_packages "${security_packages[@]}"; then
        log_warn "Some security packages failed to install, continuing..."
    fi
    
    log_info "Installing multimedia packages..."
    if ! install_packages "${multimedia_packages[@]}"; then
        log_warn "Some multimedia packages failed to install, continuing..."
    fi
    
    log_success "Fedora healthcare dependencies installed"
    return 0
}

# Configure Fedora-specific optimizations
configure_fedora_optimizations() {
    log_info "Configuring Fedora optimizations for healthcare workloads..."
    
    # Configure timezone for Malaysian healthcare
    log_info "Setting Malaysian timezone..."
    execute_command "sudo timedatectl set-timezone Asia/Kuala_Lumpur" "Setting timezone to Asia/Kuala_Lumpur"
    
    # Configure locale
    log_info "Configuring locale..."
    execute_command "sudo localectl set-locale LANG=en_US.UTF-8" "Setting system locale"
    
    # Configure SELinux for development (keep enforcing but add necessary rules)
    log_info "Configuring SELinux for development..."
    if command_exists getenforce && [[ "$(getenforce)" == "Enforcing" ]]; then
        log_info "SELinux is in enforcing mode. Adding development-friendly policies..."
        
        # Allow common development activities
        execute_command "sudo setsebool -P httpd_can_network_connect 1" "Allowing HTTP network connections" true
        execute_command "sudo setsebool -P httpd_can_network_relay 1" "Allowing HTTP network relay" true
        execute_command "sudo setsebool -P nis_enabled 1" "Enabling NIS for development" true
        
        log_info "SELinux remains in enforcing mode with development-friendly policies"
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

# File system optimizations
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288
EOF
    
    execute_command "sudo sysctl -p /etc/sysctl.d/99-healthcare.conf" "Applying kernel parameter changes"
    
    # Configure firewall for development
    log_info "Configuring firewalld for development..."
    execute_command "sudo systemctl start firewalld" "Starting firewalld"
    execute_command "sudo systemctl enable firewalld" "Enabling firewalld"
    
    # Create a development zone
    execute_command "sudo firewall-cmd --permanent --new-zone=development" "Creating development zone" true
    execute_command "sudo firewall-cmd --permanent --zone=development --add-source=127.0.0.0/8" "Adding localhost to development zone" true
    execute_command "sudo firewall-cmd --permanent --zone=development --add-source=192.168.0.0/16" "Adding private network to development zone" true
    execute_command "sudo firewall-cmd --permanent --zone=development --add-source=10.0.0.0/8" "Adding private network to development zone" true
    
    # Allow common development ports
    execute_command "sudo firewall-cmd --permanent --add-service=ssh" "Allowing SSH"
    execute_command "sudo firewall-cmd --permanent --add-port=3000-3010/tcp" "Allowing development server ports"
    execute_command "sudo firewall-cmd --permanent --add-port=8000-8010/tcp" "Allowing backend server ports"
    execute_command "sudo firewall-cmd --permanent --add-service=postgresql" "Allowing PostgreSQL"
    execute_command "sudo firewall-cmd --permanent --add-port=6379/tcp" "Allowing Redis"
    
    execute_command "sudo firewall-cmd --reload" "Reloading firewall configuration"
    
    # Configure DNF automatic updates for security
    log_info "Configuring automatic security updates..."
    execute_command "sudo dnf install -y dnf-automatic" "Installing DNF automatic"
    
    # Configure for security updates only
    sudo sed -i 's/upgrade_type = default/upgrade_type = security/' /etc/dnf/automatic.conf
    sudo sed -i 's/apply_updates = no/apply_updates = yes/' /etc/dnf/automatic.conf
    
    execute_command "sudo systemctl enable --now dnf-automatic.timer" "Enabling automatic security updates"
    
    log_success "Fedora optimizations configured for healthcare workloads"
    return 0
}

# Install Node.js via NodeSource (Fedora-optimized)
install_nodejs_fedora() {
    local node_version="${1:-18}"
    
    log_info "Installing Node.js $node_version via NodeSource..."
    
    # Install NodeSource repository
    execute_command "curl -fsSL https://rpm.nodesource.com/setup_${node_version}.x | sudo bash -" "Adding NodeSource repository"
    
    # Install Node.js
    if execute_command "sudo dnf install -y nodejs" "Installing Node.js"; then
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
        
        # Install useful global packages for healthcare development
        log_info "Installing useful global npm packages..."
        execute_command "npm install -g nodemon typescript @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint" "Installing development tools" true
        
        return 0
    else
        log_error "Node.js installation failed"
        return 1
    fi
}

# Install Docker Engine (Fedora-optimized)
install_docker_fedora() {
    if [[ "${SKIP_DOCKER:-false}" == "true" ]]; then
        log_info "Skipping Docker installation"
        return 0
    fi
    
    log_info "Installing Docker Engine for Fedora..."
    
    # Remove old versions
    execute_command "sudo dnf remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-selinux docker-engine-selinux docker-engine" "Removing old Docker versions" true
    
    # Install Docker Engine
    if execute_command "sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin" "Installing Docker Engine"; then
        # Configure Docker for SELinux
        log_info "Configuring Docker for SELinux..."
        execute_command "sudo setsebool -P container_manage_cgroup true" "Configuring SELinux for containers" true
        
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
        
        # Configure Docker daemon for better performance
        log_info "Configuring Docker daemon for healthcare workloads..."
        sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true,
  "userland-proxy": false,
  "experimental": false,
  "storage-driver": "overlay2"
}
EOF
        
        execute_command "sudo systemctl restart docker" "Restarting Docker with new configuration"
        
        log_success "Docker Engine installed successfully"
        log_info "Note: Log out and back in for docker group membership to take effect"
        
        return 0
    else
        log_error "Docker installation failed"
        return 1
    fi
}

# Main Fedora setup function
setup_fedora() {
    log_info "Starting Fedora-specific setup..."
    
    # Check compatibility
    if ! check_fedora_compatibility; then
        log_error "Fedora compatibility check failed"
        return 1
    fi
    
    # Configure repositories
    if ! configure_fedora_repositories; then
        log_error "Repository configuration failed"
        return 1
    fi
    
    # Install healthcare dependencies
    if ! install_fedora_healthcare_deps; then
        log_error "Healthcare dependencies installation failed"
        return 1
    fi
    
    # Install Node.js
    if ! install_nodejs_fedora; then
        log_error "Node.js installation failed"
        return 1
    fi
    
    # Install Docker
    if ! install_docker_fedora; then
        log_error "Docker installation failed"
        return 1
    fi
    
    # Configure optimizations
    if ! configure_fedora_optimizations; then
        log_warn "Some optimizations failed, but continuing..."
    fi
    
    log_success "Fedora setup completed successfully!"
    log_info "Please log out and back in for group changes to take effect"
    log_info "Automatic security updates have been configured"
    
    return 0
}

# Run Fedora setup if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    setup_fedora "$@"
fi