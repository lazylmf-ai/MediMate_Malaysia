#!/bin/bash
/**
 * Mobile Development Environment Setup Script
 * Configures React Native development with Malaysian cultural features
 * Supports iOS (Xcode) and Android (Android Studio) development
 */

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MOBILE_DIR="$PROJECT_ROOT/mobile"

# Malaysian healthcare app configuration
APP_NAME="MediMate Malaysia"
BUNDLE_ID="my.medimate.healthcare"
PACKAGE_NAME="my.medimate.healthcare"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${PURPLE}🏥 $1${NC}"
    echo -e "${PURPLE}$(printf '%.0s=' $(seq 1 ${#1}))${NC}"
}

# Platform detection
detect_platform() {
    case "$(uname -s)" in
        Darwin*)
            PLATFORM="macos"
            log_info "Detected macOS - iOS and Android development available"
            ;;
        Linux*)
            PLATFORM="linux"
            log_info "Detected Linux - Android development only"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            PLATFORM="windows"
            log_info "Detected Windows - Android development recommended"
            ;;
        *)
            log_error "Unsupported platform: $(uname -s)"
            exit 1
            ;;
    esac
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js version
check_nodejs() {
    log_header "Checking Node.js Environment"
    
    if ! command_exists node; then
        log_error "Node.js is not installed. Please install Node.js 18 or higher."
        log_info "Visit: https://nodejs.org/ or use setup script from repository root"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if ! npx semver "$NODE_VERSION" -r ">=$REQUIRED_VERSION" >/dev/null 2>&1; then
        log_error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_VERSION or higher"
        exit 1
    fi
    
    log_success "Node.js $NODE_VERSION is compatible"
    
    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        log_success "npm $NPM_VERSION is available"
    else
        log_error "npm is not available"
        exit 1
    fi
}

# Check React Native CLI
check_react_native_cli() {
    log_header "Setting up React Native CLI"
    
    if ! command_exists npx; then
        log_error "npx is not available. Please upgrade Node.js/npm"
        exit 1
    fi
    
    # Install React Native CLI globally if not present
    if ! npx react-native --version >/dev/null 2>&1; then
        log_info "Installing React Native CLI..."
        npm install -g react-native-cli
        log_success "React Native CLI installed"
    else
        RN_CLI_VERSION=$(npx react-native --version)
        log_success "React Native CLI is available: $RN_CLI_VERSION"
    fi
}

# Setup iOS development environment (macOS only)
setup_ios_development() {
    if [[ "$PLATFORM" != "macos" ]]; then
        log_warning "iOS development is only available on macOS"
        return 0
    fi
    
    log_header "Setting up iOS Development Environment"
    
    # Check Xcode
    if ! command_exists xcode-select; then
        log_error "Xcode Command Line Tools are not installed"
        log_info "Install Xcode from App Store and run: xcode-select --install"
        return 1
    fi
    
    # Check if Xcode is properly installed
    if ! xcode-select -p >/dev/null 2>&1; then
        log_error "Xcode Command Line Tools path is not set"
        log_info "Run: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
        return 1
    fi
    
    XCODE_VERSION=$(xcodebuild -version | head -n1 | awk '{print $2}')
    log_success "Xcode $XCODE_VERSION is available"
    
    # Check CocoaPods
    if ! command_exists pod; then
        log_info "Installing CocoaPods..."
        if command_exists brew; then
            brew install cocoapods
        else
            sudo gem install cocoapods
        fi
        log_success "CocoaPods installed"
    else
        POD_VERSION=$(pod --version)
        log_success "CocoaPods $POD_VERSION is available"
    fi
    
    # Setup iOS simulators
    log_info "Checking iOS Simulators..."
    if command_exists xcrun; then
        SIMULATOR_COUNT=$(xcrun simctl list devices available | grep "iPhone" | wc -l | xargs)
        if [[ $SIMULATOR_COUNT -gt 0 ]]; then
            log_success "$SIMULATOR_COUNT iOS simulators available"
        else
            log_warning "No iOS simulators found. Please install iOS simulators from Xcode"
        fi
    fi
    
    return 0
}

