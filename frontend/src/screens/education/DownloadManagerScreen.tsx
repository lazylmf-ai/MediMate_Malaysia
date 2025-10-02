/**
 * Download Manager Screen
 *
 * Screen for managing offline content downloads with:
 * - Storage statistics card showing used/available space
 * - List of all downloaded content
 * - Pull-to-refresh functionality
 * - Delete content with confirmation dialog
 * - Empty state when no downloads
 * - Multi-language support (MS/EN/ZH/TA)
 * - Large touch targets (56px min height) for elderly users
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { offlineStorageService } from '@/services/offlineStorageService';
import { StorageStatsCard } from '@/components/education/StorageStatsCard';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import { getRemainingDays, formatBytes } from '@/utils/storageUtils';
import type { CachedContent, EducationStorageStats } from '@/types/offline';

interface DownloadManagerScreenProps {
  navigation: any;
  route: {
    params?: {
      language?: 'ms' | 'en' | 'zh' | 'ta';
    };
  };
}

export default function DownloadManagerScreen({
  navigation,
  route,
}: DownloadManagerScreenProps) {
  const language = route.params?.language || 'en';

  const [downloads, setDownloads] = useState<CachedContent[]>([]);
  const [storageStats, setStorageStats] = useState<EducationStorageStats>({
    used: 0,
    available: 0,
    total: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load downloads and storage stats
  const loadData = useCallback(async () => {
    try {
      const [cachedContent, stats] = await Promise.all([
        offlineStorageService.getAllCachedContent(),
        offlineStorageService.getStorageStats(),
      ]);

      setDownloads(cachedContent);
      setStorageStats(stats);
    } catch (error) {
      console.error('[DownloadManager] Failed to load data:', error);
      Alert.alert(
        getErrorTitle(),
        getErrorMessage(),
        [{ text: getOkText() }]
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Delete content handler
  const handleDelete = useCallback(
    async (contentId: string, title: string) => {
      Alert.alert(
        getDeleteTitle(),
        getDeleteMessage(title),
        [
          {
            text: getCancelText(),
            style: 'cancel',
          },
          {
            text: getDeleteText(),
            style: 'destructive',
            onPress: async () => {
              try {
                await offlineStorageService.deleteContent(contentId);
                await loadData();
              } catch (error) {
                console.error('[DownloadManager] Failed to delete:', error);
                Alert.alert(getErrorTitle(), getErrorMessage());
              }
            },
          },
        ]
      );
    },
    [loadData, language]
  );

  // Multi-language text functions
  const getTitle = () => {
    switch (language) {
      case 'ms':
        return 'Muat Turun';
      case 'zh':
        return '下载管理';
      case 'ta':
        return 'பதிவிறக்க மேலாளர்';
      default:
        return 'Downloads';
    }
  };

  const getEmptyTitle = () => {
    switch (language) {
      case 'ms':
        return 'Tiada Muat Turun';
      case 'zh':
        return '无下载内容';
      case 'ta':
        return 'பதிவிறக்கங்கள் இல்லை';
      default:
        return 'No Downloads';
    }
  };

  const getEmptyMessage = () => {
    switch (language) {
      case 'ms':
        return 'Muat turun artikel dan video untuk akses luar talian';
      case 'zh':
        return '下载文章和视频以供离线访问';
      case 'ta':
        return 'ஆஃப்லைன் அணுகலுக்கு கட்டுரைகள் மற்றும் வீடியோக்களைப் பதிவிறக்கவும்';
      default:
        return 'Download articles and videos for offline access';
    }
  };

  const getDeleteTitle = () => {
    switch (language) {
      case 'ms':
        return 'Padam Kandungan';
      case 'zh':
        return '删除内容';
      case 'ta':
        return 'உள்ளடக்கத்தை நீக்கு';
      default:
        return 'Delete Content';
    }
  };

  const getDeleteMessage = (title: string) => {
    switch (language) {
      case 'ms':
        return `Adakah anda pasti mahu memadam "${title}"?`;
      case 'zh':
        return `您确定要删除"${title}"吗？`;
      case 'ta':
        return `"${title}" ஐ நீக்க விரும்புகிறீர்களா?`;
      default:
        return `Are you sure you want to delete "${title}"?`;
    }
  };

  const getCancelText = () => {
    switch (language) {
      case 'ms':
        return 'Batal';
      case 'zh':
        return '取消';
      case 'ta':
        return 'ரத்துசெய்';
      default:
        return 'Cancel';
    }
  };

  const getDeleteText = () => {
    switch (language) {
      case 'ms':
        return 'Padam';
      case 'zh':
        return '删除';
      case 'ta':
        return 'நீக்கு';
      default:
        return 'Delete';
    }
  };

  const getOkText = () => {
    switch (language) {
      case 'ms':
        return 'OK';
      case 'zh':
        return '确定';
      case 'ta':
        return 'சரி';
      default:
        return 'OK';
    }
  };

  const getErrorTitle = () => {
    switch (language) {
      case 'ms':
        return 'Ralat';
      case 'zh':
        return '错误';
      case 'ta':
        return 'பிழை';
      default:
        return 'Error';
    }
  };

  const getErrorMessage = () => {
    switch (language) {
      case 'ms':
        return 'Tidak dapat memuatkan muat turun. Sila cuba lagi.';
      case 'zh':
        return '无法加载下载。请重试。';
      case 'ta':
        return 'பதிவிறக்கங்களை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.';
      default:
        return 'Failed to load downloads. Please try again.';
    }
  };

  const getContentTypeLabel = (type: 'article' | 'video') => {
    if (type === 'video') {
      switch (language) {
        case 'ms':
          return 'Video';
        case 'zh':
          return '视频';
        case 'ta':
          return 'வீடியோ';
        default:
          return 'Video';
      }
    } else {
      switch (language) {
        case 'ms':
          return 'Artikel';
        case 'zh':
          return '文章';
        case 'ta':
          return 'கட்டுரை';
        default:
          return 'Article';
      }
    }
  };

  const getExpiresLabel = () => {
    switch (language) {
      case 'ms':
        return 'Tamat tempoh';
      case 'zh':
        return '到期';
      case 'ta':
        return 'காலாவதியாகும்';
      default:
        return 'Expires';
    }
  };

  const getDaysLabel = (days: number) => {
    switch (language) {
      case 'ms':
        return days === 1 ? 'hari' : 'hari';
      case 'zh':
        return '天';
      case 'ta':
        return days === 1 ? 'நாள்' : 'நாட்கள்';
      default:
        return days === 1 ? 'day' : 'days';
    }
  };

  // Render item
  const renderItem = ({ item }: { item: CachedContent }) => {
    const title = item.metadata.title[language] || item.metadata.title.en || 'Untitled';
    const remainingDays = getRemainingDays(item.expiresAt);

    return (
      <View style={styles.downloadItem}>
        <View style={styles.itemIconContainer}>
          <Icon
            name={item.type === 'video' ? 'video-library' : 'article'}
            size={32}
            color={COLORS.primary}
          />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.itemMeta}>
            {getContentTypeLabel(item.type)} · {formatBytes(item.metadata.size)}
          </Text>
          <Text style={styles.itemExpiry}>
            {getExpiresLabel()}: {remainingDays} {getDaysLabel(remainingDays)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id, title)}
          accessibilityLabel={`${getDeleteText()} ${title}`}
          accessibilityRole="button"
        >
          <Icon name="delete" size={24} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    );
  };

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="cloud-download" size={80} color={COLORS.gray[300]} />
      <Text style={styles.emptyTitle}>{getEmptyTitle()}</Text>
      <Text style={styles.emptyMessage}>{getEmptyMessage()}</Text>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getTitle()}</Text>
      </View>

      {/* Storage Stats Card */}
      <View style={styles.statsContainer}>
        <StorageStatsCard stats={storageStats} language={language} />
      </View>

      {/* Downloads List */}
      <FlatList
        data={downloads}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          downloads.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      />
    </SafeAreaView>
  );
}

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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  downloadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    minHeight: 56,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
    marginBottom: 2,
  },
  itemExpiry: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[500],
  },
  deleteButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[700],
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 24,
  },
});
