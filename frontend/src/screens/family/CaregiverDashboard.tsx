/**
 * Caregiver Dashboard Screen
 *
 * Main dashboard for family caregivers to monitor patient medication adherence,
 * view missed doses, and manage emergency escalations.
 * Provides culturally-aware interface for Malaysian families.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { format, isToday, isYesterday, differenceInHours } from 'date-fns';
import FamilyCoordinationService, {
  PatientFamilyCircle,
  FamilyNotification,
  CoordinationAnalytics
} from '@/services/family/FamilyCoordinationService';
import { EscalationPanel } from '@/components/emergency/EscalationPanel';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import { useAppSelector } from '@/store/hooks';

interface AdherenceStats {
  todayTaken: number;
  todayMissed: number;
  weeklyAdherence: number;
  lastDose?: Date;
  nextDose?: Date;
}

interface MissedDoseAlert {
  id: string;
  medicationName: string;
  dosage: string;
  missedTime: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
}

interface CaregiverDashboardProps {
  navigation: any;
  route: {
    params?: {
      patientId?: string;
    };
  };
}

const AdherenceCard: React.FC<{
  stats: AdherenceStats;
  language: string;
  onViewDetails?: () => void;
}> = ({ stats, language, onViewDetails }) => {
  const adherencePercentage = stats.todayTaken + stats.todayMissed > 0
    ? Math.round((stats.todayTaken / (stats.todayTaken + stats.todayMissed)) * 100)
    : 100;

  const getAdherenceColor = (percentage: number) => {
    if (percentage >= 90) return COLORS.success;
    if (percentage >= 70) return COLORS.warning;
    return COLORS.error;
  };

  const getLabels = () => {
    const labels = {
      en: {
        title: 'Medication Adherence',
        today: 'Today',
        taken: 'Taken',
        missed: 'Missed',
        weekly: 'Weekly Average',
        lastDose: 'Last Dose',
        nextDose: 'Next Dose',
        viewDetails: 'View Details'
      },
      ms: {
        title: 'Kepatuhan Ubat',
        today: 'Hari Ini',
        taken: 'Diambil',
        missed: 'Terlepas',
        weekly: 'Purata Mingguan',
        lastDose: 'Dos Terakhir',
        nextDose: 'Dos Seterusnya',
        viewDetails: 'Lihat Butiran'
      },
      zh: {
        title: '用药依从性',
        today: '今天',
        taken: '已服用',
        missed: '错过',
        weekly: '每周平均',
        lastDose: '最后剂量',
        nextDose: '下次剂量',
        viewDetails: '查看详情'
      },
      ta: {
        title: 'மருந்து பின்பற்றுதல்',
        today: 'இன்று',
        taken: 'எடுத்துக்கொண்டது',
        missed: 'தவறவிட்டது',
        weekly: 'வாராந்திர சராசரி',
        lastDose: 'கடைசி அளவு',
        nextDose: 'அடுத்த அளவு',
        viewDetails: 'விவரங்களைப் பார்க்கவும்'
      }
    };
    return labels[language as keyof typeof labels] || labels.en;
  };

  const labels = getLabels();

  return (
    <TouchableOpacity style={styles.adherenceCard} onPress={onViewDetails} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{labels.title}</Text>
        <View style={[styles.adherenceBadge, { backgroundColor: getAdherenceColor(adherencePercentage) }]}>
          <Text style={styles.adherencePercentage}>{adherencePercentage}%</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statGroup}>
          <Text style={styles.statLabel}>{labels.today}</Text>
          <View style={styles.todayStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.todayTaken}</Text>
              <Text style={styles.statSubtext}>{labels.taken}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.error }]}>{stats.todayMissed}</Text>
              <Text style={styles.statSubtext}>{labels.missed}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statGroup}>
          <Text style={styles.statLabel}>{labels.weekly}</Text>
          <Text style={[styles.statValue, { color: getAdherenceColor(stats.weeklyAdherence) }]}>
            {stats.weeklyAdherence}%
          </Text>
        </View>
      </View>

      {(stats.lastDose || stats.nextDose) && (
        <View style={styles.doseTimings}>
          {stats.lastDose && (
            <View style={styles.doseInfo}>
              <Text style={styles.doseLabel}>{labels.lastDose}</Text>
              <Text style={styles.doseTime}>
                {isToday(stats.lastDose) ? format(stats.lastDose, 'HH:mm') :
                 isYesterday(stats.lastDose) ? 'Yesterday' :
                 format(stats.lastDose, 'MMM dd, HH:mm')}
              </Text>
            </View>
          )}
          {stats.nextDose && (
            <View style={styles.doseInfo}>
              <Text style={styles.doseLabel}>{labels.nextDose}</Text>
              <Text style={styles.doseTime}>
                {isToday(stats.nextDose) ? format(stats.nextDose, 'HH:mm') :
                 format(stats.nextDose, 'MMM dd, HH:mm')}
              </Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.viewDetailsButton} onPress={onViewDetails}>
        <Text style={styles.viewDetailsText}>{labels.viewDetails}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const MissedDosesList: React.FC<{
  missedDoses: MissedDoseAlert[];
  language: string;
  onAcknowledge?: (id: string) => void;
  onContactPatient?: (missedDose: MissedDoseAlert) => void;
}> = ({ missedDoses, language, onAcknowledge, onContactPatient }) => {
  const getLabels = () => {
    const labels = {
      en: {
        title: 'Recent Missed Doses',
        noMissed: 'No missed doses today',
        acknowledge: 'Acknowledge',
        contact: 'Contact Patient',
        critical: 'Critical',
        high: 'High',
        medium: 'Medium',
        low: 'Low'
      },
      ms: {
        title: 'Dos Terlepas Terkini',
        noMissed: 'Tiada dos terlepas hari ini',
        acknowledge: 'Akui',
        contact: 'Hubungi Pesakit',
        critical: 'Kritikal',
        high: 'Tinggi',
        medium: 'Sederhana',
        low: 'Rendah'
      },
      zh: {
        title: '最近错过的剂量',
        noMissed: '今天没有错过剂量',
        acknowledge: '确认',
        contact: '联系患者',
        critical: '紧急',
        high: '高',
        medium: '中',
        low: '低'
      },
      ta: {
        title: 'சமீபத்தில் தவறவிட்ட அளவுகள்',
        noMissed: 'இன்று எந்த அளவும் தவறவில்லை',
        acknowledge: 'ஒப்புக்கொள்ளவும்',
        contact: 'நோயாளியை தொடர்பு கொள்ளவும்',
        critical: 'விமர்சனம்',
        high: 'உயர்ந்த',
        medium: 'நடுத்தர',
        low: 'குறைவான'
      }
    };
    return labels[language as keyof typeof labels] || labels.en;
  };

  const labels = getLabels();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return COLORS.error;
      case 'high': return COLORS.orange;
      case 'medium': return COLORS.warning;
      case 'low': return COLORS.gray[500];
      default: return COLORS.gray[500];
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'critical': return labels.critical;
      case 'high': return labels.high;
      case 'medium': return labels.medium;
      case 'low': return labels.low;
      default: return priority;
    }
  };

  if (missedDoses.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{labels.title}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{labels.noMissed}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{labels.title}</Text>
      <View style={styles.missedDosesList}>
        {missedDoses.map((missedDose) => (
          <View key={missedDose.id} style={[
            styles.missedDoseItem,
            missedDose.acknowledged && styles.missedDoseItemAcknowledged
          ]}>
            <View style={styles.missedDoseHeader}>
              <View style={styles.missedDoseInfo}>
                <Text style={styles.medicationName}>{missedDose.medicationName}</Text>
                <Text style={styles.dosageText}>{missedDose.dosage}</Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(missedDose.priority) }]}>
                <Text style={styles.priorityText}>{getPriorityText(missedDose.priority)}</Text>
              </View>
            </View>

            <Text style={styles.missedTime}>
              {format(missedDose.missedTime, 'MMM dd, HH:mm')}
              {differenceInHours(new Date(), missedDose.missedTime) < 24 &&
                ` (${differenceInHours(new Date(), missedDose.missedTime)}h ago)`}
            </Text>

            <View style={styles.missedDoseActions}>
              {!missedDose.acknowledged && (
                <TouchableOpacity
                  style={styles.acknowledgeButton}
                  onPress={() => onAcknowledge?.(missedDose.id)}
                >
                  <Text style={styles.acknowledgeButtonText}>{labels.acknowledge}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => onContactPatient?.(missedDose)}
              >
                <Text style={styles.contactButtonText}>{labels.contact}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export const CaregiverDashboard: React.FC<CaregiverDashboardProps> = ({ navigation, route }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [familyCircle, setFamilyCircle] = useState<PatientFamilyCircle | null>(null);
  const [adherenceStats, setAdherenceStats] = useState<AdherenceStats>({
    todayTaken: 0,
    todayMissed: 0,
    weeklyAdherence: 0
  });
  const [missedDoses, setMissedDoses] = useState<MissedDoseAlert[]>([]);
  const [analytics, setAnalytics] = useState<CoordinationAnalytics | null>(null);

  const { profile } = useAppSelector((state) => state.cultural);
  const language = profile?.language || 'en';
  const patientId = route.params?.patientId || 'default_patient'; // In real app, this would come from navigation

  const familyService = FamilyCoordinationService.getInstance();

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Initialize service if needed
      if (!familyService.isServiceInitialized()) {
        await familyService.initialize();
      }

      // Load family circle
      const circle = familyService.getFamilyCircle(patientId);
      setFamilyCircle(circle);

      // Load adherence stats (mock data for now)
      const mockStats: AdherenceStats = {
        todayTaken: 3,
        todayMissed: 1,
        weeklyAdherence: 85,
        lastDose: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        nextDose: new Date(Date.now() + 4 * 60 * 60 * 1000)  // 4 hours from now
      };
      setAdherenceStats(mockStats);

      // Load missed doses
      const mockMissedDoses: MissedDoseAlert[] = [
        {
          id: 'md1',
          medicationName: 'Metformin',
          dosage: '500mg',
          missedTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          priority: 'high',
          acknowledged: false
        },
        {
          id: 'md2',
          medicationName: 'Lisinopril',
          dosage: '10mg',
          missedTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
          priority: 'medium',
          acknowledged: true
        }
      ];
      setMissedDoses(mockMissedDoses);

      // Load analytics
      const analyticsData = await familyService.getCoordinationAnalytics(patientId);
      setAnalytics(analyticsData);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [patientId, familyService]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  const handleAcknowledgeMissedDose = useCallback(async (missedDoseId: string) => {
    try {
      // Update local state
      setMissedDoses(prev =>
        prev.map(dose =>
          dose.id === missedDoseId
            ? { ...dose, acknowledged: true }
            : dose
        )
      );

      // In real app, this would update the backend
      console.log(`Acknowledged missed dose: ${missedDoseId}`);

    } catch (error) {
      console.error('Failed to acknowledge missed dose:', error);
      Alert.alert('Error', 'Failed to acknowledge missed dose. Please try again.');
    }
  }, []);

  const handleContactPatient = useCallback(async (missedDose: MissedDoseAlert) => {
    const contactOptions = {
      en: {
        title: 'Contact Patient',
        message: `Contact patient about missed ${missedDose.medicationName} dose?`,
        call: 'Call',
        message: 'Send Message',
        cancel: 'Cancel'
      },
      ms: {
        title: 'Hubungi Pesakit',
        message: `Hubungi pesakit tentang dos ${missedDose.medicationName} yang terlepas?`,
        call: 'Panggil',
        message: 'Hantar Mesej',
        cancel: 'Batal'
      },
      zh: {
        title: '联系患者',
        message: `就错过的 ${missedDose.medicationName} 剂量联系患者？`,
        call: '呼叫',
        message: '发送消息',
        cancel: '取消'
      },
      ta: {
        title: 'நோயாளியை தொடர்பு கொள்ளவும்',
        message: `தவறவிட்ட ${missedDose.medicationName} அளவு பற்றி நோயாளியை தொடர்பு கொள்ளவா?`,
        call: 'அழைக்கவும்',
        message: 'செய்தி அனுப்பவும்',
        cancel: 'ரத்துசெய்யவும்'
      }
    };

    const options = contactOptions[language as keyof typeof contactOptions] || contactOptions.en;

    Alert.alert(
      options.title,
      options.message,
      [
        { text: options.cancel, style: 'cancel' },
        {
          text: options.call,
          onPress: () => {
            // In real app, this would initiate a phone call
            console.log('Initiating call to patient');
          }
        },
        {
          text: options.message,
          onPress: () => {
            // In real app, this would open SMS or messaging app
            console.log('Opening message to patient');
          }
        }
      ]
    );
  }, [language]);

  const handleViewAdherenceDetails = useCallback(() => {
    // Navigate to detailed adherence screen
    navigation.navigate('AdherenceDetails', { patientId });
  }, [navigation, patientId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const getScreenTitle = () => {
    const titles = {
      en: 'Caregiver Dashboard',
      ms: 'Papan Pemuka Penjaga',
      zh: '护理人员仪表板',
      ta: 'பராமரிப்பாளர் டாஷ்போர்டு'
    };
    return titles[language as keyof typeof titles] || titles.en;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {language === 'ms' ? 'Memuatkan...' :
             language === 'zh' ? '加载中...' :
             language === 'ta' ? 'ஏற்றுகிறது...' :
             'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.screenTitle}>{getScreenTitle()}</Text>
        {familyCircle && (
          <Text style={styles.patientName}>
            {language === 'ms' ? 'Untuk' :
             language === 'zh' ? '为' :
             language === 'ta' ? 'க்காக' :
             'For'} {familyCircle.patientName}
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <AdherenceCard
          stats={adherenceStats}
          language={language}
          onViewDetails={handleViewAdherenceDetails}
        />

        <MissedDosesList
          missedDoses={missedDoses}
          language={language}
          onAcknowledge={handleAcknowledgeMissedDose}
          onContactPatient={handleContactPatient}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'ms' ? 'Peningkatan Kecemasan' :
             language === 'zh' ? '紧急升级' :
             language === 'ta' ? 'அவசர அதிகரிப்பு' :
             'Emergency Escalations'}
          </Text>
          <EscalationPanel
            patientId={patientId}
            compact={true}
            onEscalationPress={(escalation) => {
              navigation.navigate('EscalationDetails', {
                escalationId: escalation.id,
                patientId: patientId
              });
            }}
          />
        </View>

        {analytics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {language === 'ms' ? 'Statistik Keluarga' :
               language === 'zh' ? '家庭统计' :
               language === 'ta' ? 'குடும்ப புள்ளிவிவரங்கள்' :
               'Family Stats'}
            </Text>
            <View style={styles.analyticsContainer}>
              <View style={styles.analyticItem}>
                <Text style={styles.analyticValue}>{analytics.familyEngagement.totalFamilyMembers}</Text>
                <Text style={styles.analyticLabel}>
                  {language === 'ms' ? 'Ahli Keluarga' :
                   language === 'zh' ? '家庭成员' :
                   language === 'ta' ? 'குடும்ப உறுப்பினர்கள்' :
                   'Family Members'}
                </Text>
              </View>
              <View style={styles.analyticItem}>
                <Text style={styles.analyticValue}>{analytics.communicationStats.totalNotifications}</Text>
                <Text style={styles.analyticLabel}>
                  {language === 'ms' ? 'Pemberitahuan' :
                   language === 'zh' ? '通知' :
                   language === 'ta' ? 'அறிவிப்புகள்' :
                   'Notifications'}
                </Text>
              </View>
              <View style={styles.analyticItem}>
                <Text style={styles.analyticValue}>{Math.round(analytics.communicationStats.deliverySuccess)}%</Text>
                <Text style={styles.analyticLabel}>
                  {language === 'ms' ? 'Kadar Kejayaan' :
                   language === 'zh' ? '成功率' :
                   language === 'ta' ? 'வெற்றி விகிதம்' :
                   'Success Rate'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  screenTitle: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.secondary,
    marginBottom: 4,
  },
  patientName: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  adherenceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.secondary,
  },
  adherenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  adherencePercentage: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.white,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statGroup: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
    marginBottom: 8,
  },
  todayStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.gray[300],
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.gray[500],
  },
  doseTimings: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  doseInfo: {
    flex: 1,
    alignItems: 'center',
  },
  doseLabel: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.gray[500],
    marginBottom: 4,
  },
  doseTime: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[700],
  },
  viewDetailsButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.secondary,
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
  missedDosesList: {
    gap: 12,
  },
  missedDoseItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  missedDoseItemAcknowledged: {
    borderLeftColor: COLORS.gray[400],
    opacity: 0.7,
  },
  missedDoseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  missedDoseInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.secondary,
    marginBottom: 2,
  },
  dosageText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  missedTime: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
    marginBottom: 12,
  },
  missedDoseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acknowledgeButton: {
    backgroundColor: COLORS.gray[200],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  acknowledgeButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[700],
  },
  contactButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  contactButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.white,
  },
  analyticsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  analyticItem: {
    alignItems: 'center',
  },
  analyticValue: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.primary,
    marginBottom: 4,
  },
  analyticLabel: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
});

export default CaregiverDashboard;