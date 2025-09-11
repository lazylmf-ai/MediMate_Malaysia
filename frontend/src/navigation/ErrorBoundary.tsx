/**
 * Navigation Error Boundary
 * 
 * Comprehensive error boundary specifically designed for navigation failures
 * with cultural context and graceful fallback mechanisms.
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

interface NavigationErrorBoundaryProps {
  children: ReactNode;
  navigation?: any;
  fallbackRoute?: string;
  culturalContext?: {
    language: 'ms' | 'en' | 'zh' | 'ta';
    theme: string;
  };
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface NavigationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  lastErrorTime: number;
}

/**
 * Navigation-Specific Error Boundary
 */
export class NavigationErrorBoundary extends Component<
  NavigationErrorBoundaryProps,
  NavigationErrorBoundaryState
> {
  constructor(props: NavigationErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<NavigationErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('Navigation Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // Update state with error info
    this.setState({ errorInfo });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to analytics/crash reporting
    this.reportNavigationError(error, errorInfo);
  }

  private reportNavigationError(error: Error, errorInfo: ErrorInfo) {
    try {
      // This would integrate with your analytics/crash reporting service
      const errorReport = {
        type: 'navigation_error',
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        culturalContext: this.props.culturalContext,
        timestamp: new Date().toISOString(),
        retryCount: this.state.retryCount,
      };

      console.log('Navigation error report:', errorReport);
      
      // In a real implementation, you'd send this to your error reporting service
      // crashlytics().recordError(error);
      // analytics().logEvent('navigation_error', errorReport);
    } catch (reportError) {
      console.error('Failed to report navigation error:', reportError);
    }
  }

  private handleRetry = () => {
    const now = Date.now();
    const timeSinceLastError = now - this.state.lastErrorTime;

    // Prevent rapid retries
    if (timeSinceLastError < 1000) {
      return;
    }

    // Increment retry count
    const newRetryCount = this.state.retryCount + 1;

    // If too many retries, navigate to safe route
    if (newRetryCount > 3) {
      this.navigateToSafeRoute();
      return;
    }

    // Reset error state and retry
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: newRetryCount,
      lastErrorTime: now,
    });
  };

  private handleGoHome = () => {
    this.navigateToSafeRoute('Home');
  };

  private handleGoBack = () => {
    if (this.props.navigation?.canGoBack()) {
      this.props.navigation.goBack();
      this.resetErrorState();
    } else {
      this.navigateToSafeRoute();
    }
  };

  private navigateToSafeRoute(route: string = 'Home') {
    try {
      if (this.props.navigation) {
        this.props.navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: route }],
          })
        );
      }
      this.resetErrorState();
    } catch (navigationError) {
      console.error('Failed to navigate to safe route:', navigationError);
      // If navigation fails, just reset error state
      this.resetErrorState();
    }
  }

  private resetErrorState() {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0,
    });
  }

  private getErrorMessage(): string {
    const { culturalContext } = this.props;
    const language = culturalContext?.language || 'en';

    const messages = {
      en: {
        title: 'Navigation Error',
        subtitle: 'Something went wrong with the app navigation',
        description: 'We apologize for the inconvenience. Please try again or return to the home screen.',
        retryButton: 'Try Again',
        homeButton: 'Go to Home',
        backButton: 'Go Back',
        technicalDetails: 'Technical Details',
        tooManyRetries: 'Multiple attempts failed. Please restart the app if issues persist.',
      },
      ms: {
        title: 'Ralat Navigasi',
        subtitle: 'Terdapat masalah dengan navigasi aplikasi',
        description: 'Kami mohon maaf atas kesulitan ini. Sila cuba lagi atau kembali ke skrin utama.',
        retryButton: 'Cuba Lagi',
        homeButton: 'Ke Laman Utama',
        backButton: 'Kembali',
        technicalDetails: 'Butiran Teknikal',
        tooManyRetries: 'Beberapa percubaan gagal. Sila mula semula aplikasi jika masalah berterusan.',
      },
      zh: {
        title: '导航错误',
        subtitle: '应用程序导航出现问题',
        description: '对于带来的不便，我们深表歉意。请重试或返回主屏幕。',
        retryButton: '重试',
        homeButton: '回到首页',
        backButton: '返回',
        technicalDetails: '技术详情',
        tooManyRetries: '多次尝试失败。如果问题持续存在，请重启应用程序。',
      },
      ta: {
        title: 'வழிசெலுத்தல் பிழை',
        subtitle: 'பயன்பாட்டு வழிசெலுத்தலில் ஏதோ தவறு ஏற்பட்டுள்ளது',
        description: 'இந்த சிரமத்திற்கு வருந்துகிறோம். மீண்டும் முயற்சிக்கவும் அல்லது முகப்பு திரைக்கு திரும்பவும்.',
        retryButton: 'மீண்டும் முயற்சிக்கவும்',
        homeButton: 'முகப்பிற்கு செல்லவும்',
        backButton: 'திரும்பு',
        technicalDetails: 'தொழில்நுட்ப விபரங்கள்',
        tooManyRetries: 'பல முயற்சிகள் தோல்வியடைந்தன. சிக்கல்கள் தொடர்ந்தால் பயன்பாட்டை மீண்டும் தொடங்கவும்.',
      },
    };

    return messages[language] || messages.en;
  }

  render() {
    if (this.state.hasError) {
      const errorMessages = this.getErrorMessage();
      const { error, retryCount } = this.state;

      return (
        <ScrollView style={styles.errorContainer} contentContainerStyle={styles.errorContent}>
          <View style={styles.errorHeader}>
            <Text style={styles.errorTitle}>{errorMessages.title}</Text>
            <Text style={styles.errorSubtitle}>{errorMessages.subtitle}</Text>
          </View>

          <View style={styles.errorBody}>
            <Text style={styles.errorDescription}>
              {retryCount > 3 ? errorMessages.tooManyRetries : errorMessages.description}
            </Text>

            {retryCount <= 3 && (
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.primaryButton} onPress={this.handleRetry}>
                  <Text style={styles.primaryButtonText}>{errorMessages.retryButton}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={this.handleGoHome}>
                  <Text style={styles.secondaryButtonText}>{errorMessages.homeButton}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={this.handleGoBack}>
                  <Text style={styles.secondaryButtonText}>{errorMessages.backButton}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {__DEV__ && error && (
            <View style={styles.technicalDetails}>
              <Text style={styles.technicalTitle}>{errorMessages.technicalDetails}</Text>
              <View style={styles.errorDetailsBox}>
                <Text style={styles.errorText}>{error.message}</Text>
                {error.stack && (
                  <Text style={styles.stackTrace}>{error.stack}</Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.retryInfo}>
            <Text style={styles.retryText}>
              Retry Count: {retryCount}/3
            </Text>
          </View>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-Order Component for Navigation Error Boundary
 */
export function withNavigationErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Partial<NavigationErrorBoundaryProps>
) {
  return function WrappedComponent(props: P & { navigation?: any }) {
    return (
      <NavigationErrorBoundary
        navigation={props.navigation}
        {...boundaryProps}
      >
        <Component {...props} />
      </NavigationErrorBoundary>
    );
  };
}

/**
 * Hook for Manual Error Reporting
 */
export function useNavigationErrorReporter() {
  const reportNavigationError = (error: Error, context?: any) => {
    try {
      const errorReport = {
        type: 'manual_navigation_error',
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
      };

      console.error('Manual navigation error report:', errorReport);
      
      // In a real implementation, you'd send this to your error reporting service
    } catch (reportError) {
      console.error('Failed to report manual navigation error:', reportError);
    }
  };

  return { reportNavigationError };
}

/**
 * Fallback Navigation Component
 * Used when navigation completely fails
 */
export function FallbackNavigationScreen({ 
  onNavigateHome,
  culturalContext,
}: {
  onNavigateHome: () => void;
  culturalContext?: { language: 'ms' | 'en' | 'zh' | 'ta' };
}) {
  const language = culturalContext?.language || 'en';

  const messages = {
    en: {
      title: 'Navigation Error',
      message: 'We are experiencing technical difficulties. Please restart the app.',
      homeButton: 'Try Home Screen',
    },
    ms: {
      title: 'Ralat Navigasi',
      message: 'Kami mengalami kesukaran teknikal. Sila mulakan semula aplikasi.',
      homeButton: 'Cuba Skrin Utama',
    },
    zh: {
      title: '导航错误',
      message: '我们遇到了技术困难。请重新启动应用程序。',
      homeButton: '尝试主屏幕',
    },
    ta: {
      title: 'வழிசெலுத்தல் பிழை',
      message: 'நாங்கள் தொழில்நுட்ப சிக்கல்களை சந்திக்கிறோம். பயன்பாட்டை மீண்டும் தொடங்கவும்.',
      homeButton: 'முகப்பு திரையை முயற்சிக்கவும்',
    },
  };

  const text = messages[language] || messages.en;

  return (
    <View style={styles.fallbackContainer}>
      <Text style={styles.fallbackTitle}>{text.title}</Text>
      <Text style={styles.fallbackMessage}>{text.message}</Text>
      <TouchableOpacity style={styles.fallbackButton} onPress={onNavigateHome}>
        <Text style={styles.fallbackButtonText}>{text.homeButton}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  errorContent: {
    padding: 20,
    minHeight: '100%',
    justifyContent: 'center',
  },
  errorHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
  errorBody: {
    alignItems: 'center',
    marginBottom: 32,
  },
  errorDescription: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[700],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  actionButtons: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: '80%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  secondaryButton: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    width: '80%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.gray[700],
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  technicalDetails: {
    backgroundColor: COLORS.gray[50],
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  technicalTitle: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[800],
    marginBottom: 8,
  },
  errorDetailsBox: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.error,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  stackTrace: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.gray[600],
    fontFamily: 'monospace',
  },
  retryInfo: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  retryText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[500],
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 20,
  },
  fallbackTitle: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  fallbackMessage: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[700],
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  fallbackButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  fallbackButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
});