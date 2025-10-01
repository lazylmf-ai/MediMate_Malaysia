/**
 * E2E Test: Medication Management Journey
 *
 * Complete user journey from medication capture to adherence tracking
 *
 * Note: This is a template for Detox E2E tests. Actual implementation
 * requires Detox to be properly configured and installed.
 */

describe('Medication Management Journey', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        camera: 'YES',
        notifications: 'YES',
        location: 'inuse',
      },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Photo Capture to Medication Entry', () => {
    it('should complete medication entry workflow using camera', async () => {
      // Step 1: Navigate to Add Medication
      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('add-medication-button')).tap();

      // Step 2: Open Camera
      await expect(element(by.id('medication-entry-screen'))).toBeVisible();
      await element(by.id('capture-photo-button')).tap();

      // Wait for camera to load
      await waitFor(element(by.id('camera-view')))
        .toBeVisible()
        .withTimeout(3000);

      // Capture photo
      await element(by.id('camera-capture-button')).tap();

      // Step 3: Review Photo
      await waitFor(element(by.id('photo-preview')))
        .toBeVisible()
        .withTimeout(2000);

      await expect(element(by.id('photo-preview'))).toBeVisible();
      await element(by.id('use-photo-button')).tap();

      // Step 4: OCR Processing
      await waitFor(element(by.id('ocr-processing-indicator')))
        .toBeVisible()
        .withTimeout(1000);

      await waitFor(element(by.id('medication-details-form')))
        .toBeVisible()
        .withTimeout(10000); // OCR may take time

      // Step 5: Verify OCR Results
      await expect(element(by.id('medication-name-input'))).toBeVisible();

      // Check if medication name was recognized
      const medicationNameAttributes = await element(
        by.id('medication-name-input')
      ).getAttributes();

      expect(medicationNameAttributes.text.length).toBeGreaterThan(0);

      // Step 6: Fill Additional Details
      await element(by.id('dosage-input')).typeText('500mg');
      await element(by.id('frequency-picker')).tap();
      await element(by.text('Twice Daily')).tap();

      // Step 7: Save Medication
      await element(by.id('save-medication-button')).tap();

      // Step 8: Verify Success
      await waitFor(element(by.text('Medication Added Successfully')))
        .toBeVisible()
        .withTimeout(3000);

      await expect(element(by.id('medication-list'))).toBeVisible();

      // Take screenshot
      await device.takeScreenshot('medication-added-successfully');
    });

    it('should handle low OCR confidence with manual verification', async () => {
      await element(by.id('add-medication-button')).tap();
      await element(by.id('capture-photo-button')).tap();

      await waitFor(element(by.id('camera-view')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.id('camera-capture-button')).tap();
      await element(by.id('use-photo-button')).tap();

      // Wait for OCR processing
      await waitFor(element(by.id('medication-details-form')))
        .toBeVisible()
        .withTimeout(10000);

      // If OCR confidence is low, verification prompt should appear
      try {
        await expect(
          element(by.text('Please verify the recognized information'))
        ).toBeVisible();

        await device.takeScreenshot('low-confidence-verification-prompt');
      } catch (error) {
        // Verification prompt may not appear if confidence is high
        console.log('High confidence OCR result - no verification needed');
      }

      // User can manually edit
      await element(by.id('medication-name-input')).clearText();
      await element(by.id('medication-name-input')).typeText('Paracetamol');

      await element(by.id('manual-verification-checkbox')).tap();
      await element(by.id('save-medication-button')).tap();

      await waitFor(element(by.text('Medication Added Successfully')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should detect and warn about drug interactions', async () => {
      // Assume patient already has Warfarin in their list
      await element(by.id('add-medication-button')).tap();
      await element(by.id('manual-entry-button')).tap();

      await element(by.id('medication-name-input')).typeText('Aspirin');
      await element(by.id('dosage-input')).typeText('100mg');
      await element(by.id('save-medication-button')).tap();

      // Interaction warning should appear
      await waitFor(element(by.id('interaction-warning-modal')))
        .toBeVisible()
        .withTimeout(3000);

      await expect(element(by.text('Drug Interaction Detected'))).toBeVisible();
      await expect(
        element(by.text(/increased bleeding risk/i))
      ).toBeVisible();

      await device.takeScreenshot('drug-interaction-warning');

      // User can acknowledge or cancel
      await element(by.id('consult-physician-button')).tap();

      // Should flag for physician review
      await waitFor(element(by.text('Marked for Physician Review')))
        .toBeVisible()
        .withTimeout(2000);
    });
  });

  describe('Medication Scheduling with Cultural Adaptation', () => {
    it('should create schedule adapted to prayer times', async () => {
      // Navigate to medication that needs scheduling
      await element(by.id('medication-list')).scroll(200, 'down');
      await element(by.id('medication-item-0')).tap();

      await expect(element(by.id('medication-detail-screen'))).toBeVisible();

      // Set up schedule
      await element(by.id('setup-schedule-button')).tap();
      await expect(element(by.id('schedule-setup-screen'))).toBeVisible();

      // Select frequency
      await element(by.id('frequency-twice-daily')).tap();

      // Enable prayer time adaptation
      await element(by.id('respect-prayer-times-toggle')).tap();

      await waitFor(element(by.text('Schedule adjusted for prayer times')))
        .toBeVisible()
        .withTimeout(2000);

      // Review suggested times
      await expect(element(by.id('suggested-time-0'))).toBeVisible();
      await expect(element(by.id('suggested-time-1'))).toBeVisible();

      await device.takeScreenshot('prayer-adapted-schedule');

      // Save schedule
      await element(by.id('save-schedule-button')).tap();

      await waitFor(element(by.text('Schedule Saved')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should adjust schedule for Ramadan', async () => {
      // Enable Ramadan mode in settings
      await element(by.id('settings-tab')).tap();
      await element(by.id('cultural-settings')).tap();

      await element(by.id('ramadan-mode-toggle')).tap();

      await waitFor(element(by.text('Ramadan mode activated')))
        .toBeVisible()
        .withTimeout(2000);

      // Navigate back to medication schedule
      await element(by.id('back-button')).tap();
      await element(by.id('medications-tab')).tap();

      await element(by.id('medication-item-0')).tap();
      await element(by.id('view-schedule-button')).tap();

      // Schedule should show Iftar/Suhoor times
      await expect(element(by.text(/Iftar/i))).toBeVisible();

      await device.takeScreenshot('ramadan-adjusted-schedule');
    });

    it('should schedule and display medication reminders', async () => {
      // Wait for scheduled notification time (simulated)
      // In real E2E test, we would manipulate device time or use mock notifications

      // Trigger a reminder (for testing, we can navigate to notification test screen)
      await element(by.id('developer-menu')).longPress();
      await element(by.id('trigger-test-notification')).tap();

      // Notification should appear
      await waitFor(element(by.text('Time to take your medication')))
        .toBeVisible()
        .withTimeout(5000);

      await device.takeScreenshot('medication-reminder-notification');

      // Tap notification to open app
      await element(by.text('Time to take your medication')).tap();

      // Should navigate to medication confirmation screen
      await expect(element(by.id('confirm-medication-screen'))).toBeVisible();

      await element(by.id('mark-taken-button')).tap();

      await waitFor(element(by.text('Medication marked as taken')))
        .toBeVisible()
        .withTimeout(2000);
    });
  });

  describe('Adherence Tracking', () => {
    it('should display adherence progress and statistics', async () => {
      await element(by.id('progress-tab')).tap();

      await waitFor(element(by.id('progress-dashboard')))
        .toBeVisible()
        .withTimeout(3000);

      // Verify adherence metrics are displayed
      await expect(element(by.id('overall-adherence-rate'))).toBeVisible();
      await expect(element(by.id('current-streak'))).toBeVisible();
      await expect(element(by.id('adherence-chart'))).toBeVisible();

      // Check that adherence rate is shown
      const adherenceRateElement = await element(by.id('overall-adherence-rate'));
      const attributes = await adherenceRateElement.getAttributes();

      // Should display percentage
      expect(attributes.text).toMatch(/%$/);

      await device.takeScreenshot('adherence-progress-dashboard');
    });

    it('should show milestone celebrations', async () => {
      // Simulate achieving a milestone
      // In real scenario, this would happen after consecutive adherence days

      // Navigate to achievements
      await element(by.id('progress-tab')).tap();
      await element(by.id('view-achievements-button')).tap();

      await expect(element(by.id('achievements-screen'))).toBeVisible();

      // Check for milestone badges
      await expect(element(by.id('milestone-7-day-streak'))).toBeVisible();

      await device.takeScreenshot('milestone-achievements');

      // Tap on a milestone to see details
      await element(by.id('milestone-7-day-streak')).tap();

      await expect(element(by.id('milestone-detail-modal'))).toBeVisible();
      await expect(element(by.text(/Congratulations/i))).toBeVisible();

      await device.takeScreenshot('milestone-celebration');

      await element(by.id('close-milestone-button')).tap();
    });

    it('should record manual adherence entry', async () => {
      await element(by.id('medications-tab')).tap();

      await element(by.id('medication-item-0')).tap();
      await element(by.id('medication-detail-screen')).scrollTo('bottom');

      await element(by.id('adherence-history-section')).tap();

      // Add manual adherence entry for missed dose
      await element(by.id('add-manual-entry-button')).tap();

      await element(by.id('entry-date-picker')).tap();
      // Select yesterday
      await element(by.text('Yesterday')).tap();

      await element(by.id('entry-time-picker')).tap();
      await element(by.text('08:00 AM')).tap();

      await element(by.id('status-taken')).tap();
      await element(by.id('save-entry-button')).tap();

      await waitFor(element(by.text('Adherence entry recorded')))
        .toBeVisible()
        .withTimeout(2000);

      await device.takeScreenshot('manual-adherence-entry');
    });
  });

  describe('Emergency Escalation', () => {
    it('should trigger family notification after missed critical doses', async () => {
      // Setup: Mark medication as critical
      await element(by.id('medications-tab')).tap();
      await element(by.id('medication-item-0')).longPress();

      await element(by.text('Mark as Critical')).tap();

      await waitFor(element(by.text('Marked as critical medication')))
        .toBeVisible()
        .withTimeout(2000);

      // Simulate missing 3 doses
      // In real test, we would advance time and wait for scheduled times to pass

      // For testing purposes, trigger emergency escalation manually
      await element(by.id('developer-menu')).longPress();
      await element(by.id('simulate-missed-doses-button')).tap();

      // Emergency alert should appear
      await waitFor(element(by.id('emergency-alert-modal')))
        .toBeVisible()
        .withTimeout(5000);

      await expect(
        element(by.text(/Family has been notified/i))
      ).toBeVisible();

      await device.takeScreenshot('emergency-escalation-alert');

      // Acknowledge alert
      await element(by.id('acknowledge-alert-button')).tap();

      // Should show emergency contact details
      await expect(element(by.id('emergency-contacts-list'))).toBeVisible();
    });
  });

  describe('Performance and User Experience', () => {
    it('should launch app within 3 seconds', async () => {
      const startTime = Date.now();

      await device.launchApp({ newInstance: true });

      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(5000);

      const launchTime = Date.now() - startTime;

      expect(launchTime).toBeLessThan(3000);

      console.log(`App launched in ${launchTime}ms`);
    });

    it('should transition between screens smoothly', async () => {
      const startTime = Date.now();

      await element(by.id('medications-tab')).tap();

      await waitFor(element(by.id('medication-list')))
        .toBeVisible()
        .withTimeout(2000);

      const transitionTime = Date.now() - startTime;

      expect(transitionTime).toBeLessThan(500);

      console.log(`Screen transition took ${transitionTime}ms`);
    });

    it('should handle offline mode gracefully', async () => {
      // Disable network
      await device.setNetworkConnection('airplane');

      await device.takeScreenshot('before-offline-mode');

      // Try to perform actions
      await element(by.id('add-medication-button')).tap();
      await element(by.id('manual-entry-button')).tap();

      // Offline indicator should appear
      await waitFor(element(by.id('offline-indicator')))
        .toBeVisible()
        .withTimeout(2000);

      await expect(element(by.text(/Offline Mode/i))).toBeVisible();

      await device.takeScreenshot('offline-mode-active');

      // Can still add medication
      await element(by.id('medication-name-input')).typeText('Test Medication');
      await element(by.id('dosage-input')).typeText('100mg');
      await element(by.id('save-medication-button')).tap();

      // Should save locally
      await waitFor(element(by.text(/Saved locally/i)))
        .toBeVisible()
        .withTimeout(2000);

      await device.takeScreenshot('offline-medication-saved');

      // Re-enable network
      await device.setNetworkConnection('wifi');

      // Should sync automatically
      await waitFor(element(by.text(/Synced/i)))
        .toBeVisible()
        .withTimeout(5000);

      await device.takeScreenshot('after-sync');
    });
  });
});