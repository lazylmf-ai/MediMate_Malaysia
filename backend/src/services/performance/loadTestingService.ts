/**
 * Load Testing Service  
 * Comprehensive load and stress testing for MediMate Malaysia
 * Task #009: Security Testing & Performance Optimization
 */

import { performance } from "perf_hooks";
import axios from "axios";

export interface LoadTestConfig {
  endpoint: string;
  method: string;
  concurrentUsers: number;
  requestsPerUser: number;
  rampUpTime: number; // seconds
  testDuration: number; // seconds
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface LoadTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
  errorRate: number;
  successRate: number;
  responseTimes: number[];
}

export interface LoadTestResult {
  config: LoadTestConfig;
  metrics: LoadTestMetrics;
  errors: any[];
  startTime: string;
  endTime: string;
  duration: number;
  passed: boolean;
  thresholds: {
    averageResponseTime: { threshold: number; actual: number; passed: boolean };
    p95ResponseTime: { threshold: number; actual: number; passed: boolean };
    errorRate: { threshold: number; actual: number; passed: boolean };
    throughput: { threshold: number; actual: number; passed: boolean };
  };
}

export class LoadTestingService {
  private initialized = false;
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      "User-Agent": "MediMate-LoadTester/1.0",
      "Content-Type": "application/json"
    };
  }

  /**
   * Initialize load testing service
   */
  async initialize(): Promise<void> {
    console.log("🔄 Initializing Load Testing Service...");
    
    try {
      // Verify application is running
      await this.verifyApplicationHealth();
      
      this.initialized = true;
      console.log("✅ Load Testing Service initialized");
    } catch (error) {
      console.error("❌ Failed to initialize Load Testing Service:", error);
      throw error;
    }
  }

  /**
   * Run comprehensive load testing suite
   */
  async runComprehensiveLoadTests(): Promise<{
    results: LoadTestResult[];
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      overallScore: number;
      bottlenecks: string[];
    };
  }> {
    console.log("🚀 Starting comprehensive load testing suite...");
    
    if (!this.initialized) {
      throw new Error("Load Testing Service not initialized");
    }

    const testConfigs = this.generateLoadTestConfigs();
    const results: LoadTestResult[] = [];

    // Run load tests sequentially to avoid overwhelming the system
    for (const config of testConfigs) {
      console.log(`🔄 Running load test: ${config.method} ${config.endpoint} with ${config.concurrentUsers} users`);
      
      try {
        const result = await this.runLoadTest(config);
        results.push(result);
        
        // Wait between tests to allow system recovery
        await this.sleep(5000);
        
        console.log(`✅ Test completed: ${result.passed ? "PASSED" : "FAILED"}`);
      } catch (error) {
        console.error(`❌ Load test failed: ${error.message}`);
        results.push(this.createFailedTestResult(config, error));
      }
    }

    // Generate summary
    const summary = this.generateLoadTestSummary(results);
    
    console.log("✅ Comprehensive load testing suite completed");
    
    return { results, summary };
  }

  /**
   * Run single load test
   */
  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    console.log(`🔄 Starting load test: ${config.endpoint}`);
    
    const startTime = new Date().toISOString();
    const startTimestamp = performance.now();
    
    const responseTimes: number[] = [];
    const errors: any[] = [];
    let successfulRequests = 0;
    let failedRequests = 0;

    // Calculate timing
    const usersPerSecond = config.concurrentUsers / config.rampUpTime;
    const requestInterval = 1000 / usersPerSecond; // ms between user starts

    // Create user promises with ramp-up
    const userPromises: Promise<void>[] = [];
    
    for (let i = 0; i < config.concurrentUsers; i++) {
      const userDelay = i * requestInterval;
      
      const userPromise = this.simulateUser(
        config,
        userDelay,
        responseTimes,
        errors,
        () => successfulRequests++,
        () => failedRequests++
      );
      
      userPromises.push(userPromise);
    }

    // Wait for all users to complete
    await Promise.all(userPromises);
    
    const endTimestamp = performance.now();
    const endTime = new Date().toISOString();
    const duration = endTimestamp - startTimestamp;

    // Calculate metrics
    const metrics = this.calculateLoadTestMetrics(
      responseTimes,
      successfulRequests,
      failedRequests,
      duration
    );

    // Evaluate against thresholds
    const thresholds = this.evaluateThresholds(config, metrics);
    const passed = Object.values(thresholds).every(t => t.passed);

    return {
      config,
      metrics,
      errors,
      startTime,
      endTime,
      duration,
      passed,
      thresholds
    };
  }

  /**
   * Simulate individual user behavior
   */
  private async simulateUser(
    config: LoadTestConfig,
    delay: number,
    responseTimes: number[],
    errors: any[],
    onSuccess: () => void,
    onFailure: () => void
  ): Promise<void> {
    // Wait for ramp-up delay
    if (delay > 0) {
      await this.sleep(delay);
    }

    // Execute requests
    for (let i = 0; i < config.requestsPerUser; i++) {
      try {
        const requestStart = performance.now();
        
        const response = await axios({
          method: config.method.toLowerCase(),
          url: `${this.baseUrl}${config.endpoint}`,
          headers: { ...this.defaultHeaders, ...config.headers },
          data: config.body,
          timeout: config.timeout || 30000,
          validateStatus: () => true // Don't throw on HTTP errors
        });
        
        const requestTime = performance.now() - requestStart;
        responseTimes.push(requestTime);
        
        if (response.status >= 200 && response.status < 400) {
          onSuccess();
        } else {
          onFailure();
          errors.push({
            status: response.status,
            statusText: response.statusText,
            timestamp: new Date().toISOString()
          });
        }
        
        // Small delay between requests from same user
        await this.sleep(100);
        
      } catch (error) {
        onFailure();
        responseTimes.push(config.timeout || 30000); // Timeout as max response time
        errors.push({
          message: error.message,
          code: error.code,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Calculate load test metrics
   */
  private calculateLoadTestMetrics(
    responseTimes: number[],
    successfulRequests: number,
    failedRequests: number,
    duration: number
  ): LoadTestMetrics {
    if (responseTimes.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0,
        errorRate: 100,
        successRate: 0,
        responseTimes: []
      };
    }

    // Sort response times for percentile calculations
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    
    const totalRequests = successfulRequests + failedRequests;
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    
    // Calculate percentiles
    const p50ResponseTime = this.calculatePercentile(sortedTimes, 0.50);
    const p95ResponseTime = this.calculatePercentile(sortedTimes, 0.95);
    const p99ResponseTime = this.calculatePercentile(sortedTimes, 0.99);
    
    const throughput = (totalRequests / duration) * 1000; // requests per second
    const errorRate = (failedRequests / totalRequests) * 100;
    const successRate = (successfulRequests / totalRequests) * 100;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      p50ResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      throughput,
      errorRate,
      successRate,
      responseTimes
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = percentile * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
    if (lower === upper) return sortedArray[lower];
    
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Evaluate performance thresholds
   */
  private evaluateThresholds(config: LoadTestConfig, metrics: LoadTestMetrics): any {
    const thresholds = this.getPerformanceThresholds(config);
    
    return {
      averageResponseTime: {
        threshold: thresholds.averageResponseTime,
        actual: metrics.averageResponseTime,
        passed: metrics.averageResponseTime <= thresholds.averageResponseTime
      },
      p95ResponseTime: {
        threshold: thresholds.p95ResponseTime,
        actual: metrics.p95ResponseTime,
        passed: metrics.p95ResponseTime <= thresholds.p95ResponseTime
      },
      errorRate: {
        threshold: thresholds.errorRate,
        actual: metrics.errorRate,
        passed: metrics.errorRate <= thresholds.errorRate
      },
      throughput: {
        threshold: thresholds.throughput,
        actual: metrics.throughput,
        passed: metrics.throughput >= thresholds.throughput
      }
    };
  }

  /**
   * Get performance thresholds based on endpoint type
   */
  private getPerformanceThresholds(config: LoadTestConfig): any {
    // Healthcare-specific performance thresholds
    const healthcareThresholds = {
      emergency: {
        averageResponseTime: 100,
        p95ResponseTime: 200,
        errorRate: 0.1,
        throughput: 50
      },
      critical: {
        averageResponseTime: 200,
        p95ResponseTime: 500,
        errorRate: 0.5,
        throughput: 30
      },
      standard: {
        averageResponseTime: 500,
        p95ResponseTime: 1000,
        errorRate: 1.0,
        throughput: 20
      },
      cultural: {
        averageResponseTime: 300,
        p95ResponseTime: 600,
        errorRate: 1.0,
        throughput: 50
      }
    };

    // Determine threshold category based on endpoint
    if (config.endpoint.includes("emergency")) {
      return healthcareThresholds.emergency;
    } else if (config.endpoint.includes("patient") || config.endpoint.includes("medication")) {
      return healthcareThresholds.critical;
    } else if (config.endpoint.includes("cultural") || config.endpoint.includes("prayer")) {
      return healthcareThresholds.cultural;
    } else {
      return healthcareThresholds.standard;
    }
  }

  /**
   * Generate load test configurations
   */
  private generateLoadTestConfigs(): LoadTestConfig[] {
    return [
      // Emergency access endpoints - must be fastest
      {
        endpoint: "/api/v1/emergency-access/patient",
        method: "GET",
        concurrentUsers: 10,
        requestsPerUser: 5,
        rampUpTime: 5,
        testDuration: 30
      },
      {
        endpoint: "/api/v1/emergency-access/patient",
        method: "GET", 
        concurrentUsers: 50,
        requestsPerUser: 5,
        rampUpTime: 10,
        testDuration: 60
      },

      // Patient data endpoints - critical performance
      {
        endpoint: "/api/v1/patients",
        method: "GET",
        concurrentUsers: 25,
        requestsPerUser: 10,
        rampUpTime: 10,
        testDuration: 60
      },
      {
        endpoint: "/api/v1/patients",
        method: "GET",
        concurrentUsers: 100,
        requestsPerUser: 10,
        rampUpTime: 20,
        testDuration: 120
      },
      {
        endpoint: "/api/v1/patients",
        method: "GET",
        concurrentUsers: 500,
        requestsPerUser: 5,
        rampUpTime: 30,
        testDuration: 180
      },

      // Medication endpoints - critical for patient safety
      {
        endpoint: "/api/v1/medications",
        method: "GET",
        concurrentUsers: 50,
        requestsPerUser: 8,
        rampUpTime: 15,
        testDuration: 90
      },
      {
        endpoint: "/api/v1/medications/active", 
        method: "GET",
        concurrentUsers: 100,
        requestsPerUser: 5,
        rampUpTime: 20,
        testDuration: 120
      },

      // Appointment endpoints - high usage
      {
        endpoint: "/api/v1/appointments",
        method: "GET",
        concurrentUsers: 100,
        requestsPerUser: 8,
        rampUpTime: 20,
        testDuration: 120
      },
      {
        endpoint: "/api/v1/appointments/upcoming",
        method: "GET", 
        concurrentUsers: 200,
        requestsPerUser: 5,
        rampUpTime: 30,
        testDuration: 180
      },

      // Cultural intelligence endpoints - high usage in Malaysia
      {
        endpoint: "/api/v1/cultural/prayer-times",
        method: "GET",
        concurrentUsers: 200,
        requestsPerUser: 3,
        rampUpTime: 20,
        testDuration: 120
      },
      {
        endpoint: "/api/v1/cultural/halal-validation",
        method: "POST",
        concurrentUsers: 100,
        requestsPerUser: 3,
        rampUpTime: 15,
        testDuration: 90,
        body: { medicationName: "Paracetamol", ingredients: ["paracetamol"] }
      },
      {
        endpoint: "/api/v1/holidays",
        method: "GET",
        concurrentUsers: 500,
        requestsPerUser: 2,
        rampUpTime: 30,
        testDuration: 150
      },

      // Real-time endpoints - must handle many concurrent connections
      {
        endpoint: "/api/v1/realtime/dashboard",
        method: "GET",
        concurrentUsers: 500,
        requestsPerUser: 2,
        rampUpTime: 30,
        testDuration: 180
      },
      {
        endpoint: "/api/v1/realtime/notifications",
        method: "GET", 
        concurrentUsers: 1000,
        requestsPerUser: 1,
        rampUpTime: 60,
        testDuration: 300
      },

      // Health check - must always be fast
      {
        endpoint: "/health",
        method: "GET",
        concurrentUsers: 1000,
        requestsPerUser: 1,
        rampUpTime: 30,
        testDuration: 120
      },

      // Authentication endpoints - security critical
      {
        endpoint: "/api/v1/auth/refresh",
        method: "POST",
        concurrentUsers: 200,
        requestsPerUser: 3,
        rampUpTime: 20,
        testDuration: 120,
        body: { refreshToken: "test-refresh-token" }
      }
    ];
  }

  /**
   * Generate load test summary
   */
  private generateLoadTestSummary(results: LoadTestResult[]): any {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    // Calculate overall score
    let score = 100;
    const failureRate = (failedTests / totalTests) * 100;
    score -= failureRate * 2; // Penalize failures heavily

    // Identify bottlenecks
    const bottlenecks: string[] = [];
    const slowEndpoints = results.filter(r => r.metrics.p95ResponseTime > 1000);
    const errorProneEndpoints = results.filter(r => r.metrics.errorRate > 2);
    const lowThroughputEndpoints = results.filter(r => r.metrics.throughput < 10);

    if (slowEndpoints.length > 0) {
      bottlenecks.push(`Slow response times: ${slowEndpoints.map(e => e.config.endpoint).join(", ")}`);
    }
    if (errorProneEndpoints.length > 0) {
      bottlenecks.push(`High error rates: ${errorProneEndpoints.map(e => e.config.endpoint).join(", ")}`);
    }
    if (lowThroughputEndpoints.length > 0) {
      bottlenecks.push(`Low throughput: ${lowThroughputEndpoints.map(e => e.config.endpoint).join(", ")}`);
    }

    return {
      totalTests,
      passedTests,
      failedTests,
      overallScore: Math.max(0, Math.round(score)),
      bottlenecks
    };
  }

  /**
   * Create failed test result
   */
  private createFailedTestResult(config: LoadTestConfig, error: any): LoadTestResult {
    return {
      config,
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0,
        errorRate: 100,
        successRate: 0,
        responseTimes: []
      },
      errors: [{ message: error.message, timestamp: new Date().toISOString() }],
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 0,
      passed: false,
      thresholds: {
        averageResponseTime: { threshold: 0, actual: 0, passed: false },
        p95ResponseTime: { threshold: 0, actual: 0, passed: false },
        errorRate: { threshold: 0, actual: 100, passed: false },
        throughput: { threshold: 0, actual: 0, passed: false }
      }
    };
  }

  /**
   * Verify application health
   */
  private async verifyApplicationHealth(): Promise<void> {
    try {
      const response = await axios({
        method: "get",
        url: `${this.baseUrl}/health`,
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status !== 200) {
        throw new Error(`Application health check failed with status ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Cannot connect to application at ${this.baseUrl}: ${error.message}`);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
