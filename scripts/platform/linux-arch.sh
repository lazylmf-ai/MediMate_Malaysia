#!/bin/bash
#
# MediMate Malaysia - Arch Linux Specific Setup
# Distribution-specific optimizations and configurations for Arch Linux and Manjaro systems
#

set -euo pipefail

# Source common libraries
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"
source "${SCRIPT_DIR}/../lib/validation.sh"
source "${SCRIPT_DIR}/../lib/package-managers.sh"

# Arch Linux specific configuration
readonly ARCH_ROLLING=true  # Arch is rolling release, no version check needed

# Detect Arch-based distribution
detect_arch_variant() {
    log_info "Detecting Arch-based distribution..."
    
    if [[ -f /etc/arch-release ]]; then
        echo "arch"
    elif [[ -f /etc/manjaro-release ]]; then
        echo "manjaro"
    elif [[ -f /etc/os-release ]]; then
        source /etc/os-release
        case "$ID" in
            arch|manjaro|endeavouros|arcolinux|garuda)
                echo "$ID"
                ;;
            *)
                echo "unknown"
                ;;
        esac
    else
        echo "unknown"
    fi
}

# Check Arch compatibility
check_arch_compatibility() {
    local variant
    variant=$(detect_arch_variant)
    
    if [[ "$variant" == "unknown" ]]; then
        log_error "Could not detect Arch-based distribution"
        return 1
    fi
    
    log_info "Detected Arch variant: $variant"
    log_success "Arch-based distribution detected and supported"
    
    # Check if system is up to date (important for Arch)
    log_info "Checking system update status..."
    if ! pacman -Qu >/dev/null 2>&1; then
        log_info "System appears to be up to date"
    else
        log_warn "System updates are available. Consider running 'sudo pacman -Syu' first"
        if [[ "${INTERACTIVE:-true}" == "true" ]]; then
            if prompt_yes_no "Update system packages now? (Recommended)"; then
                execute_command "sudo pacman -Syu --noconfirm" "Updating system packages"
            fi
        fi
    fi
    
    return 0
}

# Configure pacman and AUR
configure_arch_repositories() {
    log_info "Configuring pacman and AUR for healthcare development..."
    
    # Configure pacman for better performance and parallel downloads
    log_info "Optimizing pacman configuration..."
    
    # Backup original pacman.conf
    execute_command "sudo cp /etc/pacman.conf /etc/pacman.conf.backup" "Backing up pacman.conf"
    
    # Enable parallel downloads and color output
    sudo sed -i 's/#ParallelDownloads = 5/ParallelDownloads = 10/' /etc/pacman.conf
    sudo sed -i 's/#Color/Color/' /etc/pacman.conf
    sudo sed -i 's/#VerbosePkgLists/VerbosePkgLists/' /etc/pacman.conf
    
    # Enable multilib repository (for 32-bit compatibility)
    if ! grep -q "^\[multilib\]" /etc/pacman.conf; then
        log_info "Enabling multilib repository..."
        echo "" | sudo tee -a /etc/pacman.conf
        echo "[multilib]" | sudo tee -a /etc/pacman.conf
        echo "Include = /etc/pacman.d/mirrorlist" | sudo tee -a /etc/pacman.conf
    fi
    
    # Update package databases
    execute_command "sudo pacman -Sy" "Updating package databases"
    
    # Install AUR helper (yay) if not present
    if ! command_exists yay; then
        log_info "Installing AUR helper (yay)..."
        
        # Install base-devel and git if not present
        execute_command "sudo pacman -S --needed --noconfirm base-devel git" "Installing base development tools"
        
        # Clone and build yay
        local temp_dir
        temp_dir=$(mktemp -d)
        
        if execute_command "git clone https://aur.archlinux.org/yay.git $temp_dir/yay" "Cloning yay AUR helper"; then
            cd "$temp_dir/yay"
            execute_command "makepkg -si --noconfirm" "Building and installing yay"
            cd - >/dev/null
            rm -rf "$temp_dir"
            log_success "AUR helper (yay) installed successfully"
        else
            log_error "Failed to install yay AUR helper"
            rm -rf "$temp_dir"
            return 1
        fi
    else
        log_success "AUR helper (yay) is already available"
    fi
    
    return 0
}

