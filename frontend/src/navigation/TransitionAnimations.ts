/**
 * Screen Transition Animations
 * 
 * Cultural-themed transition animations optimized for performance
 * with consideration for elderly users and battery efficiency.
 */

import { TransitionSpec, StackCardInterpolationProps, StackCardStyleInterpolator } from '@react-navigation/stack';
import { Animated, Easing } from 'react-native';

/**
 * Animation Duration Constants
 * Optimized for elderly users and battery efficiency
 */
export const ANIMATION_DURATIONS = {
  fast: 200,
  normal: 300,
  slow: 400,
  accessibility: 500, // Slower for elderly users
};

/**
 * Cultural Theme Transition Configurations
 */
export const CulturalTransitionSpecs = {
  // Gentle transitions for elderly users
  gentle: {
    animation: 'timing',
    config: {
      duration: ANIMATION_DURATIONS.accessibility,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // Ease-out
      useNativeDriver: true,
    },
  } as TransitionSpec,

  // Fast transitions for younger users
  snappy: {
    animation: 'timing',
    config: {
      duration: ANIMATION_DURATIONS.fast,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      useNativeDriver: true,
    },
  } as TransitionSpec,

  // Standard transitions
  standard: {
    animation: 'timing',
    config: {
      duration: ANIMATION_DURATIONS.normal,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      useNativeDriver: true,
    },
  } as TransitionSpec,

  // Prayer time transitions (serene)
  serene: {
    animation: 'timing',
    config: {
      duration: ANIMATION_DURATIONS.slow,
      easing: Easing.bezier(0.23, 1, 0.32, 1), // Very gentle
      useNativeDriver: true,
    },
  } as TransitionSpec,

  // Emergency transitions (immediate)
  emergency: {
    animation: 'timing',
    config: {
      duration: ANIMATION_DURATIONS.fast - 50,
      easing: Easing.linear,
      useNativeDriver: true,
    },
  } as TransitionSpec,
};

/**
 * Cultural-Themed Interpolators
 */
export const CulturalInterpolators = {
  // Slide from right (default)
  slideFromRight: ({ current, next, layouts }: StackCardInterpolationProps) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
        ],
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.5],
        }),
      },
    };
  },

  // Gentle fade for elderly users
  gentleFade: ({ current }: StackCardInterpolationProps) => {
    return {
      cardStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0.8, 1],
        }),
        transform: [
          {
            scale: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.95, 1],
            }),
          },
        ],
      },
    };
  },

  // Prayer time serene transition
  sereneSlide: ({ current, layouts }: StackCardInterpolationProps) => {
    return {
      cardStyle: {
        transform: [
          {
            translateY: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.height * 0.1, 0],
            }),
          },
          {
            scale: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.98, 1],
            }),
          },
        ],
        opacity: current.progress.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0, 0.9, 1],
        }),
      },
    };
  },

  // Family context warm slide
  warmSlide: ({ current, layouts }: StackCardInterpolationProps) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width * 0.3, 0],
            }),
          },
          {
            scale: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.97, 1],
            }),
          },
        ],
        opacity: current.progress.interpolate({
          inputRange: [0, 0.4, 1],
          outputRange: [0, 0.85, 1],
        }),
      },
    };
  },

  // Medication context precise slide
  preciseSlide: ({ current, layouts }: StackCardInterpolationProps) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
        ],
        opacity: current.progress.interpolate({
          inputRange: [0, 0.6, 1],
          outputRange: [0, 0.95, 1],
        }),
      },
    };
  },

  // Emergency immediate transition
  emergencySlide: ({ current, layouts }: StackCardInterpolationProps) => {
    return {
      cardStyle: {
        transform: [
          {
            translateY: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [-layouts.screen.height, 0],
            }),
          },
        ],
      },
    };
  },
};

/**
 * Animation Theme Manager
 */
export class AnimationThemeManager {
  private static currentTheme: 'gentle' | 'standard' | 'snappy' | 'serene' = 'standard';
  private static userAge: number | null = null;
  private static accessibilityMode: boolean = false;

  static setTheme(theme: 'gentle' | 'standard' | 'snappy' | 'serene') {
    this.currentTheme = theme;
  }

  static setUserAge(age: number) {
    this.userAge = age;
    // Automatically adjust theme based on age
    if (age >= 65) {
      this.currentTheme = 'gentle';
      this.accessibilityMode = true;
    } else if (age >= 45) {
      this.currentTheme = 'standard';
    } else {
      this.currentTheme = 'snappy';
    }
  }

  static setAccessibilityMode(enabled: boolean) {
    this.accessibilityMode = enabled;
    if (enabled) {
      this.currentTheme = 'gentle';
    }
  }

  static getCurrentTheme() {
    return this.currentTheme;
  }

  static getTransitionSpec(): TransitionSpec {
    switch (this.currentTheme) {
      case 'gentle':
        return CulturalTransitionSpecs.gentle;
      case 'snappy':
        return CulturalTransitionSpecs.snappy;
      case 'serene':
        return CulturalTransitionSpecs.serene;
      default:
        return CulturalTransitionSpecs.standard;
    }
  }

