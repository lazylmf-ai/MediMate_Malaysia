/**
 * Mobile Optimization Hook
 * Provides performance monitoring and battery optimization for mobile devices
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Dimensions, Platform } from 'react-native';
import { useAccessibility } from '../../utils/accessibility/useAccessibility';

export interface PerformanceMetrics {
  memoryUsage: number;
  cpuUsage: number;
  batteryLevel: number;
  networkType: string;
  renderTime: number;
  frameDrops: number;
  isLowPowerMode: boolean;
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
}

export interface OptimizationConfig {
  enableBatteryOptimization: boolean;
  enablePerformanceMonitoring: boolean;
  enableAdaptiveQuality: boolean;
  maxMemoryUsage: number; // MB
  targetFrameRate: number;
  enableBackgroundOptimization: boolean;
  adaptiveImageQuality: boolean;
  reducedAnimations: boolean;
}

export interface MobileOptimization {
  metrics: PerformanceMetrics;
  config: OptimizationConfig;
  updateConfig: (updates: Partial<OptimizationConfig>) => void;
  optimizationLevel: 'none' | 'low' | 'medium' | 'high' | 'maximum';
  isLowPerformanceDevice: boolean;
  shouldReduceQuality: boolean;
  shouldDisableAnimations: boolean;
  enterPowerSaveMode: () => void;
  exitPowerSaveMode: () => void;
  isPowerSaveMode: boolean;
  startPerformanceMonitoring: () => void;
  stopPerformanceMonitoring: () => void;
  getOptimizedImageSize: (originalSize: { width: number; height: number }) => { width: number; height: number };
  getOptimizedAnimationDuration: (originalDuration: number) => number;
}

export function useMobileOptimization(
  initialConfig?: Partial<OptimizationConfig>
): MobileOptimization {
  const { config: accessibilityConfig, getAnimationDuration } = useAccessibility();

  const [config, setConfig] = useState<OptimizationConfig>({
    enableBatteryOptimization: true,
    enablePerformanceMonitoring: true,
    enableAdaptiveQuality: true,
    maxMemoryUsage: 150, // MB
    targetFrameRate: 60,
    enableBackgroundOptimization: true,
    adaptiveImageQuality: true,
    reducedAnimations: accessibilityConfig.reducedMotion,
    ...initialConfig,
  });

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    cpuUsage: 0,
    batteryLevel: 100,
    networkType: 'unknown',
    renderTime: 0,
    frameDrops: 0,
    isLowPowerMode: false,
    thermalState: 'nominal',
  });

  const [optimizationLevel, setOptimizationLevel] = useState<'none' | 'low' | 'medium' | 'high' | 'maximum'>('none');
  const [isPowerSaveMode, setIsPowerSaveMode] = useState(false);
  const [isLowPerformanceDevice, setIsLowPerformanceDevice] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const monitoringInterval = useRef<NodeJS.Timeout | null>(null);
  const frameTimeRef = useRef<number>(0);
  const renderStartTime = useRef<number>(0);

  // Device performance detection
  useEffect(() => {
    detectDevicePerformance();
  }, []);

  // App state monitoring
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (config.enableBackgroundOptimization) {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          enableBackgroundOptimization();
        } else if (nextAppState === 'active') {
          disableBackgroundOptimization();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [config.enableBackgroundOptimization]);

  // Accessibility integration
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      reducedAnimations: accessibilityConfig.reducedMotion,
    }));
  }, [accessibilityConfig.reducedMotion]);

  const detectDevicePerformance = useCallback(() => {
    const { width, height } = Dimensions.get('window');
    const screenResolution = width * height;

    // Estimate device performance based on screen resolution and platform
    let performanceScore = 100;

    // Screen resolution impact
    if (screenResolution > 2000000) { // High resolution screens
      performanceScore -= 20;
    }

    // Platform-specific adjustments
    if (Platform.OS === 'android') {
      // Android devices vary widely in performance
      performanceScore -= 10;
    }

    // Memory estimation (simplified)
    const estimatedMemory = screenResolution / 10000; // Rough estimation
    if (estimatedMemory < 4000) { // Less than 4GB RAM equivalent
      performanceScore -= 30;
    }

    const isLowPerf = performanceScore < 60;
    setIsLowPerformanceDevice(isLowPerf);

    if (isLowPerf) {
      setOptimizationLevel('high');
      enterPowerSaveMode();
    }
  }, []);

  const updateConfig = useCallback((updates: Partial<OptimizationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const startPerformanceMonitoring = useCallback(() => {
    if (isMonitoring || !config.enablePerformanceMonitoring) return;

    setIsMonitoring(true);

    monitoringInterval.current = setInterval(() => {
      // Mock performance metrics (in real implementation, these would use native modules)
      const mockMetrics: PerformanceMetrics = {
        memoryUsage: Math.random() * 200, // MB
        cpuUsage: Math.random() * 100, // %
        batteryLevel: Math.max(0, metrics.batteryLevel - Math.random() * 0.1),
        networkType: 'wifi', // Would use NetInfo in real implementation
        renderTime: frameTimeRef.current,
        frameDrops: Math.floor(Math.random() * 5),
        isLowPowerMode: isPowerSaveMode,
        thermalState: metrics.memoryUsage > 150 ? 'fair' : 'nominal',
      };

      setMetrics(mockMetrics);

      // Auto-adjust optimization based on metrics
      if (config.enableAdaptiveQuality) {
        adaptOptimizationLevel(mockMetrics);
      }
    }, 5000); // Check every 5 seconds
  }, [isMonitoring, config.enablePerformanceMonitoring, config.enableAdaptiveQuality, metrics.batteryLevel, isPowerSaveMode]);

  const stopPerformanceMonitoring = useCallback(() => {
    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
      monitoringInterval.current = null;
    }
    setIsMonitoring(false);
  }, []);

  const adaptOptimizationLevel = useCallback((currentMetrics: PerformanceMetrics) => {
    let newLevel: typeof optimizationLevel = 'none';

    if (currentMetrics.memoryUsage > config.maxMemoryUsage * 0.9) {
      newLevel = 'maximum';
    } else if (currentMetrics.memoryUsage > config.maxMemoryUsage * 0.7) {
      newLevel = 'high';
    } else if (currentMetrics.cpuUsage > 80 || currentMetrics.frameDrops > 3) {
      newLevel = 'medium';
    } else if (currentMetrics.batteryLevel < 20 || currentMetrics.isLowPowerMode) {
      newLevel = 'low';
    }

    if (newLevel !== optimizationLevel) {
      setOptimizationLevel(newLevel);
      console.log(`Optimization level changed to: ${newLevel}`);
    }
  }, [config.maxMemoryUsage, optimizationLevel]);

  const enterPowerSaveMode = useCallback(() => {
    setIsPowerSaveMode(true);
    setOptimizationLevel('maximum');
    setConfig(prev => ({
      ...prev,
      reducedAnimations: true,
      adaptiveImageQuality: true,
      targetFrameRate: 30,
    }));
  }, []);

  const exitPowerSaveMode = useCallback(() => {
    setIsPowerSaveMode(false);
    setOptimizationLevel('none');
    setConfig(prev => ({
      ...prev,
      reducedAnimations: accessibilityConfig.reducedMotion,
      targetFrameRate: 60,
    }));
  }, [accessibilityConfig.reducedMotion]);

  const enableBackgroundOptimization = useCallback(() => {
    // Reduce background activity
    stopPerformanceMonitoring();
    setOptimizationLevel(prev => prev === 'none' ? 'low' : prev);
  }, [stopPerformanceMonitoring]);

  const disableBackgroundOptimization = useCallback(() => {
    // Resume normal activity
    if (config.enablePerformanceMonitoring) {
      startPerformanceMonitoring();
    }
  }, [config.enablePerformanceMonitoring, startPerformanceMonitoring]);

  const getOptimizedImageSize = useCallback((originalSize: { width: number; height: number }) => {
    if (!config.adaptiveImageQuality) {
      return originalSize;
    }

    let scaleFactor = 1.0;

    switch (optimizationLevel) {
      case 'low':
        scaleFactor = 0.9;
        break;
      case 'medium':
        scaleFactor = 0.8;
        break;
      case 'high':
        scaleFactor = 0.7;
        break;
      case 'maximum':
        scaleFactor = 0.5;
        break;
      default:
        scaleFactor = 1.0;
    }

    return {
      width: Math.floor(originalSize.width * scaleFactor),
      height: Math.floor(originalSize.height * scaleFactor),
    };
  }, [config.adaptiveImageQuality, optimizationLevel]);

  const getOptimizedAnimationDuration = useCallback((originalDuration: number) => {
    if (config.reducedAnimations || optimizationLevel === 'maximum') {
      return 0;
    }

    let multiplier = 1.0;

    switch (optimizationLevel) {
      case 'low':
        multiplier = 0.8;
        break;
      case 'medium':
        multiplier = 0.6;
        break;
      case 'high':
        multiplier = 0.4;
        break;
      default:
        multiplier = 1.0;
    }

    // Also consider accessibility settings
    const accessibilityDuration = getAnimationDuration(originalDuration * multiplier);
    return accessibilityDuration;
  }, [config.reducedAnimations, optimizationLevel, getAnimationDuration]);

  // Derived states
  const shouldReduceQuality = optimizationLevel === 'high' || optimizationLevel === 'maximum';
  const shouldDisableAnimations = config.reducedAnimations || optimizationLevel === 'maximum';

  // Performance measurement utilities
  useEffect(() => {
    const measureRenderTime = () => {
      renderStartTime.current = performance.now();
    };

    const measureRenderEnd = () => {
      if (renderStartTime.current > 0) {
        frameTimeRef.current = performance.now() - renderStartTime.current;
        renderStartTime.current = 0;
      }
    };

    // In a real implementation, these would be called from render lifecycle
    const interval = setInterval(() => {
      measureRenderTime();
      setTimeout(measureRenderEnd, 16); // Simulate render time
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-start monitoring
  useEffect(() => {
    if (config.enablePerformanceMonitoring) {
      startPerformanceMonitoring();
    }

    return () => {
      stopPerformanceMonitoring();
    };
  }, [config.enablePerformanceMonitoring, startPerformanceMonitoring, stopPerformanceMonitoring]);

  return {
    metrics,
    config,
    updateConfig,
    optimizationLevel,
    isLowPerformanceDevice,
    shouldReduceQuality,
    shouldDisableAnimations,
    enterPowerSaveMode,
    exitPowerSaveMode,
    isPowerSaveMode,
    startPerformanceMonitoring,
    stopPerformanceMonitoring,
    getOptimizedImageSize,
    getOptimizedAnimationDuration,
  };
}

// Helper hook for component-level optimization
export function useComponentOptimization() {
  const { shouldReduceQuality, shouldDisableAnimations, getOptimizedAnimationDuration } = useMobileOptimization();

  const getOptimizedStyle = useCallback((baseStyle: any) => {
    if (shouldReduceQuality) {
      return {
        ...baseStyle,
        shadowOpacity: 0,
        elevation: 0,
        borderRadius: Math.min(baseStyle.borderRadius || 0, 4),
      };
    }
    return baseStyle;
  }, [shouldReduceQuality]);

  const getOptimizedAnimationConfig = useCallback((duration: number) => {
    return {
      duration: getOptimizedAnimationDuration(duration),
      useNativeDriver: true,
    };
  }, [getOptimizedAnimationDuration]);

  return {
    shouldReduceQuality,
    shouldDisableAnimations,
    getOptimizedStyle,
    getOptimizedAnimationConfig,
  };
}