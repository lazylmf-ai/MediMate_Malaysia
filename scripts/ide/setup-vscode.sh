#!/bin/bash
#
# VSCode IDE Setup Script for MediMate Malaysia
# Automates VSCode configuration for optimal developer experience
#

set -euo pipefail

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"
source "${SCRIPT_DIR}/../lib/platform.sh"

# Configuration
VSCODE_CONFIG_DIR="${SCRIPT_DIR}/../../config/vscode"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
VSCODE_SETTINGS_DIR="$PROJECT_ROOT/.vscode"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to display colored output
print_setup() {
    local level="$1"
    local message="$2"
    local details="${3:-}"
    local color
    
    case "$level" in
        "SUCCESS") color="$GREEN" ;;
        "ERROR") color="$RED" ;;
        "WARNING") color="$YELLOW" ;;
        "INFO") color="$BLUE" ;;
        "DEBUG") color="$CYAN" ;;
        *) color="$NC" ;;
    esac
    
    printf "${color}[%-7s]${NC} %s\n" "$level" "$message"
    
    if [[ -n "$details" ]]; then
        echo "         $details"
    fi
}

# Function to detect VSCode installation
detect_vscode() {
    print_setup "INFO" "Detecting VSCode installation..."
    
    local vscode_cmd=""
    
    # Try different VSCode command variants
    if command -v code >/dev/null 2>&1; then
        vscode_cmd="code"
        print_setup "SUCCESS" "VSCode found" "Command: code"
    elif command -v code-insiders >/dev/null 2>&1; then
        vscode_cmd="code-insiders"
        print_setup "SUCCESS" "VSCode Insiders found" "Command: code-insiders"
    elif [[ "$(uname)" == "Darwin" ]] && [[ -d "/Applications/Visual Studio Code.app" ]]; then
        vscode_cmd="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
        print_setup "SUCCESS" "VSCode found in Applications" "Path: /Applications/Visual Studio Code.app"
    elif [[ "$(uname)" == "Darwin" ]] && [[ -d "/Applications/Visual Studio Code - Insiders.app" ]]; then
        vscode_cmd="/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code"
        print_setup "SUCCESS" "VSCode Insiders found in Applications"
    else
        print_setup "ERROR" "VSCode not found"
        echo ""
        echo "Please install VSCode from one of these sources:"
        echo "1. Official website: https://code.visualstudio.com/"
        echo "2. Package manager:"
        echo "   - macOS: brew install --cask visual-studio-code"
        echo "   - Ubuntu: snap install code --classic"
        echo "   - Windows: winget install Microsoft.VisualStudioCode"
        return 1
    fi
    
    echo "$vscode_cmd"
    return 0
}

# Function to create VSCode workspace directory
setup_workspace_directory() {
    print_setup "INFO" "Setting up VSCode workspace directory..."
    
    if [[ ! -d "$VSCODE_SETTINGS_DIR" ]]; then
        mkdir -p "$VSCODE_SETTINGS_DIR"
        print_setup "SUCCESS" "Created .vscode directory" "$VSCODE_SETTINGS_DIR"
    else
        print_setup "INFO" "VSCode workspace directory already exists"
    fi
}

# Function to copy configuration files
copy_configuration_files() {
    print_setup "INFO" "Copying VSCode configuration files..."
    
    # Copy settings.json
    if [[ -f "$VSCODE_CONFIG_DIR/settings.json" ]]; then
        cp "$VSCODE_CONFIG_DIR/settings.json" "$VSCODE_SETTINGS_DIR/settings.json"
        print_setup "SUCCESS" "Copied settings.json"
    else
        print_setup "WARNING" "settings.json not found in config directory"
    fi
    
    # Copy extensions.json
    if [[ -f "$VSCODE_CONFIG_DIR/extensions.json" ]]; then
        cp "$VSCODE_CONFIG_DIR/extensions.json" "$VSCODE_SETTINGS_DIR/extensions.json"
        print_setup "SUCCESS" "Copied extensions.json"
    else
        print_setup "WARNING" "extensions.json not found in config directory"
    fi
    
    # Copy launch.json
    if [[ -f "$VSCODE_CONFIG_DIR/launch.json" ]]; then
        cp "$VSCODE_CONFIG_DIR/launch.json" "$VSCODE_SETTINGS_DIR/launch.json"
        print_setup "SUCCESS" "Copied launch.json"
    else
        print_setup "WARNING" "launch.json not found in config directory"
    fi
    
    # Copy tasks.json
    if [[ -f "$VSCODE_CONFIG_DIR/tasks.json" ]]; then
        cp "$VSCODE_CONFIG_DIR/tasks.json" "$VSCODE_SETTINGS_DIR/tasks.json"
        print_setup "SUCCESS" "Copied tasks.json"
    else
        print_setup "WARNING" "tasks.json not found in config directory"
    fi
    
    print_setup "INFO" "VSCode configuration files copied successfully"
}