# Install healthcare-specific dependencies
install_arch_healthcare_deps() {
    log_info "Installing healthcare-specific dependencies for Arch Linux..."
    
    # Core development packages
    local dev_packages=(
        "base-devel"         # Essential development tools
        "cmake"              # Build system
        "ninja"              # Fast build system
        "pkg-config"         # Package configuration
        "openssl"            # Cryptography
        "libffi"             # Foreign function interface
        "libxml2"            # XML processing
        "libxslt"            # XSLT processing
        "zlib"               # Compression
        "libjpeg-turbo"      # JPEG processing
        "libpng"             # PNG processing
        "freetype2"          # Font rendering
        "python"             # Python 3
        "python-pip"         # Python package manager
        "python-virtualenv"  # Virtual environments
    )
    
    # Healthcare and data processing specific
    local healthcare_packages=(
        "postgresql-libs"    # PostgreSQL client libraries
        "mysql-clients"      # MySQL client libraries
        "sqlite"             # SQLite database
        "redis"              # Redis server and CLI
        "imagemagick"        # Image processing
        "pandoc"             # Document conversion
        "wkhtmltopdf"        # HTML to PDF conversion
        "ghostscript"        # PDF processing
        "poppler"            # PDF utilities
        "graphicsmagick"     # Alternative image processing
    )
    
    # Security and compliance tools
    local security_packages=(
        "gnupg"
        "openssl"
        "ca-certificates"
        "fail2ban"
        "ufw"                # Uncomplicated firewall
        "clamav"             # Anti-virus (for file scanning)
        "rkhunter"           # Rootkit hunter
    )
    
    # Multimedia and graphics (useful for healthcare applications)
    local multimedia_packages=(
        "ffmpeg"
        "gstreamer"
        "gst-plugins-base"
        "gst-plugins-good"
        "gst-plugins-bad"
        "gst-plugins-ugly"
        "x264"
        "x265"
    )
    
    # Development tools
    local dev_tools=(
        "git"
        "curl"
        "wget"
        "jq"
        "tree"
        "htop"
        "neofetch"
        "unzip"
        "zip"
        "tar"
        "vim"
        "nano"
    )
    
    log_info "Installing core development packages..."
    if ! execute_command "sudo pacman -S --needed --noconfirm ${dev_packages[*]}" "Installing development packages"; then
        log_error "Failed to install core development packages"
        return 1
    fi
    
    log_info "Installing healthcare-specific packages..."
    if ! execute_command "sudo pacman -S --needed --noconfirm ${healthcare_packages[*]}" "Installing healthcare packages"; then
        log_warn "Some healthcare packages failed to install, continuing..."
    fi
    
    log_info "Installing security packages..."
    if ! execute_command "sudo pacman -S --needed --noconfirm ${security_packages[*]}" "Installing security packages"; then
        log_warn "Some security packages failed to install, continuing..."
    fi
    
    log_info "Installing multimedia packages..."
    if ! execute_command "sudo pacman -S --needed --noconfirm ${multimedia_packages[*]}" "Installing multimedia packages"; then
        log_warn "Some multimedia packages failed to install, continuing..."
    fi
    
    log_info "Installing development tools..."
    if ! execute_command "sudo pacman -S --needed --noconfirm ${dev_tools[*]}" "Installing development tools"; then
        log_warn "Some development tools failed to install, continuing..."
    fi
    
    # Install some AUR packages useful for healthcare development
    log_info "Installing AUR packages for healthcare development..."
    local aur_packages=(
        "visual-studio-code-bin"  # VS Code
        "google-chrome"           # Chrome for testing
        "postman-bin"            # API testing
        "slack-desktop"          # Communication
        "zoom"                   # Video conferencing
    )
    
    for package in "${aur_packages[@]}"; do
        if ! yay -Q "$package" >/dev/null 2>&1; then
            execute_command "yay -S --noconfirm $package" "Installing $package from AUR" true
        else
            log_debug "$package is already installed"
        fi
    done
    
    log_success "Arch Linux healthcare dependencies installed"
    return 0
}

