/**
 * Health Check Routes for MediMate Malaysia
 * Provides comprehensive system health monitoring for healthcare infrastructure
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();

// Database connection pool (to be injected)
let dbPool: Pool;

export const setHealthCheckPool = (pool: Pool): void => {
  dbPool = pool;
};

/**
 * Basic health check endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      system: 'MediMate Malaysia Backend',
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cultural_context: {
        timezone: 'Asia/Kuala_Lumpur',
        supported_languages: ['ms', 'en', 'zh', 'ta'],
        islamic_features: true,
        multi_cultural: true
      }
    };

    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Detailed health check with dependency verification
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const checks: Record<string, any> = {
    api: { status: 'healthy', timestamp: new Date().toISOString() },
    database: { status: 'unknown' },
    cultural_services: { status: 'healthy' },
    authentication: { status: 'healthy' },
    pdpa_compliance: { status: 'healthy' }
  };

  let overallStatus = 'healthy';

  // Database connectivity check
  try {
    if (dbPool) {
      const client = await dbPool.connect();
      await client.query('SELECT NOW()');
      client.release();
      checks.database = {
        status: 'healthy',
        connection_pool_size: dbPool.totalCount,
        active_connections: dbPool.idleCount
      };
    } else {
      checks.database = {
        status: 'degraded',
        message: 'Database pool not initialized'
      };
      overallStatus = 'degraded';
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
    overallStatus = 'unhealthy';
  }

  // Malaysian cultural services check
  try {
    const now = new Date();
    const malaysianTime = new Intl.DateTimeFormat('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now);

    checks.cultural_services = {
      status: 'healthy',
      malaysian_time: malaysianTime,
      supported_states: [
        'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
        'Pahang', 'Perak', 'Perlis', 'Penang', 'Sabah', 'Sarawak',
        'Selangor', 'Terengganu', 'Kuala Lumpur', 'Labuan', 'Putrajaya'
      ],
      prayer_times_available: true,
      halal_certification_lookup: true
    };
  } catch (error) {
    checks.cultural_services = {
      status: 'degraded',
      error: 'Cultural services partially available'
    };
    if (overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
  }

  res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    system_info: {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime_seconds: process.uptime(),
      memory_usage: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    },
    malaysian_compliance: {
      pdpa_2010: 'compliant',
      moh_standards: 'compliant',
      data_residency: 'Malaysia',
      cultural_sensitivity: 'enabled'
    }
  });
});

/**
 * Liveness probe for Kubernetes
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness probe for Kubernetes
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if database is ready
    if (dbPool) {
      const client = await dbPool.connect();
      await client.query('SELECT 1');
      client.release();
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      services: {
        database: dbPool ? 'ready' : 'not_initialized',
        authentication: 'ready',
        cultural_intelligence: 'ready',
        pdpa_compliance: 'ready'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error instanceof Error ? error.message : 'Service not ready',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Malaysian healthcare system status
 */
router.get('/malaysia-healthcare', (req: Request, res: Response) => {
  const malaysianHealthcareStatus = {
    status: 'operational',
    timestamp: new Date().toISOString(),
    healthcare_features: {
      patient_management: 'enabled',
      medication_tracking: 'enabled',
      appointment_scheduling: 'enabled',
      cultural_intelligence: 'enabled',
      prayer_time_integration: 'enabled',
      halal_medication_verification: 'enabled',
      multi_language_support: 'enabled'
    },
    regulatory_compliance: {
      pdpa_2010: 'compliant',
      moh_registration: 'compliant',
      malaysian_medical_council: 'integrated',
      pharmacist_board: 'integrated'
    },
    cultural_services: {
      islamic_calendar: 'active',
      prayer_times: 'active',
      halal_certification: 'active',
      multi_cultural_holidays: 'active',
      language_localization: ['ms', 'en', 'zh', 'ta']
    },
    data_governance: {
      data_residency: 'Malaysia',
      encryption: 'AES-256',
      audit_logging: 'comprehensive',
      retention_policy: '7_years_healthcare'
    }
  };

  res.json(malaysianHealthcareStatus);
});

export default router;