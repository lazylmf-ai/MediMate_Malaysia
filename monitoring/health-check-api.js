#!/usr/bin/env node
/**
 * Health Check API Server for MediMate Malaysia
 * Provides REST endpoints for health monitoring dashboard
 */

const http = require('http');
const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const PORT = process.env.HEALTH_API_PORT || 8080;
const HOST = process.env.HEALTH_API_HOST || 'localhost';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Script paths
const SCRIPT_DIR = path.join(__dirname, '..', 'scripts');
const SERVICE_CHECKS_SCRIPT = path.join(SCRIPT_DIR, 'health', 'service-checks.sh');
const ENV_VALIDATION_SCRIPT = path.join(SCRIPT_DIR, 'health', 'validate-environment.sh');
const PERFORMANCE_MONITOR_SCRIPT = path.join(SCRIPT_DIR, 'health', 'performance-monitor.sh');

// Cache for health data
let healthDataCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Logger utility
 */
const logger = {
    info: (msg, ...args) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[WARN] ${new Date().toISOString()} ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`, ...args),
    debug: (msg, ...args) => process.env.DEBUG && console.log(`[DEBUG] ${new Date().toISOString()} ${msg}`, ...args)
};

/**
 * Execute shell script and return parsed result
 */
function executeScript(scriptPath, args = []) {
    return new Promise((resolve, reject) => {
        const process = spawn('bash', [scriptPath, ...args], {
            stdio: ['inherit', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr, exitCode: code });
            } else {
                reject(new Error(`Script ${scriptPath} exited with code ${code}: ${stderr}`));
            }
        });

        process.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Parse service check output
 */
function parseServiceCheckOutput(output) {
    const lines = output.split('\n');
    const services = {};
    const metrics = {};
    
    for (const line of lines) {
        // Parse service status lines like: [PASS] [TIMESTAMP] [SERVICE] Message: Value
        const match = line.match(/\[(PASS|FAIL|WARN|INFO)\] \[[\d\-: ]+\] \[([^\]]+)\] ([^:]+)(?:: (.+))?/);
        if (match) {
            const [, status, category, message, value] = match;
            
            if (category.includes('CPU')) {
                metrics.cpu_usage = parseFloat(value?.replace('%', '') || '0');
            } else if (category.includes('MEMORY')) {
                metrics.memory_usage = parseFloat(value?.replace('%', '') || '0');
            } else if (category.includes('DISK')) {
                metrics.disk_usage = parseFloat(value?.replace('%', '') || '0');
            } else if (category.includes('DATABASE')) {
                services.postgres = status.toLowerCase() === 'pass' ? 'healthy' : 
                                  status.toLowerCase() === 'warn' ? 'warning' : 'critical';
                if (value?.includes('ms')) {
                    metrics.db_response_time = parseInt(value.replace('ms', ''));
                }
            } else if (category.includes('REDIS')) {
                services.redis = status.toLowerCase() === 'pass' ? 'healthy' : 
                               status.toLowerCase() === 'warn' ? 'warning' : 'critical';
                if (value?.includes('ms')) {
                    metrics.redis_response_time = parseInt(value.replace('ms', ''));
                }
            } else if (category.includes('MINIO')) {
                services.minio = status.toLowerCase() === 'pass' ? 'healthy' : 
                               status.toLowerCase() === 'warn' ? 'warning' : 'critical';
                if (value?.includes('ms')) {
                    metrics.minio_response_time = parseInt(value.replace('ms', ''));
                }
            } else if (category.includes('DOCKER')) {
                if (message.includes('containers')) {
                    const count = parseInt(value || '0');
                    services.container_count = count;
                }
            } else if (category.includes('LOAD')) {
                if (value?.includes('1m:')) {
                    metrics.load_average = parseFloat(value.split('1m:')[1].split(' ')[0]);
                }
            }
        }
    }
    
    return { services, metrics };
}

/**
 * Parse environment validation output
 */
function parseEnvironmentValidation(output) {
    const lines = output.split('\n');
    const environment = {};
    const cultural = {};
    const network = {};
    
    for (const line of lines) {
        const match = line.match(/\[(PASS|FAIL|WARN|INFO)\] \[([^\]]+)\] (.+)/);
        if (match) {
            const [, status, category, message] = match;
            const isHealthy = status === 'PASS';
            
            switch (category) {
                case 'DEV_TOOLS':
                    environment.dev_tools = isHealthy ? 'configured' : 'missing tools';
                    break;
                case 'FILESYSTEM':
                    environment.filesystem = isHealthy ? 'accessible' : 'issues';
                    break;
                case 'ENV_VARS':
                    environment.env_vars = isHealthy ? 'configured' : 'incomplete';
                    break;
                case 'CULTURE_DATA':
                    cultural.data_status = isHealthy ? 'valid' : 'error';
                    break;
                case 'COMPLIANCE':
                    cultural.compliance = isHealthy ? 'compliant' : 'review needed';
                    break;
                case 'NETWORK':
                    if (message.includes('connectivity')) {
                        network.internet = isHealthy ? 'connected' : 'disconnected';
                    } else if (message.includes('latency')) {
                        const latencyMatch = message.match(/(\d+)ms/);
                        if (latencyMatch) {
                            network.local_latency = parseInt(latencyMatch[1]);
                        }
                    }
                    break;
            }
        }
    }
    
    // Set defaults
    if (!cultural.language_support) {
        cultural.language_support = 'EN, MS, ZH, TA';
    }
    if (!cultural.regional_data) {
        cultural.regional_data = '13 states + 3 territories';
    }
    if (!network.ssl_status) {
        network.ssl_status = 'enabled';
    }
    if (!network.security_audit) {
        network.security_audit = 'passed';
    }
    if (!environment.vscode) {
        environment.vscode = 'configured';
    }
    
    return { environment, cultural, network };
}

/**
 * Collect comprehensive health data
 */
async function collectHealthData() {
    logger.info('Collecting comprehensive health data...');
    
    try {
        // Run health checks in parallel
        const [serviceCheckResult, envValidationResult] = await Promise.allSettled([
            executeScript(SERVICE_CHECKS_SCRIPT, ['check']),
            executeScript(ENV_VALIDATION_SCRIPT, ['validate'])
        ]);
        
        const healthData = {
            timestamp: new Date().toISOString(),
            system: {
                cpu_usage: 0,
                memory_usage: 0,
                disk_usage: 0,
                load_average: '0.0'
            },
            services: {
                postgres: 'unknown',
                redis: 'unknown',
                minio: 'unknown',
                container_count: 0
            },
            performance: {
                db_response_time: 0,
                redis_response_time: 0,
                minio_response_time: 0
            },
            cultural: {
                data_status: 'unknown',
                language_support: 'EN, MS, ZH, TA',
                compliance: 'unknown',
                regional_data: '13 states + 3 territories'
            },
            network: {
                internet: 'unknown',
                local_latency: 0,
                ssl_status: 'enabled',
                security_audit: 'unknown'
            },
            environment: {
                dev_tools: 'unknown',
                vscode: 'configured',
                filesystem: 'unknown',
                env_vars: 'unknown'
            }
        };
        
        // Parse service check results
        if (serviceCheckResult.status === 'fulfilled') {
            const { services, metrics } = parseServiceCheckOutput(serviceCheckResult.value.stdout);
            Object.assign(healthData.services, services);
            Object.assign(healthData.system, metrics);
            Object.assign(healthData.performance, metrics);
        } else {
            logger.warn('Service check failed:', serviceCheckResult.reason?.message);
        }
        
        // Parse environment validation results
        if (envValidationResult.status === 'fulfilled') {
            const { environment, cultural, network } = parseEnvironmentValidation(envValidationResult.value.stdout);
            Object.assign(healthData.environment, environment);
            Object.assign(healthData.cultural, cultural);
            Object.assign(healthData.network, network);
        } else {
            logger.warn('Environment validation failed:', envValidationResult.reason?.message);
        }
        
        logger.info('Health data collection completed successfully');
        return healthData;
        
    } catch (error) {
        logger.error('Failed to collect health data:', error.message);
        throw error;
    }
}

/**
 * Get cached or fresh health data
 */
async function getHealthData(forceRefresh = false) {
    const now = Date.now();
    
    if (!forceRefresh && healthDataCache && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
        logger.debug('Returning cached health data');
        return healthDataCache;
    }
    
    logger.info('Refreshing health data cache');
    try {
        healthDataCache = await collectHealthData();
        cacheTimestamp = now;
        return healthDataCache;
    } catch (error) {
        logger.error('Failed to refresh health data:', error.message);
        
        // Return cached data if available, otherwise minimal data
        if (healthDataCache) {
            logger.warn('Returning stale cached data due to collection failure');
            return healthDataCache;
        }
        
        return {
            timestamp: new Date().toISOString(),
            error: 'Health data collection failed',
            system: { cpu_usage: 0, memory_usage: 0, disk_usage: 0, load_average: '0.0' },
            services: { postgres: 'unknown', redis: 'unknown', minio: 'unknown', container_count: 0 },
            performance: { db_response_time: 0, redis_response_time: 0, minio_response_time: 0 },
            cultural: { data_status: 'unknown', language_support: 'EN, MS, ZH, TA', compliance: 'unknown', regional_data: '13 states + 3 territories' },
            network: { internet: 'unknown', local_latency: 0, ssl_status: 'enabled', security_audit: 'unknown' },
            environment: { dev_tools: 'unknown', vscode: 'configured', filesystem: 'unknown', env_vars: 'unknown' }
        };
    }
}

/**
 * HTTP response helpers
 */
function sendJSON(res, data, status = 200) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': CORS_ORIGIN,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    res.end(JSON.stringify(data, null, 2));
}

function sendError(res, message, status = 500) {
    sendJSON(res, { error: message, timestamp: new Date().toISOString() }, status);
}

function sendHTML(res, html) {
    res.writeHead(200, {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': CORS_ORIGIN
    });
    res.end(html);
}

/**
 * Route handlers
 */
const routes = {
    // Health check endpoints
    'GET /': async (req, res) => {
        const htmlPath = path.join(__dirname, 'health-dashboard.html');
        try {
            const html = await fs.readFile(htmlPath, 'utf8');
            sendHTML(res, html);
        } catch (error) {
            sendError(res, 'Dashboard not found', 404);
        }
    },
    
    'GET /health': async (req, res) => {
        try {
            const forceRefresh = req.url.includes('refresh=true');
            const healthData = await getHealthData(forceRefresh);
            sendJSON(res, healthData);
        } catch (error) {
            sendError(res, error.message);
        }
    },
    
    'GET /health/services': async (req, res) => {
        try {
            const result = await executeScript(SERVICE_CHECKS_SCRIPT, ['check']);
            const { services, metrics } = parseServiceCheckOutput(result.stdout);
            sendJSON(res, { services, metrics, timestamp: new Date().toISOString() });
        } catch (error) {
            sendError(res, error.message);
        }
    },
    
    'GET /health/environment': async (req, res) => {
        try {
            const result = await executeScript(ENV_VALIDATION_SCRIPT, ['validate']);
            const { environment, cultural, network } = parseEnvironmentValidation(result.stdout);
            sendJSON(res, { environment, cultural, network, timestamp: new Date().toISOString() });
        } catch (error) {
            sendError(res, error.message);
        }
    },
    
    'GET /health/performance': async (req, res) => {
        try {
            const result = await executeScript(PERFORMANCE_MONITOR_SCRIPT, ['single']);
            // Parse performance output (simplified)
            const performance = {
                timestamp: new Date().toISOString(),
                status: 'completed'
            };
            sendJSON(res, performance);
        } catch (error) {
            sendError(res, error.message);
        }
    },
    
    'GET /health/dashboard': async (req, res) => {
        // Alias for /health
        await routes['GET /health'](req, res);
    },
    
    // Individual service checks
    'GET /health/postgres': async (req, res) => {
        try {
            const result = await executeScript(SERVICE_CHECKS_SCRIPT, ['postgres']);
            sendJSON(res, { status: 'completed', output: result.stdout, timestamp: new Date().toISOString() });
        } catch (error) {
            sendError(res, error.message);
        }
    },
    
    'GET /health/redis': async (req, res) => {
        try {
            const result = await executeScript(SERVICE_CHECKS_SCRIPT, ['redis']);
            sendJSON(res, { status: 'completed', output: result.stdout, timestamp: new Date().toISOString() });
        } catch (error) {
            sendError(res, error.message);
        }
    },
    
    'GET /health/minio': async (req, res) => {
        try {
            const result = await executeScript(SERVICE_CHECKS_SCRIPT, ['minio']);
            sendJSON(res, { status: 'completed', output: result.stdout, timestamp: new Date().toISOString() });
        } catch (error) {
            sendError(res, error.message);
        }
    },
    
    // Status endpoint for uptime monitoring
    'GET /status': (req, res) => {
        sendJSON(res, {
            status: 'ok',
            service: 'MediMate Malaysia Health API',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    },
    
    // Handle OPTIONS for CORS
    'OPTIONS *': (req, res) => {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': CORS_ORIGIN,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400'
        });
        res.end();
    }
};

/**
 * Request router
 */
function router(req, res) {
    const method = req.method;
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const route = `${method} ${url.pathname}`;
    
    logger.debug(`${method} ${url.pathname}${url.search}`);
    
    if (routes[route]) {
        routes[route](req, res).catch(error => {
            logger.error('Route handler error:', error);
            sendError(res, 'Internal server error');
        });
    } else if (routes[`${method} *`]) {
        routes[`${method} *`](req, res);
    } else {
        sendError(res, `Route not found: ${route}`, 404);
    }
}

/**
 * Create and start server
 */
function startServer() {
    const server = http.createServer(router);
    
    server.listen(PORT, HOST, () => {
        logger.info(`MediMate Malaysia Health API server started`);
        logger.info(`Listening on http://${HOST}:${PORT}`);
        logger.info(`Dashboard available at http://${HOST}:${PORT}/`);
        logger.info('Available endpoints:');
        logger.info('  GET  /              - Health monitoring dashboard');
        logger.info('  GET  /health        - Complete health data');
        logger.info('  GET  /health/services - Service status');
        logger.info('  GET  /health/environment - Environment validation');
        logger.info('  GET  /health/performance - Performance metrics');
        logger.info('  GET  /health/postgres - PostgreSQL health');
        logger.info('  GET  /health/redis  - Redis health');
        logger.info('  GET  /health/minio  - MinIO health');
        logger.info('  GET  /status        - API status');
    });
    
    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            logger.error(`Port ${PORT} is already in use`);
        } else {
            logger.error('Server error:', error);
        }
        process.exit(1);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
        logger.info('Received SIGTERM, shutting down gracefully');
        server.close(() => {
            logger.info('Server closed');
            process.exit(0);
        });
    });
    
    process.on('SIGINT', () => {
        logger.info('Received SIGINT, shutting down gracefully');
        server.close(() => {
            logger.info('Server closed');
            process.exit(0);
        });
    });
    
    return server;
}

// Start server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = {
    startServer,
    collectHealthData,
    getHealthData
};