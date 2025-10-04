/**
 * Content Detail Screen
 *
 * Full article/video viewer with:
 * - Article renderer or video player based on content type
 * - Multi-language content switching
 * - Related content section
 * - Share and bookmark buttons
 * - Progress tracking (view/completion)
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchContentById,
  trackContentView,
  trackContentCompletion,
  fetchContent,
} from '@/store/slices/educationSlice';
import { ArticleRenderer, VideoPlayer, RelatedContentList, DownloadButton } from '@/components/education';
import { useOfflineContent } from '@/hooks/useOfflineContent';
import { useEducationNetworkStatus } from '@/hooks/useEducationNetworkStatus';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import type { EducationStackScreenProps } from '@/types/navigation';

type Props = EducationStackScreenProps<'ContentDetail'>;

export default function ContentDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector(state => state.cultural);
  const { currentContent, contentLoading, content } = useAppSelector(
    state => state.education
  );

  const [viewTracked, setViewTracked] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [isCompleted, setIsCompleted] = useState(false);
  const [loadedFromOffline, setLoadedFromOffline] = useState(false);

  const language = profile?.language || 'en';

  // Offline functionality
  const { isOnline } = useEducationNetworkStatus();
  const {
    isDownloaded,
    getOfflineContent,
  } = useOfflineContent(
    id,
    currentContent?.type || 'article',
    currentContent?.mediaUrl,
    currentContent
      ? {
          title: currentContent.title,
          size: 0, // Size will be determined during download
          duration: currentContent.type === 'video' ? currentContent.estimatedReadTime : undefined,
        }
      : undefined
  );

  useEffect(() => {
    const loadContent = async () => {
      await dispatch(fetchContentById({ id, incrementView: true }));
      setStartTime(Date.now());
    };

    loadContent();
  }, [id, dispatch]);

  useEffect(() => {
    if (currentContent && !viewTracked) {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      dispatch(trackContentView({ contentId: id, timeSpent }));
      setViewTracked(true);
    }
  }, [currentContent, viewTracked, id, startTime, dispatch]);

  useEffect(() => {
    if (currentContent?.relatedMedications.length || currentContent?.relatedConditions.length) {
      dispatch(fetchContent({ limit: 5 }));
    }
  }, [currentContent, dispatch]);

  // Load offline content when offline and content is downloaded
  useEffect(() => {
    const loadOfflineContent = async () => {
      if (!isOnline && isDownloaded && !currentContent) {
        try {
          console.log('[ContentDetail] Loading offline content for:', id);
          const offlineData = await getOfflineContent();
          setLoadedFromOffline(true);

          // Note: In a real implementation, you would dispatch this to the Redux store
          // or set it in local state. For now, we rely on the existing content load
          console.log('[ContentDetail] Offline content loaded:', offlineData);
        } catch (error) {
          console.error('[ContentDetail] Failed to load offline content:', error);
          Alert.alert(
            'Offline Content Unavailable',
            'Unable to load this content while offline. Please try again when online.'
          );
        }
      } else if (!isOnline && !isDownloaded) {
        // Offline but content not downloaded
        console.log('[ContentDetail] Content not available offline');
      }
    };

    loadOfflineContent();
  }, [isOnline, isDownloaded, currentContent, id, getOfflineContent]);

  const handleComplete = useCallback(async () => {
    if (!isCompleted && currentContent) {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      await dispatch(trackContentCompletion({ contentId: id, timeSpent }));
      setIsCompleted(true);
      Alert.alert('Content Completed', 'Great job! Keep learning.');
    }
  }, [isCompleted, currentContent, id, startTime, dispatch]);

  const handleShare = useCallback(() => {
    Alert.alert('Share', 'Share functionality will be implemented in Task 035');
  }, []);

  const handleBookmark = useCallback(() => {
    Alert.alert('Bookmark', 'Bookmark functionality coming soon');
  }, []);

  const handleRelatedContentPress = (contentId: string) => {
    navigation.push('ContentDetail', { id: contentId });
  };

  const getRelatedContent = () => {
    if (!currentContent) return [];
    return content
      .filter(
        c =>
          c.id !== currentContent.id &&
          (c.category === currentContent.category ||
            c.tags.some(tag => currentContent.tags.includes(tag)))
      )
      .slice(0, 5);
  };

  if (contentLoading || !currentContent) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const title = currentContent.title[language];
  const description = currentContent.description[language];
  const relatedContent = getRelatedContent();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.metadata}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{currentContent.type.toUpperCase()}</Text>
            </View>
            <Text style={styles.metadataText}>
              {currentContent.estimatedReadTime} min · {currentContent.category}
            </Text>
            {loadedFromOffline && (
              <View style={styles.offlineBadge}>
                <Text style={styles.offlineBadgeText}>Viewing Offline</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {currentContent.medicalReviewer && (
            <Text style={styles.reviewedBy}>
              Medically reviewed by {currentContent.medicalReviewer}
            </Text>
          )}

          {/* Download Button - only show for articles and videos */}
          {(currentContent.type === 'article' || currentContent.type === 'video') &&
            currentContent.mediaUrl && (
              <View style={styles.downloadButtonContainer}>
                <DownloadButton
                  contentId={currentContent.id}
                  contentType={currentContent.type}
                  downloadUrl={currentContent.mediaUrl}
                  metadata={{
                    title: currentContent.title,
                    size: 0,
                    duration:
                      currentContent.type === 'video'
                        ? currentContent.estimatedReadTime
                        : undefined,
                  }}
                  language={language}
                />
              </View>
            )}
        </View>

        {currentContent.type === 'video' ? (
          <VideoPlayer content={currentContent} />
        ) : (
          <ArticleRenderer content={currentContent} />
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleComplete}>
            <Text style={styles.actionButtonText}>
              {isCompleted ? 'Completed' : 'Mark as Complete'}
            </Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={handleBookmark}
            >
              <Text style={styles.secondaryActionText}>Bookmark</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={handleShare}
            >
              <Text style={styles.secondaryActionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {currentContent.tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={styles.tagsTitle}>Tags</Text>
            <View style={styles.tags}>
              {currentContent.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {relatedContent.length > 0 && (
          <RelatedContentList
            relatedContent={relatedContent}
            onPress={handleRelatedContentPress}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    padding: 20,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  badge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  metadataText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[500],
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
    marginBottom: 12,
    lineHeight: 32,
  },
  description: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    lineHeight: 24,
    marginBottom: 12,
  },
  reviewedBy: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[500],
    fontStyle: 'italic',
  },
  actions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryActionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
  },
  secondaryActionText: {
    color: COLORS.gray[700],
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  tagsSection: {
    padding: 20,
  },
  tagsTitle: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[700],
  },
  offlineBadge: {
    backgroundColor: COLORS.gray[600],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  offlineBadgeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  downloadButtonContainer: {
    marginTop: 16,
  },
});