# Function to install recommended extensions
install_extensions() {
    local vscode_cmd="$1"
    
    print_setup "INFO" "Installing recommended VSCode extensions..."
    
    if [[ ! -f "$VSCODE_SETTINGS_DIR/extensions.json" ]]; then
        print_setup "WARNING" "extensions.json not found, skipping extension installation"
        return 0
    fi
    
    # Extract recommended extensions from extensions.json
    local extensions
    if command -v jq >/dev/null 2>&1; then
        extensions=$(jq -r '.recommendations[]' "$VSCODE_SETTINGS_DIR/extensions.json" 2>/dev/null || echo "")
    else
        # Fallback without jq
        extensions=$(grep -o '"[^"]*"' "$VSCODE_SETTINGS_DIR/extensions.json" | grep -v "recommendations\|unwantedRecommendations" | sed 's/"//g' || echo "")
    fi
    
    if [[ -z "$extensions" ]]; then
        print_setup "WARNING" "No extensions found in extensions.json"
        return 0
    fi
    
    local installed_count=0
    local failed_count=0
    
    while IFS= read -r extension; do
        if [[ -n "$extension" && "$extension" != *"recommendations"* && "$extension" != *"unwanted"* ]]; then
            print_setup "INFO" "Installing extension: $extension"
            
            if $vscode_cmd --install-extension "$extension" >/dev/null 2>&1; then
                print_setup "SUCCESS" "Installed: $extension"
                ((installed_count++))
            else
                print_setup "WARNING" "Failed to install: $extension"
                ((failed_count++))
            fi
        fi
    done <<< "$extensions"
    
    print_setup "INFO" "Extension installation completed" "Installed: $installed_count, Failed: $failed_count"
}

# Function to create workspace file
create_workspace_file() {
    print_setup "INFO" "Creating VSCode workspace file..."
    
    local workspace_file="$PROJECT_ROOT/medimate-malaysia.code-workspace"
    
    cat > "$workspace_file" << EOF
{
  "folders": [
    {
      "name": "🏥 MediMate Malaysia",
      "path": "."
    },
    {
      "name": "🌐 Backend API",
      "path": "./backend"
    },
    {
      "name": "💻 Frontend Web",
      "path": "./frontend"
    },
    {
      "name": "📱 Mobile App",
      "path": "./mobile"
    },
    {
      "name": "🧪 Tests & E2E",
      "path": "./tests"
    },
    {
      "name": "📋 Scripts & Tools",
      "path": "./scripts"
    },
    {
      "name": "🐳 Docker & Config",
      "path": "./docker"
    },
    {
      "name": "🇲🇾 Malaysian Data",
      "path": "./data/malaysia"
    }
  ],
  "settings": {
    "typescript.preferences.includePackageJsonAutoImports": "on",
    "eslint.workingDirectories": [
      "backend",
      "frontend",
      "mobile"
    ],
    "search.exclude": {
      "**/node_modules": true,
      "**/dist": true,
      "**/build": true,
      "**/.git": true,
      "**/coverage": true,
      "**/logs": true
    },
    "files.exclude": {
      "**/node_modules": true,
      "**/dist": true,
      "**/build": true,
      "**/.git": true,
      "**/coverage": true,
      "**/*.log": true
    },
    "medimate.workspace.mode": "development",
    "medimate.culture.validation": true,
    "medimate.healthcare.compliance": "enabled"
  },
  "extensions": {
    "recommendations": [
      "ms-vscode.vscode-typescript-next",
      "ms-vscode.vscode-eslint",
      "esbenp.prettier-vscode",
      "ms-azuretools.vscode-docker",
      "ms-python.python",
      "ms-vscode.test-adapter-converter",
      "eamodio.gitlens",
      "ms-vscode.live-server",
      "streetsidesoftware.code-spell-checker"
    ]
  },
  "tasks": {
    "version": "2.0.0",
    "tasks": [
      {
        "label": "🚀 Start Full Development Environment",
        "type": "shell",
        "command": "./scripts/setup.sh",
        "group": {
          "kind": "build",
          "isDefault": true
        },
        "presentation": {
          "echo": true,
          "reveal": "always",
          "focus": false,
          "panel": "shared"
        },
        "problemMatcher": []
      },
      {
        "label": "🏥 Run Health Checks",
        "type": "shell",
        "command": "./scripts/health/service-checks.sh",
        "args": ["check"],
        "group": "test",
        "presentation": {
          "echo": true,
          "reveal": "always",
          "focus": false,
          "panel": "shared"
        }
      },
      {
        "label": "🇲🇾 Validate Malaysian Data",
        "type": "shell",
        "command": "./scripts/health/validate-environment.sh",
        "args": ["culture"],
        "group": "test",
        "presentation": {
          "echo": true,
          "reveal": "always",
          "focus": false,
          "panel": "shared"
        }
      }
    ]
  },
  "launch": {
    "version": "0.2.0",
    "configurations": [
      {
        "name": "🚀 Launch Full Stack",
        "type": "node",
        "request": "launch",
        "program": "\${workspaceFolder}/scripts/setup.sh",
        "console": "integratedTerminal"
      }
    ]
  }
}
EOF
    
    print_setup "SUCCESS" "Created VSCode workspace file" "$workspace_file"
}

