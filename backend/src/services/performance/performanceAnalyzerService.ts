/**
 * Performance Analyzer Service
 * Comprehensive performance monitoring and optimization for MediMate Malaysia
 * Task #009: Security Testing & Performance Optimization
 */

import { performance } from "perf_hooks";
import { promisify } from "util";
import { exec } from "child_process";
import axios from "axios";

const execAsync = promisify(exec);

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  cpuUsage: number;
  memoryUsage: number;
  dbQueryTime: number;
  cacheHitRate: number;
  errorRate: number;
}

export interface LoadTestResult {
  endpoint: string;
  method: string;
  concurrentUsers: number;
  totalRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
  successRate: number;
}

export interface OptimizationRecommendation {
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  issue: string;
  recommendation: string;
  expectedImprovement: string;
  implementationEffort: "LOW" | "MEDIUM" | "HIGH";
}

export class PerformanceAnalyzerService {
  private initialized = false;
  private baseUrl: string;
  private metrics: PerformanceMetrics[] = [];
  private loadTestResults: LoadTestResult[] = [];
  private recommendations: OptimizationRecommendation[] = [];

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize performance analyzer service
   */
  async initialize(): Promise<void> {
    console.log("⚡ Initializing Performance Analyzer Service...");
    
    try {
      // Clear previous results
      this.metrics = [];
      this.loadTestResults = [];
      this.recommendations = [];
      
      // Verify application is running
      await this.verifyApplicationHealth();
      
      this.initialized = true;
      console.log("✅ Performance Analyzer Service initialized");
    } catch (error) {
      console.error("❌ Failed to initialize Performance Analyzer Service:", error);
      throw error;
    }
  }

  /**
   * Run comprehensive performance analysis
   */
  async runComprehensivePerformanceAnalysis(): Promise<{
    metrics: PerformanceMetrics[];
    loadTestResults: LoadTestResult[];
    recommendations: OptimizationRecommendation[];
    overallScore: number;
    bottlenecks: string[];
  }> {
    console.log("🔍 Starting comprehensive performance analysis...");
    
    if (!this.initialized) {
      throw new Error("Performance Analyzer Service not initialized");
    }

    // Reset results
    this.metrics = [];
    this.loadTestResults = [];
    this.recommendations = [];

    // Run performance tests
    await Promise.all([
      this.measureBaselinePerformance(),
      this.runHealthcareLoadTests(),
      this.analyzeApiPerformance(),
      this.analyzeDatabasePerformance(),
      this.analyzeCachePerformance(),
      this.analyzeRealTimePerformance()
    ]);

    // Generate recommendations
    await this.generateOptimizationRecommendations();

    // Calculate overall score and identify bottlenecks
    const overallScore = this.calculatePerformanceScore();
    const bottlenecks = this.identifyBottlenecks();

    console.log("✅ Comprehensive performance analysis completed");
    
    return {
      metrics: this.metrics,
      loadTestResults: this.loadTestResults,
      recommendations: this.recommendations,
      overallScore,
      bottlenecks
    };
  }

  /**
   * Run healthcare-specific load tests
   */
  async runHealthcareLoadTests(): Promise<void> {
    console.log("🏥 Running healthcare load tests...");

    const healthcareEndpoints = [
      { endpoint: "/api/v1/patients", method: "GET", users: [10, 50, 100, 500] },
      { endpoint: "/api/v1/appointments", method: "GET", users: [10, 50, 100, 500] },
      { endpoint: "/api/v1/medications", method: "GET", users: [10, 50, 100, 500] },
      { endpoint: "/api/v1/medical-records", method: "GET", users: [5, 25, 50, 100] }, // Lower due to sensitive data
      { endpoint: "/api/v1/cultural/prayer-times", method: "GET", users: [50, 100, 500, 1000] },
      { endpoint: "/api/v1/cultural/halal-validation", method: "POST", users: [10, 50, 100, 200] },
      { endpoint: "/api/v1/realtime/dashboard", method: "GET", users: [20, 100, 500, 1000] }
    ];

    for (const test of healthcareEndpoints) {
      for (const userCount of test.users) {
        const result = await this.performLoadTest(test.endpoint, test.method, userCount);
        this.loadTestResults.push(result);
        
        // Wait between tests to avoid overwhelming the system
        await this.sleep(2000);
      }
    }
  }

