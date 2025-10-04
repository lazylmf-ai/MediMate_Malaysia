/**
 * Achievement Grid Component
 *
 * Displays all achievements in a grid layout with earned and locked badges.
 * Responsive grid layout (2 columns on mobile, 3-4 on tablet).
 * Large touch targets for elderly users.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { AchievementBadge } from './AchievementBadge';
import { gamificationService } from '@/services/gamificationService';
import type { Badge } from '@/types/education';
import { useAppSelector } from '@/store/hooks';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

interface AchievementGridProps {
  onBadgePress?: (badge: Badge) => void;
}

export const AchievementGrid: React.FC<AchievementGridProps> = ({ onBadgePress }) => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAppSelector((state) => state.cultural);
  const language = profile?.language || 'en';
  const { width } = useWindowDimensions();

  // Determine number of columns based on screen width
  const columns = width > 768 ? 3 : 2; // 3 columns on tablet, 2 on mobile

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      setError(null);
      const allBadges = await gamificationService.getAllAchievements();
      setBadges(allBadges);
    } catch (err) {
      console.error('Error loading achievements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  // Group badges into earned and locked
  const earnedBadges = badges.filter((badge) => badge.earnedAt);
  const lockedBadges = badges.filter((badge) => !badge.earnedAt);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {language === 'ms' && 'Memuatkan pencapaian...'}
          {language === 'en' && 'Loading achievements...'}
          {language === 'zh' && '加载成就中...'}
          {language === 'ta' && 'சாதனைகளை ஏற்றுகிறது...'}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {language === 'ms' && 'Gagal memuatkan pencapaian'}
          {language === 'en' && 'Failed to load achievements'}
          {language === 'zh' && '无法加载成就'}
          {language === 'ta' && 'சாதனைகளை ஏற்ற முடியவில்லை'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAchievements}>
          <Text style={styles.retryButtonText}>
            {language === 'ms' && 'Cuba Lagi'}
            {language === 'en' && 'Retry'}
            {language === 'zh' && '重试'}
            {language === 'ta' && 'மீண்டும் முயற்சிக்கவும்'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{earnedBadges.length}</Text>
          <Text style={styles.statLabel}>
            {language === 'ms' && 'Dicapai'}
            {language === 'en' && 'Earned'}
            {language === 'zh' && '已获得'}
            {language === 'ta' && 'பெற்றவை'}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{lockedBadges.length}</Text>
          <Text style={styles.statLabel}>
            {language === 'ms' && 'Belum Dicapai'}
            {language === 'en' && 'Locked'}
            {language === 'zh' && '未解锁'}
            {language === 'ta' && 'பூட்டப்பட்டவை'}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{badges.length}</Text>
          <Text style={styles.statLabel}>
            {language === 'ms' && 'Jumlah'}
            {language === 'en' && 'Total'}
            {language === 'zh' && '总计'}
            {language === 'ta' && 'மொத்தம்'}
          </Text>
        </View>
      </View>

      {/* Earned Badges Section */}
      {earnedBadges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'ms' && 'Pencapaian Anda'}
            {language === 'en' && 'Your Achievements'}
            {language === 'zh' && '您的成就'}
            {language === 'ta' && 'உங்கள் சாதனைகள்'}
          </Text>
          <View style={[styles.grid, { flexDirection: 'column' }]}>
            {earnedBadges.map((badge) => (
              <TouchableOpacity
                key={badge.id}
                onPress={() => onBadgePress?.(badge)}
                activeOpacity={0.7}
              >
                <AchievementBadge badge={badge} showDate={true} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Locked Badges Section */}
      {lockedBadges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'ms' && 'Belum Dicapai'}
            {language === 'en' && 'Locked Achievements'}
            {language === 'zh' && '未解锁成就'}
            {language === 'ta' && 'பூட்டப்பட்ட சாதனைகள்'}
          </Text>
          <View style={[styles.grid, { flexDirection: 'column' }]}>
            {lockedBadges.map((badge) => (
              <TouchableOpacity
                key={badge.id}
                onPress={() => onBadgePress?.(badge)}
                activeOpacity={0.7}
              >
                <AchievementBadge badge={badge} showDate={false} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Empty State */}
      {badges.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyText}>
            {language === 'ms' && 'Tiada pencapaian lagi'}
            {language === 'en' && 'No achievements yet'}
            {language === 'zh' && '暂无成就'}
            {language === 'ta' && 'இன்னும் சாதனைகள் இல்லை'}
          </Text>
        </View>
      )}
    </ScrollView>
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
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 48, // Large touch target for elderly users
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: COLORS.white,
    marginBottom: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSizes['3xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    marginBottom: 16,
  },
  grid: {
    gap: 0, // Individual badges have their own margin
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
});