# Function to setup Git integration
setup_git_integration() {
    print_setup "INFO" "Setting up Git integration..."
    
    # Create .gitignore entries for VSCode (if not already present)
    local gitignore_file="$PROJECT_ROOT/.gitignore"
    
    if [[ -f "$gitignore_file" ]]; then
        # Check if VSCode entries already exist
        if ! grep -q ".vscode/" "$gitignore_file" 2>/dev/null; then
            cat >> "$gitignore_file" << EOF

# VSCode
.vscode/settings.json
.vscode/launch.json
.vscode/extensions.json
.vscode/tasks.json
!.vscode/*.template.json

EOF
            print_setup "SUCCESS" "Added VSCode entries to .gitignore"
        else
            print_setup "INFO" "VSCode entries already exist in .gitignore"
        fi
    else
        print_setup "WARNING" ".gitignore not found, creating one"
        cat > "$gitignore_file" << EOF
# VSCode
.vscode/settings.json
.vscode/launch.json
.vscode/extensions.json
.vscode/tasks.json
!.vscode/*.template.json

EOF
        print_setup "SUCCESS" "Created .gitignore with VSCode entries"
    fi
    
    # Setup pre-commit hooks for VSCode (if git hooks exist)
    local hooks_dir="$PROJECT_ROOT/.git/hooks"
    if [[ -d "$hooks_dir" ]]; then
        local pre_commit_hook="$hooks_dir/pre-commit"
        if [[ ! -f "$pre_commit_hook" ]]; then
            cat > "$pre_commit_hook" << 'EOF'
#!/bin/bash
# VSCode-friendly pre-commit hook

# Run linting
echo "Running ESLint..."
npm run lint --prefix frontend --silent
npm run lint --prefix backend --silent

# Run formatting check
echo "Checking code formatting..."
npm run format:check --prefix frontend --silent 2>/dev/null || true
npm run format:check --prefix backend --silent 2>/dev/null || true

# Run health checks if available
if [[ -f "./scripts/health/validate-environment.sh" ]]; then
    echo "Running quick health validation..."
    ./scripts/health/validate-environment.sh config >/dev/null 2>&1 || true
fi

echo "Pre-commit checks completed ✓"
EOF
            chmod +x "$pre_commit_hook"
            print_setup "SUCCESS" "Created pre-commit hook"
        else
            print_setup "INFO" "Pre-commit hook already exists"
        fi
    fi
}

# Function to create development snippets
create_development_snippets() {
    print_setup "INFO" "Creating development code snippets..."
    
    # Create snippets directory
    local snippets_dir="$VSCODE_SETTINGS_DIR/snippets"
    mkdir -p "$snippets_dir"
    
    # JavaScript/TypeScript snippets for MediMate
    cat > "$snippets_dir/javascript.json" << 'EOF'
{
  "MediMate API Route": {
    "prefix": "mmroute",
    "body": [
      "/**",
      " * ${1:Route Description}",
      " * @route ${2:GET} /api/${3:endpoint}",
      " * @access ${4:Public/Private/Admin}",
      " */",
      "router.${2:get}('/${3:endpoint}', [",
      "  // Validation middleware",
      "  ${5:validateRequest},",
      "  // Authentication middleware if needed",
      "  ${6:authenticateToken},",
      "], async (req, res) => {",
      "  try {",
      "    ${7:// Implementation}",
      "    ",
      "    res.status(200).json({",
      "      success: true,",
      "      message: '${8:Success message}',",
      "      data: ${9:result}",
      "    });",
      "  } catch (error) {",
      "    console.error('${1} error:', error);",
      "    res.status(500).json({",
      "      success: false,",
      "      message: 'Internal server error',",
      "      error: process.env.NODE_ENV === 'development' ? error.message : undefined",
      "    });",
      "  }",
      "});",
      "$0"
    ],
    "description": "Create a MediMate API route with error handling"
  },
  
  "MediMate React Component": {
    "prefix": "mmcomponent",
    "body": [
      "import React, { useState, useEffect } from 'react';",
      "import { useTranslation } from 'react-i18next';",
      "import './styles/${1:ComponentName}.css';",
      "",
      "interface ${1:ComponentName}Props {",
      "  ${2:prop}: ${3:string};",
      "}",
      "",
      "export const ${1:ComponentName}: React.FC<${1:ComponentName}Props> = ({ ${2:prop} }) => {",
      "  const { t } = useTranslation();",
      "  const [${4:state}, set${4/(.*)/${4:/capitalize}/}] = useState${5:<string>}(${6:''});",
      "",
      "  useEffect(() => {",
      "    ${7:// Effect logic}",
      "  }, [${8:dependencies}]);",
      "",
      "  return (",
      "    <div className=\"${1/(.*)/${1:/downcase}/}-container\">",
      "      <h2>{t('${9:translation.key}')}</h2>",
      "      ${10:// Component JSX}",
      "    </div>",
      "  );",
      "};",
      "",
      "export default ${1:ComponentName};",
      "$0"
    ],
    "description": "Create a MediMate React component with i18n support"
  },

  "MediMate Database Model": {
    "prefix": "mmmodel",
    "body": [
      "const { DataTypes } = require('sequelize');",
      "const sequelize = require('../config/database');",
      "",
      "const ${1:ModelName} = sequelize.define('${1:ModelName}', {",
      "  id: {",
      "    type: DataTypes.UUID,",
      "    defaultValue: DataTypes.UUIDV4,",
      "    primaryKey: true,",
      "  },",
      "  ${2:fieldName}: {",
      "    type: DataTypes.${3:STRING},",
      "    allowNull: ${4:false},",
      "    ${5:validate: {",
      "      ${6:notEmpty: true}",
      "    }}",
      "  },",
      "  // Malaysian cultural fields if needed",
      "  language: {",
      "    type: DataTypes.ENUM('en', 'ms', 'zh', 'ta'),",
      "    defaultValue: 'en',",
      "  },",
      "  region: {",
      "    type: DataTypes.STRING,",
      "    allowNull: true,",
      "  },",
      "  createdAt: {",
      "    type: DataTypes.DATE,",
      "    defaultValue: DataTypes.NOW,",
      "  },",
      "  updatedAt: {",
      "    type: DataTypes.DATE,",
      "    defaultValue: DataTypes.NOW,",
      "  },",
      "}, {",
      "  tableName: '${7:table_names}',",
      "  timestamps: true,",
      "  indexes: [",
      "    { fields: ['${8:indexField}'] },",
      "    { fields: ['language', 'region'] }, // Cultural indexing",
      "  ],",
      "});",
      "",
      "// Associations",
      "${1:ModelName}.associate = (models) => {",
      "  ${9:// Define associations here}",
      "};",
      "",
      "module.exports = ${1:ModelName};",
      "$0"
    ],
    "description": "Create a MediMate database model with Malaysian cultural support"
  },

  "MediMate Health Check": {
    "prefix": "mmhealth",
    "body": [
      "/**",
      " * ${1:Service} Health Check",
      " * Monitors ${1:service} performance and availability",
      " */",
      "const check${1/(.*)/${1:/capitalize}/}Health = async () => {",
      "  const startTime = Date.now();",
      "  const healthStatus = {",
      "    service: '${1:service}',",
      "    status: 'unknown',",
      "    responseTime: 0,",
      "    timestamp: new Date().toISOString(),",
      "    details: {}",
      "  };",
      "",
      "  try {",
      "    ${2:// Health check logic}",
      "    ",
      "    const responseTime = Date.now() - startTime;",
      "    ",
      "    healthStatus.status = responseTime < ${3:1000} ? 'healthy' : 'degraded';",
      "    healthStatus.responseTime = responseTime;",
      "    healthStatus.details = {",
      "      ${4:// Additional health details}",
      "    };",
      "    ",
      "    return healthStatus;",
      "  } catch (error) {",
      "    healthStatus.status = 'unhealthy';",
      "    healthStatus.responseTime = Date.now() - startTime;",
      "    healthStatus.details = {",
      "      error: error.message,",
      "      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined",
      "    };",
      "    ",
      "    return healthStatus;",
      "  }",
      "};",
      "",
      "module.exports = { check${1/(.*)/${1:/capitalize}/}Health };",
      "$0"
    ],
    "description": "Create a MediMate health check function"
  }
}
EOF
    
    print_setup "SUCCESS" "Created JavaScript/TypeScript snippets"
    
    # Shell script snippets
    cat > "$snippets_dir/shellscript.json" << 'EOF'
{
  "MediMate Shell Script Header": {
    "prefix": "mmshell",
    "body": [
      "#!/bin/bash",
      "#",
      "# ${1:Script Description} for MediMate Malaysia",
      "# ${2:Additional description}",
      "#",
      "",
      "set -euo pipefail",
      "",
      "# Source common functions",
      "SCRIPT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" && pwd)\"",
      "source \"${SCRIPT_DIR}/../lib/common.sh\"",
      "",
      "# Configuration",
      "${3:CONFIG_VAR}=${${4:CONFIG_VAR}:-${5:default_value}}",
      "",
      "# Function definitions",
      "${6:function_name}() {",
      "    local ${7:param}=\"$1\"",
      "    ",
      "    print_status \"INFO\" \"${8:Action description}\" \"$${7:param}\"",
      "    ",
      "    ${9:# Implementation}",
      "    ",
      "    return 0",
      "}",
      "",
      "# Main function",
      "main() {",
      "    local command=\"${1:-${10:default_command}}\"",
      "    ",
      "    case \"$command\" in",
      "        \"${10:default_command}\")",
      "            ${6:function_name} \"${11:argument}\"",
      "            ;;",
      "        *)",
      "            echo \"Usage: $0 {${10:default_command}}\"",
      "            exit 1",
      "            ;;",
      "    esac",
      "}",
      "",
      "# Run main function if script is executed directly",
      "if [[ \"${BASH_SOURCE[0]}\" == \"${0}\" ]]; then",
      "    main \"$@\"",
      "fi",
      "$0"
    ],
    "description": "Create a MediMate shell script with standard structure"
  }
}
EOF
    
    print_setup "SUCCESS" "Created shell script snippets"
}

