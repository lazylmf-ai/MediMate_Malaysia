#!/bin/bash
#
# MediMate Malaysia - Cross-Platform Package Manager Utilities
# Provides unified package installation with intelligent fallbacks
#

set -euo pipefail

# Ensure platform detection is available
if [[ -z "${DETECTED_PLATFORM:-}" ]] && [[ -f "$(dirname "${BASH_SOURCE[0]}")/platform.sh" ]]; then
    source "$(dirname "${BASH_SOURCE[0]}")/platform.sh" 2>/dev/null || true
fi

# Initialize global variables with defaults (only if not already set)
: "${DETECTED_PLATFORM:=0}"
: "${PLATFORM_MACOS:=1}"
: "${PLATFORM_LINUX:=2}"
: "${PLATFORM_WINDOWS:=3}"
: "${PLATFORM_WSL:=4}"

# Package manager configuration
# Note: Using functions instead of associative arrays for compatibility
# Linux - Debian/Ubuntu
PKG_MANAGERS["apt"]="APT"
PKG_MANAGERS["apt-get"]="APT (legacy)"
PKG_MANAGERS["dpkg"]="DPKG"
# Linux - RedHat/Fedora
PKG_MANAGERS["dnf"]="DNF"
PKG_MANAGERS["yum"]="YUM"
PKG_MANAGERS["rpm"]="RPM"
# Linux - Arch
PKG_MANAGERS["pacman"]="Pacman"
PKG_MANAGERS["yay"]="YAY (AUR helper)"
PKG_MANAGERS["paru"]="Paru (AUR helper)"
# Linux - openSUSE
PKG_MANAGERS["zypper"]="Zypper"
# Linux - Alpine
PKG_MANAGERS["apk"]="Alpine Package Keeper"
# Universal Linux
PKG_MANAGERS["snap"]="Snap"
PKG_MANAGERS["flatpak"]="Flatpak"
# Windows
PKG_MANAGERS["choco"]="Chocolatey"
PKG_MANAGERS["scoop"]="Scoop"
PKG_MANAGERS["winget"]="Windows Package Manager"
# Language-specific
PKG_MANAGERS["npm"]="Node Package Manager"
PKG_MANAGERS["pip"]="Python Package Installer"
PKG_MANAGERS["pip3"]="Python 3 Package Installer"
PKG_MANAGERS["gem"]="RubyGems"
PKG_MANAGERS["cargo"]="Rust Package Manager"