# Setup Android development environment
setup_android_development() {
    log_header "Setting up Android Development Environment"
    
    # Check Java
    if ! command_exists java; then
        log_error "Java is not installed. Android development requires JDK 11 or higher"
        log_info "Install Java from: https://adoptium.net/"
        return 1
    fi
    
    JAVA_VERSION=$(java -version 2>&1 | head -n1 | awk -F '"' '{print $2}' | cut -d'.' -f1)
    if [[ $JAVA_VERSION -lt 11 ]]; then
        log_error "Java version $JAVA_VERSION is too old. Android requires JDK 11 or higher"
        return 1
    fi
    
    log_success "Java $JAVA_VERSION is available"
    
    # Check ANDROID_HOME
    if [[ -z "${ANDROID_HOME:-}" ]]; then
        log_warning "ANDROID_HOME is not set"
        
        # Try to find Android SDK
        case "$PLATFORM" in
            macos)
                POTENTIAL_ANDROID_HOME="$HOME/Library/Android/sdk"
                ;;
            linux)
                POTENTIAL_ANDROID_HOME="$HOME/Android/Sdk"
                ;;
            windows)
                POTENTIAL_ANDROID_HOME="$HOME/AppData/Local/Android/Sdk"
                ;;
        esac
        
        if [[ -d "$POTENTIAL_ANDROID_HOME" ]]; then
            log_info "Found Android SDK at: $POTENTIAL_ANDROID_HOME"
            log_warning "Please add the following to your shell profile:"
            echo "export ANDROID_HOME=\"$POTENTIAL_ANDROID_HOME\""
            echo "export PATH=\"\$ANDROID_HOME/tools:\$ANDROID_HOME/platform-tools:\$PATH\""
            
            # Temporarily set for this session
            export ANDROID_HOME="$POTENTIAL_ANDROID_HOME"
            export PATH="$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH"
        else
            log_error "Android SDK not found. Please install Android Studio"
            log_info "Download from: https://developer.android.com/studio"
            return 1
        fi
    else
        log_success "ANDROID_HOME is set: $ANDROID_HOME"
    fi
    
    # Check Android SDK tools
    if [[ -d "$ANDROID_HOME" ]]; then
        if [[ -f "$ANDROID_HOME/platform-tools/adb" ]]; then
            ADB_VERSION=$(adb version | head -n1 | awk '{print $5}')
            log_success "ADB $ADB_VERSION is available"
        else
            log_warning "ADB not found in Android SDK"
        fi
        
        if [[ -d "$ANDROID_HOME/platforms" ]]; then
            API_LEVELS=$(ls "$ANDROID_HOME/platforms" | grep -o 'android-[0-9]\+' | sort -V | tail -3 | tr '\n' ', ' | sed 's/,$//')
            log_success "Android platforms available: $API_LEVELS"
        else
            log_warning "No Android platforms found"
        fi
        
        # Check for Android emulators
        if [[ -d "$ANDROID_HOME/emulator" ]]; then
            EMU_COUNT=$(ls "$ANDROID_HOME/emulator" | grep -c "emulator" || echo 0)
            if [[ $EMU_COUNT -gt 0 ]]; then
                log_success "Android emulator tools available"
            else
                log_warning "Android emulator not found"
            fi
        fi
    fi
    
    return 0
}

