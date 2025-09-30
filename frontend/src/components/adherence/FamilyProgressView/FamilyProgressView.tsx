/**
 * Enhanced Family Progress View Component
 *
 * Family member adherence overview with collaborative milestone tracking,
 * privacy-controlled sharing, emergency alert indicators, and cultural coordination.
 * Supports Malaysian family structures and cultural practices.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import * as Animatable from 'react-native-animatable';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import {
  ProgressMetrics,
  AdherenceMilestone,
  CulturalInsight,
  FamilyAdherenceMetrics,
} from '@/types/adherence';

const { width: screenWidth } = Dimensions.get('window');

interface FamilyMember {
  id: string;
  name: string;
  role: 'head' | 'spouse' | 'parent' | 'child' | 'elderly' | 'caregiver';
  age: number;
  adherenceRate: number;
  currentStreak: number;
  medications: number;
  lastActive: Date;
  emergencyContact: boolean;
  privacyLevel: 'full' | 'limited' | 'minimal';
  culturalPreferences: {
    language: string;
    religiousObservance: string;
    festivalPriorities: string[];
  };
  healthStatus: 'stable' | 'monitoring' | 'critical';
  supportProvided: number; // Support given to others
  supportReceived: number; // Support received from others
}

interface FamilyProgressViewProps {
  patientId: string;
  progressMetrics: ProgressMetrics;
  familyId?: string;
  onFamilyShare?: (data: any) => void;
  onEmergencyAlert?: (memberId: string, type: string) => void;
  onPrivacyUpdate?: (memberId: string, level: string) => void;
}

export const FamilyProgressView: React.FC<FamilyProgressViewProps> = ({
  patientId,
  progressMetrics,
  familyId,
  onFamilyShare,
  onEmergencyAlert,
  onPrivacyUpdate,
}) => {
  const { theme, culturalContext } = useCulturalTheme();
  const { getCardStyle, getTextStyle, getButtonStyle } = useCulturalStyles();
  const { t, language } = useTranslation();

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [familyMetrics, setFamilyMetrics] = useState<FamilyAdherenceMetrics | null>(null);

  const malaysianColors = {
    primary: '#DC143C', // Malaysian red
    secondary: '#FFD700', // Gold
    accent: '#228B22', // Green
    warning: '#FF8C00', // Orange
    cultural: '#4B0082', // Indigo
    family: '#8B4513', // Brown for family bonds
  };

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(220, 20, 60, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: { borderRadius: 8 },
  };

  useEffect(() => {
    loadFamilyData();
  }, [patientId, familyId]);

  const loadFamilyData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Generate mock family data for demonstration
      const mockFamilyMembers = generateMockFamilyMembers();
      setFamilyMembers(mockFamilyMembers);

      const mockFamilyMetrics = generateMockFamilyMetrics(mockFamilyMembers);
      setFamilyMetrics(mockFamilyMetrics);
    } catch (error) {
      console.error('Error loading family data:', error);
      Alert.alert(t('error.title'), t('family.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [patientId, familyId, t]);

  const generateMockFamilyMembers = (): FamilyMember[] => {
    const malaysianNames = [
      { name: 'Ahmad Abdullah', role: 'head' as const, age: 55 },
      { name: 'Siti Nurhaliza', role: 'spouse' as const, age: 52 },
      { name: 'Nenek Aminah', role: 'elderly' as const, age: 78 },
      { name: 'Ali Ahmad', role: 'child' as const, age: 25 },
      { name: 'Fatimah Ahmad', role: 'child' as const, age: 22 },
    ];

    return malaysianNames.map((person, index) => ({
      id: `family_${index + 1}`,
      name: person.name,
      role: person.role,
      age: person.age,
      adherenceRate: 75 + Math.random() * 20,
      currentStreak: Math.floor(Math.random() * 30),
      medications: 1 + Math.floor(Math.random() * 4),
      lastActive: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      emergencyContact: person.role === 'head' || person.role === 'spouse',
      privacyLevel: index === 0 ? 'full' : 'limited',
      culturalPreferences: {
        language: index < 2 ? 'ms' : 'en',
        religiousObservance: 'moderate',
        festivalPriorities: ['hari_raya', 'chinese_new_year'],
      },
      healthStatus: person.age > 70 ? 'monitoring' : 'stable',
      supportProvided: Math.floor(Math.random() * 10),
      supportReceived: Math.floor(Math.random() * 10),
    }));
  };

  const generateMockFamilyMetrics = (members: FamilyMember[]): FamilyAdherenceMetrics => {
    const headOfFamily = members.find(m => m.role === 'head')?.id || members[0].id;
    const familyAdherenceRate = members.reduce((sum, m) => sum + m.adherenceRate, 0) / members.length;

    return {
      familyId: familyId || 'family_001',
      headOfFamily,
      memberMetrics: members.map(member => ({
        memberId: member.id,
        role: member.role,
        adherenceRate: member.adherenceRate,
        supportProvided: member.supportProvided,
        supportReceived: member.supportReceived,
      })),
      familyAdherenceRate,
      coordinationScore: 85 + Math.random() * 10,
      culturalHarmony: 90 + Math.random() * 8,
      lastUpdated: new Date(),
    };
  };

  const getRoleIcon = (role: string): string => {
    const roleIcons: Record<string, string> = {
      head: '👨‍💼',
      spouse: '👩‍💼',
      parent: '👨‍👩‍👧‍👦',
      child: '👧',
      elderly: '👴',
      caregiver: '👩‍⚕️',
    };
    return roleIcons[role] || '👤';
  };

  const getRoleLabel = (role: string): string => {
    const roleLabels: Record<string, string> = {
      head: t('family.roles.head'),
      spouse: t('family.roles.spouse'),
      parent: t('family.roles.parent'),
      child: t('family.roles.child'),
      elderly: t('family.roles.elderly'),
      caregiver: t('family.roles.caregiver'),
    };
    return roleLabels[role] || role;
  };

  const getHealthStatusColor = (status: string): string => {
    switch (status) {
      case 'stable':
        return malaysianColors.accent;
      case 'monitoring':
        return malaysianColors.warning;
      case 'critical':
        return malaysianColors.primary;
      default:
        return theme.colors.text;
    }
  };

  const getAdherenceColor = (rate: number): string => {
    if (rate >= 85) return malaysianColors.accent;
    if (rate >= 70) return malaysianColors.secondary;
    if (rate >= 50) return malaysianColors.warning;
    return malaysianColors.primary;
  };

  const renderFamilyOverview = () => {
    if (!familyMetrics) return null;

    const pieData = familyMembers.map((member, index) => ({
      name: member.name.split(' ')[0], // First name only
      population: member.adherenceRate,
      color: `hsl(${index * 360 / familyMembers.length}, 70%, 60%)`,
      legendFontColor: theme.colors.text,
      legendFontSize: 12,
    }));

    return (
      <Animatable.View animation="fadeInUp" duration={600} style={[styles.overviewSection, getCardStyle()]}>
        <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
          {t('family.overview.title')}
        </Text>

        <View style={styles.familyStats}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, getTextStyle('display'), { color: malaysianColors.primary }]}>
              {familyMembers.length}
            </Text>
            <Text style={[styles.statLabel, getTextStyle('caption')]}>
              {t('family.overview.members')}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, getTextStyle('display'), { color: malaysianColors.accent }]}>
              {Math.round(familyMetrics.familyAdherenceRate)}%
            </Text>
            <Text style={[styles.statLabel, getTextStyle('caption')]}>
              {t('family.overview.adherence')}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, getTextStyle('display'), { color: malaysianColors.cultural }]}>
              {Math.round(familyMetrics.culturalHarmony)}%
            </Text>
            <Text style={[styles.statLabel, getTextStyle('caption')]}>
              {t('family.overview.harmony')}
            </Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <Text style={[styles.chartTitle, getTextStyle('subheading')]}>
            {t('family.overview.adherenceDistribution')}
          </Text>
          <PieChart
            data={pieData}
            width={screenWidth - 80}
            height={200}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      </Animatable.View>
    );
  };

  const renderMemberCard = (member: FamilyMember, index: number) => {
    const isSelected = selectedMember === member.id;

    return (
      <Animatable.View
        key={member.id}
        animation="slideInRight"
        delay={index * 100}
        duration={600}
        style={[
          styles.memberCard,
          getCardStyle(),
          isSelected && styles.selectedMemberCard,
          { borderLeftColor: getAdherenceColor(member.adherenceRate) },
        ]}
      >
        <TouchableOpacity
          style={styles.memberCardContent}
          onPress={() => setSelectedMember(isSelected ? null : member.id)}
          accessibilityRole="button"
          accessibilityLabel={`${member.name} family member details`}
        >
          <View style={styles.memberHeader}>
            <View style={styles.memberInfo}>
              <View style={styles.memberNameRow}>
                <Text style={styles.roleIcon}>{getRoleIcon(member.role)}</Text>
                <Text style={[styles.memberName, getTextStyle('subheading')]}>
                  {member.name}
                </Text>
                {member.emergencyContact && (
                  <Text style={styles.emergencyBadge}>🚨</Text>
                )}
              </View>
              <Text style={[styles.memberRole, getTextStyle('caption')]}>
                {getRoleLabel(member.role)} • {member.age} {t('family.years')}
              </Text>
            </View>

            <View style={styles.memberStatus}>
              <View style={[
                styles.healthStatusIndicator,
                { backgroundColor: getHealthStatusColor(member.healthStatus) }
              ]} />
              <Text style={[
                styles.adherenceRate,
                getTextStyle('body'),
                { color: getAdherenceColor(member.adherenceRate) }
              ]}>
                {Math.round(member.adherenceRate)}%
              </Text>
            </View>
          </View>

          <View style={styles.memberMetrics}>
            <View style={styles.metric}>
              <Text style={[styles.metricValue, getTextStyle('caption')]}>
                {member.currentStreak}
              </Text>
              <Text style={[styles.metricLabel, getTextStyle('caption')]}>
                {t('family.streak')}
              </Text>
            </View>

            <View style={styles.metric}>
              <Text style={[styles.metricValue, getTextStyle('caption')]}>
                {member.medications}
              </Text>
              <Text style={[styles.metricLabel, getTextStyle('caption')]}>
                {t('family.medications')}
              </Text>
            </View>

            <View style={styles.metric}>
              <Text style={[styles.metricValue, getTextStyle('caption')]}>
                {member.supportProvided}
              </Text>
              <Text style={[styles.metricLabel, getTextStyle('caption')]}>
                {t('family.support')}
              </Text>
            </View>
          </View>

          {isSelected && renderMemberDetails(member)}
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  const renderMemberDetails = (member: FamilyMember) => (
    <View style={styles.memberDetails}>
      <View style={styles.detailSection}>
        <Text style={[styles.detailTitle, getTextStyle('subheading')]}>
          {t('family.details.preferences')}
        </Text>
        <View style={styles.preferenceItem}>
          <Text style={[styles.preferenceLabel, getTextStyle('caption')]}>
            {t('family.details.language')}:
          </Text>
          <Text style={[styles.preferenceValue, getTextStyle('caption')]}>
            {member.culturalPreferences.language.toUpperCase()}
          </Text>
        </View>
        <View style={styles.preferenceItem}>
          <Text style={[styles.preferenceLabel, getTextStyle('caption')]}>
            {t('family.details.observance')}:
          </Text>
          <Text style={[styles.preferenceValue, getTextStyle('caption')]}>
            {member.culturalPreferences.religiousObservance}
          </Text>
        </View>
      </View>

      <View style={styles.detailSection}>
        <Text style={[styles.detailTitle, getTextStyle('subheading')]}>
          {t('family.details.privacy')}
        </Text>
        <View style={styles.privacyControls}>
          <Text style={[styles.privacyLabel, getTextStyle('caption')]}>
            {t('family.privacy.shareLevel')}:
          </Text>
          <TouchableOpacity
            style={[styles.privacyButton, getButtonStyle('tertiary')]}
            onPress={() => showPrivacyOptions(member)}
            accessibilityRole="button"
          >
            <Text style={[styles.privacyButtonText, getTextStyle('caption')]}>
              {t(`family.privacy.${member.privacyLevel}`)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.detailActions}>
        <TouchableOpacity
          style={[styles.detailActionButton, getButtonStyle('primary'), { backgroundColor: malaysianColors.secondary }]}
          onPress={() => handleFamilySupport(member)}
          accessibilityRole="button"
        >
          <Text style={[styles.actionButtonText, getTextStyle('caption'), { color: theme.colors.surface }]}>
            {t('family.actions.support')} 🤝
          </Text>
        </TouchableOpacity>

        {member.emergencyContact && (
          <TouchableOpacity
            style={[styles.detailActionButton, getButtonStyle('secondary'), { backgroundColor: malaysianColors.primary }]}
            onPress={() => handleEmergencyContact(member)}
            accessibilityRole="button"
          >
            <Text style={[styles.actionButtonText, getTextStyle('caption'), { color: theme.colors.surface }]}>
              {t('family.actions.emergency')} 🚨
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderCoordinationInsights = () => {
    if (!familyMetrics) return null;

    const coordinationData = {
      labels: familyMembers.slice(0, 5).map(m => m.name.split(' ')[0]),
      datasets: [
        {
          data: familyMembers.slice(0, 5).map(m => m.supportProvided),
          color: (opacity = 1) => `rgba(220, 20, 60, ${opacity})`,
        },
      ],
    };

    return (
      <Animatable.View animation="fadeInLeft" duration={800} style={[styles.coordinationSection, getCardStyle()]}>
        <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
          {t('family.coordination.title')}
        </Text>

        <View style={styles.coordinationMetrics}>
          <View style={styles.coordinationMetric}>
            <Text style={[styles.coordinationValue, getTextStyle('heading'), { color: malaysianColors.family }]}>
              {Math.round(familyMetrics.coordinationScore)}%
            </Text>
            <Text style={[styles.coordinationLabel, getTextStyle('caption')]}>
              {t('family.coordination.score')}
            </Text>
          </View>

          <View style={styles.coordinationMetric}>
            <Text style={[styles.coordinationValue, getTextStyle('heading'), { color: malaysianColors.cultural }]}>
              {Math.round(familyMetrics.culturalHarmony)}%
            </Text>
            <Text style={[styles.coordinationLabel, getTextStyle('caption')]}>
              {t('family.coordination.harmony')}
            </Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <Text style={[styles.chartTitle, getTextStyle('subheading')]}>
            {t('family.coordination.supportChart')}
          </Text>
          <BarChart
            data={coordinationData}
            width={screenWidth - 80}
            height={200}
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars
          />
        </View>

        <View style={styles.coordinationInsights}>
          <Text style={[styles.insightText, getTextStyle('caption')]}>
            💡 {t('family.coordination.insight1')}
          </Text>
          <Text style={[styles.insightText, getTextStyle('caption')]}>
            🌟 {t('family.coordination.insight2')}
          </Text>
        </View>
      </Animatable.View>
    );
  };

  const renderFamilyActions = () => (
    <Animatable.View animation="fadeInUp" duration={600} style={[styles.actionsSection, getCardStyle()]}>
      <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
        {t('family.actions.title')}
      </Text>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, getButtonStyle('primary'), { backgroundColor: malaysianColors.primary }]}
          onPress={handleShareFamilyProgress}
          accessibilityRole="button"
        >
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={[styles.actionButtonText, getTextStyle('caption'), { color: theme.colors.surface }]}>
            {t('family.actions.shareProgress')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, getButtonStyle('secondary'), { backgroundColor: malaysianColors.secondary }]}
          onPress={handleFamilyReminders}
          accessibilityRole="button"
        >
          <Text style={styles.actionIcon}>⏰</Text>
          <Text style={[styles.actionButtonText, getTextStyle('caption'), { color: theme.colors.surface }]}>
            {t('family.actions.reminders')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, getButtonStyle('tertiary'), { borderColor: malaysianColors.cultural }]}
          onPress={handleCulturalSettings}
          accessibilityRole="button"
        >
          <Text style={styles.actionIcon}>🏮</Text>
          <Text style={[styles.actionButtonText, getTextStyle('caption'), { color: malaysianColors.cultural }]}>
            {t('family.actions.cultural')}
          </Text>
        </TouchableOpacity>
      </View>
    </Animatable.View>
  );

  const showPrivacyOptions = (member: FamilyMember) => {
    Alert.alert(
      t('family.privacy.title'),
      t('family.privacy.description'),
      [
        { text: t('family.privacy.full'), onPress: () => updatePrivacy(member.id, 'full') },
        { text: t('family.privacy.limited'), onPress: () => updatePrivacy(member.id, 'limited') },
        { text: t('family.privacy.minimal'), onPress: () => updatePrivacy(member.id, 'minimal') },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const updatePrivacy = (memberId: string, level: string) => {
    setFamilyMembers(prev =>
      prev.map(member =>
        member.id === memberId
          ? { ...member, privacyLevel: level as 'full' | 'limited' | 'minimal' }
          : member
      )
    );
    onPrivacyUpdate?.(memberId, level);
  };

  const handleFamilySupport = (member: FamilyMember) => {
    Alert.alert(
      t('family.support.title'),
      t('family.support.description', { name: member.name }),
      [
        { text: t('family.support.remind'), onPress: () => console.log('Send reminder') },
        { text: t('family.support.encourage'), onPress: () => console.log('Send encouragement') },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const handleEmergencyContact = (member: FamilyMember) => {
    onEmergencyAlert?.(member.id, 'manual_contact');
    Alert.alert(
      t('family.emergency.title'),
      t('family.emergency.contacted', { name: member.name })
    );
  };

  const handleShareFamilyProgress = () => {
    if (familyMetrics) {
      onFamilyShare?.(familyMetrics);
    }
  };

  const handleFamilyReminders = () => {
    Alert.alert(
      t('family.reminders.title'),
      t('family.reminders.description'),
      [{ text: t('common.ok') }]
    );
  };

  const handleCulturalSettings = () => {
    Alert.alert(
      t('family.cultural.title'),
      t('family.cultural.description'),
      [{ text: t('common.ok') }]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={malaysianColors.primary} />
        <Text style={[styles.loadingText, getTextStyle('body')]}>
          {t('family.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderFamilyOverview()}

        <View style={styles.membersSection}>
          <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
            {t('family.members.title')}
          </Text>
          {familyMembers.map((member, index) => renderMemberCard(member, index))}
        </View>

        {renderCoordinationInsights()}
        {renderFamilyActions()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  overviewSection: {
    marginBottom: 20,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  familyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    textAlign: 'center',
    opacity: 0.7,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  chart: {
    borderRadius: 8,
  },
  membersSection: {
    marginBottom: 20,
  },
  memberCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  selectedMemberCard: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  memberCardContent: {
    padding: 16,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  roleIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  memberName: {
    flex: 1,
    fontWeight: 'bold',
  },
  emergencyBadge: {
    fontSize: 16,
    marginLeft: 8,
  },
  memberRole: {
    opacity: 0.7,
  },
  memberStatus: {
    alignItems: 'center',
  },
  healthStatusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  adherenceRate: {
    fontWeight: 'bold',
  },
  memberMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metricLabel: {
    textAlign: 'center',
    opacity: 0.7,
  },
  memberDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  detailSection: {
    marginBottom: 12,
  },
  detailTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  preferenceLabel: {
    opacity: 0.7,
  },
  preferenceValue: {
    fontWeight: '600',
  },
  privacyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privacyLabel: {
    opacity: 0.7,
  },
  privacyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  privacyButtonText: {
    fontWeight: '600',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  detailActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  coordinationSection: {
    marginBottom: 20,
    padding: 16,
  },
  coordinationMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  coordinationMetric: {
    alignItems: 'center',
  },
  coordinationValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  coordinationLabel: {
    textAlign: 'center',
    opacity: 0.7,
  },
  coordinationInsights: {
    marginTop: 12,
  },
  insightText: {
    marginBottom: 8,
    paddingLeft: 8,
    opacity: 0.8,
  },
  actionsSection: {
    marginBottom: 20,
    padding: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionButtonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default FamilyProgressView;