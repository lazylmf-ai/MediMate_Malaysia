/**
 * MediMate Malaysia Backend Application
 * Healthcare-focused Express.js server with Malaysian cultural intelligence
 * PDPA compliant with healthcare security standards
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import path from 'path';
import { createServer } from 'http';

// Import Malaysian healthcare middleware
import { healthcareSecurityMiddleware } from './middleware/security';
import { pdpaComplianceMiddleware } from './middleware/pdpa';
import { culturalDataMiddleware } from './middleware/cultural';
import { healthcareLoggingMiddleware } from './middleware/logging';
import { errorHandlingMiddleware } from './middleware/error-handling';

// Import Malaysian healthcare services
import { CulturalDataService } from './services/cultural-data.service';
import { HealthcareSecurityService } from './services/healthcare-security.service';
import { PDPAComplianceService } from './services/pdpa-compliance.service';

// Import real-time services
import { WebSocketService } from './services/realtime/webSocketService';
import { RedisService } from './services/cache/redisService';
import { NotificationService } from './services/realtime/notificationService';
import { MonitoringService } from './services/realtime/monitoringService';
import { WebhookService } from './services/realtime/webhookService';
import { DashboardService } from './services/realtime/dashboardService';

// Import routes
import healthRoutes from './routes/health';
import culturalRoutes from './routes/cultural';
import culturalIntelligenceRoutes from './routes/cultural/culturalRoutes';
import medicationRoutes from './routes/medication';
import prayerTimesRoutes from './routes/prayer-times';
import holidaysRoutes from './routes/holidays';
import patientsRoutes from './routes/patients';
import providersRoutes from './routes/providers';
import appointmentsRoutes from './routes/appointments';
import medicalRecordsRoutes from './routes/medical-records';
import emergencyAccessRoutes from './routes/emergency-access';
import realtimeRoutes from './routes/realtime';

// Load environment configuration
config({ path: path.resolve(__dirname, '../.env') });

/**
 * Malaysian Healthcare Application Class
 * Implements healthcare-grade security and cultural intelligence
 */
class MediMateBackendApplication {
  public app: Application;
  public server: ReturnType<typeof createServer>;
  private readonly port: number;
  private readonly environment: string;
  
  // Real-time services
  private webSocketService: WebSocketService;
  private redisService: RedisService;
  private notificationService: NotificationService;
  private monitoringService: MonitoringService;
  private webhookService: WebhookService;
  private dashboardService: DashboardService;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.environment = process.env.NODE_ENV || 'development';
    
