/**
 * Adherence Intervention Banner Component
 *
 * Displays a warning banner when user's medication adherence is below 60%.
 * Provides a call-to-action to view educational content about medication adherence.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import { educationService } from '@/services/educationService';

interface InterventionBanner {
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action: {
    label: string;
    screen: string;
    params: Record<string, any>;
  };
}

export const AdherenceInterventionBanner: React.FC = () => {
  const navigation = useNavigation();
  const [banner, setBanner] = useState<InterventionBanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadBanner();
  }, []);

  const loadBanner = async () => {
    try {
      setLoading(true);
      const interventionBanner = await educationService.getAdherenceInterventionBanner();
      setBanner(interventionBanner);
    } catch (error) {
      console.error('[AdherenceInterventionBanner] Error loading banner:', error);
      setBanner(null);
    } finally {
      setLoading(false);
    }
  };

  const handleActionPress = () => {
    if (banner) {
      navigation.navigate(banner.action.screen as never, banner.action.params as never);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (!banner || dismissed) {
    return null;
  }

  const bannerStyles = [
    styles.banner,
    banner.type === 'warning' && styles.warningBanner,
    banner.type === 'info' && styles.infoBanner,
    banner.type === 'success' && styles.successBanner,
  ];

  return (
    <View style={bannerStyles}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>
          {banner.type === 'warning' ? '⚠️' : banner.type === 'info' ? 'ℹ️' : '✅'}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{banner.title}</Text>
        <Text style={styles.message}>{banner.message}</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleActionPress}
            accessibilityRole="button"
            accessibilityLabel={banner.action.label}
          >
            <Text style={styles.actionText}>{banner.action.label}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          >
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  warningBanner: {
    backgroundColor: '#FFF3E0', // Light orange background
    borderLeftWidth: 4,
    borderLeftColor: '#F57C00', // Dark orange border
  },
  infoBanner: {
    backgroundColor: '#E3F2FD', // Light blue background
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3', // Blue border
  },
  successBanner: {
    backgroundColor: '#E8F5E9', // Light green background
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50', // Green border
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  icon: {
    fontSize: 32,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
    marginBottom: 8,
    lineHeight: 24,
  },
  message: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.normal,
    color: COLORS.gray[700],
    marginBottom: 16,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#F57C00', // Dark orange for warning
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minHeight: 48, // Large touch target for elderly users
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.white,
  },
  dismissButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    minHeight: 48, // Large touch target for elderly users
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[600],
  },
});