  /**
   * Perform load test on specific endpoint
   */
  private async performLoadTest(endpoint: string, method: string, concurrentUsers: number): Promise<LoadTestResult> {
    const requestsPerUser = 10;
    const totalRequests = concurrentUsers * requestsPerUser;
    const results: number[] = [];
    let successCount = 0;
    let errorCount = 0;

    console.log(`🔄 Load testing ${endpoint} with ${concurrentUsers} users...`);

    const startTime = performance.now();

    // Create concurrent user requests
    const userPromises = Array.from({ length: concurrentUsers }, async () => {
      for (let i = 0; i < requestsPerUser; i++) {
        try {
          const requestStart = performance.now();
          const response = await this.makeRequest(method, endpoint);
          const requestTime = performance.now() - requestStart;
          
          results.push(requestTime);
          
          if (response.status >= 200 && response.status < 400) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
          results.push(10000); // 10s timeout as failure
        }
        
        // Small delay between requests from same user
        await this.sleep(100);
      }
    });

    await Promise.all(userPromises);
    const totalTime = performance.now() - startTime;

    // Calculate statistics
    results.sort((a, b) => a - b);
    const averageResponseTime = results.reduce((a, b) => a + b, 0) / results.length;
    const p95ResponseTime = results[Math.floor(results.length * 0.95)];
    const p99ResponseTime = results[Math.floor(results.length * 0.99)];
    const throughput = (totalRequests / totalTime) * 1000; // requests per second
    const errorRate = (errorCount / totalRequests) * 100;
    const successRate = (successCount / totalRequests) * 100;

    return {
      endpoint,
      method,
      concurrentUsers,
      totalRequests,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      throughput,
      errorRate,
      successRate
    };
  }

  /**
   * Measure baseline performance metrics
   */
  private async measureBaselinePerformance(): Promise<void> {
    console.log("📊 Measuring baseline performance metrics...");

    try {
      const systemMetrics = await this.getSystemMetrics();
      const appMetrics = await this.getApplicationMetrics();
      
      this.metrics.push({
        responseTime: appMetrics.avgResponseTime,
        throughput: appMetrics.requestsPerSecond,
        cpuUsage: systemMetrics.cpuUsage,
        memoryUsage: systemMetrics.memoryUsage,
        dbQueryTime: appMetrics.avgDbQueryTime,
        cacheHitRate: appMetrics.cacheHitRate,
        errorRate: appMetrics.errorRate
      });
    } catch (error) {
      console.error("Failed to measure baseline performance:", error);
    }
  }