# Function to setup debugging configuration
setup_debugging() {
    print_setup "INFO" "Setting up debugging configuration..."
    
    # Ensure launch.json has the correct paths
    if [[ -f "$VSCODE_SETTINGS_DIR/launch.json" ]]; then
        # Verify that paths exist in launch.json
        if grep -q "workspaceFolder" "$VSCODE_SETTINGS_DIR/launch.json"; then
            print_setup "SUCCESS" "Debugging configuration verified"
        else
            print_setup "WARNING" "Debugging configuration may need manual adjustment"
        fi
    else
        print_setup "WARNING" "launch.json not found, debugging may not work properly"
    fi
    
    # Create debug data directories
    mkdir -p "$PROJECT_ROOT/.vscode/chrome-debug-data"
    mkdir -p "$PROJECT_ROOT/.vscode/edge-debug-data"
    
    print_setup "SUCCESS" "Debug data directories created"
}

# Function to verify installation
verify_installation() {
    print_setup "INFO" "Verifying VSCode setup..."
    
    local verification_passed=true
    
    # Check workspace directory
    if [[ -d "$VSCODE_SETTINGS_DIR" ]]; then
        print_setup "SUCCESS" "VSCode workspace directory exists"
    else
        print_setup "ERROR" "VSCode workspace directory missing"
        verification_passed=false
    fi
    
    # Check configuration files
    local config_files=("settings.json" "extensions.json" "launch.json" "tasks.json")
    for config_file in "${config_files[@]}"; do
        if [[ -f "$VSCODE_SETTINGS_DIR/$config_file" ]]; then
            print_setup "SUCCESS" "$config_file exists"
        else
            print_setup "WARNING" "$config_file missing"
        fi
    done
    
    # Check workspace file
    if [[ -f "$PROJECT_ROOT/medimate-malaysia.code-workspace" ]]; then
        print_setup "SUCCESS" "Workspace file exists"
    else
        print_setup "WARNING" "Workspace file missing"
    fi
    
    if [[ "$verification_passed" == true ]]; then
        print_setup "SUCCESS" "VSCode setup verification completed successfully"
        return 0
    else
        print_setup "ERROR" "VSCode setup verification failed"
        return 1
    fi
}

