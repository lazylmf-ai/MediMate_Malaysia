/**
 * Provider Dashboard Component
 *
 * Stream D - Provider Reporting & FHIR Integration
 *
 * Healthcare provider dashboard with patient consent management, adherence
 * insights, cultural context awareness, and FHIR-compliant data access.
 *
 * Features:
 * - Patient consent management dashboard
 * - Real-time adherence monitoring
 * - Cultural context insights
 * - Clinical alerts and recommendations
 * - FHIR data export capabilities
 * - Malaysian healthcare compliance
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

// Service imports
import { ClinicalInsightsEngine, ProviderInsightProfile, ClinicalAlert } from '../../services/analytics/ClinicalInsightsEngine';
import { AdherenceFHIRService } from '../../services/fhir/AdherenceFHIRService';
import { ProviderReportGenerator, ProviderReport } from '../../services/reporting/ProviderReportGenerator';
import { DataExportService, ExportResult } from '../../services/export/DataExportService';

// Type imports
import {
  AdherenceRecord,
  ProgressMetrics,
  CulturalInsight,
  RiskLevel
} from '../../types/adherence';
import { Medication } from '../../types/medication';

// Component interfaces
interface ProviderDashboardProps {
  providerId: string;
  onPatientSelect?: (patientId: string) => void;
  onExportComplete?: (exportResult: ExportResult) => void;
  initialPatientId?: string;
}

interface PatientSummaryCard {
  patientId: string;
  patientName: string;
  overallAdherence: number;
  riskLevel: RiskLevel;
  alertsCount: number;
  lastUpdate: Date;
  culturalFactors: string[];
  consentStatus: 'active' | 'expired' | 'revoked';
}

interface DashboardMetrics {
  totalPatients: number;
  averageAdherence: number;
  highRiskPatients: number;
  pendingAlerts: number;
  culturalChallenges: number;
  recentReports: number;
}

interface ChartData {
  adherenceTrends: {
    labels: string[];
    datasets: Array<{ data: number[] }>;
  };
  riskDistribution: Array<{
    name: string;
    population: number;
    color: string;
    legendFontColor: string;
    legendFontSize: number;
  }>;
  culturalFactors: {
    labels: string[];
    datasets: Array<{ data: number[] }>;
  };
}

export const ProviderDashboard: React.FC<ProviderDashboardProps> = ({
  providerId,
  onPatientSelect,
  onExportComplete,
  initialPatientId
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId || null);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [patientSummaries, setPatientSummaries] = useState<PatientSummaryCard[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<ClinicalAlert[]>([]);
  const [selectedInsight, setSelectedInsight] = useState<ProviderInsightProfile | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [exportFormat, setExportFormat] = useState<'fhir_json' | 'pdf_report' | 'csv_data'>('fhir_json');
  const [isExporting, setIsExporting] = useState(false);

  // Service instances
  const clinicalEngine = useMemo(() => new ClinicalInsightsEngine(), []);
  const fhirService = useMemo(() => AdherenceFHIRService.getInstance(), []);
  const reportGenerator = useMemo(() => new ProviderReportGenerator(), []);
  const exportService = useMemo(() => DataExportService.getInstance(), []);

  // Screen dimensions for responsive design
  const screenWidth = Dimensions.get('window').width;
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(45, 156, 219, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#2D9CDB'
    }
  };

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Get consent summary for provider
      const consentSummary = fhirService.getProviderConsentSummary(providerId);

      // Simulate patient summaries (in real implementation, this would fetch from API)
      const mockPatientSummaries: PatientSummaryCard[] = consentSummary.map((consent, index) => ({
        patientId: consent.patientId,
        patientName: `Patient ${index + 1}`, // Would be fetched from patient service
        overallAdherence: 75 + Math.random() * 20, // Mock data
        riskLevel: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as RiskLevel,
        alertsCount: Math.floor(Math.random() * 5),
        lastUpdate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        culturalFactors: ['Prayer time conflicts', 'Family support'].slice(0, Math.floor(Math.random() * 2) + 1),
        consentStatus: consent.consentStatus
      }));

      setPatientSummaries(mockPatientSummaries);

      // Calculate dashboard metrics
      const metrics: DashboardMetrics = {
        totalPatients: mockPatientSummaries.length,
        averageAdherence: mockPatientSummaries.reduce((sum, p) => sum + p.overallAdherence, 0) / mockPatientSummaries.length,
        highRiskPatients: mockPatientSummaries.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').length,
        pendingAlerts: mockPatientSummaries.reduce((sum, p) => sum + p.alertsCount, 0),
        culturalChallenges: mockPatientSummaries.filter(p => p.culturalFactors.length > 0).length,
        recentReports: Math.floor(Math.random() * 10) + 5
      };

      setDashboardMetrics(metrics);

      // Generate chart data
      const charts: ChartData = {
        adherenceTrends: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            data: [85, 82, 88, 90, 87, 84, 89]
          }]
        },
        riskDistribution: [
          { name: 'Low Risk', population: 45, color: '#4CAF50', legendFontColor: '#4CAF50', legendFontSize: 12 },
          { name: 'Medium Risk', population: 30, color: '#FF9800', legendFontColor: '#FF9800', legendFontSize: 12 },
          { name: 'High Risk', population: 20, color: '#F44336', legendFontColor: '#F44336', legendFontSize: 12 },
          { name: 'Critical', population: 5, color: '#9C27B0', legendFontColor: '#9C27B0', legendFontSize: 12 }
        ],
        culturalFactors: {
          labels: ['Prayer', 'Family', 'Language', 'Traditional'],
          datasets: [{
            data: [65, 80, 45, 35]
          }]
        }
      };

      setChartData(charts);

      // Get active alerts for provider
      const patientIds = mockPatientSummaries.map(p => p.patientId);
      const alerts = await clinicalEngine.generateClinicalAlertsForProvider(providerId, patientIds);
      setActiveAlerts(alerts);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [providerId, clinicalEngine, fhirService]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  // Load patient details
  const loadPatientDetails = useCallback(async (patientId: string) => {
    try {
      setIsLoading(true);

      // Mock data - in real implementation, this would fetch actual patient data
      const mockMedications: Medication[] = [];
      const mockAdherenceRecords: AdherenceRecord[] = [];

      const insights = await clinicalEngine.generateProviderInsights(
        patientId,
        providerId,
        mockMedications,
        mockAdherenceRecords
      );

      setSelectedInsight(insights);
      setShowPatientDetails(true);
    } catch (error) {
      console.error('Failed to load patient details:', error);
      Alert.alert('Error', 'Failed to load patient details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [providerId, clinicalEngine]);

  // Handle patient selection
  const handlePatientSelect = useCallback((patientId: string) => {
    setSelectedPatientId(patientId);
    loadPatientDetails(patientId);
    onPatientSelect?.(patientId);
  }, [loadPatientDetails, onPatientSelect]);

  // Handle export
  const handleExport = useCallback(async () => {
    if (!selectedPatientId) {
      Alert.alert('Error', 'Please select a patient first');
      return;
    }

    try {
      setIsExporting(true);

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // Last 30 days

      const exportResult = await exportService.exportAdherenceDataForProvider(
        selectedPatientId,
        providerId,
        startDate,
        endDate,
        exportFormat
      );

      setShowExportModal(false);
      onExportComplete?.(exportResult);

      Alert.alert(
        'Export Complete',
        `Data exported successfully as ${exportResult.filename}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', 'Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [selectedPatientId, providerId, exportFormat, exportService, onExportComplete]);

  // Acknowledge alert
  const handleAcknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      await clinicalEngine.acknowledgeClinicalAlert(alertId, providerId);
      setActiveAlerts(alerts => alerts.filter(alert => alert.id !== alertId));
      Alert.alert('Alert Acknowledged', 'Alert has been marked as acknowledged.');
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      Alert.alert('Error', 'Failed to acknowledge alert. Please try again.');
    }
  }, [providerId, clinicalEngine]);

  // Generate report
  const handleGenerateReport = useCallback(async () => {
    if (!selectedPatientId) {
      Alert.alert('Error', 'Please select a patient first');
      return;
    }

    try {
      setIsLoading(true);

      // Mock data for report generation
      const mockMedications: Medication[] = [];
      const mockAdherenceRecords: AdherenceRecord[] = [];

      const report = await reportGenerator.generateProviderReport(
        selectedPatientId,
        providerId,
        mockMedications,
        mockAdherenceRecords,
        {
          reportType: 'comprehensive',
          includeCulturalContext: true,
          includeInsights: true
        }
      );

      Alert.alert(
        'Report Generated',
        `Comprehensive report generated for patient. Report ID: ${report.id}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to generate report:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPatientId, providerId, reportGenerator]);

  // Initialize dashboard
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Render risk level badge
  const renderRiskBadge = (riskLevel: RiskLevel) => {
    const colors = {
      low: '#4CAF50',
      medium: '#FF9800',
      high: '#F44336',
      critical: '#9C27B0'
    };

    return (
      <View style={[styles.riskBadge, { backgroundColor: colors[riskLevel] }]}>
        <Text style={styles.riskBadgeText}>{riskLevel.toUpperCase()}</Text>
      </View>
    );
  };

  // Render consent status badge
  const renderConsentBadge = (status: 'active' | 'expired' | 'revoked') => {
    const colors = {
      active: '#4CAF50',
      expired: '#FF9800',
      revoked: '#F44336'
    };

    return (
      <View style={[styles.consentBadge, { backgroundColor: colors[status] }]}>
        <Text style={styles.consentBadgeText}>{status.toUpperCase()}</Text>
      </View>
    );
  };

  // Render patient summary card
  const renderPatientCard = (patient: PatientSummaryCard) => (
    <TouchableOpacity
      key={patient.patientId}
      style={[
        styles.patientCard,
        selectedPatientId === patient.patientId && styles.selectedPatientCard
      ]}
      onPress={() => handlePatientSelect(patient.patientId)}
    >
      <View style={styles.patientCardHeader}>
        <Text style={styles.patientName}>{patient.patientName}</Text>
        {renderConsentBadge(patient.consentStatus)}
      </View>

      <View style={styles.patientMetrics}>
        <Text style={styles.adherenceText}>
          Adherence: {patient.overallAdherence.toFixed(1)}%
        </Text>
        {renderRiskBadge(patient.riskLevel)}
      </View>

      <View style={styles.patientDetails}>
        <Text style={styles.alertsText}>
          {patient.alertsCount} pending alerts
        </Text>
        <Text style={styles.lastUpdateText}>
          Updated: {patient.lastUpdate.toLocaleDateString()}
        </Text>
      </View>

      {patient.culturalFactors.length > 0 && (
        <View style={styles.culturalFactors}>
          <Text style={styles.culturalFactorsTitle}>Cultural Factors:</Text>
          {patient.culturalFactors.map((factor, index) => (
            <Text key={index} style={styles.culturalFactorText}>• {factor}</Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  // Render alert card
  const renderAlertCard = (alert: ClinicalAlert) => (
    <View key={alert.id} style={[styles.alertCard, styles[`alert${alert.severity}`]]}>
      <View style={styles.alertHeader}>
        <Text style={styles.alertTitle}>{alert.title}</Text>
        <TouchableOpacity
          style={styles.acknowledgeButton}
          onPress={() => handleAcknowledgeAlert(alert.id)}
        >
          <Text style={styles.acknowledgeButtonText}>Acknowledge</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.alertMessage}>{alert.message}</Text>
      <Text style={styles.alertTime}>
        {alert.generatedAt.toLocaleString()}
      </Text>
    </View>
  );

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D9CDB" />
          <Text style={styles.loadingText}>Loading provider dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Dashboard Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Provider Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Malaysian Healthcare Data Platform
          </Text>
        </View>

        {/* Dashboard Metrics */}
        {dashboardMetrics && (
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{dashboardMetrics.totalPatients}</Text>
              <Text style={styles.metricLabel}>Total Patients</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {dashboardMetrics.averageAdherence.toFixed(1)}%
              </Text>
              <Text style={styles.metricLabel}>Avg Adherence</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{dashboardMetrics.highRiskPatients}</Text>
              <Text style={styles.metricLabel}>High Risk</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{dashboardMetrics.pendingAlerts}</Text>
              <Text style={styles.metricLabel}>Pending Alerts</Text>
            </View>
          </View>
        )}

        {/* Charts Section */}
        {chartData && (
          <View style={styles.chartsSection}>
            <Text style={styles.sectionTitle}>Analytics Overview</Text>

            {/* Adherence Trends */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Weekly Adherence Trends</Text>
              <LineChart
                data={chartData.adherenceTrends}
                width={screenWidth - 40}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </View>

            {/* Risk Distribution */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Patient Risk Distribution</Text>
              <PieChart
                data={chartData.riskDistribution}
                width={screenWidth - 40}
                height={220}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
              />
            </View>

            {/* Cultural Factors */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Cultural Factors Impact (%)</Text>
              <BarChart
                data={chartData.culturalFactors}
                width={screenWidth - 40}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
              />
            </View>
          </View>
        )}

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <View style={styles.alertsSection}>
            <Text style={styles.sectionTitle}>Active Clinical Alerts</Text>
            {activeAlerts.slice(0, 5).map(renderAlertCard)}
          </View>
        )}

        {/* Patient List */}
        <View style={styles.patientsSection}>
          <View style={styles.patientsSectionHeader}>
            <Text style={styles.sectionTitle}>Patient Overview</Text>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowExportModal(true)}
              disabled={!selectedPatientId}
            >
              <Text style={styles.actionButtonText}>Export Data</Text>
            </TouchableOpacity>
          </View>

          {patientSummaries.map(renderPatientCard)}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleGenerateReport}
            disabled={!selectedPatientId}
          >
            <Text style={styles.primaryButtonText}>Generate Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Export Patient Data</Text>

            <Text style={styles.modalLabel}>Export Format:</Text>
            <View style={styles.formatOptions}>
              {[
                { value: 'fhir_json', label: 'FHIR JSON' },
                { value: 'pdf_report', label: 'PDF Report' },
                { value: 'csv_data', label: 'CSV Data' }
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.formatOption,
                    exportFormat === option.value && styles.selectedFormatOption
                  ]}
                  onPress={() => setExportFormat(option.value as any)}
                >
                  <Text style={[
                    styles.formatOptionText,
                    exportFormat === option.value && styles.selectedFormatOptionText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowExportModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalExportButton}
                onPress={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalExportButtonText}>Export</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Patient Details Modal */}
      <Modal
        visible={showPatientDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPatientDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.patientDetailsModal}>
            <ScrollView>
              <Text style={styles.modalTitle}>Patient Clinical Insights</Text>

              {selectedInsight && (
                <View style={styles.insightContent}>
                  <View style={styles.insightSection}>
                    <Text style={styles.insightSectionTitle}>Overall Risk Assessment</Text>
                    {renderRiskBadge(selectedInsight.overallRiskLevel)}
                  </View>

                  <View style={styles.insightSection}>
                    <Text style={styles.insightSectionTitle}>Key Insights</Text>
                    {selectedInsight.keyInsights.slice(0, 3).map((insight, index) => (
                      <View key={index} style={styles.insightItem}>
                        <Text style={styles.insightTitle}>{insight.title}</Text>
                        <Text style={styles.insightDescription}>{insight.description}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.insightSection}>
                    <Text style={styles.insightSectionTitle}>Cultural Profile</Text>
                    <Text style={styles.culturalText}>
                      Primary Language: {selectedInsight.culturalProfile.linguisticFactors.primaryLanguage}
                    </Text>
                    <Text style={styles.culturalText}>
                      Family Support: {selectedInsight.culturalProfile.familyDynamics.supportLevel}
                    </Text>
                    <Text style={styles.culturalText}>
                      Prayer Time Considerations: {selectedInsight.culturalProfile.religiousConsiderations.prayerTimeConflicts ? 'Yes' : 'No'}
                    </Text>
                  </View>

                  <View style={styles.insightSection}>
                    <Text style={styles.insightSectionTitle}>Recommended Actions</Text>
                    {selectedInsight.recommendedActions.slice(0, 3).map((action, index) => (
                      <View key={index} style={styles.recommendationItem}>
                        <Text style={styles.recommendationAction}>{action.action}</Text>
                        <Text style={styles.recommendationRationale}>{action.rationale}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPatientDetails(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2D9CDB',
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 4,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricCard: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D9CDB',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  chartsSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 16,
  },
  alertsSection: {
    margin: 16,
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  alertlow: {
    borderLeftColor: '#4CAF50',
  },
  alertmedium: {
    borderLeftColor: '#FF9800',
  },
  alerthigh: {
    borderLeftColor: '#F44336',
  },
  alertcritical: {
    borderLeftColor: '#9C27B0',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  acknowledgeButton: {
    backgroundColor: '#2D9CDB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  acknowledgeButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  alertTime: {
    fontSize: 12,
    color: '#999',
  },
  patientsSection: {
    margin: 16,
  },
  patientsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  patientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedPatientCard: {
    borderColor: '#2D9CDB',
    borderWidth: 2,
  },
  patientCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  patientMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adherenceText: {
    fontSize: 16,
    color: '#2D9CDB',
    fontWeight: '500',
  },
  patientDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  alertsText: {
    fontSize: 14,
    color: '#F44336',
  },
  lastUpdateText: {
    fontSize: 14,
    color: '#666',
  },
  culturalFactors: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  culturalFactorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  culturalFactorText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  consentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  consentBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionsContainer: {
    padding: 16,
  },
  actionButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D9CDB',
  },
  actionButtonText: {
    color: '#2D9CDB',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#2D9CDB',
    borderColor: '#2D9CDB',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  formatOptions: {
    marginBottom: 24,
  },
  formatOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  selectedFormatOption: {
    borderColor: '#2D9CDB',
    backgroundColor: '#f0f8ff',
  },
  formatOptionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  selectedFormatOptionText: {
    color: '#2D9CDB',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalExportButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2D9CDB',
    marginLeft: 8,
  },
  modalExportButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  patientDetailsModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '95%',
    maxHeight: '80%',
  },
  insightContent: {
    marginBottom: 20,
  },
  insightSection: {
    marginBottom: 20,
  },
  insightSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  insightItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 12,
    color: '#666',
  },
  culturalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  recommendationItem: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 4,
  },
  recommendationRationale: {
    fontSize: 12,
    color: '#666',
  },
  modalCloseButton: {
    backgroundColor: '#2D9CDB',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ProviderDashboard;