  static getInterpolator(context: 'general' | 'prayer' | 'family' | 'medication' | 'emergency' = 'general'): StackCardStyleInterpolator {
    if (context === 'emergency') {
      return CulturalInterpolators.emergencySlide;
    }

    switch (this.currentTheme) {
      case 'gentle':
        return context === 'prayer' 
          ? CulturalInterpolators.sereneSlide 
          : CulturalInterpolators.gentleFade;
      case 'serene':
        return CulturalInterpolators.sereneSlide;
      case 'snappy':
        return context === 'family' 
          ? CulturalInterpolators.warmSlide 
          : CulturalInterpolators.slideFromRight;
      default:
        switch (context) {
          case 'prayer':
            return CulturalInterpolators.sereneSlide;
          case 'family':
            return CulturalInterpolators.warmSlide;
          case 'medication':
            return CulturalInterpolators.preciseSlide;
          default:
            return CulturalInterpolators.slideFromRight;
        }
    }
  }

  static isAccessibilityMode(): boolean {
    return this.accessibilityMode;
  }
}

/**
 * Context-Aware Animation Selector
 */
export class ContextualAnimationSelector {
  static getAnimationForRoute(routeName: string, userContext?: any) {
    // Emergency routes get immediate transitions
    if (routeName.includes('Emergency') || routeName.includes('Alert')) {
      return {
        transitionSpec: CulturalTransitionSpecs.emergency,
        cardStyleInterpolator: CulturalInterpolators.emergencySlide,
      };
    }

    // Prayer time routes get serene transitions
    if (routeName.includes('Prayer') || routeName.includes('Spiritual')) {
      return {
        transitionSpec: CulturalTransitionSpecs.serene,
        cardStyleInterpolator: CulturalInterpolators.sereneSlide,
      };
    }

    // Family routes get warm transitions
    if (routeName.includes('Family') || routeName.includes('Caregiver')) {
      return {
        transitionSpec: AnimationThemeManager.getTransitionSpec(),
        cardStyleInterpolator: CulturalInterpolators.warmSlide,
      };
    }

    // Medication routes get precise transitions
    if (routeName.includes('Medication') || routeName.includes('Medicine')) {
      return {
        transitionSpec: AnimationThemeManager.getTransitionSpec(),
        cardStyleInterpolator: CulturalInterpolators.preciseSlide,
      };
    }

    // Default transitions
    return {
      transitionSpec: AnimationThemeManager.getTransitionSpec(),
      cardStyleInterpolator: AnimationThemeManager.getInterpolator(),
    };
  }

  static shouldReduceMotion(userContext?: any): boolean {
    // Check if user prefers reduced motion
    if (userContext?.accessibilitySettings?.reduceMotion) {
      return true;
    }

    // Check if user is elderly
    if (userContext?.age >= 65) {
      return true;
    }

    // Check if accessibility mode is enabled
    return AnimationThemeManager.isAccessibilityMode();
  }
}

/**
 * Performance Optimized Animations
 */
export const PerformanceOptimizedAnimations = {
  // Minimal animation for low-end devices
  minimal: {
    transitionSpec: {
      animation: 'timing',
      config: {
        duration: ANIMATION_DURATIONS.fast,
        easing: Easing.linear,
        useNativeDriver: true,
      },
    } as TransitionSpec,
    cardStyleInterpolator: ({ current }: StackCardInterpolationProps) => ({
      cardStyle: {
        opacity: current.progress,
      },
    }),
  },

  // Battery optimized animations
  batteryOptimized: {
    transitionSpec: {
      animation: 'timing',
      config: {
        duration: ANIMATION_DURATIONS.fast,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      },
    } as TransitionSpec,
    cardStyleInterpolator: CulturalInterpolators.slideFromRight,
  },
};

/**
 * Animation Performance Monitor
 */
export class AnimationPerformanceMonitor {
  private static animationTimes: number[] = [];
  private static droppedFrames: number = 0;

  static startAnimation(): number {
    return Date.now();
  }

  static endAnimation(startTime: number) {
    const duration = Date.now() - startTime;
    this.animationTimes.push(duration);
    
    // Keep only last 50 measurements
    if (this.animationTimes.length > 50) {
      this.animationTimes.shift();
    }

    // Log performance if animation took too long
    if (duration > ANIMATION_DURATIONS.accessibility + 100) {
      console.warn(`Slow animation detected: ${duration}ms`);
    }
  }

  static reportDroppedFrame() {
    this.droppedFrames++;
  }

  static getAverageAnimationTime(): number {
    if (this.animationTimes.length === 0) return 0;
    return this.animationTimes.reduce((a, b) => a + b, 0) / this.animationTimes.length;
  }

  static getDroppedFrameCount(): number {
    return this.droppedFrames;
  }

  static shouldOptimizeForPerformance(): boolean {
    return this.getAverageAnimationTime() > ANIMATION_DURATIONS.normal || 
           this.droppedFrames > 10;
  }

  static resetMetrics() {
    this.animationTimes = [];
    this.droppedFrames = 0;
  }
}

/**
 * Cultural Animation Presets
 */
export const CulturalAnimationPresets = {
  malaysian: {
    // Gentle, respectful animations
    transitionSpec: CulturalTransitionSpecs.gentle,
    cardStyleInterpolator: CulturalInterpolators.gentleFade,
  },
  chinese: {
    // Precise, efficient animations
    transitionSpec: CulturalTransitionSpecs.standard,
    cardStyleInterpolator: CulturalInterpolators.preciseSlide,
  },
  indian: {
    // Warm, family-oriented animations
    transitionSpec: CulturalTransitionSpecs.standard,
    cardStyleInterpolator: CulturalInterpolators.warmSlide,
  },
  international: {
    // Standard animations
    transitionSpec: CulturalTransitionSpecs.standard,
    cardStyleInterpolator: CulturalInterpolators.slideFromRight,
  },
};