# Function to open VSCode with the project
open_vscode() {
    local vscode_cmd="$1"
    local open_workspace="${2:-false}"
    
    print_setup "INFO" "Opening VSCode..."
    
    if [[ "$open_workspace" == "true" && -f "$PROJECT_ROOT/medimate-malaysia.code-workspace" ]]; then
        $vscode_cmd "$PROJECT_ROOT/medimate-malaysia.code-workspace"
        print_setup "SUCCESS" "Opened VSCode with workspace file"
    else
        $vscode_cmd "$PROJECT_ROOT"
        print_setup "SUCCESS" "Opened VSCode with project directory"
    fi
}

# Main setup function
run_vscode_setup() {
    echo "================================================="
    echo "    MediMate Malaysia VSCode Setup"
    echo "================================================="
    echo ""
    
    # Detect VSCode
    local vscode_cmd
    if ! vscode_cmd=$(detect_vscode); then
        return 1
    fi
    
    echo ""
    
    # Setup workspace
    setup_workspace_directory
    echo ""
    
    # Copy configuration files
    copy_configuration_files
    echo ""
    
    # Install extensions
    install_extensions "$vscode_cmd"
    echo ""
    
    # Create workspace file
    create_workspace_file
    echo ""
    
    # Setup Git integration
    setup_git_integration
    echo ""
    
    # Create development snippets
    create_development_snippets
    echo ""
    
    # Setup debugging
    setup_debugging
    echo ""
    
    # Verify installation
    if verify_installation; then
        echo ""
        print_setup "SUCCESS" "VSCode setup completed successfully!"
        echo ""
        echo "Next steps:"
        echo "1. Restart VSCode to apply all settings"
        echo "2. Install any missing extensions prompted by VSCode"
        echo "3. Configure your preferred color theme and font"
        echo "4. Test debugging configuration with a sample project"
        echo ""
        echo "To open the project:"
        echo "  code $PROJECT_ROOT"
        echo "  or"
        echo "  code $PROJECT_ROOT/medimate-malaysia.code-workspace"
        return 0
    else
        return 1
    fi
}

