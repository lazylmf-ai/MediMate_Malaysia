/**
 * Medication Status Grid Component
 *
 * Displays family medication overview with adherence rates, missed medications,
 * and cultural scheduling considerations. Supports both grid and list layouts
 * with prayer time awareness for Malaysian families.
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import {
  MedicationStatusGridProps,
  FamilyMedicationSummary,
  SharingLevel,
  FAMILY_UI_CONSTANTS,
} from '@/types/family';

const { width: screenWidth } = Dimensions.get('window');

interface MedicationCardData extends FamilyMedicationSummary {
  adherenceColor: string;
  statusIcon: string;
  priorityLevel: 'normal' | 'attention' | 'urgent' | 'critical';
}

export const MedicationStatusGrid: React.FC<MedicationStatusGridProps> = ({
  medications,
  onMedicationPress,
  gridLayout = 'grid',
  showEmergencyOnly = false,
  culturalContext = {
    language: 'en',
    prayerAware: false,
  },
}) => {
  const { t } = useTranslation();
  const { currentTheme } = useCulturalTheme();
  const culturalStyles = useCulturalStyles();

  // Calculate grid dimensions
  const cardDimensions = useMemo(() => {
    const margin = 16;
    const gap = 12;

    if (gridLayout === 'grid') {
      const columns = 2;
      const availableWidth = screenWidth - (margin * 2) - (gap * (columns - 1));
      const cardWidth = availableWidth / columns;
      return { width: cardWidth, height: 120 };
    }

    return { width: screenWidth - (margin * 2), height: 80 };
  }, [gridLayout]);

  // Process medication data with cultural context
  const processedMedications = useMemo((): MedicationCardData[] => {
    const processed = medications.map((medication): MedicationCardData => {
      const { adherenceRate, criticalMissed, missedToday, medicationCount } = medication;

      // Determine priority level
      let priorityLevel: MedicationCardData['priorityLevel'] = 'normal';
      if (criticalMissed > 0) {
        priorityLevel = 'critical';
      } else if (missedToday > 2) {
        priorityLevel = 'urgent';
      } else if (adherenceRate < 70 || missedToday > 0) {
        priorityLevel = 'attention';
      }

      // Determine adherence color
      let adherenceColor = FAMILY_UI_CONSTANTS.EMERGENCY_COLORS.NORMAL;
      if (adherenceRate < 50) {
        adherenceColor = FAMILY_UI_CONSTANTS.EMERGENCY_COLORS.CRITICAL;
      } else if (adherenceRate < 70) {
        adherenceColor = FAMILY_UI_CONSTANTS.EMERGENCY_COLORS.EMERGENCY;
      } else if (adherenceRate < 90) {
        adherenceColor = FAMILY_UI_CONSTANTS.EMERGENCY_COLORS.WARNING;
      }

      // Determine status icon
      let statusIcon = '✅';
      if (criticalMissed > 0) {
        statusIcon = '🚨';
      } else if (missedToday > 0) {
        statusIcon = '⚠️';
      } else if (adherenceRate < 90) {
        statusIcon = '⚡';
      }

      return {
        ...medication,
        adherenceColor,
        statusIcon,
        priorityLevel,
      };
    });

    // Filter for emergency-only view
    if (showEmergencyOnly) {
      return processed.filter(med =>
        med.priorityLevel === 'critical' ||
        med.priorityLevel === 'urgent' ||
        med.criticalMissed > 0
      );
    }

    // Sort by priority
    const priorityOrder = { critical: 0, urgent: 1, attention: 2, normal: 3 };
    return processed.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priorityLevel] - priorityOrder[b.priorityLevel];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by adherence rate (lower first for attention)
      return a.adherenceRate - b.adherenceRate;
    });
  }, [medications, showEmergencyOnly]);

  // Handle medication card press
  const handleMedicationPress = useCallback((medication: MedicationCardData) => {
    onMedicationPress?.(medication.userId, undefined);
  }, [onMedicationPress]);

  // Format last taken time with cultural awareness
  const formatLastTaken = useCallback((lastTaken?: Date) => {
    if (!lastTaken) return t('medication.status.never');

    const now = new Date();
    const timeDiff = now.getTime() - lastTaken.getTime();
    const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));

    if (hoursDiff < 1) return t('medication.status.recently');
    if (hoursDiff < 24) {
      // Consider prayer times for Malaysian cultural context
      if (culturalContext.prayerAware && hoursDiff < 6) {
        return t('medication.status.sincePrayer');
      }
      return t('medication.status.hoursAgo', { hours: hoursDiff });
    }

    const daysDiff = Math.floor(hoursDiff / 24);
    return t('medication.status.daysAgo', { days: daysDiff });
  }, [culturalContext.prayerAware, t]);

  // Get sharing level display
  const getSharingLevelDisplay = useCallback((level: SharingLevel) => {
    switch (level) {
      case 'full':
        return { text: t('medication.sharing.full'), color: '#10B981' };
      case 'basic':
        return { text: t('medication.sharing.basic'), color: '#3B82F6' };
      case 'emergency_only':
        return { text: t('medication.sharing.emergency'), color: '#F59E0B' };
      default:
        return { text: t('medication.sharing.none'), color: '#6B7280' };
    }
  }, [t]);

  // Render medication card
  const renderMedicationCard = useCallback((medication: MedicationCardData, index: number) => {
    const sharingInfo = getSharingLevelDisplay(medication.sharingLevel);
    const isGridCard = gridLayout === 'grid';

    return (
      <TouchableOpacity
        key={`${medication.userId}-${index}`}
        style={[
          styles.medicationCard,
          isGridCard ? styles.gridCard : styles.listCard,
          {
            width: cardDimensions.width,
            height: cardDimensions.height,
          },
          culturalStyles.cardBackground,
          medication.priorityLevel !== 'normal' && {
            borderLeftWidth: 4,
            borderLeftColor: medication.adherenceColor,
          },
        ]}
        onPress={() => handleMedicationPress(medication)}
        activeOpacity={0.7}
        accessibilityLabel={t('medication.accessibility.card', {
          name: medication.userName,
          adherence: medication.adherenceRate,
          medications: medication.medicationCount,
        })}
        accessibilityRole="button"
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <Text style={[
              styles.userName,
              culturalStyles.text,
              isGridCard && styles.compactUserName,
            ]} numberOfLines={1}>
              {medication.userName}
            </Text>

            {!isGridCard && (
              <Text style={[styles.lastTaken, culturalStyles.subtleText]}>
                {formatLastTaken(medication.lastTaken)}
              </Text>
            )}
          </View>

          <View style={styles.statusContainer}>
            <Text style={styles.statusIcon}>
              {medication.statusIcon}
            </Text>
            {medication.priorityLevel !== 'normal' && (
              <View style={[
                styles.priorityBadge,
                { backgroundColor: medication.adherenceColor }
              ]}>
                <Text style={styles.priorityText}>
                  {t(`medication.priority.${medication.priorityLevel}`)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Medication Stats */}
        <View style={[
          styles.statsContainer,
          isGridCard ? styles.gridStats : styles.listStats
        ]}>
          <View style={styles.statItem}>
            <Text style={[
              styles.statNumber,
              { color: medication.adherenceColor },
              isGridCard && styles.compactStatNumber,
            ]}>
              {medication.adherenceRate}%
            </Text>
            <Text style={[
              styles.statLabel,
              culturalStyles.subtleText,
              isGridCard && styles.compactStatLabel,
            ]}>
              {t('medication.stats.adherence')}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[
              styles.statNumber,
              culturalStyles.text,
              medication.missedToday > 0 && styles.missedNumber,
              isGridCard && styles.compactStatNumber,
            ]}>
              {medication.missedToday}
            </Text>
            <Text style={[
              styles.statLabel,
              culturalStyles.subtleText,
              isGridCard && styles.compactStatLabel,
            ]}>
              {t('medication.stats.missed')}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[
              styles.statNumber,
              culturalStyles.text,
              isGridCard && styles.compactStatNumber,
            ]}>
              {medication.medicationCount}
            </Text>
            <Text style={[
              styles.statLabel,
              culturalStyles.subtleText,
              isGridCard && styles.compactStatLabel,
            ]}>
              {t('medication.stats.total')}
            </Text>
          </View>

          {!isGridCard && (
            <View style={styles.statItem}>
              <View style={[
                styles.sharingIndicator,
                { backgroundColor: sharingInfo.color }
              ]}>
                <Text style={styles.sharingText}>
                  {sharingInfo.text}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Grid card sharing info */}
        {isGridCard && (
          <View style={styles.gridSharingContainer}>
            <View style={[
              styles.gridSharingIndicator,
              { backgroundColor: sharingInfo.color }
            ]}>
              <Text style={styles.gridSharingText}>
                {sharingInfo.text}
              </Text>
            </View>
            {medication.lastTaken && (
              <Text style={[styles.gridLastTaken, culturalStyles.subtleText]}>
                {formatLastTaken(medication.lastTaken)}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [
    cardDimensions,
    culturalStyles,
    gridLayout,
    getSharingLevelDisplay,
    handleMedicationPress,
    formatLastTaken,
    t,
  ]);

  // Render empty state
  if (processedMedications.length === 0) {
    return (
      <View style={[styles.emptyContainer, culturalStyles.cardBackground]}>
        <Text style={[styles.emptyIcon]}>💊</Text>
        <Text style={[styles.emptyTitle, culturalStyles.text]}>
          {showEmergencyOnly
            ? t('medication.empty.noEmergencies')
            : t('medication.empty.noMedications')
          }
        </Text>
        <Text style={[styles.emptySubtitle, culturalStyles.subtleText]}>
          {showEmergencyOnly
            ? t('medication.empty.allGood')
            : t('medication.empty.addMedications')
          }
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary header */}
      <View style={styles.summaryHeader}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, culturalStyles.text]}>
            {processedMedications.reduce((sum, med) => sum + med.medicationCount, 0)}
          </Text>
          <Text style={[styles.summaryLabel, culturalStyles.subtleText]}>
            {t('medication.summary.total')}
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={[
            styles.summaryNumber,
            culturalStyles.text,
            processedMedications.some(med => med.missedToday > 0) && styles.missedNumber,
          ]}>
            {processedMedications.reduce((sum, med) => sum + med.missedToday, 0)}
          </Text>
          <Text style={[styles.summaryLabel, culturalStyles.subtleText]}>
            {t('medication.summary.missed')}
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={[
            styles.summaryNumber,
            processedMedications.some(med => med.criticalMissed > 0)
              ? { color: FAMILY_UI_CONSTANTS.EMERGENCY_COLORS.CRITICAL }
              : culturalStyles.text,
          ]}>
            {processedMedications.reduce((sum, med) => sum + med.criticalMissed, 0)}
          </Text>
          <Text style={[styles.summaryLabel, culturalStyles.subtleText]}>
            {t('medication.summary.critical')}
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={[
            styles.summaryNumber,
            culturalStyles.text,
          ]}>
            {Math.round(processedMedications.reduce((sum, med) => sum + med.adherenceRate, 0) / processedMedications.length)}%
          </Text>
          <Text style={[styles.summaryLabel, culturalStyles.subtleText]}>
            {t('medication.summary.average')}
          </Text>
        </View>
      </View>

      {/* Medication Grid/List */}
      <ScrollView
        contentContainerStyle={[
          gridLayout === 'grid' ? styles.gridContainer : styles.listContainer,
          { paddingBottom: 20 }
        ]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {processedMedications.map(renderMedicationCard)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  listContainer: {
    gap: 12,
  },
  medicationCard: {
    borderRadius: 8,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  gridCard: {
    // Grid-specific styles handled by width/height props
  },
  listCard: {
    // List-specific styles handled by width/height props
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  compactUserName: {
    fontSize: 14,
  },
  lastTaken: {
    fontSize: 12,
  },
  statusContainer: {
    alignItems: 'center',
    gap: 4,
  },
  statusIcon: {
    fontSize: 18,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridStats: {
    marginBottom: 8,
  },
  listStats: {
    // Default flex layout
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  compactStatNumber: {
    fontSize: 14,
  },
  missedNumber: {
    color: '#EF4444',
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  compactStatLabel: {
    fontSize: 9,
  },
  sharingIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sharingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  gridSharingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridSharingIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gridSharingText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
  },
  gridLastTaken: {
    fontSize: 9,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default MedicationStatusGrid;