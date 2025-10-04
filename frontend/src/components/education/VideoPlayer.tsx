/**
 * VideoPlayer Component
 *
 * Video player wrapper with custom controls for educational videos.
 * Includes play/pause, seek, fullscreen, progress bar, and error handling.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Dimensions,
} from 'react-native';
import { useAppSelector } from '@/store/hooks';
import { useCulturalTheme } from '@/components/language/ui/CulturalThemeProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface VideoPlayerProps {
  videoUrl: string;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  autoPlay?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  onError,
  onProgress,
  onComplete,
  autoPlay = false,
}) => {
  const { theme } = useCulturalTheme();
  const language = useAppSelector(state => state.cultural.profile?.language ?? 'en');

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getErrorText = (): string => {
    const errorTexts = {
      en: 'Failed to load video',
      ms: 'Gagal memuatkan video',
      zh: '无法加载视频',
      ta: 'வீடியோவை ஏற்ற முடியவில்லை',
    };
    return errorTexts[language] || errorTexts.en;
  };

  const getRetryText = (): string => {
    const retryTexts = {
      en: 'Retry',
      ms: 'Cuba Semula',
      zh: '重试',
      ta: 'மீண்டும் முயற்சிக்கவும்',
    };
    return retryTexts[language] || retryTexts.en;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
    resetControlsTimeout();
  }, [isPlaying]);

  const handleSeek = useCallback((position: number) => {
    const newTime = (position / 100) * duration;
    setCurrentTime(newTime);
    onProgress?.(position);
    resetControlsTimeout();
  }, [duration, onProgress]);

  const handleError = useCallback((error: Error) => {
    setHasError(true);
    setIsLoading(false);
    onError?.(error);
  }, [onError]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
  }, []);

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handlePlayerPress = () => {
    resetControlsTimeout();
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const styles = StyleSheet.create({
    container: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: '#000000',
      position: 'relative',
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
    } as ViewStyle,
    video: {
      width: '100%',
      height: '100%',
      backgroundColor: '#000000',
    } as ViewStyle,
    loadingContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
    } as ViewStyle,
    errorContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: theme.spacing.lg,
    } as ViewStyle,
    errorText: {
      color: '#FFFFFF',
      fontSize: 16 * theme.accessibility.textScaling,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    } as TextStyle,
    retryButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      minHeight: theme.accessibility.minimumTouchTarget,
    } as ViewStyle,
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 16 * theme.accessibility.textScaling,
      fontWeight: '600',
    } as TextStyle,
    controlsContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      backgroundColor: 'transparent',
    } as ViewStyle,
    controlsOverlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: theme.spacing.md,
    } as ViewStyle,
    playPauseButton: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: [{ translateX: -32 }, { translateY: -32 }],
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,
    playPauseIcon: {
      color: '#FFFFFF',
      fontSize: 32,
    } as TextStyle,
    bottomControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    } as ViewStyle,
    timeText: {
      color: '#FFFFFF',
      fontSize: 12 * theme.accessibility.textScaling,
      minWidth: 45,
    } as TextStyle,
    progressContainer: {
      flex: 1,
      height: theme.accessibility.minimumTouchTarget,
      justifyContent: 'center',
    } as ViewStyle,
    progressTrack: {
      height: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      borderRadius: 2,
      overflow: 'hidden',
    } as ViewStyle,
    progressBar: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    } as ViewStyle,
    fullscreenButton: {
      padding: theme.spacing.sm,
      minHeight: theme.accessibility.minimumTouchTarget,
      minWidth: theme.accessibility.minimumTouchTarget,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,
    fullscreenIcon: {
      color: '#FFFFFF',
      fontSize: 20,
    } as TextStyle,
  });

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={handlePlayerPress}
      accessibilityRole="button"
      accessibilityLabel="Video player"
    >
      {/* Video Placeholder (Would use React Native Video library in production) */}
      <View style={styles.video} />

      {/* Loading State */}
      {isLoading && !hasError && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      {/* Error State */}
      {hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{getErrorText()}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            accessibilityRole="button"
            accessibilityLabel={getRetryText()}
          >
            <Text style={styles.retryButtonText}>{getRetryText()}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Controls */}
      {showControls && !isLoading && !hasError && (
        <View style={styles.controlsContainer} pointerEvents="box-none">
          {/* Play/Pause Button */}
          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={handlePlayPause}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            <Text style={styles.playPauseIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>

          {/* Bottom Controls */}
          <View style={styles.controlsOverlay}>
            <View style={styles.bottomControls}>
              {/* Current Time */}
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
                </View>
              </View>

              {/* Duration */}
              <Text style={styles.timeText}>{formatTime(duration)}</Text>

              {/* Fullscreen Button */}
              <TouchableOpacity
                style={styles.fullscreenButton}
                onPress={() => {/* Handle fullscreen */}}
                accessibilityRole="button"
                accessibilityLabel="Toggle fullscreen"
              >
                <Text style={styles.fullscreenIcon}>⛶</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default VideoPlayer;