# Main function
main() {
    local command="${1:-setup}"
    local open_after="${2:-false}"
    
    case "$command" in
        "setup"|"configure")
            run_vscode_setup
            if [[ "$?" -eq 0 && "$open_after" == "open" ]]; then
                local vscode_cmd
                if vscode_cmd=$(detect_vscode); then
                    open_vscode "$vscode_cmd" true
                fi
            fi
            ;;
        "extensions")
            local vscode_cmd
            if vscode_cmd=$(detect_vscode); then
                install_extensions "$vscode_cmd"
            fi
            ;;
        "workspace")
            create_workspace_file
            ;;
        "snippets")
            create_development_snippets
            ;;
        "verify")
            verify_installation
            ;;
        "open")
            local vscode_cmd
            if vscode_cmd=$(detect_vscode); then
                open_vscode "$vscode_cmd" true
            fi
            ;;
        *)
            echo "Usage: $0 {setup|extensions|workspace|snippets|verify|open} [open]"
            echo ""
            echo "Commands:"
            echo "  setup        - Complete VSCode setup (default)"
            echo "  extensions   - Install recommended extensions only"
            echo "  workspace    - Create workspace file only"
            echo "  snippets     - Create code snippets only"
            echo "  verify       - Verify current setup"
            echo "  open         - Open VSCode with the project"
            echo ""
            echo "Options:"
            echo "  open         - Open VSCode after setup (use with setup command)"
            echo ""
            echo "Examples:"
            echo "  $0 setup open   # Setup and open VSCode"
            echo "  $0 extensions   # Install extensions only"
            exit 1
            ;;
    esac
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi