#!/bin/bash
#
# MediMate Malaysia - Simple Cross-Platform Package Manager Utilities
# Simplified version for older bash compatibility
#

set -euo pipefail

# Ensure common functions are available
if ! declare -f log_info >/dev/null 2>&1; then
    source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
fi

# Initialize global variables with defaults
: "${DETECTED_PLATFORM:=0}"
: "${PLATFORM_MACOS:=1}"
: "${PLATFORM_LINUX:=2}"
: "${PLATFORM_WINDOWS:=3}"
: "${PLATFORM_WSL:=4}"

# Get primary package manager for current platform
get_primary_package_manager() {
    case "${DETECTED_PLATFORM:-0}" in
        $PLATFORM_MACOS)
            if command_exists brew; then echo "brew"
            elif command_exists port; then echo "port"
            else echo ""
            fi
            ;;
        $PLATFORM_LINUX|$PLATFORM_WSL)
            if command_exists apt; then echo "apt"
            elif command_exists apt-get; then echo "apt-get"
            elif command_exists dnf; then echo "dnf"
            elif command_exists yum; then echo "yum"
            elif command_exists pacman; then echo "pacman"
            elif command_exists zypper; then echo "zypper"
            elif command_exists apk; then echo "apk"
            else echo ""
            fi
            ;;
        $PLATFORM_WINDOWS)
            if command_exists choco; then echo "choco"
            elif command_exists scoop; then echo "scoop"
            elif command_exists winget; then echo "winget"
            else echo ""
            fi
            ;;
        *)
            echo ""
            ;;
    esac
}

# Get install command for package manager
get_install_command() {
    local pkg_manager="$1"
    local sudo_prefix=""
    
    # Determine if sudo is needed
    case "$pkg_manager" in
        brew|scoop|npm|pip|pip3|gem|cargo)
            sudo_prefix=""
            ;;
        *)
            if [[ $EUID -ne 0 ]] && command_exists sudo; then
                sudo_prefix="sudo "
            fi
            ;;
    esac
    
    case "$pkg_manager" in
        apt) echo "${sudo_prefix}apt install -y" ;;
        apt-get) echo "${sudo_prefix}apt-get install -y" ;;
        dnf) echo "${sudo_prefix}dnf install -y" ;;
        yum) echo "${sudo_prefix}yum install -y" ;;
        pacman) echo "${sudo_prefix}pacman -S --noconfirm" ;;
        zypper) echo "${sudo_prefix}zypper install -y" ;;
        apk) echo "${sudo_prefix}apk add" ;;
        brew) echo "brew install" ;;
        port) echo "${sudo_prefix}port install" ;;
        choco) echo "choco install -y" ;;
        scoop) echo "scoop install" ;;
        winget) echo "winget install --silent" ;;
        npm) echo "npm install -g" ;;
        pip|pip3) echo "$pkg_manager install --user" ;;
        gem) echo "gem install" ;;
        cargo) echo "cargo install" ;;
        *) echo ""; return 1 ;;
    esac
}

# Simple package installation with fallbacks
install_package() {
    local package="$1"
    local description="${2:-$package}"
    
    log_info "Installing $description..."
    
    local primary_mgr
    if ! primary_mgr=$(get_primary_package_manager); then
        log_error "No package manager available"
        return 1
    fi
    
    local install_cmd
    if ! install_cmd=$(get_install_command "$primary_mgr"); then
        log_error "Could not determine install command"
        return 1
    fi
    
    local full_cmd="$install_cmd $package"
    log_debug "Executing: $full_cmd"
    
    if execute_command "$full_cmd" "Installing $description"; then
        log_success "Successfully installed $description"
        return 0
    else
        log_error "Failed to install $package"
        return 1
    fi
}

# Install multiple packages
install_packages() {
    local packages=("$@")
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

# Healthcare-specific dependencies installation
install_healthcare_dependencies() {
    log_info "Installing healthcare platform dependencies..."
    
    local healthcare_packages=("git" "curl" "jq")
    
    # Add platform-specific packages
    case "${DETECTED_PLATFORM:-0}" in
        $PLATFORM_LINUX|$PLATFORM_WSL)
            healthcare_packages+=("python3" "build-essential")
            ;;
        $PLATFORM_MACOS)
            healthcare_packages+=("python3")
            ;;
    esac
    
    install_packages "${healthcare_packages[@]}"
}

# Check if package is installed (simple version)
is_package_installed() {
    local package="$1"
    command_exists "$package"
}

# Export functions for compatibility
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    export -f get_primary_package_manager 2>/dev/null || true
    export -f install_package 2>/dev/null || true
    export -f install_packages 2>/dev/null || true
    export -f install_healthcare_dependencies 2>/dev/null || true
fi