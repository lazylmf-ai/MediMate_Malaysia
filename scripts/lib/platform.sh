#!/bin/bash
#
# MediMate Malaysia - Enhanced Cross-Platform Detection & Compatibility
# Advanced platform detection with WSL, multiple distros, and fallback support
#

set -euo pipefail

# Ensure common functions are available
if [[ -z "${SCRIPT_DIR:-}" ]]; then
    readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

# Source common functions if not already loaded
if ! declare -f log_info >/dev/null 2>&1; then
    source "${SCRIPT_DIR}/lib/common.sh"
fi

# Platform detection constants
readonly PLATFORM_UNKNOWN=0
readonly PLATFORM_MACOS=1
readonly PLATFORM_LINUX=2
readonly PLATFORM_WINDOWS=3
readonly PLATFORM_WSL=4

# Architecture constants
readonly ARCH_X64="x64"
readonly ARCH_X86="x86"
readonly ARCH_ARM64="arm64"
readonly ARCH_ARM="arm"

# Global platform information
DETECTED_PLATFORM=${PLATFORM_UNKNOWN}
DETECTED_ARCH=""
DETECTED_DISTRO=""
DETECTED_DISTRO_VERSION=""
IS_WSL=false
WSL_VERSION=""

# Enhanced platform detection with WSL support
detect_platform_enhanced() {
    log_info "Running enhanced cross-platform detection..."
    
    local os_name
    os_name=$(uname -s)
    
    # Check for WSL first (most specific)
    if detect_wsl; then
        DETECTED_PLATFORM=${PLATFORM_WSL}
        log_info "Platform: Windows Subsystem for Linux (WSL ${WSL_VERSION})"
        return 0
    fi
    
    case "$os_name" in
        Darwin*)
            DETECTED_PLATFORM=${PLATFORM_MACOS}
            detect_macos_version
            log_info "Platform: macOS $(get_macos_version)"
            return 0
            ;;
        Linux*)
            DETECTED_PLATFORM=${PLATFORM_LINUX}
            detect_linux_enhanced
            log_info "Platform: Linux (${DETECTED_DISTRO} ${DETECTED_DISTRO_VERSION})"
            return 0
            ;;
        CYGWIN*|MINGW*|MSYS*)
            DETECTED_PLATFORM=${PLATFORM_WINDOWS}
            log_info "Platform: Windows (MSYS/MinGW environment)"
            return 0
            ;;
        *)
            DETECTED_PLATFORM=${PLATFORM_UNKNOWN}
            log_error "Unknown platform: $os_name"
            return 1
            ;;
    esac
}

# WSL detection with version identification
detect_wsl() {
    # Check for WSL-specific files and environment variables
    if [[ -f /proc/version ]] && grep -qi "Microsoft\|WSL" /proc/version; then
        IS_WSL=true
        
        # Determine WSL version
        if [[ -f /proc/version ]] && grep -qi "WSL2" /proc/version; then
            WSL_VERSION="2"
        elif [[ -n "${WSL_DISTRO_NAME:-}" ]] || [[ -n "${WSL_INTEROP:-}" ]]; then
            WSL_VERSION="2"
        else
            WSL_VERSION="1"
        fi
        
        log_debug "WSL detected: version ${WSL_VERSION}"
        
        # Also detect the underlying Linux distribution in WSL
        detect_linux_enhanced
        
        return 0
    fi
    
    return 1
}