# Create React Native project structure
setup_react_native_project() {
    log_header "Setting up React Native Project Structure"
    
    # Create mobile directory if it doesn't exist
    if [[ ! -d "$MOBILE_DIR" ]]; then
        log_info "Creating mobile directory..."
        mkdir -p "$MOBILE_DIR"
    fi
    
    cd "$MOBILE_DIR"
    
    # Initialize React Native project if package.json doesn't exist
    if [[ ! -f "package.json" ]]; then
        log_info "Initializing React Native project..."
        
        # Create package.json with Malaysian healthcare configuration
        cat > package.json << EOF
{
  "name": "medimate-malaysia-mobile",
  "version": "1.0.0",
  "description": "MediMate Malaysia - Culturally Intelligent Healthcare Mobile App",
  "main": "index.js",
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "start": "react-native start",
    "test": "jest",
    "lint": "eslint .",
    "cultural-assets": "node scripts/generate-cultural-assets.js",
    "build:android": "cd android && ./gradlew assembleRelease",
    "build:ios": "react-native run-ios --configuration Release"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-native": "^0.72.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "react-native-screens": "^3.25.0",
    "react-native-safe-area-context": "^4.7.0",
    "react-native-gesture-handler": "^2.12.0",
    "react-native-reanimated": "^3.5.0",
    "react-i18next": "^13.2.0",
    "i18next": "^23.5.0",
    "react-native-localize": "^3.0.0",
    "@react-native-async-storage/async-storage": "^1.19.0",
    "react-native-vector-icons": "^10.0.0",
    "react-native-svg": "^13.4.0",
    "react-native-calendars": "^1.1300.0",
    "react-native-push-notification": "^8.1.0",
    "react-native-device-info": "^10.9.0",
    "@react-native-community/netinfo": "^9.4.0",
    "react-native-keychain": "^8.1.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@babel/preset-env": "^7.20.0",
    "@babel/runtime": "^7.20.0",
    "@react-native/eslint-config": "^0.72.0",
    "@react-native/metro-config": "^0.72.0",
    "@tsconfig/react-native": "^3.0.0",
    "@types/react": "^18.0.24",
    "@types/react-test-renderer": "^18.0.0",
    "babel-jest": "^29.2.1",
    "eslint": "^8.19.0",
    "jest": "^29.2.1",
    "metro-react-native-babel-transformer": "^0.76.0",
    "prettier": "^2.4.1",
    "react-test-renderer": "^18.2.0",
    "typescript": "^4.8.4"
  },
  "jest": {
    "preset": "react-native",
    "setupFilesAfterEnv": ["<rootDir>/src/__tests__/setup.js"],
    "testMatch": [
      "**/__tests__/**/*.test.{js,jsx,ts,tsx}",
      "**/*.(test|spec).{js,jsx,ts,tsx}"
    ],
    "collectCoverageFrom": [
      "src/**/*.{js,jsx,ts,tsx}",
      "!src/**/*.d.ts",
      "!src/__tests__/**",
      "!src/assets/**"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 70,
        "lines": 70,
        "statements": 70
      }
    }
  }
}
EOF
        log_success "Created package.json with Malaysian healthcare configuration"
    fi
    
    # Install dependencies
    if [[ ! -d "node_modules" ]]; then
        log_info "Installing React Native dependencies..."
        npm install
        log_success "Dependencies installed"
    else
        log_info "Updating React Native dependencies..."
        npm update
        log_success "Dependencies updated"
    fi
    
    return 0
}

