/**
 * Localized Medication Card Component
 * 
 * Displays medication information with full cultural localization,
 * RTL support, prayer time considerations, and elderly-friendly formatting.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  useTranslation,
  useMedicalTranslation,
  useCulturalFormatting,
  useRtlSupport,
} from '@/i18n/hooks/useTranslation';
import { useCulturalTheme, useCulturalStyles } from './CulturalThemeProvider';
import { useAppSelector } from '@/store/hooks';
import { selectMedicationCulturalContext } from '@/store/slices/culturalSlice';
import CulturalFormatters from '@/utils/localization/formatters/CulturalFormatters';
import RtlSupport from '@/utils/localization/rtl/RtlSupport';

interface MedicationInfo {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  specialInstructions?: string[];
  halalStatus?: 'halal' | 'haram' | 'syubhah' | 'unknown';
  nextDose?: Date;
  conflictsWithPrayer?: boolean;
}

interface LocalizedMedicationCardProps {
  medication: MedicationInfo;
  onPress?: () => void;
  onTakeMedication?: () => void;
  onSkipDose?: () => void;
  showHalalStatus?: boolean;
  showPrayerConflicts?: boolean;
  compactMode?: boolean;
}

export function LocalizedMedicationCard({
  medication,
  onPress,
  onTakeMedication,
  onSkipDose,
  showHalalStatus = true,
  showPrayerConflicts = true,
  compactMode = false,
}: LocalizedMedicationCardProps) {
  const { t, currentLanguage } = useTranslation();
  const { translateMedical, translateHalalStatus } = useMedicalTranslation();
  const { formatDate } = useCulturalFormatting();
  const { getTextStyle, hasRtlContent } = useRtlSupport();
  const { theme, isElderlyMode } = useCulturalTheme();
  const { getCardStyle, getTextStyle: getCulturalTextStyle } = useCulturalStyles();
  
  const culturalContext = useAppSelector(selectMedicationCulturalContext);

  // Format medication instructions with cultural context
  const formattedInstructions = useMemo(() => {
    const instructionData = {
      timing: medication.timing,
      dosage: medication.dosage,
      frequency: medication.frequency,
      specialInstructions: medication.specialInstructions,
      culturalNotes: [],
    };

    const formattingContext = {
      language: currentLanguage,
      religion: culturalContext.religion,
      elderlyMode: culturalContext.elderlyMode,
      culturalProfile: culturalContext,
    };

    return CulturalFormatters.formatMedicationInstructions(instructionData, formattingContext);
  }, [medication, currentLanguage, culturalContext]);

  // Handle RTL content in medication name and instructions
  const medicationNameStyle = useMemo(() => {
    const rtlFormatted = RtlSupport.formatMedicationInstructionsRtl(
      medication.name,
      currentLanguage,
      culturalContext.halalValidationEnabled
    );
    
    return {
      text: rtlFormatted.text,
      style: RtlSupport.createRtlAwareStyle(
        getCulturalTextStyle('heading'),
        rtlFormatted.text,
        currentLanguage
      ),
    };
  }, [medication.name, currentLanguage, culturalContext, getCulturalTextStyle]);

  // Prayer time conflict warning
  const prayerConflictWarning = useMemo(() => {
    if (!showPrayerConflicts || !medication.conflictsWithPrayer || !culturalContext.prayerTimesEnabled) {
      return null;
    }

    return (
      <View style={styles.warningContainer}>
        <Text style={[
          getCulturalTextStyle('caption'),
          styles.warningText,
          { color: theme.colors.warning }
        ]}>
          {t('medications.cultural.prayerTimeAdjustment')}
        </Text>
      </View>
    );
  }, [medication.conflictsWithPrayer, culturalContext.prayerTimesEnabled, showPrayerConflicts, t, getCulturalTextStyle, theme.colors.warning]);

  // Halal status display
  const halalStatusDisplay = useMemo(() => {
    if (!showHalalStatus || !culturalContext.halalValidationEnabled || !medication.halalStatus) {
      return null;
    }

    const statusColor = {
      halal: theme.colors.success,
      haram: theme.colors.error,
      syubhah: theme.colors.warning,
      unknown: theme.colors.info,
    }[medication.halalStatus];

    return (
      <View style={[styles.halalStatusContainer, { backgroundColor: statusColor + '20' }]}>
        <Text style={[
          getCulturalTextStyle('caption'),
          { color: statusColor }
        ]}>
          {translateHalalStatus(medication.halalStatus)}
        </Text>
      </View>
    );
  }, [medication.halalStatus, culturalContext.halalValidationEnabled, showHalalStatus, translateHalalStatus, getCulturalTextStyle, theme.colors]);

  // Next dose information
  const nextDoseInfo = useMemo(() => {
    if (!medication.nextDose) return null;

    const formattedTime = formatDate(medication.nextDose, 'time');
    
    return (
      <View style={styles.nextDoseContainer}>
        <Text style={getCulturalTextStyle('caption')}>
          {t('medications.nextDose')}: {formattedTime}
        </Text>
      </View>
    );
  }, [medication.nextDose, formatDate, t, getCulturalTextStyle]);

  const cardStyle = useMemo(() => ({
    ...getCardStyle(),
    ...(compactMode && { padding: theme.spacing.sm }),
    ...(isElderlyMode && { 
      padding: theme.spacing.lg,
      minHeight: 120,
    }),
  }), [getCardStyle, compactMode, isElderlyMode, theme.spacing]);

  return (
    <TouchableOpacity
      style={cardStyle}
      onPress={onPress}
      activeOpacity={0.7}
      accessible={true}
      accessibilityLabel={`${t('medications.medicationName')}: ${medicationNameStyle.text}`}
      accessibilityHint={formattedInstructions}
    >
      {/* Header with medication name and halal status */}
      <View style={[
        styles.header,
        RtlSupport.getRtlFlexDirection(medicationNameStyle.text) === 'row-reverse' && styles.headerRtl
      ]}>
        <Text style={medicationNameStyle.style} numberOfLines={compactMode ? 1 : 2}>
          {medicationNameStyle.text}
        </Text>
        {halalStatusDisplay}
      </View>

      {/* Prayer time conflict warning */}
      {prayerConflictWarning}

      {/* Medication instructions */}
      <View style={styles.instructionsContainer}>
        <Text 
          style={[
            getCulturalTextStyle('body'),
            getTextStyle(formattedInstructions),
            isElderlyMode && styles.elderlyText,
          ]}
          numberOfLines={compactMode ? 2 : undefined}
        >
          {formattedInstructions}
        </Text>
      </View>

      {/* Next dose and actions */}
      {!compactMode && (
        <View style={styles.footer}>
          {nextDoseInfo}
          
          {/* Action buttons */}
          <View style={[
            styles.actionContainer,
            RtlSupport.getRtlFlexDirection(medicationNameStyle.text) === 'row-reverse' && styles.actionContainerRtl
          ]}>
            {onTakeMedication && (
              <TouchableOpacity
                style={[styles.actionButton, styles.takeButton, { backgroundColor: theme.colors.success }]}
                onPress={onTakeMedication}
                accessible={true}
                accessibilityLabel={t('medications.takeMedication')}
              >
                <Text style={[styles.actionButtonText, { color: '#fff' }]}>
                  {t('medications.takeMedication')}
                </Text>
              </TouchableOpacity>
            )}
            
            {onSkipDose && (
              <TouchableOpacity
                style={[styles.actionButton, styles.skipButton, { borderColor: theme.colors.border }]}
                onPress={onSkipDose}
                accessible={true}
                accessibilityLabel={t('medications.skipDose')}
              >
                <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
                  {t('medications.skipDose')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  warningText: {
    fontWeight: '500',
  },
  halalStatusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  instructionsContainer: {
    marginBottom: 12,
  },
  elderlyText: {
    lineHeight: 24,
  },
  nextDoseContainer: {
    marginBottom: 12,
  },
  footer: {
    marginTop: 'auto',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionContainerRtl: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  takeButton: {
    marginRight: 4,
  },
  skipButton: {
    borderWidth: 1,
    marginLeft: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LocalizedMedicationCard;