#!/bin/bash
#
# MediMate Malaysia - Automated Troubleshooting Guide Generation
# Generates platform-specific troubleshooting documentation
#

set -euo pipefail

# Source common libraries
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
source "${SCRIPT_DIR}/../lib/common.sh"

# Configuration
readonly DOCS_DIR="$PROJECT_ROOT/docs"

# Generate Windows troubleshooting guide
generate_windows_troubleshooting() {
    log_info "Generating Windows troubleshooting guide..."
    
    cat > "$DOCS_DIR/troubleshooting-windows.md" << 'EOF'
# Windows Troubleshooting Guide

## Common Issues and Solutions

### PowerShell Execution Policy Issues

**Problem**: PowerShell refuses to run scripts with execution policy errors.

**Solution**:
```powershell
# Check current execution policy
Get-ExecutionPolicy

# Set execution policy for current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Set execution policy for current process only
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

### Package Manager Installation Failures

#### Chocolatey Installation Issues

**Problem**: Chocolatey installation fails due to network or permission issues.

**Solutions**:
1. **Run as Administrator**: Right-click PowerShell and select "Run as Administrator"
2. **Check Internet Connection**: Ensure you can access `chocolatey.org`
3. **Disable Antivirus Temporarily**: Some antivirus software blocks Chocolatey
4. **Manual Installation**:
   ```powershell
   # Download and install manually
   $url = 'https://community.chocolatey.org/install.ps1'
   $script = Invoke-WebRequest -Uri $url -UseBasicParsing
   Invoke-Expression $script.Content
   ```

#### Scoop Installation Issues (Fallback)

**Problem**: Scoop installation fails or Chocolatey requires admin rights.

**Solution**:
```powershell
# Install Scoop (no admin required)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Add essential buckets
scoop bucket add main
scoop bucket add extras
scoop bucket add versions
```

### Node.js Installation Problems

**Problem**: Node.js installation fails or wrong version is installed.

**Solutions**:
1. **Using Chocolatey**:
   ```powershell
   # Install specific version
   choco install nodejs --version=18.17.0
   
   # Upgrade existing installation
   choco upgrade nodejs
   ```

2. **Using Scoop**:
   ```powershell
   # Install Node.js
   scoop install nodejs
   
   # Install specific version
   scoop install nodejs@18.17.0
   ```

3. **Manual Installation**:
   - Download from [nodejs.org](https://nodejs.org/)
   - Install the Windows Installer (.msi)
   - Restart PowerShell after installation

4. **Version Issues**:
   ```powershell
   # Check installed version
   node --version
   npm --version
   
   # Update npm separately
   npm install -g npm@latest
   ```

### Docker Desktop Issues

**Problem**: Docker Desktop installation fails or doesn't start.

**Solutions**:
1. **System Requirements**: Ensure Windows 10/11 with Hyper-V or WSL2
2. **Enable Windows Features**:
   ```powershell
   # Enable Hyper-V (requires restart)
   Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
   
   # Enable WSL2 (alternative to Hyper-V)
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   ```

3. **Manual Installation**:
   - Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)
   - Run installer as Administrator
   - Restart computer after installation

4. **WSL2 Issues**:
   ```powershell
   # Update WSL2
   wsl --update
   
   # Set WSL2 as default
   wsl --set-default-version 2
   
   # Check WSL distributions
   wsl --list --verbose
   ```

### Environment Variables and PATH Issues

**Problem**: Commands not found after installation (node, npm, python, etc.).

**Solutions**:
1. **Refresh Environment Variables**:
   ```powershell
   # Refresh PATH in current session
   $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
   
   # Or restart PowerShell
   ```

2. **Check PATH**:
   ```powershell
   # View current PATH
   $env:PATH -split ';'
   
   # Check if Node.js is in PATH
   where.exe node
   ```

3. **Manual PATH Update**:
   ```powershell
   # Add to user PATH (permanent)
   $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
   [Environment]::SetEnvironmentVariable("Path", $userPath + ";C:\Program Files\nodejs", "User")
   ```

### Windows Defender and Antivirus Issues

**Problem**: Windows Defender or antivirus software blocks installation.

**Solutions**:
1. **Add Exclusions**:
   - Add project directory to Windows Defender exclusions
   - Add `%LOCALAPPDATA%\npm` to exclusions
   - Add `%APPDATA%\npm` to exclusions

2. **Temporarily Disable Real-time Protection**:
   - Open Windows Security
   - Go to Virus & threat protection
   - Manage settings under Real-time protection
   - Turn off temporarily during installation

### Permission and Access Issues

**Problem**: Access denied errors during installation or setup.

**Solutions**:
1. **Run as Administrator**: Right-click PowerShell and select "Run as Administrator"
2. **User Account Control (UAC)**: Temporarily lower UAC settings if needed
3. **File Permissions**:
   ```powershell
   # Take ownership of directory
   takeown /r /f "C:\path\to\directory"
   
   # Grant full control
   icacls "C:\path\to\directory" /grant %USERNAME%:F /T
   ```

### Network and Proxy Issues

**Problem**: Downloads fail due to network or proxy configuration.

**Solutions**:
1. **Configure npm for Corporate Proxy**:
   ```powershell
   npm config set proxy http://proxy-server:port
   npm config set https-proxy http://proxy-server:port
   
   # For authenticated proxy
   npm config set proxy http://username:password@proxy-server:port
   ```

2. **Configure Chocolatey for Proxy**:
   ```powershell
   choco config set proxy http://proxy-server:port
   choco config set proxyUser username
   choco config set proxyPassword password
   ```

3. **PowerShell Proxy Configuration**:
   ```powershell
   # Set proxy for current session
   $proxy = New-Object System.Net.WebProxy("http://proxy-server:port")
   [System.Net.WebRequest]::DefaultWebProxy = $proxy
   ```

### Long Path Support Issues

**Problem**: Path too long errors during npm install or git operations.

**Solutions**:
1. **Enable Long Path Support** (Windows 10 1607+):
   ```powershell
   # Run as Administrator
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```

2. **Configure Git for Long Paths**:
   ```powershell
   git config --global core.longpaths true
   ```

3. **Use Shorter Project Paths**: Move project to a shorter path like `C:\dev\medimate`

### Build and Compilation Errors

**Problem**: Native module compilation fails during npm install.

**Solutions**:
1. **Install Visual Studio Build Tools**:
   ```powershell
   # Using Chocolatey
   choco install visualstudio2022-workload-vctools
   
   # Or install manually from Microsoft
   ```

2. **Install Python for node-gyp**:
   ```powershell
   # Install Python (required for native modules)
   choco install python3
   
   # Configure npm to use Python
   npm config set python python3
   ```

3. **Windows SDK Issues**:
   ```powershell
   # Install Windows SDK
   choco install windows-sdk-10-version-2004-all
   ```

## Diagnostic Commands

### System Information
```powershell
# Windows version
Get-CimInstance -ClassName Win32_OperatingSystem | Select-Object Caption, Version, Architecture

# PowerShell version
$PSVersionTable.PSVersion

# Available memory
Get-CimInstance -ClassName Win32_ComputerSystem | Select-Object TotalPhysicalMemory

# Disk space
Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID, @{Name="Size(GB)";Expression={[math]::Round($_.Size/1GB,2)}}, @{Name="FreeSpace(GB)";Expression={[math]::Round($_.FreeSpace/1GB,2)}}
```

### Package Manager Status
```powershell
# Check Chocolatey
if (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "Chocolatey: Installed"
    choco --version
} else {
    Write-Host "Chocolatey: Not installed"
}

# Check Scoop
if (Get-Command scoop -ErrorAction SilentlyContinue) {
    Write-Host "Scoop: Installed"
    scoop --version
} else {
    Write-Host "Scoop: Not installed"
}
```

### Development Tools Status
```powershell
# Node.js and npm
try {
    Write-Host "Node.js: $(node --version)"
    Write-Host "npm: $(npm --version)"
} catch {
    Write-Host "Node.js: Not installed or not in PATH"
}

# Python
try {
    Write-Host "Python: $(python --version)"
} catch {
    Write-Host "Python: Not installed or not in PATH"
}

# Git
try {
    Write-Host "Git: $(git --version)"
} catch {
    Write-Host "Git: Not installed or not in PATH"
}

# Docker
try {
    Write-Host "Docker: $(docker --version)"
    Write-Host "Docker Compose: $(docker-compose --version)"
} catch {
    Write-Host "Docker: Not installed or not in PATH"
}
```

### Network Connectivity Tests
```powershell
# Test internet connectivity
Test-NetConnection -ComputerName google.com -Port 443

# Test package manager endpoints
Test-NetConnection -ComputerName chocolatey.org -Port 443
Test-NetConnection -ComputerName registry.npmjs.org -Port 443
Test-NetConnection -ComputerName github.com -Port 443

# Test proxy (if applicable)
# Replace with your proxy server
# Test-NetConnection -ComputerName your-proxy-server -Port 8080
```

## Performance Optimization

### System Performance
1. **Disable Windows Search Indexing** for development directories
2. **Add Antivirus Exclusions** for:
   - Project directories
   - `node_modules` folders
   - npm cache directories
   - Git repositories

3. **SSD Optimization**:
   - Disable defragmentation for SSDs
   - Enable TRIM support
   - Disable hibernation if not needed

### Development Environment
```powershell
# Increase PowerShell history size
Set-PSReadLineOption -MaximumHistoryCount 4000

# Enable tab completion for npm
npm completion >> $profile

# Configure npm for better performance
npm config set cache-min 86400
npm config set prefer-offline true
```

## Getting Additional Help

1. **Check Setup Logs**: Review `setup.log` in the project root
2. **Windows Event Viewer**: Check for system errors during installation
3. **Package Manager Logs**:
   - Chocolatey: `$env:ALLUSERSPROFILE\chocolatey\logs\chocolatey.log`
   - Scoop: `$env:USERPROFILE\scoop\apps\scoop\current\README.md`

4. **Community Resources**:
   - [Chocolatey Documentation](https://docs.chocolatey.org/)
   - [Scoop Documentation](https://scoop.sh/)
   - [Node.js Troubleshooting](https://nodejs.org/en/docs/guides/)

## Emergency Recovery

If the automated setup completely fails:

1. **Clean Installation**:
   ```powershell
   # Remove Chocolatey
   Remove-Item -Path $env:ChocolateyInstall -Recurse -Force
   
   # Remove Scoop
   scoop uninstall scoop
   
   # Clean PATH
   # Manually edit environment variables to remove package manager paths
   ```

2. **Manual Setup**: Follow the manual installation steps in the main README

3. **Virtual Machine**: Consider using a clean Windows VM for development

4. **WSL2 Alternative**: Use Windows Subsystem for Linux as development environment
   ```powershell
   wsl --install
   wsl --install -d Ubuntu-22.04
   ```

EOF

    log_success "Windows troubleshooting guide generated: $DOCS_DIR/troubleshooting-windows.md"
}

# Generate Linux troubleshooting guide
generate_linux_troubleshooting() {
    log_info "Generating Linux troubleshooting guide..."
    
    cat > "$DOCS_DIR/troubleshooting-linux.md" << 'EOF'
# Linux Troubleshooting Guide

## Common Issues and Solutions

### Package Manager Issues

#### Permission Denied Errors

**Problem**: Cannot install packages due to permission issues.

**Solutions**:
1. **Use sudo**: Ensure you're using sudo for system package installation
   ```bash
   sudo apt install package-name  # Ubuntu/Debian
   sudo dnf install package-name  # Fedora
   sudo yum install package-name  # CentOS/RHEL
   sudo pacman -S package-name    # Arch Linux
   ```

2. **Check sudo access**:
   ```bash
   # Test sudo access
   sudo -v
   
   # Add user to sudo group (Ubuntu/Debian)
   sudo usermod -aG sudo $USER
   
   # Add user to wheel group (CentOS/RHEL/Fedora)
   sudo usermod -aG wheel $USER
   
   # Log out and back in for changes to take effect
   ```

#### Repository Issues

**Ubuntu/Debian Repository Problems**:
```bash
# Update package lists
sudo apt update

# Fix broken packages
sudo apt --fix-broken install

# Clean package cache
sudo apt clean && sudo apt autoclean

# Reset sources.list (if corrupted)
sudo cp /etc/apt/sources.list /etc/apt/sources.list.backup
sudo software-properties-gtk  # GUI to reset repositories
```

**CentOS/RHEL/Fedora Repository Problems**:
```bash
# Clear package cache
sudo dnf clean all  # or sudo yum clean all

# Rebuild package cache
sudo dnf makecache  # or sudo yum makecache

# Enable EPEL repository (CentOS/RHEL)
sudo dnf install epel-release

# Enable PowerTools repository (CentOS 8)
sudo dnf config-manager --set-enabled powertools
```

**Arch Linux Repository Problems**:
```bash
# Update package databases
sudo pacman -Sy

# Force refresh all packages
sudo pacman -Syy

# Fix corrupted package database
sudo pacman -Dk

# Reinstall keyring if GPG issues
sudo pacman -S archlinux-keyring
sudo pacman-key --refresh-keys
```

### Node.js Installation Issues

#### Version Conflicts

**Problem**: Wrong Node.js version or multiple versions installed.

**Solutions**:
1. **Remove existing installations**:
   ```bash
   # Ubuntu/Debian
   sudo apt remove nodejs npm
   sudo apt autoremove
   
   # CentOS/RHEL/Fedora
   sudo dnf remove nodejs npm
   
   # Arch Linux
   sudo pacman -R nodejs npm
   ```

2. **Install from NodeSource**:
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # CentOS/RHEL/Fedora
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo dnf install nodejs npm
   ```

3. **Using Node Version Manager (nvm)**:
   ```bash
   # Install nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   
   # Install and use Node.js 18
   nvm install 18
   nvm use 18
   nvm alias default 18
   ```

#### npm Permission Issues

**Problem**: EACCES errors when installing global packages.

**Solutions**:
1. **Configure npm global directory**:
   ```bash
   mkdir ~/.local
   npm config set prefix '~/.local'
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc
   ```

2. **Fix npm permissions**:
   ```bash
   sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
   ```

### Docker Installation Issues

#### Docker Engine Installation

**Ubuntu/Debian Docker Issues**:
```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc

# Install prerequisites
sudo apt update
sudo apt install ca-certificates curl gnupg lsb-release

# Add Docker GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

**CentOS/RHEL/Fedora Docker Issues**:
```bash
# Remove old versions
sudo dnf remove docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine

# Install yum-utils
sudo dnf install yum-utils

# Add Docker repository
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker Engine
sudo dnf install docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

#### Docker Service Issues

**Problem**: Docker daemon not running or accessible.

**Solutions**:
1. **Start Docker service**:
   ```bash
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo systemctl status docker
   ```

2. **Add user to docker group**:
   ```bash
   sudo usermod -aG docker $USER
   # Log out and back in for changes to take effect
   
   # Verify group membership
   groups $USER
   ```

3. **Docker daemon configuration issues**:
   ```bash
   # Check Docker daemon logs
   journalctl -u docker.service -f
   
   # Restart Docker daemon
   sudo systemctl restart docker
   
   # Reset Docker to defaults (removes all containers/images)
   sudo systemctl stop docker
   sudo rm -rf /var/lib/docker
   sudo systemctl start docker
   ```

### Python Installation Issues

#### Python Version Conflicts

**Problem**: Multiple Python versions or pip not found.

**Solutions**:
1. **Ubuntu/Debian**:
   ```bash
   # Install Python 3 and pip
   sudo apt install python3 python3-pip python3-venv python3-dev
   
   # Make python3 default python
   sudo apt install python-is-python3
   
   # Or create alias
   echo 'alias python=python3' >> ~/.bashrc
   ```

2. **CentOS/RHEL/Fedora**:
   ```bash
   # Install Python 3
   sudo dnf install python3 python3-pip python3-devel
   
   # Set python3 as default (CentOS/RHEL)
   sudo alternatives --install /usr/bin/python python /usr/bin/python3 1
   ```

3. **Fix pip issues**:
   ```bash
   # Update pip
   python3 -m pip install --user --upgrade pip
   
   # Install packages with --user flag
   pip3 install --user package-name
   
   # Add user bin to PATH
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
   ```

### Firewall Issues

#### Port Access Problems

**Problem**: Cannot access development servers due to firewall.

**Solutions**:
1. **UFW (Ubuntu/Debian)**:
   ```bash
   # Check firewall status
   sudo ufw status
   
   # Allow development ports
   sudo ufw allow 3000:3010/tcp comment 'Development servers'
   sudo ufw allow 8000:8010/tcp comment 'Backend servers'
   sudo ufw allow 5432/tcp comment 'PostgreSQL'
   sudo ufw allow 6379/tcp comment 'Redis'
   
   # Enable firewall
   sudo ufw enable
   ```

2. **firewalld (CentOS/RHEL/Fedora)**:
   ```bash
   # Check firewall status
   sudo firewall-cmd --state
   
   # Allow ports permanently
   sudo firewall-cmd --permanent --add-port=3000-3010/tcp
   sudo firewall-cmd --permanent --add-port=8000-8010/tcp
   sudo firewall-cmd --permanent --add-service=postgresql
   sudo firewall-cmd --reload
   
   # List allowed services/ports
   sudo firewall-cmd --list-all
   ```

### SELinux Issues (CentOS/RHEL/Fedora)

#### SELinux Blocking Applications

**Problem**: SELinux prevents applications from running or accessing files.

**Solutions**:
1. **Check SELinux status**:
   ```bash
   getenforce
   sestatus
   ```

2. **Temporary solutions**:
   ```bash
   # Set to permissive mode (temporary)
   sudo setenforce 0
   
   # Set to permissive mode (permanent)
   sudo sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
   ```

3. **Better approach - configure SELinux policies**:
   ```bash
   # Allow web servers to connect to network
   sudo setsebool -P httpd_can_network_connect 1
   
   # Allow containers to manage cgroups
   sudo setsebool -P container_manage_cgroup 1
   
   # Check SELinux logs for denials
   sudo ausearch -m avc -ts recent
   ```

### File Permission Issues

#### Ownership and Permission Problems

**Problem**: Cannot read/write files or execute scripts.

**Solutions**:
1. **Fix ownership**:
   ```bash
   # Change ownership recursively
   sudo chown -R $USER:$USER /path/to/directory
   
   # Fix common directories
   sudo chown -R $USER:$USER ~/.npm
   sudo chown -R $USER:$USER ~/.local
   ```

2. **Fix permissions**:
   ```bash
   # Make scripts executable
   chmod +x script-name.sh
   
   # Set directory permissions
   chmod 755 /path/to/directory
   
   # Set file permissions
   chmod 644 /path/to/file
   ```

3. **npm cache permissions**:
   ```bash
   # Fix npm cache ownership
   sudo chown -R $(whoami) ~/.npm
   
   # Clear npm cache
   npm cache clean --force
   ```

## Distribution-Specific Issues

### Ubuntu/Debian Specific

#### Snap Package Conflicts
```bash
# Disable snapd if causing issues
sudo systemctl disable snapd.service
sudo systemctl mask snapd.service

# Remove snap packages
snap list
sudo snap remove <package-name>
```

#### APT Lock Issues
```bash
# Kill processes using apt
sudo killall apt apt-get

# Remove lock files
sudo rm /var/lib/apt/lists/lock
sudo rm /var/cache/apt/archives/lock
sudo rm /var/lib/dpkg/lock*

# Reconfigure dpkg
sudo dpkg --configure -a
```

### CentOS/RHEL Specific

#### Subscription Manager Issues (RHEL)
```bash
# Register system
sudo subscription-manager register --username <username> --password <password>

# Attach subscription
sudo subscription-manager attach --auto

# Enable repositories
sudo subscription-manager repos --enable=rhel-8-for-x86_64-baseos-rpms
sudo subscription-manager repos --enable=rhel-8-for-x86_64-appstream-rpms
```

### Arch Linux Specific

#### Package Signature Issues
```bash
# Refresh package keys
sudo pacman -Sy archlinux-keyring
sudo pacman-key --refresh-keys

# If still failing, reset keyring
sudo rm -rf /etc/pacman.d/gnupg
sudo pacman-key --init
sudo pacman-key --populate archlinux
```

#### AUR Helper Issues
```bash
# Install yay manually
git clone https://aur.archlinux.org/yay.git
cd yay
makepkg -si

# Fix yay permissions
sudo chown -R $USER:$USER ~/.config/yay
```

## Diagnostic Commands

### System Information
```bash
# Distribution information
cat /etc/os-release
lsb_release -a  # if available

# Kernel version
uname -a

# System resources
free -h
df -h
lscpu
```

### Network Diagnostics
```bash
# Test connectivity
ping -c 4 google.com
ping -c 4 github.com

# DNS resolution
nslookup github.com
dig github.com

# Check listening ports
sudo netstat -tlnp
ss -tlnp
```

### Service Status
```bash
# Check service status
systemctl status docker
systemctl status nginx
systemctl status postgresql

# View service logs
journalctl -u docker.service -f
journalctl -u nginx.service --since "1 hour ago"
```

### Package Information
```bash
# Ubuntu/Debian
apt list --installed | grep nodejs
dpkg -l | grep docker

# CentOS/RHEL/Fedora
dnf list installed | grep nodejs
rpm -qa | grep docker

# Arch Linux
pacman -Q | grep nodejs
pacman -Qi docker
```

## Performance Optimization

### System Optimization
```bash
# Update system limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize kernel parameters
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
echo "net.core.somaxconn=65536" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Development Environment
```bash
# Configure Git for better performance
git config --global core.preloadindex true
git config --global core.fscache true
git config --global gc.auto 256

# Configure npm for better performance
npm config set cache-min 86400
npm config set prefer-offline true

# Use faster package managers
# Arch: Use yay with parallel compilation
yay --editmenu --nodiffmenu --save

# Ubuntu: Use apt-fast
sudo add-apt-repository ppa:apt-fast/stable
sudo apt-get update
sudo apt-get install apt-fast
```

## Recovery Procedures

### Clean Package Manager State
```bash
# Ubuntu/Debian
sudo apt clean
sudo apt autoclean
sudo apt autoremove
sudo dpkg --configure -a

# CentOS/RHEL/Fedora
sudo dnf clean all
sudo dnf autoremove

# Arch Linux
sudo pacman -Sc
sudo pacman -Scc  # More aggressive cleanup
```

### Reset Development Environment
```bash
# Remove node_modules and reinstall
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
npm install

# Clear npm cache
npm cache clean --force

# Reset npm configuration
rm ~/.npmrc
npm config edit  # Recreate with defaults
```

## Getting Additional Help

1. **Distribution Documentation**:
   - [Ubuntu Documentation](https://help.ubuntu.com/)
   - [CentOS Documentation](https://docs.centos.org/)
   - [Fedora Documentation](https://docs.fedoraproject.org/)
   - [Arch Linux Wiki](https://wiki.archlinux.org/)

2. **Community Support**:
   - Distribution forums and IRC channels
   - Stack Overflow for specific technical issues
   - GitHub issues for application-specific problems

3. **Log Analysis**:
   ```bash
   # System logs
   journalctl -xe
   tail -f /var/log/syslog  # Ubuntu/Debian
   tail -f /var/log/messages  # CentOS/RHEL
   
   # Application logs
   tail -f ~/.npm/_logs/*.log
   docker logs container-name
   ```

EOF

    log_success "Linux troubleshooting guide generated: $DOCS_DIR/troubleshooting-linux.md"
}

# Generate macOS troubleshooting guide
generate_macos_troubleshooting() {
    log_info "Generating macOS troubleshooting guide..."
    
    cat > "$DOCS_DIR/troubleshooting-macos.md" << 'EOF'
# macOS Troubleshooting Guide

## Common Issues and Solutions

### Xcode Command Line Tools Issues

**Problem**: Xcode Command Line Tools installation fails or is incomplete.

**Solutions**:
1. **Manual Installation**:
   ```bash
   # Trigger installation dialog
   xcode-select --install
   
   # If already installed, reset
   sudo xcode-select --reset
   sudo xcode-select --install
   ```

2. **Check Installation**:
   ```bash
   # Verify installation
   xcode-select -p
   
   # Should output: /Applications/Xcode.app/Contents/Developer
   # Or: /Library/Developer/CommandLineTools
   ```

3. **Full Xcode Installation**:
   - Install Xcode from Mac App Store
   - Accept license: `sudo xcodebuild -license accept`

### Homebrew Installation Issues

#### Installation Failures

**Problem**: Homebrew installation script fails.

**Solutions**:
1. **Network Issues**:
   ```bash
   # Download and inspect script first
   curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh -o install.sh
   less install.sh
   
   # Run with debugging
   /bin/bash -x install.sh
   ```

2. **Permission Issues**:
   ```bash
   # Fix ownership of /usr/local (Intel Macs)
   sudo chown -R $(whoami):admin /usr/local/*
   
   # For Apple Silicon, /opt/homebrew should be user-owned
   sudo chown -R $(whoami):staff /opt/homebrew
   ```

3. **Rosetta 2 Issues (Apple Silicon)**:
   ```bash
   # Install Rosetta 2 for Intel compatibility
   softwareupdate --install-rosetta --agree-to-license
   ```

#### Homebrew Path Issues

**Problem**: `brew` command not found after installation.

**Solutions**:
1. **Add to PATH (Apple Silicon)**:
   ```bash
   echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
   source ~/.zprofile
   ```

2. **Add to PATH (Intel Mac)**:
   ```bash
   echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
   source ~/.zprofile
   ```

3. **Check Shell Configuration**:
   ```bash
   # Check current shell
   echo $SHELL
   
   # For zsh (default in macOS 10.15+)
   echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
   
   # For bash
   echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bash_profile
   ```

### Package Installation Issues

#### Formula Not Found

**Problem**: Homebrew cannot find a package formula.

**Solutions**:
1. **Update Homebrew**:
   ```bash
   brew update
   brew upgrade
   ```

2. **Search for alternatives**:
   ```bash
   brew search package-name
   brew search --cask package-name
   ```

3. **Check taps**:
   ```bash
   # List current taps
   brew tap
   
   # Add common taps
   brew tap homebrew/cask
   brew tap homebrew/cask-versions
   ```

#### Architecture Conflicts (Apple Silicon)

**Problem**: Package built for wrong architecture.

**Solutions**:
1. **Force ARM64 installation**:
   ```bash
   arch -arm64 brew install package-name
   ```

2. **Use Rosetta for Intel packages**:
   ```bash
   arch -x86_64 brew install package-name
   ```

3. **Check installed architecture**:
   ```bash
   # Check what's installed
   brew list | xargs brew info | grep -E "Built from source|Poured from bottle"
   
   # Check specific package architecture
   file $(brew --prefix)/bin/node
   ```

### Node.js Installation Issues

#### Version Conflicts

**Problem**: Multiple Node.js versions or wrong version installed.

**Solutions**:
1. **Using Homebrew**:
   ```bash
   # Remove current installation
   brew uninstall node
   
   # Install specific version
   brew install node@18
   
   # Link version
   brew link --force node@18
   
   # Add to PATH
   echo 'export PATH="/opt/homebrew/opt/node@18/bin:$PATH"' >> ~/.zshrc
   ```

2. **Using Node Version Manager (nvm)**:
   ```bash
   # Install nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Reload shell configuration
   source ~/.zshrc
   
   # Install Node.js 18
   nvm install 18
   nvm use 18
   nvm alias default 18
   ```

#### npm Permission Issues

**Problem**: Permission errors when installing global packages.

**Solutions**:
1. **Change npm global directory**:
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

2. **Fix npm permissions**:
   ```bash
   # Change ownership of npm directories
   sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
   ```

### Docker Desktop Issues

#### Installation Problems

**Problem**: Docker Desktop won't install or start.

**Solutions**:
1. **System Requirements**:
   - macOS 10.15 or later
   - At least 4GB RAM
   - VirtualBox must be uninstalled

2. **Manual Installation**:
   ```bash
   # Download from docker.com
   # Or install via Homebrew
   brew install --cask docker
   
   # Start Docker Desktop
   open /Applications/Docker.app
   ```

3. **Gatekeeper Issues**:
   ```bash
   # Allow Docker Desktop to run
   sudo spctl --add /Applications/Docker.app
   sudo spctl --enable --label "Developer ID Application: Docker Inc"
   ```

#### Docker Daemon Issues

**Problem**: Docker daemon not accessible or slow.

**Solutions**:
1. **Resource Allocation**:
   - Open Docker Desktop preferences
   - Increase CPU and Memory allocation
   - Enable file sharing for project directories

2. **Reset Docker Desktop**:
   - Docker Desktop → Troubleshoot → Reset to factory defaults
   - Or via command line:
   ```bash
   # Stop Docker Desktop
   osascript -e 'quit app "Docker Desktop"'
   
   # Clear Docker data
   rm -rf ~/Library/Containers/com.docker.docker
   rm -rf ~/.docker
   
   # Restart Docker Desktop
   open /Applications/Docker.app
   ```

### Python Installation Issues

#### System Python vs Homebrew Python

**Problem**: Conflicts between system Python and Homebrew Python.

**Solutions**:
1. **Use Homebrew Python**:
   ```bash
   # Install Python via Homebrew
   brew install python@3.11
   
   # Add to PATH
   echo 'export PATH="/opt/homebrew/opt/python@3.11/bin:$PATH"' >> ~/.zshrc
   
   # Create symlinks
   ln -s /opt/homebrew/bin/python3 /opt/homebrew/bin/python
   ```

2. **Using pyenv for version management**:
   ```bash
   # Install pyenv
   brew install pyenv
   
   # Add to shell configuration
   echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
   echo 'command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
   echo 'eval "$(pyenv init -)"' >> ~/.zshrc
   
   # Install Python
   pyenv install 3.11.0
   pyenv global 3.11.0
   ```

### macOS-Specific Issues

#### System Integrity Protection (SIP)

**Problem**: SIP prevents modification of system directories.

**Solutions**:
1. **Check SIP status**:
   ```bash
   csrutil status
   ```

2. **Work within SIP constraints**:
   - Use user directories for development
   - Use Homebrew for package management
   - Don't modify `/System` or `/usr/bin`

3. **Disable SIP (not recommended)**:
   - Boot into Recovery Mode (Cmd+R during startup)
   - Open Terminal from Utilities menu
   - Run: `csrutil disable`
   - Reboot

#### Gatekeeper Issues

**Problem**: macOS blocks unsigned applications or scripts.

**Solutions**:
1. **Allow specific applications**:
   ```bash
   # Allow Docker Desktop
   sudo spctl --add /Applications/Docker.app
   
   # Allow specific binary
   sudo spctl --add /path/to/binary
   ```

2. **Temporary Gatekeeper bypass**:
   ```bash
   # Disable Gatekeeper temporarily
   sudo spctl --master-disable
   
   # Re-enable after installation
   sudo spctl --master-enable
   ```

#### Code Signing Issues

**Problem**: Developer tools fail due to code signing.

**Solutions**:
1. **Sign binaries manually**:
   ```bash
   # Self-sign binary
   codesign --force --deep --sign - /path/to/binary
   ```

2. **Trust developer certificate**:
   - System Preferences → Security & Privacy → General
   - Click "Allow Anyway" for blocked software

### Performance Issues

#### Slow Build Times

**Problem**: Development builds are slow on macOS.

**Solutions**:
1. **Exclude directories from Spotlight**:
   - System Preferences → Spotlight → Privacy
   - Add `node_modules`, build directories, and cache directories

2. **Configure Docker for better performance**:
   ```bash
   # Use :delegated for volume mounts
   # In docker-compose.yml:
   # volumes:
   #   - .:/app:delegated
   ```

3. **Use faster file systems**:
   ```bash
   # For Docker volumes, use named volumes instead of bind mounts
   # Better performance but data doesn't persist on host
   ```

#### Memory Issues

**Problem**: System runs out of memory during development.

**Solutions**:
1. **Monitor memory usage**:
   ```bash
   # Check memory usage
   top -o mem
   vm_stat
   
   # Check swap usage
   sysctl vm.swapusage
   ```

2. **Optimize Docker memory usage**:
   - Reduce Docker Desktop memory allocation
   - Use multi-stage builds to reduce image size
   - Clean up unused containers and images regularly

3. **Clear system caches**:
   ```bash
   # Clear DNS cache
   sudo dscacheutil -flushcache
   
   # Clear font cache
   atsutil databases -remove
   
   # Rebuild Launch Services database
   /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user
   ```

## Diagnostic Commands

### System Information
```bash
# macOS version
sw_vers

# Hardware information
system_profiler SPHardwareDataType

# Architecture
arch
uname -m

# Available memory
memory_pressure
vm_stat
```

### Development Environment Status
```bash
# Xcode Command Line Tools
xcode-select -p

# Homebrew
brew --version
brew doctor

# Node.js and npm
node --version
npm --version
which node

# Python
python3 --version
which python3

# Docker
docker --version
docker info
docker system info
```

### Network Diagnostics
```bash
# Test connectivity
ping -c 4 google.com
nslookup github.com

# Check DNS configuration
scutil --dns

# Network configuration
ifconfig
netstat -rn
```

### File System Issues
```bash
# Check disk usage
df -h
du -h -d 1 ~/

# Disk utility checks
diskutil list
diskutil verifyVolume /

# File permissions
ls -la /usr/local
ls -la /opt/homebrew  # Apple Silicon
```

## Recovery Procedures

### Reset Development Environment
```bash
# Remove Homebrew completely
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"

# Clean up remaining files
sudo rm -rf /opt/homebrew  # Apple Silicon
sudo rm -rf /usr/local/Homebrew  # Intel

# Remove configuration files
rm -rf ~/.npm
rm -rf ~/.node-gyp
rm ~/.npmrc
```

### Clean Docker Environment
```bash
# Stop Docker Desktop
osascript -e 'quit app "Docker Desktop"'

# Remove Docker data
rm -rf ~/Library/Containers/com.docker.docker
rm -rf ~/.docker

# Remove Docker Desktop
rm -rf /Applications/Docker.app

# Reinstall
brew install --cask docker
```

### System Maintenance
```bash
# Run periodic maintenance
sudo periodic daily weekly monthly

# Rebuild Spotlight index
sudo mdutil -a -i on

# Repair permissions (older macOS versions)
sudo diskutil repairPermissions /

# Clear system logs
sudo rm -rf /private/var/log/asl/*.asl
```

## Getting Additional Help

1. **Apple Developer Documentation**: [developer.apple.com](https://developer.apple.com/documentation/)
2. **Homebrew Documentation**: [docs.brew.sh](https://docs.brew.sh/)
3. **macOS Console**: Use Console app to view system logs
4. **Activity Monitor**: Monitor system resources and processes
5. **System Information**: Hold Option key and click Apple menu

### Community Resources
- **Stack Overflow**: macOS-specific development questions
- **Homebrew GitHub**: [github.com/Homebrew/brew](https://github.com/Homebrew/brew)
- **Apple Developer Forums**: Technical support from Apple
- **Reddit r/MacOS**: Community support and tips

EOF

    log_success "macOS troubleshooting guide generated: $DOCS_DIR/troubleshooting-macos.md"
}

# Main function
main() {
    log_info "Starting automated troubleshooting guide generation..."
    
    # Ensure output directory exists
    mkdir -p "$DOCS_DIR"
    
    # Generate platform-specific troubleshooting guides
    generate_windows_troubleshooting
    generate_linux_troubleshooting
    generate_macos_troubleshooting
    
    log_success "Troubleshooting guide generation completed successfully!"
    log_info "Files generated:"
    log_info "  - $DOCS_DIR/troubleshooting-windows.md"
    log_info "  - $DOCS_DIR/troubleshooting-linux.md"
    log_info "  - $DOCS_DIR/troubleshooting-macos.md"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi