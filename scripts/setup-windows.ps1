# MediMate Malaysia - Windows Development Environment Setup
# Platform-specific setup for Windows systems using PowerShell

param(
    [switch]$Verbose,
    [switch]$SkipDocker,
    [switch]$Production,
    [switch]$NonInteractive,
    [switch]$Help
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Colors = @{
    Red    = "Red"
    Green  = "Green"
    Yellow = "Yellow"
    Blue   = "Blue"
    Purple = "Magenta"
    Cyan   = "Cyan"
}

# Global variables
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptRoot
$LogFile = Join-Path $ProjectRoot "setup.log"
$ProgressFile = Join-Path $ProjectRoot ".setup-progress"

# Logging functions
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [ConsoleColor]$Color = "White"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$Level] $timestamp - $Message"
    
    Write-Host "[$Level] $Message" -ForegroundColor $Color
    Add-Content -Path $LogFile -Value $logEntry
}

function Write-LogDebug {
    param([string]$Message)
    if ($Verbose) {
        Write-Log $Message "DEBUG" $Colors.Purple
    }
}

function Write-LogInfo {
    param([string]$Message)
    Write-Log $Message "INFO" $Colors.Blue
}

function Write-LogWarn {
    param([string]$Message)
    Write-Log $Message "WARN" $Colors.Yellow
}

function Write-LogError {
    param([string]$Message)
    Write-Log $Message "ERROR" $Colors.Red
}

function Write-LogSuccess {
    param([string]$Message)
    Write-Log $Message "SUCCESS" $Colors.Green
}

# Show help message
function Show-Help {
    Write-Host @"
MediMate Malaysia Development Environment Setup (Windows)

USAGE:
    .\setup-windows.ps1 [OPTIONS]

OPTIONS:
    -Verbose           Enable verbose output and detailed logging
    -SkipDocker        Skip Docker Desktop installation
    -Production        Setup for production environment (stricter validation)
    -NonInteractive    Run in non-interactive mode (for CI/CD)
    -Help              Show this help message

EXAMPLES:
    .\setup-windows.ps1                                # Interactive setup
    .\setup-windows.ps1 -Verbose                       # Detailed output
    .\setup-windows.ps1 -SkipDocker -Verbose          # Skip Docker, verbose
    .\setup-windows.ps1 -NonInteractive               # Automated setup

For more information, see: docs/setup-guide.md
"@
}

# Initialize logging
function Initialize-Logging {
    # Create log file with header
    $header = @"
=== MediMate Malaysia Setup Log (Windows) ===
Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC')
Platform: $($env:OS) $(Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty Caption)
User: $env:USERNAME
PowerShell Version: $($PSVersionTable.PSVersion)
Working Directory: $(Get-Location)
=============================================

"@
    Set-Content -Path $LogFile -Value $header
    Write-LogDebug "Logging initialized - file: $LogFile"
}

# Check Windows version compatibility
function Test-WindowsVersion {
    Write-LogInfo "Checking Windows compatibility..."
    
    $osInfo = Get-CimInstance Win32_OperatingSystem
    $osVersion = [System.Version]$osInfo.Version
    $minVersion = [System.Version]"10.0.0"
    
    Write-LogDebug "Detected Windows version: $($osInfo.Caption) ($($osInfo.Version))"
    
    if ($osVersion -lt $minVersion) {
        Write-LogError "Windows version $($osInfo.Version) is below minimum supported version (Windows 10)"
        return $false
    }
    
    Write-LogSuccess "$($osInfo.Caption) is supported"
    
    # Check architecture
    $arch = $env:PROCESSOR_ARCHITECTURE
    Write-LogInfo "Architecture: $arch"
    
    return $true
}

# Check if running as Administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check execution policy
function Test-ExecutionPolicy {
    $policy = Get-ExecutionPolicy
    if ($policy -eq "Restricted") {
        Write-LogWarn "PowerShell execution policy is Restricted"
        Write-LogInfo "You may need to set execution policy: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser"
        return $false
    }
    Write-LogDebug "Execution policy: $policy"
    return $true
}

# Install Chocolatey package manager
function Install-Chocolatey {
    Write-LogInfo "Checking Chocolatey installation..."
    
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-LogSuccess "Chocolatey is already installed"
        Write-LogInfo "Updating Chocolatey..."
        try {
            choco upgrade chocolatey -y
            return $true
        }
        catch {
            Write-LogError "Chocolatey update failed: $($_.Exception.Message)"
            return $false
        }
    }
    
    Write-LogInfo "Installing Chocolatey package manager..."
    
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        if (Get-Command choco -ErrorAction SilentlyContinue) {
            Write-LogSuccess "Chocolatey installed successfully"
            Add-Content -Path $ProgressFile -Value "chocolatey_installed"
            return $true
        }
        else {
            Write-LogError "Chocolatey installation verification failed"
            return $false
        }
    }
    catch {
        Write-LogError "Chocolatey installation failed: $($_.Exception.Message)"
        return $false
    }
}

# Install Node.js
function Install-NodeJS {
    param([string]$Version = "18")
    
    Write-LogInfo "Installing Node.js $Version..."
    
    # Check if already installed
    try {
        $nodeVersion = node --version
        if ($nodeVersion -match "v(\d+)\.") {
            $majorVersion = [int]$Matches[1]
            if ($majorVersion -ge 18) {
                Write-LogSuccess "Node.js $nodeVersion is already installed and meets requirements"
                return $true
            }
        }
    }
    catch {
        Write-LogDebug "Node.js not found or version check failed"
    }
    
    try {
        choco install nodejs --version=$Version.* -y
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        # Verify installation
        $nodeVersion = node --version
        $npmVersion = npm --version
        
        Write-LogSuccess "Node.js $nodeVersion installed successfully"
        Write-LogSuccess "npm $npmVersion is available"
        
        # Update npm to latest version
        Write-LogInfo "Updating npm to latest version..."
        npm install -g npm@latest
        
        Add-Content -Path $ProgressFile -Value "node_installed"
        return $true
    }
    catch {
        Write-LogError "Node.js installation failed: $($_.Exception.Message)"
        return $false
    }
}

# Install Python
function Install-Python {
    param([string]$Version = "3.11")
    
    Write-LogInfo "Installing Python $Version..."
    
    # Check if already installed
    try {
        $pythonVersion = python --version
        if ($pythonVersion -match "(\d+)\.(\d+)\.(\d+)") {
            $major = [int]$Matches[1]
            $minor = [int]$Matches[2]
            if ($major -ge 3 -and $minor -ge 8) {
                Write-LogSuccess "Python $pythonVersion is already installed and meets requirements"
                return $true
            }
        }
    }
    catch {
        Write-LogDebug "Python not found or version check failed"
    }
    
    try {
        choco install python --version=$Version.* -y
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        # Verify installation
        $pythonVersion = python --version
        $pipVersion = pip --version
        
        Write-LogSuccess "Python $pythonVersion installed successfully"
        Write-LogSuccess "pip is available"
        
        Add-Content -Path $ProgressFile -Value "python_installed"
        return $true
    }
    catch {
        Write-LogError "Python installation failed: $($_.Exception.Message)"
        return $false
    }
}

# Install Git
function Install-Git {
    Write-LogInfo "Installing Git..."
    
    # Check if already installed
    try {
        $gitVersion = git --version
        if ($gitVersion) {
            Write-LogSuccess "Git is already installed: $gitVersion"
            return $true
        }
    }
    catch {
        Write-LogDebug "Git not found"
    }
    
    try {
        choco install git -y
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        # Verify installation
        $gitVersion = git --version
        Write-LogSuccess "Git installed successfully: $gitVersion"
        
        Add-Content -Path $ProgressFile -Value "git_installed"
        return $true
    }
    catch {
        Write-LogError "Git installation failed: $($_.Exception.Message)"
        return $false
    }
}

# Install Docker Desktop
function Install-Docker {
    if ($SkipDocker) {
        Write-LogInfo "Skipping Docker installation (-SkipDocker flag used)"
        return $true
    }
    
    Write-LogInfo "Installing Docker Desktop..."
    
    # Check if already installed
    try {
        $dockerVersion = docker --version
        if ($dockerVersion) {
            Write-LogSuccess "Docker is already installed: $dockerVersion"
            
            # Check if Docker daemon is running
            try {
                docker info | Out-Null
                Write-LogSuccess "Docker daemon is running"
                return $true
            }
            catch {
                Write-LogWarn "Docker daemon is not running"
                Write-LogInfo "Please start Docker Desktop manually"
            }
        }
    }
    catch {
        Write-LogDebug "Docker not found"
    }
    
    try {
        choco install docker-desktop -y
        
        Write-LogSuccess "Docker Desktop installed successfully"
        Write-LogInfo "Please start Docker Desktop manually from the Start Menu"
        Write-LogInfo "Docker Desktop needs to be running for the development environment"
        
        Add-Content -Path $ProgressFile -Value "docker_installed"
        return $true
    }
    catch {
        Write-LogError "Docker Desktop installation failed: $($_.Exception.Message)"
        return $false
    }
}

# Install additional development tools
function Install-DevTools {
    Write-LogInfo "Installing additional development tools..."
    
    $tools = @(
        "jq",
        "curl",
        "wget",
        "unzip",
        "7zip"
    )
    
    foreach ($tool in $tools) {
        try {
            Write-LogInfo "Installing $tool..."
            choco install $tool -y
        }
        catch {
            Write-LogWarn "Failed to install $tool, but continuing..."
        }
    }
    
    # Install Visual Studio Code if not present
    try {
        if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
            Write-LogInfo "Installing Visual Studio Code..."
            choco install vscode -y
        }
        else {
            Write-LogDebug "Visual Studio Code is already installed"
        }
    }
    catch {
        Write-LogWarn "Visual Studio Code installation failed, but continuing..."
    }
    
    Write-LogSuccess "Development tools installation completed"
    return $true
}

# Configure Windows development environment
function Set-DevelopmentEnvironment {
    Write-LogInfo "Configuring Windows development environment..."
    
    # Create development directories
    $devDirs = @(
        "$env:USERPROFILE\Development",
        "$env:USERPROFILE\Development\Projects",
        "$env:USERPROFILE\Development\Tools"
    )
    
    foreach ($dir in $devDirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-LogDebug "Created directory: $dir"
        }
    }
    
    # Configure Git if not already configured
    try {
        $gitUserName = git config --global user.name
        if (-not $gitUserName) {
            if (-not $NonInteractive) {
                $gitUsername = Read-Host "Enter your Git username"
                $gitEmail = Read-Host "Enter your Git email"
                
                git config --global user.name $gitUsername
                git config --global user.email $gitEmail
                
                Write-LogSuccess "Git configuration completed"
            }
            else {
                Write-LogInfo "Git user configuration skipped in non-interactive mode"
                Write-LogInfo "Please configure Git manually: git config --global user.name 'Your Name'"
            }
        }
    }
    catch {
        Write-LogWarn "Git configuration check failed, but continuing..."
    }
    
    # Set up Windows-specific optimizations
    try {
        # Enable long path support (Windows 10 version 1607 and later)
        if ((Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -ErrorAction SilentlyContinue).LongPathsEnabled -ne 1) {
            Write-LogInfo "Enabling long path support..."
            if (Test-Administrator) {
                Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1
                Write-LogSuccess "Long path support enabled"
            }
            else {
                Write-LogWarn "Cannot enable long path support (requires administrator privileges)"
            }
        }
        
        # Configure Git for Windows optimizations
        git config --global core.autocrlf true
        git config --global core.filemode false
        git config --global core.longpaths true
        
        Write-LogDebug "Git Windows optimizations applied"
    }
    catch {
        Write-LogWarn "Some environment optimizations failed, but continuing..."
    }
    
    Write-LogSuccess "Windows environment configuration completed"
    return $true
}

# Validate complete setup
function Test-CompleteSetup {
    Write-LogInfo "Running complete setup validation..."
    
    $validationResults = @()
    
    # Test Node.js
    try {
        $nodeVersion = node --version
        if ($nodeVersion -match "v(\d+)\.") {
            $majorVersion = [int]$Matches[1]
            if ($majorVersion -ge 18) {
                $validationResults += "✓ Node.js $nodeVersion"
            }
            else {
                $validationResults += "✗ Node.js version too old: $nodeVersion"
            }
        }
    }
    catch {
        $validationResults += "✗ Node.js not found"
    }
    
    # Test npm
    try {
        $npmVersion = npm --version
        $validationResults += "✓ npm $npmVersion"
    }
    catch {
        $validationResults += "✗ npm not found"
    }
    
    # Test Python
    try {
        $pythonVersion = python --version
        $validationResults += "✓ Python $pythonVersion"
    }
    catch {
        $validationResults += "✗ Python not found"
    }
    
    # Test Git
    try {
        $gitVersion = git --version
        $validationResults += "✓ Git $gitVersion"
    }
    catch {
        $validationResults += "✗ Git not found"
    }
    
    # Test Docker (if not skipped)
    if (-not $SkipDocker) {
        try {
            $dockerVersion = docker --version
            $validationResults += "✓ Docker $dockerVersion"
            
            try {
                docker info | Out-Null
                $validationResults += "✓ Docker daemon running"
            }
            catch {
                $validationResults += "⚠ Docker daemon not running"
            }
        }
        catch {
            $validationResults += "✗ Docker not found"
        }
    }
    
    # Display results
    Write-LogInfo "Validation Results:"
    foreach ($result in $validationResults) {
        if ($result.StartsWith("✓")) {
            Write-Host $result -ForegroundColor Green
        }
        elseif ($result.StartsWith("⚠")) {
            Write-Host $result -ForegroundColor Yellow
        }
        else {
            Write-Host $result -ForegroundColor Red
        }
    }
    
    $failedCount = ($validationResults | Where-Object { $_.StartsWith("✗") }).Count
    return $failedCount -eq 0
}

# Cleanup function
function Invoke-Cleanup {
    param([int]$ExitCode)
    
    if ($ExitCode -ne 0) {
        Write-LogError "Setup failed with exit code: $ExitCode"
        Write-LogError "Check the log file for details: $LogFile"
    }
    
    # Clean up temporary files
    if (Test-Path $ProgressFile) {
        Remove-Item $ProgressFile -Force -ErrorAction SilentlyContinue
    }
}

# Main setup function
function Start-WindowsSetup {
    try {
        Initialize-Logging
        Write-LogInfo "Starting MediMate Malaysia Windows setup..."
        Write-LogInfo "Configuration: Verbose=$Verbose, SkipDocker=$SkipDocker, Production=$Production, NonInteractive=$NonInteractive"
        
        # Check Windows version
        if (-not (Test-WindowsVersion)) {
            Write-LogError "Windows version compatibility check failed"
            return 1
        }
        
        # Check execution policy
        if (-not (Test-ExecutionPolicy)) {
            Write-LogError "PowerShell execution policy check failed"
            return 1
        }
        
        # Install Chocolatey
        if (-not (Install-Chocolatey)) {
            Write-LogError "Chocolatey installation failed"
            return 1
        }
        
        # Install Node.js
        if (-not (Install-NodeJS)) {
            Write-LogError "Node.js installation failed"
            return 1
        }
        
        # Install Python
        if (-not (Install-Python)) {
            Write-LogError "Python installation failed"
            return 1
        }
        
        # Install Git
        if (-not (Install-Git)) {
            Write-LogError "Git installation failed"
            return 1
        }
        
        # Install Docker
        if (-not (Install-Docker)) {
            Write-LogError "Docker installation failed"
            return 1
        }
        
        # Install additional tools
        if (-not (Install-DevTools)) {
            Write-LogWarn "Some development tools installation failed, but continuing..."
        }
        
        # Configure environment
        if (-not (Set-DevelopmentEnvironment)) {
            Write-LogWarn "Environment configuration had issues, but continuing..."
        }
        
        # Validate setup
        if (-not (Test-CompleteSetup)) {
            Write-LogError "Setup validation failed"
            return 1
        }
        
        Write-LogSuccess "Windows setup completed successfully!"
        Write-LogInfo "Next steps:"
        Write-LogInfo "  1. Review the setup log: $LogFile"
        Write-LogInfo "  2. Restart your PowerShell session to ensure environment variables are loaded"
        Write-LogInfo "  3. Start the development server: npm run dev"
        Write-LogInfo "  4. Check the documentation: docs/setup-guide.md"
        
        if (-not $NonInteractive) {
            $startDev = Read-Host "Would you like to start the development server now? (y/n)"
            if ($startDev -eq "y" -or $startDev -eq "Y") {
                Write-LogInfo "Starting development server..."
                Set-Location $ProjectRoot
                npm run dev
            }
        }
        
        return 0
    }
    catch {
        Write-LogError "Unexpected error: $($_.Exception.Message)"
        return 1
    }
}

# Main execution
if ($Help) {
    Show-Help
    exit 0
}

$exitCode = Start-WindowsSetup
Invoke-Cleanup $exitCode
exit $exitCode