# Package name mappings across different package managers
declare -A PACKAGE_MAPPINGS
# Node.js mappings
PACKAGE_MAPPINGS["nodejs:apt"]="nodejs npm"
PACKAGE_MAPPINGS["nodejs:dnf"]="nodejs npm"
PACKAGE_MAPPINGS["nodejs:pacman"]="nodejs npm"
PACKAGE_MAPPINGS["nodejs:zypper"]="nodejs npm"
PACKAGE_MAPPINGS["nodejs:apk"]="nodejs npm"
PACKAGE_MAPPINGS["nodejs:brew"]="node"
PACKAGE_MAPPINGS["nodejs:choco"]="nodejs"
PACKAGE_MAPPINGS["nodejs:scoop"]="nodejs"
# Docker mappings
PACKAGE_MAPPINGS["docker:apt"]="docker.io"
PACKAGE_MAPPINGS["docker:dnf"]="docker"
PACKAGE_MAPPINGS["docker:pacman"]="docker"
PACKAGE_MAPPINGS["docker:zypper"]="docker"
PACKAGE_MAPPINGS["docker:apk"]="docker"
PACKAGE_MAPPINGS["docker:brew"]="docker"
PACKAGE_MAPPINGS["docker:choco"]="docker-desktop"
PACKAGE_MAPPINGS["docker:scoop"]="docker"
# Git mappings
PACKAGE_MAPPINGS["git:apt"]="git"
PACKAGE_MAPPINGS["git:dnf"]="git"
PACKAGE_MAPPINGS["git:pacman"]="git"
PACKAGE_MAPPINGS["git:zypper"]="git"
PACKAGE_MAPPINGS["git:apk"]="git"
PACKAGE_MAPPINGS["git:brew"]="git"
PACKAGE_MAPPINGS["git:choco"]="git"
PACKAGE_MAPPINGS["git:scoop"]="git"
# curl mappings
PACKAGE_MAPPINGS["curl:apt"]="curl"
PACKAGE_MAPPINGS["curl:dnf"]="curl"
PACKAGE_MAPPINGS["curl:pacman"]="curl"
PACKAGE_MAPPINGS["curl:zypper"]="curl"
PACKAGE_MAPPINGS["curl:apk"]="curl"
PACKAGE_MAPPINGS["curl:brew"]="curl"
PACKAGE_MAPPINGS["curl:choco"]="curl"
PACKAGE_MAPPINGS["curl:scoop"]="curl"
# wget mappings
PACKAGE_MAPPINGS["wget:apt"]="wget"
PACKAGE_MAPPINGS["wget:dnf"]="wget"
PACKAGE_MAPPINGS["wget:pacman"]="wget"
PACKAGE_MAPPINGS["wget:zypper"]="wget"
PACKAGE_MAPPINGS["wget:apk"]="wget"
PACKAGE_MAPPINGS["wget:brew"]="wget"
PACKAGE_MAPPINGS["wget:choco"]="wget"
PACKAGE_MAPPINGS["wget:scoop"]="wget"
# jq mappings
PACKAGE_MAPPINGS["jq:apt"]="jq"
PACKAGE_MAPPINGS["jq:dnf"]="jq"
PACKAGE_MAPPINGS["jq:pacman"]="jq"
PACKAGE_MAPPINGS["jq:zypper"]="jq"
PACKAGE_MAPPINGS["jq:apk"]="jq"
PACKAGE_MAPPINGS["jq:brew"]="jq"
PACKAGE_MAPPINGS["jq:choco"]="jq"
PACKAGE_MAPPINGS["jq:scoop"]="jq"
# PostgreSQL mappings
PACKAGE_MAPPINGS["postgresql:apt"]="postgresql postgresql-contrib"
PACKAGE_MAPPINGS["postgresql:dnf"]="postgresql postgresql-contrib"
PACKAGE_MAPPINGS["postgresql:pacman"]="postgresql"
PACKAGE_MAPPINGS["postgresql:zypper"]="postgresql postgresql-contrib"
PACKAGE_MAPPINGS["postgresql:apk"]="postgresql"
PACKAGE_MAPPINGS["postgresql:brew"]="postgresql"
PACKAGE_MAPPINGS["postgresql:choco"]="postgresql"
PACKAGE_MAPPINGS["postgresql:scoop"]="postgresql"
# Redis mappings
PACKAGE_MAPPINGS["redis:apt"]="redis-server"
PACKAGE_MAPPINGS["redis:dnf"]="redis"
PACKAGE_MAPPINGS["redis:pacman"]="redis"
PACKAGE_MAPPINGS["redis:zypper"]="redis"
PACKAGE_MAPPINGS["redis:apk"]="redis"
PACKAGE_MAPPINGS["redis:brew"]="redis"
PACKAGE_MAPPINGS["redis:choco"]="redis"
PACKAGE_MAPPINGS["redis:scoop"]="redis"

# Get primary package manager for current platform
get_primary_package_manager() {
    local platform_managers
    
    case "$DETECTED_PLATFORM" in
        ${PLATFORM_MACOS})
            platform_managers=("brew" "port" "fink")
            ;;
        ${PLATFORM_LINUX}|${PLATFORM_WSL})
            case "$DETECTED_DISTRO" in
                ubuntu|debian)
                    platform_managers=("apt" "apt-get")
                    ;;
                fedora|rhel|centos)
                    platform_managers=("dnf" "yum")
                    ;;
                arch|manjaro)
                    platform_managers=("pacman" "yay" "paru")
                    ;;
                opensuse)
                    platform_managers=("zypper")
                    ;;
                alpine)
                    platform_managers=("apk")
                    ;;
                *)
                    # Generic Linux fallback
                    platform_managers=("apt" "dnf" "yum" "pacman" "zypper")
                    ;;
            esac
            ;;
        ${PLATFORM_WINDOWS})
            platform_managers=("choco" "scoop" "winget")
            ;;
        *)
            log_error "Unknown platform for package manager selection"
            return 1
            ;;
    esac
    
    # Find the first available package manager
    for mgr in "${platform_managers[@]}"; do
        if command_exists "$mgr"; then
            echo "$mgr"
            return 0
        fi
    done
    
    log_error "No suitable package manager found for platform"
    return 1
}

# Get package manager install command
get_install_command() {
    local pkg_manager="$1"
    local sudo_prefix=""
    
    # Determine if sudo is needed (not for user-space managers)
    case "$pkg_manager" in
        brew|scoop|pip|pip3|npm|gem|cargo|yay|paru)
            sudo_prefix=""
            ;;
        *)
            if [[ $EUID -ne 0 ]] && command_exists sudo; then
                sudo_prefix="sudo "
            fi
            ;;
    esac
    
    case "$pkg_manager" in
        apt)
            echo "${sudo_prefix}apt install -y"
            ;;
        apt-get)
            echo "${sudo_prefix}apt-get install -y"
            ;;
        dnf)
            echo "${sudo_prefix}dnf install -y"
            ;;
        yum)
            echo "${sudo_prefix}yum install -y"
            ;;
        pacman)
            echo "${sudo_prefix}pacman -S --noconfirm"
            ;;
        zypper)
            echo "${sudo_prefix}zypper install -y"
            ;;
        apk)
            echo "${sudo_prefix}apk add"
            ;;
        brew)
            echo "brew install"
            ;;
        port)
            echo "${sudo_prefix}port install"
            ;;
        choco)
            echo "choco install -y"
            ;;
        scoop)
            echo "scoop install"
            ;;
        winget)
            echo "winget install --silent"
            ;;
        snap)
            echo "${sudo_prefix}snap install"
            ;;
        flatpak)
            echo "flatpak install -y flathub"
            ;;
        npm)
            echo "npm install -g"
            ;;
        pip|pip3)
            echo "$pkg_manager install --user"
            ;;
        gem)
            echo "gem install"
            ;;
        cargo)
            echo "cargo install"
            ;;
        yay|paru)
            echo "$pkg_manager -S --noconfirm"
            ;;
        *)
            log_error "Unknown package manager: $pkg_manager"
            return 1
            ;;
    esac
}

# Get package manager update command
get_update_command() {
    local pkg_manager="$1"
    local sudo_prefix=""
    
    # Determine if sudo is needed
    case "$pkg_manager" in
        brew|scoop|pip|pip3|npm|gem|cargo|yay|paru)
            sudo_prefix=""
            ;;
        *)
            if [[ $EUID -ne 0 ]] && command_exists sudo; then
                sudo_prefix="sudo "
            fi
            ;;
    esac
    
    case "$pkg_manager" in
        apt)
            echo "${sudo_prefix}apt update"
            ;;
        apt-get)
            echo "${sudo_prefix}apt-get update"
            ;;
        dnf)
            echo "${sudo_prefix}dnf check-update"
            ;;
        yum)
            echo "${sudo_prefix}yum check-update"
            ;;
        pacman)
            echo "${sudo_prefix}pacman -Sy"
            ;;
        zypper)
            echo "${sudo_prefix}zypper refresh"
            ;;
        apk)
            echo "${sudo_prefix}apk update"
            ;;
        brew)
            echo "brew update"
            ;;
        port)
            echo "${sudo_prefix}port sync"
            ;;
        choco)
            echo "choco upgrade all -y"
            ;;
        scoop)
            echo "scoop update *"
            ;;
        snap)
            echo "${sudo_prefix}snap refresh"
            ;;
        flatpak)
            echo "flatpak update -y"
            ;;
        npm)
            echo "npm update -g"
            ;;
        pip|pip3)
            echo "$pkg_manager list --outdated --format=freeze | grep -v '^\\-e' | cut -d = -f 1 | xargs -n1 $pkg_manager install -U"
            ;;
        yay|paru)
            echo "$pkg_manager -Syu --noconfirm"
            ;;
        *)
            log_warn "No update command defined for: $pkg_manager"
            return 1
            ;;
    esac
}

# Resolve package name for specific package manager
resolve_package_name() {
    local package="$1"
    local pkg_manager="$2"
    
    local mapping_key="${package}:${pkg_manager}"
    
    if [[ -n "${PACKAGE_MAPPINGS[$mapping_key]:-}" ]]; then
        echo "${PACKAGE_MAPPINGS[$mapping_key]}"
    else
        # Return original package name as fallback
        echo "$package"
    fi
}