# Setup Malaysian localization files
setup_localization_files() {
    log_header "Setting up Malaysian Localization"
    
    cd "$MOBILE_DIR"
    
    # Create localization directories
    mkdir -p src/i18n/{locales,medical,cultural,islamic,healthcare}
    
    # Create sample localization files
    cat > src/i18n/locales/en.json << 'EOF'
{
  "welcome": "Welcome to MediMate Malaysia",
  "navigation": {
    "home": "Home",
    "medications": "Medications",
    "appointments": "Appointments",
    "profile": "Profile"
  },
  "common": {
    "yes": "Yes",
    "no": "No",
    "ok": "OK",
    "cancel": "Cancel",
    "save": "Save",
    "loading": "Loading...",
    "error": "Error",
    "retry": "Retry"
  }
}
EOF

    cat > src/i18n/locales/ms.json << 'EOF'
{
  "welcome": "Selamat datang ke MediMate Malaysia",
  "navigation": {
    "home": "Utama",
    "medications": "Ubat-ubatan",
    "appointments": "Temujanji",
    "profile": "Profil"
  },
  "common": {
    "yes": "Ya",
    "no": "Tidak",
    "ok": "OK",
    "cancel": "Batal",
    "save": "Simpan",
    "loading": "Memuatkan...",
    "error": "Ralat",
    "retry": "Cuba Lagi"
  }
}
EOF

    cat > src/i18n/locales/zh.json << 'EOF'
{
  "welcome": "欢迎使用马来西亚医疗助手",
  "navigation": {
    "home": "首页",
    "medications": "药物",
    "appointments": "预约",
    "profile": "个人资料"
  },
  "common": {
    "yes": "是",
    "no": "否",
    "ok": "确定",
    "cancel": "取消",
    "save": "保存",
    "loading": "加载中...",
    "error": "错误",
    "retry": "重试"
  }
}
EOF

    cat > src/i18n/locales/ta.json << 'EOF'
{
  "welcome": "மலேசிய மருத்துவ உதவியாளருக்கு வரவேற்கிறோம்",
  "navigation": {
    "home": "முகப்பு",
    "medications": "மருந்துகள்",
    "appointments": "சந்திப்புகள்",
    "profile": "சுயவிவரம்"
  },
  "common": {
    "yes": "ஆம்",
    "no": "இல்லை",
    "ok": "சரி",
    "cancel": "ரத்து",
    "save": "சேமி",
    "loading": "ஏற்றுகிறது...",
    "error": "பிழை",
    "retry": "மீண்டும் முயற்சி"
  }
}
EOF

    # Create Islamic terminology file
    cat > src/i18n/islamic/terms.json << 'EOF'
{
  "en": {
    "prayers": {
      "fajr": "Fajr",
      "dhuhr": "Dhuhr", 
      "asr": "Asr",
      "maghrib": "Maghrib",
      "isha": "Isha"
    },
    "ramadan": {
      "reminder": "Ramadan reminder",
      "fasting": "Fasting hours",
      "iftar": "Iftar time",
      "suhur": "Suhur time"
    }
  },
  "ms": {
    "prayers": {
      "fajr": "Subuh",
      "dhuhr": "Zohor",
      "asr": "Asar", 
      "maghrib": "Maghrib",
      "isha": "Isya"
    },
    "ramadan": {
      "reminder": "Peringatan Ramadan",
      "fasting": "Waktu berpuasa",
      "iftar": "Waktu berbuka",
      "suhur": "Waktu sahur"
    }
  }
}
EOF

    log_success "Malaysian localization files created"
    return 0
}

# Setup cultural assets
setup_cultural_assets() {
    log_header "Setting up Malaysian Cultural Assets"
    
    cd "$MOBILE_DIR"
    
    # Create assets directories
    mkdir -p src/assets/cultural/{icons,images,flags,themes}
    
    # Create cultural asset generator script
    cat > scripts/generate-cultural-assets.js << 'EOF'
/**
 * Cultural Assets Generator for MediMate Malaysia
 * Generates culturally appropriate icons and images
 */

const fs = require('fs').promises;
const path = require('path');

async function generateCulturalAssets() {
    console.log('🇲🇾 Generating Malaysian cultural assets...');
    
    const assetsDir = path.join(__dirname, '../src/assets/cultural');
    
    // Create asset directories
    const dirs = ['icons', 'images', 'flags', 'themes'];
    for (const dir of dirs) {
        await fs.mkdir(path.join(assetsDir, dir), { recursive: true });
    }
    
    // Generate placeholder assets configuration
    const culturalConfig = {
        icons: {
            prayer: 'prayer-icon.png',
            halal: 'halal-certified.png', 
            mosque: 'mosque-icon.png',
            hospital: 'hospital-icon.png',
            pharmacy: 'pharmacy-icon.png'
        },
        flags: {
            malaysia: 'malaysia-flag.png',
            states: {
                'KUL': 'kuala-lumpur-flag.png',
                'SGR': 'selangor-flag.png'
            }
        },
        themes: {
            colors: 'malaysian-colors.json',
            fonts: 'cultural-fonts.json'
        }
    };
    
    await fs.writeFile(
        path.join(assetsDir, 'cultural-config.json'),
        JSON.stringify(culturalConfig, null, 2)
    );
    
    console.log('✅ Cultural assets configuration generated');
}

if (require.main === module) {
    generateCulturalAssets().catch(console.error);
}

module.exports = { generateCulturalAssets };
EOF

    # Run cultural assets generator
    if command_exists node; then
        cd "$MOBILE_DIR" && node scripts/generate-cultural-assets.js
    fi
    
    log_success "Cultural assets setup completed"
    return 0
}

# Setup Metro bundler configuration
setup_metro_config() {
    log_header "Configuring Metro Bundler"
    
    cd "$MOBILE_DIR"
    
    # Metro config is already created by our main implementation
    if [[ -f "metro.config.js" ]]; then
        log_success "Metro configuration already exists"
    else
        log_warning "Metro configuration not found, creating basic config..."
        
        cat > metro.config.js << 'EOF'
const { getDefaultConfig } = require('metro-config');

module.exports = (async () => {
  const defaultConfig = await getDefaultConfig();
  
  return {
    ...defaultConfig,
    resolver: {
      ...defaultConfig.resolver,
      alias: {
        '@cultural': './src/assets/cultural',
        '@i18n': './src/i18n',
        '@themes': './src/themes',
        '@components': './src/components',
        '@utils': './src/utils',
      }
    }
  };
})();
EOF
        log_success "Basic Metro configuration created"
    fi
    
    return 0
}

# Test React Native setup
test_react_native_setup() {
    log_header "Testing React Native Setup"
    
    cd "$MOBILE_DIR"
    
    # Test Metro bundler
    log_info "Testing Metro bundler configuration..."
    if npx react-native start --reset-cache --verbose 2>/dev/null &
    then
        METRO_PID=$!
        sleep 5
        
        if kill -0 $METRO_PID 2>/dev/null; then
            log_success "Metro bundler started successfully"
            kill $METRO_PID
        else
            log_warning "Metro bundler may have issues"
        fi
    else
        log_warning "Could not test Metro bundler"
    fi
    
    # Test Android if available
    if [[ -n "${ANDROID_HOME:-}" ]] && command_exists adb; then
        log_info "Testing Android setup..."
        
        # Check for connected devices/emulators
        ANDROID_DEVICES=$(adb devices | grep -v "List" | wc -l | xargs)
        if [[ $ANDROID_DEVICES -gt 0 ]]; then
            log_success "Android devices/emulators detected"
        else
            log_info "No Android devices connected (this is normal for initial setup)"
        fi
    fi
    
    # Test iOS if available (macOS only)
    if [[ "$PLATFORM" == "macos" ]] && command_exists xcrun; then
        log_info "Testing iOS setup..."
        
        # Check simulators
        IOS_SIMS=$(xcrun simctl list devices available | grep "iPhone" | wc -l | xargs)
        if [[ $IOS_SIMS -gt 0 ]]; then
            log_success "iOS simulators available"
        else
            log_warning "No iOS simulators found"
        fi
    fi
    
    return 0
}

# Create development documentation
create_mobile_docs() {
    log_header "Creating Mobile Development Documentation"
    
    # Create docs directory
    mkdir -p "$PROJECT_ROOT/docs"
    
    cat > "$PROJECT_ROOT/docs/mobile-development.md" << 'EOF'
# Mobile Development Guide - MediMate Malaysia

## Overview
This guide covers the React Native mobile development environment for MediMate Malaysia, a culturally intelligent healthcare application.

## Prerequisites
- Node.js 18+
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## Quick Start

### 1. Setup Environment
```bash
./scripts/setup-mobile.sh
```

### 2. Start Development Server
```bash
cd mobile
npm start
```

### 3. Run on Device/Simulator
```bash
# Android
npm run android

# iOS (macOS only)
npm run ios
```

## Malaysian Cultural Features

### Localization
- Supports Bahasa Malaysia, English, Mandarin, Tamil
- Cultural date/time formatting (DD/MM/YYYY)
- Malaysian Ringgit currency formatting
- Healthcare terminology in local languages

### Cultural Themes
- Malaysian national colors integration
- Islamic prayer time UI elements
- Multi-cultural festival themes
- Healthcare-specific Malaysian design patterns

### Cultural Components
- Prayer time displays with JAKIM calculations
- Holiday calendars with Malaysian federal and state holidays
- Halal medication indicators
- Cultural greetings and messaging

## Development Workflow

### 1. Cultural Asset Management
```bash
npm run cultural-assets
```

### 2. Localization Updates
- Edit files in `src/i18n/locales/`
- Test with different language settings
- Validate cultural accuracy

### 3. Theme Customization  
- Modify `src/themes/cultural.js`
- Test accessibility compliance
- Validate Malaysian design standards

## Testing

### Unit Tests
```bash
npm test
```

### Cultural Feature Testing
- Test prayer time calculations
- Validate holiday displays
- Check multi-language rendering
- Verify cultural icon display

## Troubleshooting

### Common Issues
1. **Metro bundler issues**: Clear cache with `npm start --reset-cache`
2. **Android build failures**: Check ANDROID_HOME environment variable
3. **iOS build failures**: Verify Xcode and CocoaPods installation
4. **Cultural assets not loading**: Run `npm run cultural-assets`

### Platform-Specific Issues

#### Android
- Ensure API level 28+ is installed
- Check USB debugging is enabled
- Verify device is connected with `adb devices`

#### iOS (macOS only)
- Ensure Xcode is updated
- Check iOS Simulator installation
- Run `pod install` in `mobile/ios` if needed

## Cultural Considerations

### Islamic Features
- Prayer times calculated using JAKIM standards
- Ramadan mode for medication scheduling
- Halal certification indicators

### Multi-Cultural Support
- Chinese New Year calendar integration
- Deepavali and other Hindu festivals
- Multi-language medical terminology

### Malaysian Healthcare
- PDPA compliance considerations
- MOH integration standards
- Local pharmacy and hospital data

## Performance Optimization

### Cultural Assets
- Optimize images for different screen densities
- Use lazy loading for cultural content
- Cache prayer times and holiday data

### Network Considerations
- Handle slow Malaysian mobile networks
- Implement offline capabilities
- Optimize cultural data sync

## Deployment

### Android Release Build
```bash
npm run build:android
```

### iOS Release Build  
```bash
npm run build:ios
```

## Support
For issues related to Malaysian cultural features or healthcare compliance, consult with:
- Malaysian healthcare experts
- Islamic scholars (for prayer time accuracy)
- Multi-cultural community representatives
EOF

    log_success "Mobile development documentation created"
    return 0
}

# Main setup function
main() {
    log_header "MediMate Malaysia Mobile Development Setup"
    log_info "Setting up React Native environment with Malaysian cultural features"
    
    # Platform detection
    detect_platform
    
    # Core requirements check
    check_nodejs || exit 1
    check_react_native_cli || exit 1
    
    # Platform-specific setup
    setup_ios_development
    setup_android_development || exit 1
    
    # Project setup
    setup_react_native_project || exit 1
    setup_localization_files || exit 1
    setup_cultural_assets || exit 1
    setup_metro_config || exit 1
    
    # Testing
    test_react_native_setup
    
    # Documentation
    create_mobile_docs || exit 1
    
    log_header "Mobile Development Environment Ready!"
    log_success "MediMate Malaysia mobile development environment is configured"
    log_info "Next steps:"
    echo "  1. cd mobile"
    echo "  2. npm start"
    echo "  3. npm run android (or npm run ios on macOS)"
    echo ""
    log_info "For detailed information, see docs/mobile-development.md"
    echo ""
    log_success "🇲🇾 Ready to build culturally intelligent healthcare technology!"
}

# Run main function
main "$@"