# Enhanced Linux distribution detection
detect_linux_enhanced() {
    log_debug "Detecting Linux distribution..."
    
    local distro_id=""
    local version_id=""
    local pretty_name=""
    
    # Primary method: /etc/os-release (systemd standard)
    if [[ -f /etc/os-release ]]; then
        # Parse os-release file safely
        while IFS='=' read -r key value; do
            # Remove quotes and handle key-value pairs
            value="${value%\"}"
            value="${value#\"}"
            
            case "$key" in
                ID) distro_id="$value" ;;
                VERSION_ID) version_id="$value" ;;
                PRETTY_NAME) pretty_name="$value" ;;
            esac
        done < /etc/os-release
        
        DETECTED_DISTRO="$distro_id"
        DETECTED_DISTRO_VERSION="$version_id"
        
        log_debug "Detected from os-release: $distro_id $version_id ($pretty_name)"
        
    # Fallback methods for older systems
    elif [[ -f /etc/lsb-release ]]; then
        source /etc/lsb-release 2>/dev/null || true
        DETECTED_DISTRO="${DISTRIB_ID,,}"  # Convert to lowercase
        DETECTED_DISTRO_VERSION="${DISTRIB_RELEASE:-}"
        log_debug "Detected from lsb-release: $DETECTED_DISTRO $DETECTED_DISTRO_VERSION"
        
    elif [[ -f /etc/redhat-release ]]; then
        local release_content
        release_content=$(cat /etc/redhat-release)
        
        if [[ "$release_content" =~ CentOS ]]; then
            DETECTED_DISTRO="centos"
        elif [[ "$release_content" =~ "Red Hat" ]]; then
            DETECTED_DISTRO="rhel"
        elif [[ "$release_content" =~ Fedora ]]; then
            DETECTED_DISTRO="fedora"
        else
            DETECTED_DISTRO="redhat"
        fi
        
        # Extract version number
        if [[ "$release_content" =~ ([0-9]+\.[0-9]+) ]]; then
            DETECTED_DISTRO_VERSION="${BASH_REMATCH[1]}"
        fi
        
        log_debug "Detected from redhat-release: $DETECTED_DISTRO $DETECTED_DISTRO_VERSION"
        
    elif [[ -f /etc/debian_version ]]; then
        DETECTED_DISTRO="debian"
        DETECTED_DISTRO_VERSION=$(cat /etc/debian_version)
        log_debug "Detected from debian_version: $DETECTED_DISTRO $DETECTED_DISTRO_VERSION"
        
    else
        DETECTED_DISTRO="unknown"
        DETECTED_DISTRO_VERSION=""
        log_warn "Could not detect Linux distribution"
    fi
    
    # Normalize distribution names
    case "$DETECTED_DISTRO" in
        ubuntu|Ubuntu) DETECTED_DISTRO="ubuntu" ;;
        debian|Debian) DETECTED_DISTRO="debian" ;;
        fedora|Fedora) DETECTED_DISTRO="fedora" ;;
        centos|CentOS) DETECTED_DISTRO="centos" ;;
        rhel|"Red Hat"*) DETECTED_DISTRO="rhel" ;;
        arch|Arch*) DETECTED_DISTRO="arch" ;;
        manjaro|Manjaro) DETECTED_DISTRO="manjaro" ;;
        opensuse*|openSUSE*) DETECTED_DISTRO="opensuse" ;;
        alpine|Alpine) DETECTED_DISTRO="alpine" ;;
        *)
            log_debug "Distribution '$DETECTED_DISTRO' will use generic Linux handling"
            ;;
    esac
}

# macOS version detection
detect_macos_version() {
    if [[ "$(uname -s)" == "Darwin" ]]; then
        DETECTED_DISTRO="macos"
        DETECTED_DISTRO_VERSION=$(sw_vers -productVersion 2>/dev/null || echo "unknown")
        log_debug "macOS version: $DETECTED_DISTRO_VERSION"
    fi
}

# Get human-readable macOS version
get_macos_version() {
    local version="${DETECTED_DISTRO_VERSION:-unknown}"
    
    case "$version" in
        14.*) echo "$version (Sonoma)" ;;
        13.*) echo "$version (Ventura)" ;;
        12.*) echo "$version (Monterey)" ;;
        11.*) echo "$version (Big Sur)" ;;
        10.15.*) echo "$version (Catalina)" ;;
        10.14.*) echo "$version (Mojave)" ;;
        *) echo "$version" ;;
    esac
}

# Enhanced architecture detection
detect_architecture_enhanced() {
    local arch
    arch=$(uname -m)
    
    case "$arch" in
        x86_64|amd64)
            DETECTED_ARCH="${ARCH_X64}"
            ;;
        i386|i686|x86)
            DETECTED_ARCH="${ARCH_X86}"
            ;;
        aarch64|arm64)
            DETECTED_ARCH="${ARCH_ARM64}"
            # Special handling for Apple Silicon
            if [[ "$(uname -s)" == "Darwin" ]] && sysctl -n machdep.cpu.brand_string 2>/dev/null | grep -q "Apple"; then
                log_debug "Apple Silicon detected"
            fi
            ;;
        armv7l|armv6l|arm)
            DETECTED_ARCH="${ARCH_ARM}"
            ;;
        *)
            log_warn "Unknown architecture: $arch, defaulting to x64"
            DETECTED_ARCH="${ARCH_X64}"
            ;;
    esac
    
    log_debug "Architecture: $DETECTED_ARCH ($arch)"
}

# Package manager detection with fallbacks
detect_package_managers() {
    log_debug "Detecting available package managers..."
    
    local available_managers=()
    
    case "$DETECTED_PLATFORM" in
        ${PLATFORM_MACOS})
            # macOS package managers in order of preference
            command_exists brew && available_managers+=("brew")
            command_exists port && available_managers+=("port")
            command_exists fink && available_managers+=("fink")
            ;;
            
        ${PLATFORM_LINUX}|${PLATFORM_WSL})
            # Linux package managers based on distribution
            case "$DETECTED_DISTRO" in
                ubuntu|debian)
                    command_exists apt && available_managers+=("apt")
                    command_exists apt-get && available_managers+=("apt-get")
                    command_exists dpkg && available_managers+=("dpkg")
                    ;;
                fedora|rhel|centos)
                    command_exists dnf && available_managers+=("dnf")
                    command_exists yum && available_managers+=("yum")
                    command_exists rpm && available_managers+=("rpm")
                    ;;
                arch|manjaro)
                    command_exists pacman && available_managers+=("pacman")
                    command_exists yay && available_managers+=("yay")
                    command_exists paru && available_managers+=("paru")
                    ;;
                opensuse)
                    command_exists zypper && available_managers+=("zypper")
                    command_exists rpm && available_managers+=("rpm")
                    ;;
                alpine)
                    command_exists apk && available_managers+=("apk")
                    ;;
            esac
            
            # Universal Linux package managers
            command_exists snap && available_managers+=("snap")
            command_exists flatpak && available_managers+=("flatpak")
            command_exists appimage && available_managers+=("appimage")
            ;;
            
        ${PLATFORM_WINDOWS})
            # Windows package managers
            command_exists choco && available_managers+=("choco")
            command_exists scoop && available_managers+=("scoop")
            command_exists winget && available_managers+=("winget")
            ;;
    esac
    
    # Universal package managers (available on multiple platforms)
    command_exists npm && available_managers+=("npm")
    command_exists pip && available_managers+=("pip")
    command_exists pip3 && available_managers+=("pip3")
    command_exists gem && available_managers+=("gem")
    command_exists cargo && available_managers+=("cargo")
    
    if [[ ${#available_managers[@]} -eq 0 ]]; then
        log_warn "No package managers detected"
    else
        log_debug "Available package managers: ${available_managers[*]}"
    fi
    
    # Export as array for use by other scripts
    printf '%s\n' "${available_managers[@]}"
}

# System compatibility check
check_system_compatibility() {
    log_info "Checking system compatibility for MediMate Malaysia..."
    
    # Run platform detection
    detect_platform_enhanced
    detect_architecture_enhanced
    
    # Minimum system requirements for healthcare platform
    local requirements_met=true
    
    # Memory check (minimum 4GB for healthcare applications)
    local memory_gb
    memory_gb=$(get_system_memory_gb)
    
    if [[ "$memory_gb" -lt 4 ]]; then
        log_warn "System has ${memory_gb}GB RAM. Healthcare applications require minimum 4GB"
        requirements_met=false
    else
        log_debug "Memory: ${memory_gb}GB (sufficient for healthcare workloads)"
    fi
    
    # Disk space check (minimum 10GB for healthcare data)
    local disk_available_gb
    if command_exists df; then
        case "$DETECTED_PLATFORM" in
            ${PLATFORM_MACOS})
                disk_available_gb=$(df -BG . 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G' || echo "0")
                ;;
            ${PLATFORM_LINUX}|${PLATFORM_WSL})
                disk_available_gb=$(df -BG . 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G' || echo "0")
                ;;
            *)
                disk_available_gb=10  # Assume sufficient for Windows
                ;;
        esac
        
        if [[ "$disk_available_gb" -lt 10 ]]; then
            log_warn "Available disk space: ${disk_available_gb}GB. Healthcare platform requires minimum 10GB"
            requirements_met=false
        else
            log_debug "Disk space: ${disk_available_gb}GB (sufficient for healthcare data)"
        fi
    fi
    
    # Platform-specific compatibility checks
    case "$DETECTED_PLATFORM" in
        ${PLATFORM_WSL})
            check_wsl_compatibility
            ;;
        ${PLATFORM_LINUX})
            check_linux_compatibility
            ;;
        ${PLATFORM_MACOS})
            check_macos_compatibility
            ;;
        ${PLATFORM_WINDOWS})
            check_windows_compatibility
            ;;
    esac
    
    if [[ "$requirements_met" == "true" ]]; then
        log_success "System compatibility check passed"
        return 0
    else
        log_error "System does not meet minimum requirements for healthcare platform"
        return 1
    fi
}