# Configure Arch-specific optimizations
configure_arch_optimizations() {
    log_info "Configuring Arch Linux optimizations for healthcare workloads..."
    
    # Configure timezone for Malaysian healthcare
    log_info "Setting Malaysian timezone..."
    execute_command "sudo timedatectl set-timezone Asia/Kuala_Lumpur" "Setting timezone to Asia/Kuala_Lumpur"
    
    # Configure locale
    log_info "Configuring locale..."
    if ! grep -q "^en_US.UTF-8" /etc/locale.gen; then
        sudo sed -i 's/#en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen
        execute_command "sudo locale-gen" "Generating locales"
    fi
    execute_command "sudo localectl set-locale LANG=en_US.UTF-8" "Setting system locale"
    
    # Configure system limits
    log_info "Configuring system limits for healthcare workloads..."
    sudo tee /etc/security/limits.d/99-healthcare.conf > /dev/null << 'EOF'
# Limits for healthcare application processes
* soft nofile 131072
* hard nofile 131072
* soft nproc 65536
* hard nproc 65536
EOF
    
    # Configure sysctl for better performance
    log_info "Configuring kernel parameters..."
    sudo tee /etc/sysctl.d/99-healthcare.conf > /dev/null << 'EOF'
# Network optimizations for healthcare applications
net.core.somaxconn = 131072
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 3
net.ipv4.tcp_congestion_control = bbr

# Memory optimizations for data processing
vm.swappiness = 1
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.vfs_cache_pressure = 50

# File system optimizations
fs.file-max = 2097152
fs.inotify.max_user_watches = 1048576
kernel.pid_max = 4194304
EOF
    
    execute_command "sudo sysctl -p /etc/sysctl.d/99-healthcare.conf" "Applying kernel parameter changes"
    
    # Configure firewall (UFW)
    log_info "Configuring UFW firewall for development..."
    execute_command "sudo ufw --force reset" "Resetting firewall rules"
    execute_command "sudo ufw default deny incoming" "Setting default deny incoming"
    execute_command "sudo ufw default allow outgoing" "Setting default allow outgoing"
    
    # Allow common development ports
    execute_command "sudo ufw allow 22/tcp comment 'SSH'" "Allowing SSH"
    execute_command "sudo ufw allow 3000:3010/tcp comment 'Development servers'" "Allowing development server ports"
    execute_command "sudo ufw allow 8000:8010/tcp comment 'Backend servers'" "Allowing backend server ports"
    execute_command "sudo ufw allow 5432/tcp comment 'PostgreSQL'" "Allowing PostgreSQL"
    execute_command "sudo ufw allow 6379/tcp comment 'Redis'" "Allowing Redis"
    
    execute_command "sudo ufw --force enable" "Enabling firewall"
    execute_command "sudo systemctl enable ufw" "Enabling UFW service"
    
    # Configure automatic cleanup (Arch-specific)
    log_info "Configuring automatic package cache cleanup..."
    
    # Create systemd timer for package cache cleanup
    sudo tee /etc/systemd/system/pacman-cleanup.service > /dev/null << 'EOF'
[Unit]
Description=Clean pacman cache
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/paccache -r -k 2
ExecStart=/usr/bin/pacman -Sc --noconfirm
EOF
    
    sudo tee /etc/systemd/system/pacman-cleanup.timer > /dev/null << 'EOF'
[Unit]
Description=Clean pacman cache weekly
Requires=pacman-cleanup.service

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
EOF
    
    execute_command "sudo systemctl enable pacman-cleanup.timer" "Enabling automatic cache cleanup"
    execute_command "sudo systemctl start pacman-cleanup.timer" "Starting cache cleanup timer"
    
    log_success "Arch Linux optimizations configured for healthcare workloads"
    return 0
}

