/**
 * Download Button Component
 *
 * Button component for downloading educational content with:
 * - Three states: Download, Downloading (with progress %), Downloaded
 * - Subscribe to download progress events
 * - Handle download errors with Alert
 * - Show delete option when downloaded
 * - Icon-based UI (download icon, check icon, progress indicator)
 * - Multi-language support
 * - Large touch targets for elderly users
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  StyleSheet,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { offlineStorageService } from '@/services/offlineStorageService';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import type { DownloadProgress } from '@/types/offline';

interface DownloadButtonProps {
  contentId: string;
  contentType: 'article' | 'video';
  downloadUrl: string;
  metadata?: {
    title: Record<string, string>;
    size: number;
    duration?: number;
  };
  language?: 'ms' | 'en' | 'zh' | 'ta';
  onDownloadComplete?: () => void;
  onDeleteComplete?: () => void;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  contentId,
  contentType,
  downloadUrl,
  metadata = {
    title: { en: 'Content' },
    size: 0,
  },
  language = 'en',
  onDownloadComplete,
  onDeleteComplete,
}) => {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Check download status on mount
  useEffect(() => {
    checkDownloadStatus();
  }, [contentId]);

  const checkDownloadStatus = async () => {
    try {
      const cached = await offlineStorageService.isContentCached(contentId);
      setIsDownloaded(cached);
    } catch (error) {
      console.error('[DownloadButton] Failed to check download status:', error);
    }
  };

  // Handle download
  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    setProgress(0);

    // Subscribe to download progress
    const unsubscribe = offlineStorageService.onDownloadProgress(
      contentId,
      (progressData: DownloadProgress) => {
        setProgress(Math.round(progressData.progress));
      }
    );

    try {
      await offlineStorageService.downloadContent(
        contentId,
        contentType,
        downloadUrl,
        metadata
      );

      setIsDownloaded(true);
      setProgress(100);

      // Show success message
      Alert.alert(getSuccessTitle(), getSuccessMessage(), [
        { text: getOkText() },
      ]);

      // Notify parent component
      if (onDownloadComplete) {
        onDownloadComplete();
      }
    } catch (error: any) {
      console.error('[DownloadButton] Download failed:', error);

      let errorMessage = getErrorMessage();

      // Customize error message based on error type
      if (error.name === 'StorageQuotaExceededError') {
        errorMessage = getStorageQuotaError();
      } else if (error.name === 'DownloadFailedError') {
        errorMessage = getDownloadFailedError();
      }

      Alert.alert(getErrorTitle(), errorMessage, [{ text: getOkText() }]);
    } finally {
      setIsDownloading(false);
      unsubscribe();
    }
  }, [contentId, contentType, downloadUrl, metadata, language, onDownloadComplete]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    Alert.alert(
      getDeleteTitle(),
      getDeleteMessage(),
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
              setIsDownloaded(false);
              setProgress(0);

              // Notify parent component
              if (onDeleteComplete) {
                onDeleteComplete();
              }
            } catch (error) {
              console.error('[DownloadButton] Delete failed:', error);
              Alert.alert(getErrorTitle(), getErrorMessage());
            }
          },
        },
      ]
    );
  }, [contentId, language, onDeleteComplete]);

  // Multi-language text functions
  const getDownloadText = () => {
    switch (language) {
      case 'ms':
        return 'Muat Turun';
      case 'zh':
        return '下载';
      case 'ta':
        return 'பதிவிறக்கு';
      default:
        return 'Download';
    }
  };

  const getDownloadedText = () => {
    switch (language) {
      case 'ms':
        return 'Dimuat Turun';
      case 'zh':
        return '已下载';
      case 'ta':
        return 'பதிவிறக்கப்பட்டது';
      default:
        return 'Downloaded';
    }
  };

  const getDeleteTitle = () => {
    switch (language) {
      case 'ms':
        return 'Padam Muat Turun';
      case 'zh':
        return '删除下载';
      case 'ta':
        return 'பதிவிறக்கத்தை நீக்கு';
      default:
        return 'Delete Download';
    }
  };

  const getDeleteMessage = () => {
    switch (language) {
      case 'ms':
        return 'Adakah anda pasti mahu memadam kandungan yang dimuat turun ini?';
      case 'zh':
        return '您确定要删除此下载内容吗？';
      case 'ta':
        return 'இந்த பதிவிறக்கத்தை நீக்க விரும்புகிறீர்களா?';
      default:
        return 'Are you sure you want to delete this downloaded content?';
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

  const getSuccessTitle = () => {
    switch (language) {
      case 'ms':
        return 'Berjaya';
      case 'zh':
        return '成功';
      case 'ta':
        return 'வெற்றி';
      default:
        return 'Success';
    }
  };

  const getSuccessMessage = () => {
    switch (language) {
      case 'ms':
        return 'Kandungan telah berjaya dimuat turun untuk akses luar talian';
      case 'zh':
        return '内容已成功下载以供离线访问';
      case 'ta':
        return 'ஆஃப்லைன் அணுகலுக்கு உள்ளடக்கம் வெற்றிகரமாக பதிவிறக்கப்பட்டது';
      default:
        return 'Content downloaded successfully for offline access';
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
        return 'Gagal memuat turun kandungan. Sila cuba lagi.';
      case 'zh':
        return '下载内容失败。请重试。';
      case 'ta':
        return 'உள்ளடக்கத்தைப் பதிவிறக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.';
      default:
        return 'Failed to download content. Please try again.';
    }
  };

  const getStorageQuotaError = () => {
    switch (language) {
      case 'ms':
        return 'Ruang penyimpanan tidak mencukupi. Sila padam beberapa kandungan.';
      case 'zh':
        return '存储空间不足。请删除一些内容。';
      case 'ta':
        return 'சேமிப்பக இடம் போதுமானதாக இல்லை. சில உள்ளடக்கங்களை நீக்கவும்.';
      default:
        return 'Insufficient storage space. Please delete some content.';
    }
  };

  const getDownloadFailedError = () => {
    switch (language) {
      case 'ms':
        return 'Muat turun gagal. Sila semak sambungan internet anda.';
      case 'zh':
        return '下载失败。请检查您的互联网连接。';
      case 'ta':
        return 'பதிவிறக்கம் தோல்வியுற்றது. உங்கள் இணைய இணைப்பை சரிபார்க்கவும்.';
      default:
        return 'Download failed. Please check your internet connection.';
    }
  };

  // Render downloading state
  if (isDownloading) {
    return (
      <View style={styles.progressContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.progressText}>{progress}%</Text>
      </View>
    );
  }

  // Render downloaded state
  if (isDownloaded) {
    return (
      <TouchableOpacity
        style={styles.downloadedButton}
        onPress={handleDelete}
        accessibilityLabel={getDeleteText()}
        accessibilityRole="button"
      >
        <Icon name="check-circle" size={20} color={COLORS.success} />
        <Text style={styles.downloadedText}>{getDownloadedText()}</Text>
      </TouchableOpacity>
    );
  }

  // Render download state
  return (
    <TouchableOpacity
      style={styles.downloadButton}
      onPress={handleDownload}
      accessibilityLabel={getDownloadText()}
      accessibilityRole="button"
    >
      <Icon name="download" size={20} color={COLORS.primary} />
      <Text style={styles.downloadText}>{getDownloadText()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
    backgroundColor: COLORS.gray[100],
    borderRadius: 8,
  },
  progressText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.primary,
    marginLeft: 8,
  },
  downloadedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
    backgroundColor: COLORS.success + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  downloadedText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.success,
    marginLeft: 8,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  downloadText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.primary,
    marginLeft: 8,
  },
});