# WSL-specific compatibility checks
check_wsl_compatibility() {
    log_debug "Checking WSL-specific compatibility..."
    
    # Check WSL version
    if [[ "$WSL_VERSION" == "1" ]]; then
        log_warn "WSL 1 detected. WSL 2 is recommended for better Docker support"
    else
        log_debug "WSL 2 detected (recommended)"
    fi
    
    # Check if systemd is enabled (WSL 2)
    if [[ "$WSL_VERSION" == "2" ]] && command_exists systemctl; then
        if systemctl is-system-running >/dev/null 2>&1; then
            log_debug "systemd is running (good for healthcare services)"
        else
            log_debug "systemd not running (services may need manual management)"
        fi
    fi
    
    # Check Windows interop
    if [[ -n "${WSL_INTEROP:-}" ]] || [[ -n "${WSLENV:-}" ]]; then
        log_debug "Windows interop available (good for hybrid workflows)"
    fi
}

# Linux-specific compatibility checks
check_linux_compatibility() {
    log_debug "Checking Linux-specific compatibility..."
    
    # Check for containerization support (important for healthcare isolation)
    if [[ -f /proc/version ]] && grep -qi "docker\|container" /proc/version; then
        log_debug "Container runtime detected"
    fi
    
    # Check for security modules (important for healthcare compliance)
    if command_exists getenforce && [[ "$(getenforce 2>/dev/null || echo 'disabled')" != "Disabled" ]]; then
        log_debug "SELinux is active (good for healthcare security)"
    fi
    
    if [[ -d /sys/kernel/security/apparmor ]]; then
        log_debug "AppArmor detected (good for healthcare security)"
    fi
}

# macOS-specific compatibility checks
check_macos_compatibility() {
    log_debug "Checking macOS-specific compatibility..."
    
    # Check Xcode Command Line Tools
    if xcode-select -p >/dev/null 2>&1; then
        log_debug "Xcode Command Line Tools installed"
    else
        log_warn "Xcode Command Line Tools not found - required for development"
    fi
    
    # Check SIP status (System Integrity Protection)
    if command_exists csrutil; then
        local sip_status
        sip_status=$(csrutil status 2>/dev/null | awk '{print $5}' || echo "unknown")
        log_debug "System Integrity Protection: $sip_status"
    fi
}

# Windows-specific compatibility checks
check_windows_compatibility() {
    log_debug "Checking Windows-specific compatibility..."
    
    # This function would be called from PowerShell context
    # For now, we'll assume basic compatibility
    log_debug "Windows compatibility check (basic)"
}

# Get platform information as JSON for other tools
get_platform_info_json() {
    local package_managers
    package_managers=$(detect_package_managers | jq -R . | jq -s .)
    
    cat << EOF
{
    "platform": {
        "os": "$(case $DETECTED_PLATFORM in
            $PLATFORM_MACOS) echo "macos" ;;
            $PLATFORM_LINUX) echo "linux" ;;
            $PLATFORM_WINDOWS) echo "windows" ;;
            $PLATFORM_WSL) echo "wsl" ;;
            *) echo "unknown" ;;
        esac)",
        "distribution": "${DETECTED_DISTRO}",
        "version": "${DETECTED_DISTRO_VERSION}",
        "architecture": "${DETECTED_ARCH}",
        "is_wsl": ${IS_WSL},
        "wsl_version": "${WSL_VERSION}"
    },
    "package_managers": $package_managers,
    "system": {
        "memory_gb": $(get_system_memory_gb),
        "disk_available_gb": $(df -BG . 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G' || echo "0")
    },
    "detection_timestamp": "$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
}
EOF
}

# Initialize platform detection if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Initialize logging to stderr only for standalone execution
    LOG_FILE=""
    
    # Script is being run directly, perform detection
    detect_platform_enhanced
    detect_architecture_enhanced
    
    # Output results to stdout
    echo "Platform Detection Results:"
    echo "=========================="
    echo "Platform: $DETECTED_PLATFORM"
    echo "Distribution: $DETECTED_DISTRO $DETECTED_DISTRO_VERSION"
    echo "Architecture: $DETECTED_ARCH"
    echo "WSL: $IS_WSL (version: $WSL_VERSION)"
    echo
    echo "Package Managers:"
    detect_package_managers | sed 's/^/  - /'
    echo
    if command -v jq >/dev/null 2>&1; then
        echo "JSON Output:"
        get_platform_info_json | jq .
    else
        echo "JSON Output (install jq for formatting):"
        get_platform_info_json
    fi
fi