  /**
   * Analyze API performance
   */
  private async analyzeApiPerformance(): Promise<void> {
    console.log("🔌 Analyzing API performance...");

    const criticalEndpoints = [
      "/api/v1/patients",
      "/api/v1/appointments/upcoming",
      "/api/v1/medications/active", 
      "/api/v1/cultural/prayer-times",
      "/health"
    ];

    for (const endpoint of criticalEndpoints) {
      const samples = 10;
      const times: number[] = [];

      for (let i = 0; i < samples; i++) {
        try {
          const start = performance.now();
          await this.makeRequest("GET", endpoint);
          const time = performance.now() - start;
          times.push(time);
        } catch (error) {
          times.push(5000); // 5s as failure penalty
        }
        await this.sleep(500);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      
      if (avgTime > 200) { // Healthcare APIs should be under 200ms
        this.recommendations.push({
          category: "API Performance",
          priority: avgTime > 1000 ? "CRITICAL" : avgTime > 500 ? "HIGH" : "MEDIUM",
          issue: `${endpoint} average response time: ${avgTime.toFixed(2)}ms`,
          recommendation: "Optimize database queries, add caching, or implement pagination",
          expectedImprovement: "50-80% response time reduction",
          implementationEffort: "MEDIUM"
        });
      }
    }
  }

  /**
   * Analyze database performance
   */
  private async analyzeDatabasePerformance(): Promise<void> {
    console.log("🗃️ Analyzing database performance...");

    try {
      // Simulate database performance analysis
      const dbMetrics = await this.simulateDatabaseMetrics();
      
      if (dbMetrics.avgQueryTime > 50) {
        this.recommendations.push({
          category: "Database Performance",
          priority: dbMetrics.avgQueryTime > 200 ? "CRITICAL" : "HIGH",
          issue: `Average database query time: ${dbMetrics.avgQueryTime}ms`,
          recommendation: "Add database indexes, optimize queries, implement query caching",
          expectedImprovement: "60-90% query time reduction",
          implementationEffort: "MEDIUM"
        });
      }

      if (dbMetrics.slowQueries > 10) {
        this.recommendations.push({
          category: "Database Performance", 
          priority: "HIGH",
          issue: `${dbMetrics.slowQueries} slow queries detected`,
          recommendation: "Identify and optimize slow queries, add proper indexes",
          expectedImprovement: "Eliminate slow query bottlenecks",
          implementationEffort: "HIGH"
        });
      }
    } catch (error) {
      console.error("Database performance analysis failed:", error);
    }
  }

  /**
   * Analyze cache performance
   */
  private async analyzeCachePerformance(): Promise<void> {
    console.log("⚡ Analyzing cache performance...");

    try {
      const cacheMetrics = await this.getCacheMetrics();
      
      if (cacheMetrics.hitRate < 80) {
        this.recommendations.push({
          category: "Cache Performance",
          priority: cacheMetrics.hitRate < 50 ? "HIGH" : "MEDIUM",
          issue: `Cache hit rate: ${cacheMetrics.hitRate}%`,
          recommendation: "Optimize cache strategy, increase cache TTL, add more cacheable endpoints",
          expectedImprovement: "20-40% response time improvement",
          implementationEffort: "LOW"
        });
      }

      if (cacheMetrics.avgRetrievalTime > 10) {
        this.recommendations.push({
          category: "Cache Performance",
          priority: "MEDIUM",
          issue: `Cache retrieval time: ${cacheMetrics.avgRetrievalTime}ms`,
          recommendation: "Optimize Redis configuration, use connection pooling",
          expectedImprovement: "50-70% cache retrieval improvement", 
          implementationEffort: "LOW"
        });
      }
    } catch (error) {
      console.error("Cache performance analysis failed:", error);
    }
  }

  /**
   * Analyze real-time performance
   */
  private async analyzeRealTimePerformance(): Promise<void> {
    console.log("⚡ Analyzing real-time service performance...");

    try {
      const realTimeMetrics = await this.getRealTimeMetrics();
      
      if (realTimeMetrics.avgLatency > 1000) {
        this.recommendations.push({
          category: "Real-time Performance",
          priority: "HIGH",
          issue: `WebSocket message latency: ${realTimeMetrics.avgLatency}ms`,
          recommendation: "Optimize WebSocket handling, implement message queuing",
          expectedImprovement: "60-80% latency reduction",
          implementationEffort: "MEDIUM"
        });
      }

      if (realTimeMetrics.connectionDropRate > 5) {
        this.recommendations.push({
          category: "Real-time Performance",
          priority: "HIGH", 
          issue: `High connection drop rate: ${realTimeMetrics.connectionDropRate}%`,
          recommendation: "Implement connection pooling, add reconnection logic",
          expectedImprovement: "90% reduction in connection drops",
          implementationEffort: "MEDIUM"
        });
      }
    } catch (error) {
      console.error("Real-time performance analysis failed:", error);
    }
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(): Promise<void> {
    console.log("💡 Generating optimization recommendations...");

    // Analyze load test results for bottlenecks
    for (const result of this.loadTestResults) {
      if (result.p95ResponseTime > 200) {
        this.recommendations.push({
          category: "Load Performance",
          priority: result.p95ResponseTime > 1000 ? "CRITICAL" : "HIGH",
          issue: `${result.endpoint} P95 response time: ${result.p95ResponseTime.toFixed(2)}ms under ${result.concurrentUsers} concurrent users`,
          recommendation: "Implement caching, optimize database queries, add load balancing",
          expectedImprovement: "Reduce P95 response time to <200ms",
          implementationEffort: "HIGH"
        });
      }

      if (result.errorRate > 1) {
        this.recommendations.push({
          category: "Reliability", 
          priority: result.errorRate > 5 ? "CRITICAL" : "HIGH",
          issue: `${result.endpoint} error rate: ${result.errorRate.toFixed(2)}%`,
          recommendation: "Implement circuit breakers, improve error handling, add retry logic",
          expectedImprovement: "Reduce error rate to <0.1%",
          implementationEffort: "MEDIUM"
        });
      }

      if (result.throughput < 100) {
        this.recommendations.push({
          category: "Throughput",
          priority: "MEDIUM", 
          issue: `${result.endpoint} low throughput: ${result.throughput.toFixed(2)} RPS`,
          recommendation: "Optimize request processing, implement connection pooling",
          expectedImprovement: "2-5x throughput increase",
          implementationEffort: "MEDIUM"
        });
      }
    }

    // Healthcare-specific recommendations
    this.addHealthcareSpecificRecommendations();
  }

  /**
   * Add healthcare-specific performance recommendations
   */
  private addHealthcareSpecificRecommendations(): void {
    // Emergency access performance
    this.recommendations.push({
      category: "Healthcare Performance",
      priority: "CRITICAL",
      issue: "Emergency access endpoints must have <100ms response time",
      recommendation: "Implement dedicated emergency cache, pre-warm critical data",
      expectedImprovement: "Sub-100ms emergency response time",
      implementationEffort: "HIGH"
    });

    // Real-time monitoring performance
    this.recommendations.push({
      category: "Healthcare Performance",
      priority: "HIGH",
      issue: "Patient monitoring alerts must be delivered within 1 second",
      recommendation: "Implement push notifications, optimize WebSocket message routing",
      expectedImprovement: "Real-time alert delivery <1s",
      implementationEffort: "MEDIUM"
    });

    // Malaysian cultural context performance
    this.recommendations.push({
      category: "Cultural Performance",
      priority: "MEDIUM",
      issue: "Cultural context loading adds latency to healthcare requests",
      recommendation: "Cache cultural preferences, pre-load prayer times",
      expectedImprovement: "30-50% cultural context loading improvement",
      implementationEffort: "LOW"
    });
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(): number {
    if (this.loadTestResults.length === 0) return 0;

    let score = 100;
    
    // Penalize high response times
    const avgResponseTime = this.loadTestResults.reduce((acc, r) => acc + r.averageResponseTime, 0) / this.loadTestResults.length;
    if (avgResponseTime > 200) score -= 20;
    if (avgResponseTime > 500) score -= 30;
    if (avgResponseTime > 1000) score -= 40;

    // Penalize high error rates
    const avgErrorRate = this.loadTestResults.reduce((acc, r) => acc + r.errorRate, 0) / this.loadTestResults.length;
    if (avgErrorRate > 1) score -= 15;
    if (avgErrorRate > 5) score -= 35;

    // Penalize low throughput
    const avgThroughput = this.loadTestResults.reduce((acc, r) => acc + r.throughput, 0) / this.loadTestResults.length;
    if (avgThroughput < 50) score -= 20;
    if (avgThroughput < 20) score -= 40;

    return Math.max(0, score);
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(): string[] {
    const bottlenecks: string[] = [];

    // Check for response time bottlenecks
    const slowEndpoints = this.loadTestResults.filter(r => r.p95ResponseTime > 500);
    if (slowEndpoints.length > 0) {
      bottlenecks.push(`Slow endpoints: ${slowEndpoints.map(e => e.endpoint).join(", ")}`);
    }

    // Check for throughput bottlenecks
    const lowThroughputEndpoints = this.loadTestResults.filter(r => r.throughput < 50);
    if (lowThroughputEndpoints.length > 0) {
      bottlenecks.push(`Low throughput endpoints: ${lowThroughputEndpoints.map(e => e.endpoint).join(", ")}`);
    }

    // Check for error rate bottlenecks
    const errorProneEndpoints = this.loadTestResults.filter(r => r.errorRate > 2);
    if (errorProneEndpoints.length > 0) {
      bottlenecks.push(`Error-prone endpoints: ${errorProneEndpoints.map(e => e.endpoint).join(", ")}`);
    }

    // Check critical recommendations
    const criticalRecs = this.recommendations.filter(r => r.priority === "CRITICAL");
    if (criticalRecs.length > 0) {
      bottlenecks.push(...criticalRecs.map(r => r.issue));
    }

    return bottlenecks;
  }

  /**
   * Make HTTP request for testing
   */
  private async makeRequest(method: string, path: string): Promise<any> {
    try {
      const response = await axios({
        method: method.toLowerCase(),
        url: `${this.baseUrl}${path}`,
        timeout: 10000,
        validateStatus: () => true
      });
      
      return {
        status: response.status,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      if (error.code === "ECONNREFUSED") {
        throw new Error("Application not running");
      }
      throw error;
    }
  }

  /**
   * Utility function to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verify application health
   */
  private async verifyApplicationHealth(): Promise<void> {
    try {
      const response = await this.makeRequest("GET", "/health");
      if (response.status !== 200) {
        throw new Error(`Application health check failed with status ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Cannot connect to application at ${this.baseUrl}: ${error.message}`);
    }
  }

  // Mock/simulation methods (would be replaced with actual implementations)
  private async getSystemMetrics(): Promise<any> {
    return {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100
    };
  }

  private async getApplicationMetrics(): Promise<any> {
    return {
      avgResponseTime: 150 + Math.random() * 100,
      requestsPerSecond: 50 + Math.random() * 200,
      avgDbQueryTime: 20 + Math.random() * 80,
      cacheHitRate: 70 + Math.random() * 25,
      errorRate: Math.random() * 2
    };
  }

  private async simulateDatabaseMetrics(): Promise<any> {
    return {
      avgQueryTime: 30 + Math.random() * 50,
      slowQueries: Math.floor(Math.random() * 20)
    };
  }

  private async getCacheMetrics(): Promise<any> {
    return {
      hitRate: 75 + Math.random() * 20,
      avgRetrievalTime: 5 + Math.random() * 15
    };
  }

  private async getRealTimeMetrics(): Promise<any> {
    return {
      avgLatency: 500 + Math.random() * 1000,
      connectionDropRate: Math.random() * 10
    };
  }
}