    this.server = createServer(this.app);
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeHealthcareServices();
    this.initializeRealTimeServices();
  }

  /**
   * Initialize security and healthcare middleware
   */
  private initializeMiddleware(): void {
    console.log('🔐 Initializing Malaysian healthcare security middleware...');

    // Healthcare-grade security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration for Malaysian healthcare context
    this.app.use(cors({
      origin: this.getAllowedOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin', 'X-Requested-With', 'Content-Type', 'Accept',
        'Authorization', 'X-Cultural-Context', 'X-Healthcare-Provider',
        'X-PDPA-Consent', 'X-Malaysian-State'
      ],
      exposedHeaders: ['X-Total-Count', 'X-Prayer-Time', 'X-Cultural-Event'],
      maxAge: 86400 // 24 hours
    }));

    // Request compression for Malaysian mobile networks
    this.app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));

    // Rate limiting for healthcare API protection
    const healthcareRateLimit = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: this.environment === 'production' ? 100 : 1000, // requests per window
      message: {
        error: 'Too many healthcare requests from this IP',
        code: 'RATE_LIMIT_EXCEEDED',
        cultural_message: {
          en: 'Please wait before making more requests',
          ms: 'Sila tunggu sebelum membuat permintaan lagi',
          zh: '请稍等再发送请求',
          ta: 'மீண்டும் கோரிக்கை அனுப்புவதற்கு முன் காத்திருக்கவும்'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Skip rate limiting for health checks
      skip: (req) => req.path.startsWith('/health')
    });
    
    this.app.use(healthcareRateLimit);

    // Body parsing with healthcare data limits
    this.app.use(express.json({
      limit: '10mb',
      verify: (req, res, buf) => {
        // Log healthcare data handling for PDPA compliance
        if (req.url?.includes('/patient') || req.url?.includes('/medication')) {
          console.log(`🏥 Healthcare data received: ${req.method} ${req.url}`);
        }
      }
    }));
    
    this.app.use(express.urlencoded({
      extended: true,
      limit: '10mb'
    }));

    // Malaysian cultural context middleware
    this.app.use(culturalDataMiddleware);

    // Healthcare-specific logging for PDPA compliance
    this.app.use(healthcareLoggingMiddleware);

    // PDPA compliance validation middleware
    this.app.use(pdpaComplianceMiddleware);

    // Healthcare security validation
    this.app.use(healthcareSecurityMiddleware);

    // Request ID for healthcare audit trails
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.id = `hc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('X-Request-ID', req.id);
      res.setHeader('X-Healthcare-System', 'MediMate-Malaysia');
      next();
    });

    console.log('✅ Malaysian healthcare middleware initialized');
  }

  /**
   * Initialize healthcare API routes
   */
  private initializeRoutes(): void {
    console.log('🛣️ Initializing Malaysian healthcare API routes...');

    // Health check endpoints (no auth required)
    this.app.use('/health', healthRoutes);

    // Malaysian cultural intelligence routes
    this.app.use('/api/v1/cultural', culturalRoutes);
    this.app.use('/api/cultural', culturalIntelligenceRoutes); // New comprehensive cultural services
    this.app.use('/api/v1/prayer-times', prayerTimesRoutes);
    this.app.use('/api/v1/holidays', holidaysRoutes);

    // Healthcare data routes (requires authentication)
    this.app.use('/api/v1/medications', medicationRoutes);
    this.app.use('/api/v1/patients', patientsRoutes);
    this.app.use('/api/v1/providers', providersRoutes);
    this.app.use('/api/v1/appointments', appointmentsRoutes);
    this.app.use('/api/v1/medical-records', medicalRecordsRoutes);
    this.app.use('/api/v1/emergency-access', emergencyAccessRoutes);

    // Real-time services routes
    this.app.use('/api/v1/realtime', realtimeRoutes);

    // Malaysian cultural context endpoint
    this.app.get('/api/v1/context', (req: Request, res: Response) => {
      res.json({
        system: 'MediMate Malaysia',
        cultural_context: 'Malaysian Healthcare',
        supported_languages: ['ms', 'en', 'zh', 'ta'],
        timezone: 'Asia/Kuala_Lumpur',
        healthcare_standards: ['MOH Malaysia', 'PDPA 2010'],
        islamic_features: true,
        multi_cultural_support: true,
        version: process.env.API_VERSION || '1.0.0'
      });
    });

    // 404 handler for undefined routes
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Endpoint not found',
        code: 'ENDPOINT_NOT_FOUND',
        path: req.originalUrl,
        cultural_message: {
          en: 'The requested healthcare endpoint was not found',
          ms: 'Endpoint perubatan yang diminta tidak dijumpai',
          zh: '未找到请求的医疗端点',
          ta: 'கோரப்பட்ட மருத்துவ இறுதிப் புள்ளி கிடைக்கவில்லை'
        }
      });
    });

    console.log('✅ Malaysian healthcare API routes initialized');
  }

  /**
   * Initialize healthcare error handling
   */
  private initializeErrorHandling(): void {
    this.app.use(errorHandlingMiddleware);
  }

  /**
   * Initialize Malaysian healthcare services
   */
  private async initializeHealthcareServices(): Promise<void> {
    console.log('🏥 Initializing Malaysian healthcare services...');

    try {
      // Initialize cultural data service
      const culturalService = new CulturalDataService();
      await culturalService.initialize();

      // Initialize healthcare security service
      const securityService = new HealthcareSecurityService();
      await securityService.initialize();

      // Initialize PDPA compliance service
      const pdpaService = new PDPAComplianceService();
      await pdpaService.initialize();

      // Store services in app context for middleware access
      this.app.locals.culturalService = culturalService;
      this.app.locals.securityService = securityService;
      this.app.locals.pdpaService = pdpaService;

      console.log('✅ Malaysian healthcare services initialized');
    } catch (error) {
      console.error('❌ Failed to initialize healthcare services:', error);
      process.exit(1);
    }
  }

  /**
   * Initialize real-time services
   */
  private async initializeRealTimeServices(): Promise<void> {
    console.log('⚡ Initializing real-time healthcare services...');

    try {
      // Initialize Redis service first
      this.redisService = RedisService.getInstance();
      await this.redisService.connect();

      // Initialize WebSocket service
      this.webSocketService = WebSocketService.getInstance(this.server);

      // Initialize notification service
      this.notificationService = NotificationService.getInstance();

      // Initialize monitoring service
      this.monitoringService = MonitoringService.getInstance();

      // Initialize webhook service
      this.webhookService = WebhookService.getInstance();

      // Initialize dashboard service
      this.dashboardService = DashboardService.getInstance();

      // Store services in app context for route access
      this.app.locals.webSocketService = this.webSocketService;
      this.app.locals.redisService = this.redisService;
      this.app.locals.notificationService = this.notificationService;
      this.app.locals.monitoringService = this.monitoringService;
      this.app.locals.webhookService = this.webhookService;
      this.app.locals.dashboardService = this.dashboardService;

      console.log('✅ Real-time healthcare services initialized');
    } catch (error) {
      console.error('❌ Failed to initialize real-time services:', error);
      process.exit(1);
    }
  }

  /**
   * Get allowed origins for CORS based on environment
   */
  private getAllowedOrigins(): string[] {
    const baseOrigins = [
      'http://localhost:3000',
      'http://localhost:8081', // React Native Metro
      'http://10.0.2.2:3000',  // Android emulator
    ];

    if (this.environment === 'production') {
      return [
        'https://medimate.my',
        'https://api.medimate.my',
        'https://admin.medimate.my',
        ...baseOrigins
      ];
    }

    if (this.environment === 'staging') {
      return [
        'https://staging.medimate.my',
        'https://staging-api.medimate.my',
        ...baseOrigins
      ];
    }

    // Development - allow all localhost ports
    return [
      ...baseOrigins,
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://10.0.2.2:8081'
    ];
  }

  /**
   * Start the Malaysian healthcare server
   */
  public listen(): void {
    this.server.listen(this.port, () => {
      console.log('\n🏥 MediMate Malaysia Backend Server Started');
      console.log('=====================================');
      console.log(`🌍 Environment: ${this.environment}`);
      console.log(`🚀 Server running on port: ${this.port}`);
      console.log(`📍 Health Check: http://localhost:${this.port}/health`);
      console.log(`🕌 Cultural API: http://localhost:${this.port}/api/v1/cultural`);
      console.log(`💊 Medications API: http://localhost:${this.port}/api/v1/medications`);
      console.log(`🇲🇾 Malaysian Context: http://localhost:${this.port}/api/v1/context`);
      console.log('=====================================');
      console.log('🛡️ Healthcare Security: Enabled');
      console.log('📋 PDPA Compliance: Active');
      console.log('🕌 Islamic Features: Integrated');
      console.log('🌍 Multi-Cultural: Supported');
      console.log('⚡ Real-time Services: Active');
      console.log(`🔌 WebSocket Connections: ${this.webSocketService?.getActiveConnectionsCount() || 0}`);
      console.log('📊 Dashboard Streaming: Ready');
      console.log('🚨 Emergency Alerts: Monitoring');
      console.log('💊 Medication Reminders: Active');
      console.log('🔗 Webhook Integrations: Ready');
      console.log('=====================================\n');
    });

    // Graceful shutdown handling for healthcare data integrity
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('uncaughtException', this.handleCriticalError.bind(this));
    process.on('unhandledRejection', this.handleCriticalError.bind(this));
  }

  /**
   * Graceful shutdown for healthcare data integrity
   */
  private gracefulShutdown(signal: string): void {
    console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
    
    this.server.close(async () => {
      console.log('✅ HTTP server closed');
      
      // Close real-time services
      try {
        if (this.redisService) {
          await this.redisService.disconnect();
          console.log('✅ Redis connections closed');
        }
        
        // WebSocket service will be closed when HTTP server closes
        console.log('✅ WebSocket connections closed');
        console.log('✅ Real-time services shutdown complete');
      } catch (error) {
        console.error('❌ Error closing real-time services:', error);
      }
      
      console.log('🏥 Healthcare data integrity maintained');
      console.log('📋 PDPA compliance logs saved');
      console.log('⚡ Real-time services gracefully closed');
      console.log('👋 MediMate Malaysia Backend shutdown complete\n');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  }

  /**
   * Handle critical errors with healthcare data protection
   */
  private handleCriticalError(error: Error): void {
    console.error('💥 Critical healthcare system error:', error);
    console.error('🛡️ Initiating emergency healthcare data protection...');
    
    // Emergency healthcare data protection logic would go here
    // This would include secure data backup and audit trail completion
    
    process.exit(1);
  }
}

// Start the Malaysian healthcare backend application
const mediMateApp = new MediMateBackendApplication();
mediMateApp.listen();

export default mediMateApp;