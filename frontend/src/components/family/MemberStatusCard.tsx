/**
 * Member Status Card Component
 *
 * Displays individual family member medication status with emergency indicators,
 * accessibility support for elderly users, and Malaysian cultural design patterns.
 * Optimized for both grid and list layouts with <300ms rendering time.
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import {
  MemberStatusCardProps,
  FamilyMemberWithStatus,
  FAMILY_UI_CONSTANTS,
} from '@/types/family';

const { width: screenWidth } = Dimensions.get('window');

export const MemberStatusCard: React.FC<MemberStatusCardProps> = ({
  member,
  onPress,
  onEmergencyContact,
  showFullDetails = false,
  compactMode = false,
  accessibilityMode = false,
}) => {
  const { t } = useTranslation();
  const { currentTheme } = useCulturalTheme();
  const culturalStyles = useCulturalStyles();

  // Calculate card dimensions based on mode
  const cardDimensions = useMemo(() => {
    if (compactMode) {
      const gridWidth = (screenWidth - 48) / 2; // 2 columns with margins
      return { width: gridWidth, height: 140 };
    }
    return { width: screenWidth - 32, height: showFullDetails ? 180 : 120 };
  }, [compactMode, showFullDetails]);

  // Determine emergency status color and icon
  const emergencyStatus = useMemo(() => {
    const { medicationStatus, emergencyStatus: status } = member;

    if (medicationStatus.criticalMissed > 0) {
      return {
        color: FAMILY_UI_CONSTANTS.EMERGENCY_COLORS.CRITICAL,
        label: t('member.status.critical'),
        icon: '🚨',
        severity: 'critical' as const,
      };
    }

    if (status === 'emergency' || medicationStatus.missedToday > 2) {
      return {
        color: FAMILY_UI_CONSTANTS.EMERGENCY_COLORS.EMERGENCY,
        label: t('member.status.emergency'),
        icon: '⚠️',
        severity: 'emergency' as const,
      };
    }

    if (medicationStatus.missedToday > 0) {
      return {
        color: FAMILY_UI_CONSTANTS.EMERGENCY_COLORS.WARNING,
        label: t('member.status.warning'),
        icon: '⚡',
        severity: 'warning' as const,
      };
    }

    return {
      color: FAMILY_UI_CONSTANTS.EMERGENCY_COLORS.NORMAL,
      label: t('member.status.normal'),
      icon: '✅',
      severity: 'normal' as const,
    };
  }, [member.medicationStatus, member.emergencyStatus, t]);

  // Calculate adherence percentage
  const adherencePercentage = useMemo(() => {
    const { takenToday, totalMedications } = member.medicationStatus;
    if (totalMedications === 0) return 100;
    return Math.round((takenToday / totalMedications) * 100);
  }, [member.medicationStatus]);

  // Online status indicator
  const onlineStatusColor = member.isOnline
    ? currentTheme.colors.success
    : currentTheme.colors.neutral;

  // Handle card press
  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  // Handle emergency contact
  const handleEmergencyContact = useCallback(() => {
    if (emergencyStatus.severity === 'normal') {
      return;
    }

    Alert.alert(
      t('member.emergency.title'),
      t('member.emergency.message', { name: member.fullName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('member.emergency.call'),
          style: 'destructive',
          onPress: () => onEmergencyContact?.()
        },
      ]
    );
  }, [emergencyStatus.severity, member.fullName, onEmergencyContact, t]);

  // Format last seen time
  const formatLastSeen = useCallback(() => {
    if (!member.lastSeen) return t('member.lastSeen.never');

    const now = new Date();
    const lastSeen = new Date(member.lastSeen);
    const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return t('member.lastSeen.now');
    if (diffMinutes < 60) return t('member.lastSeen.minutes', { minutes: diffMinutes });

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return t('member.lastSeen.hours', { hours: diffHours });

    const diffDays = Math.floor(diffHours / 24);
    return t('member.lastSeen.days', { days: diffDays });
  }, [member.lastSeen, t]);

  // Accessibility label
  const accessibilityLabel = useMemo(() => {
    const statusText = emergencyStatus.label;
    const adherenceText = t('member.accessibility.adherence', {
      percentage: adherencePercentage
    });
    const medicationText = t('member.accessibility.medications', {
      taken: member.medicationStatus.takenToday,
      total: member.medicationStatus.totalMedications,
    });

    return `${member.fullName}, ${statusText}, ${adherenceText}, ${medicationText}`;
  }, [member, emergencyStatus.label, adherencePercentage, t]);

  // Render compact version for grid layout
  if (compactMode) {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          styles.compactCard,
          { width: cardDimensions.width, height: cardDimensions.height },
          culturalStyles.cardBackground,
          emergencyStatus.severity !== 'normal' && {
            borderLeftWidth: 4,
            borderLeftColor: emergencyStatus.color,
          },
          accessibilityMode && styles.accessibilityCard,
        ]}
        onPress={handlePress}
        onLongPress={handleEmergencyContact}
        activeOpacity={0.7}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityHint={t('member.accessibility.tapHint')}
      >
        {/* Online Status Indicator */}
        <View style={[styles.onlineIndicator, { backgroundColor: onlineStatusColor }]} />

        {/* Emergency Status Icon */}
        {emergencyStatus.severity !== 'normal' && (
          <View style={styles.emergencyIcon}>
            <Text style={[
              styles.emergencyIconText,
              accessibilityMode && styles.largeEmergencyIcon
            ]}>
              {emergencyStatus.icon}
            </Text>
          </View>
        )}

        {/* Member Info */}
        <View style={styles.memberInfo}>
          <Text
            style={[
              styles.memberName,
              culturalStyles.text,
              accessibilityMode && styles.largeMemberName
            ]}
            numberOfLines={2}
          >
            {member.fullName}
          </Text>

          <Text style={[styles.relationship, culturalStyles.subtleText]}>
            {member.relationship}
          </Text>
        </View>

        {/* Medication Status */}
        <View style={styles.medicationStatus}>
          <View style={styles.statusRow}>
            <View style={[
              styles.adherenceCircle,
              { backgroundColor: emergencyStatus.color },
              accessibilityMode && styles.largeAdherenceCircle,
            ]}>
              <Text style={[
                styles.adherenceText,
                accessibilityMode && styles.largeAdherenceText
              ]}>
                {adherencePercentage}%
              </Text>
            </View>
          </View>

          <Text style={[
            styles.medicationCount,
            culturalStyles.subtleText,
            accessibilityMode && styles.largeMedicationCount
          ]}>
            {member.medicationStatus.takenToday}/{member.medicationStatus.totalMedications}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Render full details version for list layout
  return (
    <TouchableOpacity
      style={[
        styles.card,
        styles.fullCard,
        { width: cardDimensions.width, height: cardDimensions.height },
        culturalStyles.cardBackground,
        emergencyStatus.severity !== 'normal' && {
          borderLeftWidth: 6,
          borderLeftColor: emergencyStatus.color,
        },
        accessibilityMode && styles.accessibilityCard,
      ]}
      onPress={handlePress}
      onLongPress={handleEmergencyContact}
      activeOpacity={0.7}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityHint={t('member.accessibility.tapHint')}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.memberInfoFull}>
          <View style={styles.nameRow}>
            <Text style={[
              styles.memberNameFull,
              culturalStyles.text,
              accessibilityMode && styles.largeMemberName
            ]}>
              {member.fullName}
            </Text>

            <View style={[styles.onlineIndicator, { backgroundColor: onlineStatusColor }]} />
          </View>

          <Text style={[styles.relationship, culturalStyles.subtleText]}>
            {member.relationship}
          </Text>

          <Text style={[styles.lastSeen, culturalStyles.subtleText]}>
            {formatLastSeen()}
          </Text>
        </View>

        {/* Emergency Status */}
        {emergencyStatus.severity !== 'normal' && (
          <TouchableOpacity
            style={[styles.emergencyButton, { backgroundColor: emergencyStatus.color }]}
            onPress={handleEmergencyContact}
            accessibilityLabel={t('member.emergency.button')}
            accessibilityRole="button"
          >
            <Text style={[
              styles.emergencyIconText,
              accessibilityMode && styles.largeEmergencyIcon
            ]}>
              {emergencyStatus.icon}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Medication Details */}
      <View style={styles.medicationDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={[
              styles.detailNumber,
              culturalStyles.text,
              accessibilityMode && styles.largeDetailNumber
            ]}>
              {adherencePercentage}%
            </Text>
            <Text style={[styles.detailLabel, culturalStyles.subtleText]}>
              {t('member.details.adherence')}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[
              styles.detailNumber,
              culturalStyles.text,
              member.medicationStatus.missedToday > 0 && styles.warningNumber,
              accessibilityMode && styles.largeDetailNumber
            ]}>
              {member.medicationStatus.missedToday}
            </Text>
            <Text style={[styles.detailLabel, culturalStyles.subtleText]}>
              {t('member.details.missed')}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[
              styles.detailNumber,
              culturalStyles.text,
              accessibilityMode && styles.largeDetailNumber
            ]}>
              {member.medicationStatus.totalMedications}
            </Text>
            <Text style={[styles.detailLabel, culturalStyles.subtleText]}>
              {t('member.details.total')}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[
              styles.detailNumber,
              culturalStyles.text,
              accessibilityMode && styles.largeDetailNumber
            ]}>
              {member.healthScore}
            </Text>
            <Text style={[styles.detailLabel, culturalStyles.subtleText]}>
              {t('member.details.health')}
            </Text>
          </View>
        </View>

        {/* Next medication info */}
        {member.medicationStatus.nextDue && (
          <View style={styles.nextMedication}>
            <Text style={[styles.nextMedLabel, culturalStyles.subtleText]}>
              {t('member.details.nextDue')}:{' '}
              <Text style={culturalStyles.text}>
                {new Date(member.medicationStatus.nextDue).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  compactCard: {
    padding: 12,
  },
  fullCard: {
    padding: 16,
    marginBottom: 12,
  },
  accessibilityCard: {
    padding: 20,
    elevation: 4,
    shadowOpacity: 0.15,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  emergencyIcon: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyIconText: {
    fontSize: 16,
  },
  largeEmergencyIcon: {
    fontSize: 24,
  },
  memberInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  largeMemberName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  relationship: {
    fontSize: 12,
    marginBottom: 4,
  },
  medicationStatus: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  adherenceCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeAdherenceCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  adherenceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  largeAdherenceText: {
    fontSize: 16,
  },
  medicationCount: {
    fontSize: 11,
    textAlign: 'center',
  },
  largeMedicationCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  memberInfoFull: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberNameFull: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  lastSeen: {
    fontSize: 12,
    marginTop: 2,
  },
  emergencyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  medicationDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  largeDetailNumber: {
    fontSize: 24,
  },
  warningNumber: {
    color: '#EF4444',
  },
  detailLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  nextMedication: {
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  nextMedLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default MemberStatusCard;