# Install package with automatic fallback
install_package() {
    local package="$1"
    local description="${2:-$package}"
    local force_manager="${3:-}"
    local max_attempts="${4:-3}"
    
    log_info "Installing $description..."
    
    local available_managers=()
    if [[ -n "$force_manager" ]]; then
        if command_exists "$force_manager"; then
            available_managers=("$force_manager")
        else
            log_error "Forced package manager '$force_manager' not available"
            return 1
        fi
    else
        # Get available package managers in order of preference
        while IFS= read -r mgr; do
            [[ -n "$mgr" ]] && available_managers+=("$mgr")
        done < <(detect_package_managers)
        
        # Add primary package manager at the beginning if not already present
        local primary_mgr
        if primary_mgr=$(get_primary_package_manager 2>/dev/null); then
            if [[ ! " ${available_managers[*]} " =~ " $primary_mgr " ]]; then
                available_managers=("$primary_mgr" "${available_managers[@]}")
            fi
        fi
    fi
    
    if [[ ${#available_managers[@]} -eq 0 ]]; then
        log_error "No package managers available for installing $package"
        return 1
    fi
    
    # Try each package manager until one succeeds
    for ((attempt=1; attempt<=max_attempts; attempt++)); do
        for mgr in "${available_managers[@]}"; do
            log_debug "Attempting to install $package using $mgr (attempt $attempt/$max_attempts)"
            
            # Resolve package name for this manager
            local resolved_package
            resolved_package=$(resolve_package_name "$package" "$mgr")
            
            # Get install command
            local install_cmd
            if install_cmd=$(get_install_command "$mgr" 2>/dev/null); then
                # Update package lists if needed
                if [[ "$mgr" =~ ^(apt|apt-get|dnf|yum|pacman|zypper|apk)$ ]]; then
                    local update_cmd
                    if update_cmd=$(get_update_command "$mgr" 2>/dev/null); then
                        log_debug "Updating package lists: $update_cmd"
                        if ! execute_command "$update_cmd" "Updating package lists" true; then
                            log_warn "Failed to update package lists, continuing anyway"
                        fi
                    fi
                fi
                
                # Attempt installation
                local full_cmd="$install_cmd $resolved_package"
                log_debug "Executing: $full_cmd"
                
                if execute_command "$full_cmd" "Installing $description via $mgr" true; then
                    log_success "Successfully installed $description using $mgr"
                    track_progress "${package}_installed_via_${mgr}"
                    return 0
                else
                    log_warn "Failed to install $package using $mgr"
                fi
            else
                log_warn "Could not determine install command for $mgr"
            fi
        done
        
        if [[ $attempt -lt $max_attempts ]]; then
            log_info "Retrying installation (attempt $((attempt + 1))/$max_attempts)..."
            sleep 2
        fi
    done
    
    log_error "Failed to install $package after $max_attempts attempts with all available package managers"
    return 1
}

# Install multiple packages with dependency resolution
install_packages() {
    local packages=("$@")
    
    if [[ ${#packages[@]} -eq 0 ]]; then
        log_warn "No packages specified for installation"
        return 0
    fi
    
    log_info "Installing ${#packages[@]} packages: ${packages[*]}"
    
    local failed_packages=()
    local success_count=0
    
    for package in "${packages[@]}"; do
        if install_package "$package"; then
            ((success_count++))
        else
            failed_packages+=("$package")
        fi
    done
    
    if [[ ${#failed_packages[@]} -eq 0 ]]; then
        log_success "All $success_count packages installed successfully"
        return 0
    else
        log_error "Failed to install ${#failed_packages[@]} packages: ${failed_packages[*]}"
        return 1
    fi
}

# Check if package is installed
is_package_installed() {
    local package="$1"
    local pkg_manager="${2:-}"
    
    # If specific package manager is provided, use its check command
    if [[ -n "$pkg_manager" ]]; then
        case "$pkg_manager" in
            apt|apt-get)
                dpkg -l "$package" 2>/dev/null | grep -q "^ii"
                ;;
            dnf|yum)
                rpm -q "$package" >/dev/null 2>&1
                ;;
            pacman)
                pacman -Q "$package" >/dev/null 2>&1
                ;;
            zypper)
                rpm -q "$package" >/dev/null 2>&1
                ;;
            apk)
                apk info -e "$package" >/dev/null 2>&1
                ;;
            brew)
                brew list "$package" >/dev/null 2>&1
                ;;
            choco)
                choco list --local-only "$package" 2>/dev/null | grep -q "$package"
                ;;
            npm)
                npm list -g "$package" >/dev/null 2>&1
                ;;
            pip|pip3)
                "$pkg_manager" show "$package" >/dev/null 2>&1
                ;;
            *)
                # Fallback to command existence check
                command_exists "$package"
                ;;
        esac
    else
        # Generic check - try to find the package in the system
        command_exists "$package" || {
            # Try common package managers
            dpkg -l "$package" 2>/dev/null | grep -q "^ii" || \
            rpm -q "$package" >/dev/null 2>&1 || \
            pacman -Q "$package" >/dev/null 2>&1 || \
            brew list "$package" >/dev/null 2>&1 || \
            apk info -e "$package" >/dev/null 2>&1
        }
    fi
}