# Install Node.js (Arch-optimized)
install_nodejs_arch() {
    local node_version="${1:-lts}"
    
    log_info "Installing Node.js $node_version..."
    
    # Install Node.js and npm
    if execute_command "sudo pacman -S --needed --noconfirm nodejs npm" "Installing Node.js and npm"; then
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
        local global_packages=(
            "nodemon"
            "typescript"
            "@typescript-eslint/parser"
            "@typescript-eslint/eslint-plugin"
            "prettier"
            "eslint"
            "pm2"
            "@vue/cli"
            "create-react-app"
            "@angular/cli"
        )
        
        for package in "${global_packages[@]}"; do
            execute_command "npm install -g $package" "Installing $package globally" true
        done
        
        return 0
    else
        log_error "Node.js installation failed"
        return 1
    fi
}

# Install Docker Engine (Arch-optimized)
install_docker_arch() {
    if [[ "${SKIP_DOCKER:-false}" == "true" ]]; then
        log_info "Skipping Docker installation"
        return 0
    fi
    
    log_info "Installing Docker Engine for Arch Linux..."
    
    # Install Docker
    if execute_command "sudo pacman -S --needed --noconfirm docker docker-compose" "Installing Docker and Docker Compose"; then
        # Start and enable Docker
        execute_command "sudo systemctl start docker" "Starting Docker service"
        execute_command "sudo systemctl enable docker" "Enabling Docker service"
        
        # Add user to docker group
        execute_command "sudo usermod -aG docker $USER" "Adding user to docker group"
        
        # Configure Docker daemon for better performance
        log_info "Configuring Docker daemon for healthcare workloads..."
        sudo mkdir -p /etc/docker
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
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ]
}
EOF
        
        execute_command "sudo systemctl restart docker" "Restarting Docker with new configuration"
        
        # Install additional Docker tools from AUR
        log_info "Installing additional Docker tools..."
        execute_command "yay -S --noconfirm lazydocker" "Installing lazydocker (Docker TUI)" true
        execute_command "yay -S --noconfirm ctop-bin" "Installing ctop (container monitoring)" true
        
        log_success "Docker Engine installed successfully"
        log_info "Note: Log out and back in for docker group membership to take effect"
        
        return 0
    else
        log_error "Docker installation failed"
        return 1
    fi
}

# Main Arch setup function
setup_arch() {
    log_info "Starting Arch Linux-specific setup..."
    
    # Check compatibility
    if ! check_arch_compatibility; then
        log_error "Arch Linux compatibility check failed"
        return 1
    fi
    
    # Configure repositories and AUR
    if ! configure_arch_repositories; then
        log_error "Repository configuration failed"
        return 1
    fi
    
    # Install healthcare dependencies
    if ! install_arch_healthcare_deps; then
        log_error "Healthcare dependencies installation failed"
        return 1
    fi
    
    # Install Node.js
    if ! install_nodejs_arch; then
        log_error "Node.js installation failed"
        return 1
    fi
    
    # Install Docker
    if ! install_docker_arch; then
        log_error "Docker installation failed"
        return 1
    fi
    
    # Configure optimizations
    if ! configure_arch_optimizations; then
        log_warn "Some optimizations failed, but continuing..."
    fi
    
    log_success "Arch Linux setup completed successfully!"
    log_info "Please log out and back in for group changes to take effect"
    log_info "System optimization timers have been configured"
    log_info "Consider running 'sudo pacman -Syu' regularly to keep system updated"
    
    return 0
}

# Run Arch setup if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    setup_arch "$@"
fi