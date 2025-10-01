/**
 * Privacy Controls Hook
 * Manages privacy settings and data visibility for family dashboard integration
 * Ensures PDPA compliance and cultural appropriateness
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../useAuth';
import { useTranslation } from 'react-i18next';
import {
  privacyManager,
  PrivacySettings,
  DataCategory,
  VisibilityLevel,
  FamilyMemberPermission,
  PDPAConsent,
  FHIRSharingSettings
} from '../../services/family/PrivacyManager';
import { culturalFamilyPatterns } from '../../services/family/CulturalFamilyPatterns';
import { fhirFamilyIntegration } from '../../services/fhir/FamilyIntegration';

export interface PrivacyControlsState {
  settings: PrivacySettings | null;
  loading: boolean;
  error: string | null;
  pdpaCompliant: boolean;
  culturallyValidated: boolean;
  fhirSharingEnabled: boolean;
  auditTrailAvailable: boolean;
}

export interface DataVisibilityFilter {
  category: DataCategory;
  visible: boolean;
  reason?: string;
}

export interface PrivacyActions {
  updateDataVisibility: (category: DataCategory, visibility: VisibilityLevel) => Promise<void>;
  grantFamilyMemberAccess: (memberId: string, permissions: string[]) => Promise<void>;
  revokeFamilyMemberAccess: (memberId: string) => Promise<void>;
  updatePDPAConsent: (consent: Partial<PDPAConsent>) => Promise<void>;
  enableFHIRSharing: (providerId: string, settings: FHIRSharingSettings) => Promise<void>;
  disableFHIRSharing: (providerId: string) => Promise<void>;
  checkDataAccess: (memberId: string, category: DataCategory) => boolean;
  filterVisibleData: (data: any[], category: DataCategory) => any[];
  generatePrivacyReport: () => Promise<void>;
  exportAuditTrail: (startDate: Date, endDate: Date) => Promise<void>;
}

export function usePrivacyControls(
  familyId: string,
  userId?: string
): PrivacyControlsState & PrivacyActions {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const currentUserId = userId || user?.id;

  const [state, setState] = useState<PrivacyControlsState>({
    settings: null,
    loading: true,
    error: null,
    pdpaCompliant: false,
    culturallyValidated: false,
    fhirSharingEnabled: false,
    auditTrailAvailable: false
  });

  // Load privacy settings
  useEffect(() => {
    loadPrivacySettings();
  }, [familyId, currentUserId]);

  const loadPrivacySettings = async () => {
    if (!currentUserId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const settings = await privacyManager.getPrivacySettings(currentUserId, familyId);

      // Validate PDPA compliance
      const pdpaStatus = await privacyManager.checkPDPACompliance(settings);

      // Validate cultural appropriateness
      const culturalValidation = await culturalFamilyPatterns.validatePrivacySettings(
        settings,
        i18n.language
      );

      // Check FHIR sharing status
      const fhirStatus = settings.fhirSharing?.some(s => s.enabled) || false;

      // Check audit trail availability
      const auditAvailable = await privacyManager.isAuditTrailAvailable(familyId);

      setState({
        settings,
        loading: false,
        error: null,
        pdpaCompliant: pdpaStatus.compliant,
        culturallyValidated: culturalValidation.valid,
        fhirSharingEnabled: fhirStatus,
        auditTrailAvailable: auditAvailable
      });
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: t('privacy.loadError')
      }));
    }
  };

  // Update data visibility for a category
  const updateDataVisibility = useCallback(async (
    category: DataCategory,
    visibility: VisibilityLevel
  ): Promise<void> => {
    if (!state.settings || !currentUserId) return;

    try {
      // Validate cultural appropriateness
      const culturalCheck = await culturalFamilyPatterns.validateDataSharing(
        category,
        visibility,
        state.settings.culturalPreferences
      );

      if (!culturalCheck.allowed) {
        Alert.alert(
          t('privacy.culturalWarning'),
          culturalCheck.reason || t('privacy.culturalRestriction'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.proceed'),
              onPress: async () => {
                await performVisibilityUpdate(category, visibility);
              }
            }
          ]
        );
      } else {
        await performVisibilityUpdate(category, visibility);
      }
    } catch (error) {
      console.error('Failed to update data visibility:', error);
      Alert.alert(t('error.title'), t('privacy.updateError'));
    }
  }, [state.settings, currentUserId, t]);

  const performVisibilityUpdate = async (
    category: DataCategory,
    visibility: VisibilityLevel
  ): Promise<void> => {
    if (!state.settings || !currentUserId) return;

    const updatedSettings = {
      ...state.settings,
      dataCategories: state.settings.dataCategories.map(cat =>
        cat.category === category
          ? { ...cat, visibility }
          : cat
      )
    };

    await privacyManager.updatePrivacySettings(currentUserId, familyId, updatedSettings);

    // Audit the change
    await privacyManager.auditPrivacyChange({
      userId: currentUserId,
      familyId,
      action: 'visibility_updated',
      category,
      oldValue: state.settings.dataCategories.find(c => c.category === category)?.visibility,
      newValue: visibility,
      timestamp: new Date()
    });

    await loadPrivacySettings();
  };

  // Grant family member access
  const grantFamilyMemberAccess = useCallback(async (
    memberId: string,
    permissions: string[]
  ): Promise<void> => {
    if (!state.settings || !currentUserId) return;

    try {
      // Check cultural hierarchy
      const hierarchyCheck = await culturalFamilyPatterns.checkFamilyHierarchy(
        currentUserId,
        memberId,
        familyId
      );

      if (!hierarchyCheck.canGrantAccess) {
        Alert.alert(
          t('privacy.hierarchyError'),
          t('privacy.insufficientAuthority')
        );
        return;
      }

      const memberPermission: FamilyMemberPermission = {
        memberId,
        relationship: hierarchyCheck.relationship,
        permissions: permissions.map(p => ({
          resource: p,
          actions: ['view'],
          culturalOverride: false
        })),
        culturalRole: hierarchyCheck.culturalRole,
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      };

      await privacyManager.grantMemberAccess(familyId, memberPermission);

      // Audit the grant
      await privacyManager.auditPrivacyChange({
        userId: currentUserId,
        familyId,
        action: 'access_granted',
        targetUserId: memberId,
        permissions,
        timestamp: new Date()
      });

      await loadPrivacySettings();

      Alert.alert(t('success'), t('privacy.accessGranted'));
    } catch (error) {
      console.error('Failed to grant member access:', error);
      Alert.alert(t('error.title'), t('privacy.grantError'));
    }
  }, [state.settings, currentUserId, familyId, t]);

  // Revoke family member access
  const revokeFamilyMemberAccess = useCallback(async (
    memberId: string
  ): Promise<void> => {
    if (!currentUserId) return;

    try {
      await privacyManager.revokeMemberAccess(familyId, memberId);

      // Audit the revocation
      await privacyManager.auditPrivacyChange({
        userId: currentUserId,
        familyId,
        action: 'access_revoked',
        targetUserId: memberId,
        timestamp: new Date()
      });

      await loadPrivacySettings();

      Alert.alert(t('success'), t('privacy.accessRevoked'));
    } catch (error) {
      console.error('Failed to revoke member access:', error);
      Alert.alert(t('error.title'), t('privacy.revokeError'));
    }
  }, [currentUserId, familyId, t]);

  // Update PDPA consent
  const updatePDPAConsent = useCallback(async (
    consent: Partial<PDPAConsent>
  ): Promise<void> => {
    if (!state.settings || !currentUserId) return;

    try {
      const updatedConsent = {
        ...state.settings.pdpaConsent,
        ...consent,
        lastReviewDate: new Date(),
        nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      };

      await privacyManager.updatePDPAConsent(currentUserId, familyId, updatedConsent);

      // Audit consent update
      await privacyManager.auditPrivacyChange({
        userId: currentUserId,
        familyId,
        action: 'consent_updated',
        consentChanges: consent,
        timestamp: new Date()
      });

      await loadPrivacySettings();

      Alert.alert(t('success'), t('privacy.consentUpdated'));
    } catch (error) {
      console.error('Failed to update PDPA consent:', error);
      Alert.alert(t('error.title'), t('privacy.consentError'));
    }
  }, [state.settings, currentUserId, familyId, t]);

  // Enable FHIR sharing with provider
  const enableFHIRSharing = useCallback(async (
    providerId: string,
    settings: FHIRSharingSettings
  ): Promise<void> => {
    if (!currentUserId) return;

    try {
      // Validate provider and get consent requirements
      const providerInfo = await fhirFamilyIntegration.getProviderInfo(providerId);

      if (providerInfo.requiresSpecialConsent) {
        Alert.alert(
          t('privacy.specialConsent'),
          t('privacy.providerConsentRequired', { provider: providerInfo.name }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.agree'),
              onPress: async () => {
                await performFHIRSharingUpdate(providerId, settings);
              }
            }
          ]
        );
      } else {
        await performFHIRSharingUpdate(providerId, settings);
      }
    } catch (error) {
      console.error('Failed to enable FHIR sharing:', error);
      Alert.alert(t('error.title'), t('privacy.fhirError'));
    }
  }, [currentUserId, familyId, t]);

  const performFHIRSharingUpdate = async (
    providerId: string,
    settings: FHIRSharingSettings
  ): Promise<void> => {
    await fhirFamilyIntegration.enableProviderSharing(
      familyId,
      providerId,
      settings
    );

    // Audit FHIR sharing enablement
    await privacyManager.auditPrivacyChange({
      userId: currentUserId!,
      familyId,
      action: 'fhir_sharing_enabled',
      providerId,
      sharingLevel: settings.sharingLevel,
      timestamp: new Date()
    });

    await loadPrivacySettings();

    Alert.alert(t('success'), t('privacy.fhirEnabled'));
  };

  // Disable FHIR sharing with provider
  const disableFHIRSharing = useCallback(async (
    providerId: string
  ): Promise<void> => {
    if (!currentUserId) return;

    try {
      await fhirFamilyIntegration.disableProviderSharing(familyId, providerId);

      // Audit FHIR sharing disablement
      await privacyManager.auditPrivacyChange({
        userId: currentUserId,
        familyId,
        action: 'fhir_sharing_disabled',
        providerId,
        timestamp: new Date()
      });

      await loadPrivacySettings();

      Alert.alert(t('success'), t('privacy.fhirDisabled'));
    } catch (error) {
      console.error('Failed to disable FHIR sharing:', error);
      Alert.alert(t('error.title'), t('privacy.fhirError'));
    }
  }, [currentUserId, familyId, t]);

  // Check if a family member has access to a data category
  const checkDataAccess = useCallback((
    memberId: string,
    category: DataCategory
  ): boolean => {
    if (!state.settings) return false;

    // Check category visibility
    const categorySettings = state.settings.dataCategories.find(
      c => c.category === category
    );

    if (!categorySettings) return false;

    // Check if member has specific access
    const memberPermission = state.settings.familyMemberPermissions.find(
      p => p.memberId === memberId
    );

    if (!memberPermission) {
      // Check general visibility level
      return categorySettings.visibility === 'family_only' ||
             categorySettings.visibility === 'public';
    }

    // Check specific permissions
    return memberPermission.permissions.some(
      p => p.resource === category && p.actions.includes('view')
    );
  }, [state.settings]);

  // Filter data based on privacy settings
  const filterVisibleData = useCallback(<T extends any>(
    data: T[],
    category: DataCategory
  ): T[] => {
    if (!state.settings) return [];

    const categorySettings = state.settings.dataCategories.find(
      c => c.category === category
    );

    if (!categorySettings) return [];

    // Apply visibility filtering based on current user's role
    switch (categorySettings.visibility) {
      case 'private':
        return currentUserId === state.settings.userId ? data : [];
      case 'family_only':
        // Check if current user is a family member
        return state.settings.familyMemberPermissions.some(
          p => p.memberId === currentUserId
        ) ? data : [];
      case 'caregivers_only':
        // Check if current user is a caregiver
        return state.settings.familyMemberPermissions.some(
          p => p.memberId === currentUserId &&
               p.culturalRole?.includes('caregiver')
        ) ? data : [];
      case 'healthcare_providers':
        // Include family and healthcare providers
        return data;
      case 'public':
        return data;
      default:
        return [];
    }
  }, [state.settings, currentUserId]);

  // Generate privacy compliance report
  const generatePrivacyReport = useCallback(async (): Promise<void> => {
    if (!currentUserId) return;

    try {
      const report = await privacyManager.generatePrivacyReport(
        familyId,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        new Date()
      );

      // Save report or share
      Alert.alert(
        t('privacy.reportGenerated'),
        t('privacy.reportDescription'),
        [
          { text: t('common.share'), onPress: () => shareReport(report) },
          { text: t('common.save'), onPress: () => saveReport(report) },
          { text: t('common.close') }
        ]
      );
    } catch (error) {
      console.error('Failed to generate privacy report:', error);
      Alert.alert(t('error.title'), t('privacy.reportError'));
    }
  }, [currentUserId, familyId, t]);

  // Export audit trail for PDPA compliance
  const exportAuditTrail = useCallback(async (
    startDate: Date,
    endDate: Date
  ): Promise<void> => {
    if (!currentUserId) return;

    try {
      const auditData = await privacyManager.exportAuditTrail(
        familyId,
        startDate,
        endDate
      );

      // Process export
      Alert.alert(
        t('privacy.auditExported'),
        t('privacy.auditDescription', {
          count: auditData.entries.length,
          period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
        }),
        [
          { text: t('common.share'), onPress: () => shareAuditTrail(auditData) },
          { text: t('common.save'), onPress: () => saveAuditTrail(auditData) },
          { text: t('common.close') }
        ]
      );
    } catch (error) {
      console.error('Failed to export audit trail:', error);
      Alert.alert(t('error.title'), t('privacy.auditError'));
    }
  }, [currentUserId, familyId, t]);

  // Helper functions for report/audit sharing
  const shareReport = async (report: any) => {
    // Implementation for sharing report via native share sheet
    console.log('Share report:', report);
  };

  const saveReport = async (report: any) => {
    // Implementation for saving report to device
    console.log('Save report:', report);
  };

  const shareAuditTrail = async (auditData: any) => {
    // Implementation for sharing audit trail
    console.log('Share audit trail:', auditData);
  };

  const saveAuditTrail = async (auditData: any) => {
    // Implementation for saving audit trail
    console.log('Save audit trail:', auditData);
  };

  // Calculate privacy health score
  const privacyHealthScore = useMemo(() => {
    if (!state.settings) return 0;

    let score = 0;
    const factors = {
      pdpaCompliant: 25,
      culturallyValidated: 25,
      consentUpToDate: 20,
      granularPermissions: 15,
      auditTrailActive: 15
    };

    if (state.pdpaCompliant) score += factors.pdpaCompliant;
    if (state.culturallyValidated) score += factors.culturallyValidated;

    // Check consent recency
    const consentAge = Date.now() - new Date(state.settings.pdpaConsent.consentDate).getTime();
    if (consentAge < 90 * 24 * 60 * 60 * 1000) { // Less than 90 days
      score += factors.consentUpToDate;
    }

    // Check granular permissions
    if (state.settings.familyMemberPermissions.length > 0) {
      score += factors.granularPermissions;
    }

    if (state.auditTrailAvailable) score += factors.auditTrailActive;

    return score;
  }, [state]);

  return {
    // State
    ...state,
    privacyHealthScore,

    // Actions
    updateDataVisibility,
    grantFamilyMemberAccess,
    revokeFamilyMemberAccess,
    updatePDPAConsent,
    enableFHIRSharing,
    disableFHIRSharing,
    checkDataAccess,
    filterVisibleData,
    generatePrivacyReport,
    exportAuditTrail
  };
}

export default usePrivacyControls;