# Healthcare-specific package installation
install_healthcare_dependencies() {
    log_info "Installing healthcare-specific dependencies..."
    
    local healthcare_packages=(
        "nodejs"      # Backend runtime
        "postgresql"  # Primary database
        "redis"       # Session store and caching
        "git"         # Version control
        "curl"        # HTTP client
        "jq"          # JSON processing
        "docker"      # Containerization (if not skipped)
    )
    
    # Add platform-specific packages
    case "$DETECTED_PLATFORM" in
        ${PLATFORM_LINUX}|${PLATFORM_WSL})
            healthcare_packages+=("build-essential" "python3-dev" "libpq-dev")
            ;;
        ${PLATFORM_MACOS})
            healthcare_packages+=("python3" "libpq")
            ;;
    esac
    
    local failed_installs=()
    
    for package in "${healthcare_packages[@]}"; do
        if ! is_package_installed "$package"; then
            if ! install_package "$package" "Healthcare dependency: $package"; then
                failed_installs+=("$package")
            fi
        else
            log_debug "Healthcare dependency already installed: $package"
        fi
    done
    
    if [[ ${#failed_installs[@]} -gt 0 ]]; then
        log_error "Failed to install critical healthcare dependencies: ${failed_installs[*]}"
        log_error "This may impact healthcare platform functionality"
        return 1
    fi
    
    log_success "All healthcare dependencies installed successfully"
    return 0
}

# Performance optimization for package installations
optimize_package_installation() {
    log_info "Optimizing package installation performance..."
    
    # Get primary package manager
    local primary_mgr
    if ! primary_mgr=$(get_primary_package_manager); then
        log_warn "Could not determine primary package manager for optimization"
        return 1
    fi
    
    case "$primary_mgr" in
        apt|apt-get)
            # Optimize APT performance
            log_debug "Optimizing APT performance..."
            if [[ $EUID -eq 0 ]] || command_exists sudo; then
                local sudo_prefix=""
                [[ $EUID -ne 0 ]] && sudo_prefix="sudo "
                
                # Enable parallel downloads
                execute_command "${sudo_prefix}echo 'APT::Acquire::Retries \"3\";' > /etc/apt/apt.conf.d/80retries" "Setting APT retries" true
                execute_command "${sudo_prefix}echo 'Acquire::http::Pipeline-Depth \"50\";' > /etc/apt/apt.conf.d/80pipeline" "Setting APT pipeline depth" true
            fi
            ;;
        dnf)
            # Optimize DNF performance
            log_debug "Optimizing DNF performance..."
            if [[ -f /etc/dnf/dnf.conf ]]; then
                execute_command "grep -q 'max_parallel_downloads' /etc/dnf/dnf.conf || echo 'max_parallel_downloads=10' | sudo tee -a /etc/dnf/dnf.conf" "Setting DNF parallel downloads" true
            fi
            ;;
        brew)
            # Optimize Homebrew performance
            log_debug "Optimizing Homebrew performance..."
            export HOMEBREW_NO_AUTO_UPDATE=1
            export HOMEBREW_NO_INSTALL_CLEANUP=1
            ;;
    esac
    
    log_success "Package installation optimization completed"
}

# Cleanup package manager caches
cleanup_package_caches() {
    log_info "Cleaning up package manager caches to save disk space..."
    
    local primary_mgr
    if primary_mgr=$(get_primary_package_manager 2>/dev/null); then
        case "$primary_mgr" in
            apt|apt-get)
                execute_command "sudo apt autoremove -y && sudo apt autoclean" "Cleaning APT cache" true
                ;;
            dnf)
                execute_command "sudo dnf autoremove -y && sudo dnf clean all" "Cleaning DNF cache" true
                ;;
            yum)
                execute_command "sudo yum autoremove -y && sudo yum clean all" "Cleaning YUM cache" true
                ;;
            pacman)
                execute_command "sudo pacman -Sc --noconfirm" "Cleaning Pacman cache" true
                ;;
            brew)
                execute_command "brew cleanup --prune=all" "Cleaning Homebrew cache" true
                ;;
        esac
    fi
}

# Export functions for use in other scripts
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    # Script is being sourced
    export -f get_primary_package_manager
    export -f install_package
    export -f install_packages
    export -f is_package_installed
    export -f install_healthcare_dependencies
fi