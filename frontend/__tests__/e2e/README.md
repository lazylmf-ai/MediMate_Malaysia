# End-to-End Tests for MediMate

## Overview

This directory contains E2E tests that simulate real user journeys through the MediMate application. These tests validate complete workflows from the user's perspective.

## Test Framework

We use **Detox** for React Native E2E testing, which provides:
- Real device/simulator testing
- Reliable element matching
- Synchronization with React Native
- Screenshot and video recording capabilities

## Setup

### Installation

```bash
# Install Detox CLI globally
npm install -g detox-cli

# Install Detox in the project
npm install --save-dev detox

# iOS setup
cd ios && pod install && cd ..

# Android setup (if needed)
```

### Configuration

Detox configuration is in `package.json` or `.detoxrc.js`:

```json
{
  "detox": {
    "configurations": {
      "ios.sim.debug": {
        "device": {
          "type": "iPhone 14 Pro"
        },
        "app": "ios.debug"
      },
      "android.emu.debug": {
        "device": {
          "avdName": "Pixel_5_API_31"
        },
        "app": "android.debug"
      }
    }
  }
}
```

## Running Tests

### Run all E2E tests
```bash
detox test --configuration ios.sim.debug
detox test --configuration android.emu.debug
```

### Run specific test suite
```bash
detox test --configuration ios.sim.debug medication-management.e2e.ts
```

### Debug mode
```bash
detox test --configuration ios.sim.debug --loglevel verbose
```

## Test Scenarios

### 1. Medication Management Journey (medication-management.e2e.ts)
- Photo capture → OCR → Medication entry
- Schedule creation with cultural adaptation
- Reminder notifications
- Adherence tracking

### 2. Emergency Escalation (emergency-escalation.e2e.ts)
- Miss critical medication doses
- Automatic family notification
- Emergency contact workflow
- Alert acknowledgment

### 3. Offline Usage (offline-usage.e2e.ts)
- 7-day offline simulation
- Local data storage
- Sync conflict resolution
- Data integrity verification

### 4. Family Dashboard (family-dashboard.e2e.ts)
- Family member login
- View patient medication status
- Receive alerts
- Privacy control validation

### 5. Cultural Workflows (cultural-workflows.e2e.ts)
- Prayer time integration
- Language switching (EN/MS/ZH/TA)
- Ramadan schedule adaptation
- Festival awareness

## Best Practices

### Element Matching
Use testID for reliable element selection:
```tsx
<Button testID="submit-medication-button" />
```

```typescript
await element(by.id('submit-medication-button')).tap();
```

### Waiting for Elements
```typescript
await waitFor(element(by.id('medication-list')))
  .toBeVisible()
  .withTimeout(5000);
```

### Assertions
```typescript
await expect(element(by.text('Medication Added'))).toBeVisible();
await expect(element(by.id('adherence-rate'))).toHaveText('85%');
```

### Screenshots
```typescript
await device.takeScreenshot('medication-entry-screen');
```

## Test Data

### Fixtures
Test data is managed in `__tests__/fixtures/`:
- `medications.json` - Sample medication data
- `patients.json` - Test patient profiles
- `cultural-contexts.json` - Cultural settings

### Test Accounts
```typescript
const testAccounts = {
  patient: {
    email: 'test.patient@medimate.test',
    password: 'TestPassword123!',
  },
  familyMember: {
    email: 'family.member@medimate.test',
    password: 'FamilyPassword123!',
  },
};
```

## Device Compatibility Matrix

Tests should run on:

### iOS
- iPhone 12, 13, 14 (various sizes)
- iPad (6th gen+)
- iOS 12.0+

### Android
- Samsung Galaxy S series
- Pixel devices
- Android 8.0+

## Performance Benchmarks

E2E tests validate:
- App launch time < 3 seconds
- Screen transitions < 500ms
- API response handling < 2 seconds
- Offline mode activation < 1 second

## Troubleshooting

### iOS Simulator Issues
```bash
# Reset simulator
xcrun simctl erase all

# Rebuild app
detox build --configuration ios.sim.debug
```

### Android Emulator Issues
```bash
# List available devices
emulator -list-avds

# Start specific emulator
emulator -avd Pixel_5_API_31
```

### Test Failures
1. Check element testIDs are correct
2. Verify app is built for testing
3. Review logs: `detox test --loglevel verbose`
4. Take screenshots at failure point

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run E2E Tests
  run: |
    detox build --configuration ios.sim.debug
    detox test --configuration ios.sim.debug --cleanup
```

### Test Reports
Results are saved in:
- `test-results/` - JUnit XML reports
- `artifacts/` - Screenshots and videos

## Coverage Goals

- **User Journey Coverage**: 15-20 complete scenarios
- **Critical Path Coverage**: 100%
- **Device Coverage**: 30+ device/OS combinations
- **Cultural Scenario Coverage**: All 4 languages, 3 religions

## Maintenance

### Updating Tests
- Review and update test scenarios quarterly
- Add new scenarios for new features
- Remove obsolete tests
- Keep test data fresh and realistic

### Performance Monitoring
Track E2E test execution time:
- Target: < 10 minutes for full suite
- Individual test: < 2 minutes
- Optimize slow tests

## Resources

- [Detox Documentation](https://wix.github.io/Detox/)
- [React Native Testing](https://reactnative.dev/docs/testing-overview)
- [MediMate Test Strategy](../../docs/testing-strategy.md)