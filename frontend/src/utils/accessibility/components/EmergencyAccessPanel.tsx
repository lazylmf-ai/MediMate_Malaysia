/**
 * Emergency Access Panel Component
 * Provides quick access to emergency functions with enhanced accessibility
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { AccessibilityButton } from './AccessibilityButton';
import { AdaptiveText, LargeTextMode } from './LargeTextMode';
import { useAccessibility } from '../useAccessibility';
import { hapticFeedback } from '../HapticFeedback';
import { voiceGuidance } from '../VoiceGuidance';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  priority: number;
  isHealthcare?: boolean;
}

export interface EmergencyAccessPanelProps {
  emergencyContacts?: EmergencyContact[];
  onEmergencyCall?: (contact: EmergencyContact) => void;
  onMedicalAlert?: () => void;
  onLocationShare?: () => void;
  showMedicalInfo?: boolean;
  medicalConditions?: string[];
  medications?: string[];
  allergies?: string[];
  testID?: string;
}

export const EmergencyAccessPanel: React.FC<EmergencyAccessPanelProps> = ({
  emergencyContacts = [],
  onEmergencyCall,
  onMedicalAlert,
  onLocationShare,
  showMedicalInfo = true,
  medicalConditions = [],
  medications = [],
  allergies = [],
  testID,
}) => {
  const {
    colors,
    applyEmergencyProfile,
    isEmergencyMode,
    isVoiceGuidanceEnabled,
  } = useAccessibility();

  const [isDialing, setIsDialing] = useState<string | null>(null);
  const [emergencyModeActivated, setEmergencyModeActivated] = useState(false);

  // Default emergency contacts for Malaysia
  const defaultEmergencyContacts: EmergencyContact[] = [
    {
      id: 'mda',
      name: 'MDA Emergency',
      phone: '999',
      relationship: 'Emergency Services',
      priority: 1,
      isHealthcare: true,
    },
    {
      id: 'hospital',
      name: 'Hospital Kuala Lumpur',
      phone: '0326155555',
      relationship: 'Hospital',
      priority: 2,
      isHealthcare: true,
    },
    {
      id: 'poison',
      name: 'Poison Control',
      phone: '0326428144',
      relationship: 'Poison Control Center',
      priority: 3,
      isHealthcare: true,
    },
  ];

  const allContacts = [...emergencyContacts, ...defaultEmergencyContacts]
    .sort((a, b) => a.priority - b.priority);

  useEffect(() => {
    if (isEmergencyMode && !emergencyModeActivated) {
      setEmergencyModeActivated(true);
      if (isVoiceGuidanceEnabled) {
        voiceGuidance.speakEmergencyAlert('Emergency mode activated. Tap any contact to call immediately.');
      }
    }
  }, [isEmergencyMode, emergencyModeActivated, isVoiceGuidanceEnabled]);

  const handleEmergencyCall = useCallback(async (contact: EmergencyContact) => {
    if (isDialing) return;

    setIsDialing(contact.id);

    try {
      // Provide immediate haptic feedback
      await hapticFeedback.emergencyContactDialing();

      // Voice guidance
      if (isVoiceGuidanceEnabled) {
        await voiceGuidance.speak({
          text: `Calling ${contact.name}`,
          priority: 'emergency',
          interrupt: true,
        });
      }

      // Execute callback if provided
      if (onEmergencyCall) {
        onEmergencyCall(contact);
      }

      // Initiate phone call
      const phoneUrl = `tel:${contact.phone}`;
      const canCall = await Linking.canOpenURL(phoneUrl);

      if (canCall) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert(
          'Cannot make call',
          `Unable to call ${contact.name} at ${contact.phone}. Please dial manually.`,
          [
            {
              text: 'OK',
              onPress: () => setIsDialing(null),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Emergency call error:', error);
      Alert.alert(
        'Call Error',
        'Unable to initiate emergency call. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => setIsDialing(null),
          },
        ]
      );

      if (isVoiceGuidanceEnabled) {
        await voiceGuidance.speakErrorMessage('Unable to make call. Please try again.');
      }
    } finally {
      // Clear dialing state after a delay
      setTimeout(() => setIsDialing(null), 3000);
    }
  }, [isDialing, isVoiceGuidanceEnabled, onEmergencyCall]);

  const handleActivateEmergencyMode = useCallback(async () => {
    await hapticFeedback.emergencyAlert();
    applyEmergencyProfile();
    setEmergencyModeActivated(true);

    if (isVoiceGuidanceEnabled) {
      await voiceGuidance.speakEmergencyAlert('Emergency accessibility mode activated. All buttons are now larger and easier to access.');
    }
  }, [applyEmergencyProfile, isVoiceGuidanceEnabled]);

  const handleMedicalAlert = useCallback(async () => {
    await hapticFeedback.emergencyAlert();

    if (onMedicalAlert) {
      onMedicalAlert();
    }

    if (isVoiceGuidanceEnabled) {
      await voiceGuidance.speak({
        text: 'Medical alert activated. Emergency contacts will be notified.',
        priority: 'emergency',
        interrupt: true,
      });
    }

    // Show medical information alert
    const medicalInfo = [
      ...medicalConditions.map(condition => `Condition: ${condition}`),
      ...medications.map(medication => `Medication: ${medication}`),
      ...allergies.map(allergy => `Allergy: ${allergy}`),
    ].join('\n');

    Alert.alert(
      'Medical Alert Activated',
      medicalInfo || 'No medical information available. Please update your profile.',
      [{ text: 'OK' }]
    );
  }, [onMedicalAlert, isVoiceGuidanceEnabled, medicalConditions, medications, allergies]);

  const handleLocationShare = useCallback(async () => {
    await hapticFeedback.navigationFeedback();

    if (onLocationShare) {
      onLocationShare();
    }

    if (isVoiceGuidanceEnabled) {
      await voiceGuidance.speak({
        text: 'Sharing location with emergency contacts',
        priority: 'high',
        interrupt: false,
      });
    }

    Alert.alert(
      'Location Sharing',
      'Your current location will be shared with emergency contacts.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Share Location',
          onPress: () => {
            // Implementation would integrate with location services
            console.log('Location sharing activated');
          },
        },
      ]
    );
  }, [onLocationShare, isVoiceGuidanceEnabled]);

  const containerStyles = [
    styles.container,
    {
      backgroundColor: colors.background,
      borderColor: colors.emergency,
    },
    isEmergencyMode && styles.emergencyMode,
  ];

  return (
    <LargeTextMode
      variant="emergency"
      title="Emergency Access"
      subtitle="Quick access to emergency contacts and medical information"
      style={containerStyles}
      testID={testID}
    >
      {/* Emergency Mode Toggle */}
      {!isEmergencyMode && (
        <View style={styles.section}>
          <AccessibilityButton
            title="Activate Emergency Mode"
            onPress={handleActivateEmergencyMode}
            variant="emergency"
            size="large"
            accessibilityLabel="Activate emergency accessibility mode"
            accessibilityHint="Makes all buttons larger and easier to access"
            testID="emergency-mode-toggle"
          />
        </View>
      )}

      {/* Emergency Actions */}
      <View style={styles.section}>
        <AdaptiveText variant="large" style={styles.sectionTitle}>
          Emergency Actions
        </AdaptiveText>

        <View style={styles.actionGrid}>
          <AccessibilityButton
            title="Medical Alert"
            onPress={handleMedicalAlert}
            variant="emergency"
            size={isEmergencyMode ? 'emergency' : 'large'}
            accessibilityLabel="Send medical alert to emergency contacts"
            accessibilityHint="Shares your medical information with emergency contacts"
            testID="medical-alert-button"
          />

          <AccessibilityButton
            title="Share Location"
            onPress={handleLocationShare}
            variant="emergency"
            size={isEmergencyMode ? 'emergency' : 'large'}
            accessibilityLabel="Share current location"
            accessibilityHint="Sends your current location to emergency contacts"
            testID="location-share-button"
          />
        </View>
      </View>

      {/* Emergency Contacts */}
      <View style={styles.section}>
        <AdaptiveText variant="large" style={styles.sectionTitle}>
          Emergency Contacts
        </AdaptiveText>

        <View style={styles.contactsList}>
          {allContacts.slice(0, 4).map((contact) => (
            <View key={contact.id} style={styles.contactItem}>
              <AccessibilityButton
                title={`Call ${contact.name}`}
                onPress={() => handleEmergencyCall(contact)}
                variant="emergency"
                size={isEmergencyMode ? 'emergency' : 'large'}
                disabled={isDialing === contact.id}
                loading={isDialing === contact.id}
                accessibilityLabel={`Call ${contact.name} at ${contact.phone}`}
                accessibilityHint={`Emergency contact: ${contact.relationship}`}
                testID={`emergency-contact-${contact.id}`}
              />

              <View style={styles.contactInfo}>
                <AdaptiveText variant="normal" style={styles.contactName}>
                  {contact.name}
                </AdaptiveText>
                <AdaptiveText variant="small" style={styles.contactRelationship}>
                  {contact.relationship}
                </AdaptiveText>
                <AdaptiveText variant="small" style={styles.contactPhone}>
                  {contact.phone}
                </AdaptiveText>
              </View>

              {isDialing === contact.id && (
                <ActivityIndicator
                  size="small"
                  color={colors.emergency}
                  style={styles.dialingIndicator}
                />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Medical Information */}
      {showMedicalInfo && (
        <View style={styles.section}>
          <AdaptiveText variant="large" style={styles.sectionTitle}>
            Medical Information
          </AdaptiveText>

          {medicalConditions.length > 0 && (
            <View style={styles.medicalSection}>
              <AdaptiveText variant="normal" style={styles.medicalLabel}>
                Conditions:
              </AdaptiveText>
              {medicalConditions.map((condition, index) => (
                <AdaptiveText key={index} variant="small" style={styles.medicalItem}>
                  • {condition}
                </AdaptiveText>
              ))}
            </View>
          )}

          {medications.length > 0 && (
            <View style={styles.medicalSection}>
              <AdaptiveText variant="normal" style={styles.medicalLabel}>
                Current Medications:
              </AdaptiveText>
              {medications.map((medication, index) => (
                <AdaptiveText key={index} variant="small" style={styles.medicalItem}>
                  • {medication}
                </AdaptiveText>
              ))}
            </View>
          )}

          {allergies.length > 0 && (
            <View style={styles.medicalSection}>
              <AdaptiveText variant="normal" style={styles.medicalLabel}>
                Allergies:
              </AdaptiveText>
              {allergies.map((allergy, index) => (
                <AdaptiveText key={index} variant="small" style={[styles.medicalItem, styles.allergyItem]}>
                  ⚠️ {allergy}
                </AdaptiveText>
              ))}
            </View>
          )}

          {medicalConditions.length === 0 && medications.length === 0 && allergies.length === 0 && (
            <AdaptiveText variant="normal" style={styles.noMedicalInfo}>
              No medical information available. Please update your profile.
            </AdaptiveText>
          )}
        </View>
      )}
    </LargeTextMode>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderRadius: 12,
    margin: 8,
  },
  emergencyMode: {
    borderWidth: 4,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  contactsList: {
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    gap: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontWeight: '600',
  },
  contactRelationship: {
    opacity: 0.7,
  },
  contactPhone: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  dialingIndicator: {
    marginLeft: 8,
  },
  medicalSection: {
    marginBottom: 16,
  },
  medicalLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  medicalItem: {
    marginLeft: 16,
    marginBottom: 2,
  },
  allergyItem: {
    fontWeight: '600',
    color: '#D32F2F',
  },
  noMedicalInfo: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
});