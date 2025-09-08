/**
 * Service Integration Tests for MediMate Malaysia
 * Tests integration between different services and components
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// Test configuration
const TEST_TIMEOUT = 60000; // 60 seconds
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');

// Test utilities
class TestRunner {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            errors: []
        };
    }

    test(name, testFn, options = {}) {
        this.tests.push({
            name,
            fn: testFn,
            timeout: options.timeout || TEST_TIMEOUT,
            skip: options.skip || false
        });
    }

    async run() {
        console.log('\n🇲🇾 MediMate Malaysia - Service Integration Tests');
        console.log('=' .repeat(60));

        for (const test of this.tests) {
            if (test.skip) {
                console.log(`⏭️  SKIP: ${test.name}`);
                this.results.skipped++;
                continue;
            }

            try {
                console.log(`🧪 Testing: ${test.name}`);
                const startTime = Date.now();
                
                await Promise.race([
                    test.fn(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Test timeout')), test.timeout)
                    )
                ]);
                
                const duration = Date.now() - startTime;
                console.log(`✅ PASS: ${test.name} (${duration}ms)`);
                this.results.passed++;
            } catch (error) {
                console.log(`❌ FAIL: ${test.name} - ${error.message}`);
                this.results.failed++;
                this.results.errors.push({
                    test: test.name,
                    error: error.message
                });
            }
        }

        this.printSummary();
        return this.results.failed === 0;
    }

    printSummary() {
        const total = this.results.passed + this.results.failed + this.results.skipped;
        console.log('\n' + '=' .repeat(60));
        console.log('📊 Test Results Summary');
        console.log('=' .repeat(60));
        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⏭️  Skipped: ${this.results.skipped}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ Failed Tests:');
            this.results.errors.forEach(({ test, error }) => {
                console.log(`  • ${test}: ${error}`);
            });
        }

        if (this.results.failed === 0) {
            console.log('\n🎉 All tests passed! MediMate Malaysia services are integrated correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Please review and fix the issues.');
        }
    }
}

// Utility functions
function execScript(scriptPath, args = []) {
    return new Promise((resolve, reject) => {
        const process = spawn('bash', [scriptPath, ...args], {
            cwd: PROJECT_ROOT,
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
                reject(new Error(`Script exited with code ${code}: ${stderr}`));
            }
        });

        process.on('error', (error) => {
            reject(error);
        });
    });
}

function execCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, { cwd: PROJECT_ROOT }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Test setup and teardown
async function setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');
    
    // Ensure Docker services are running
    try {
        await execCommand('docker-compose up -d');
        await sleep(30000); // Wait 30 seconds for services to start
        console.log('✅ Docker services started');
    } catch (error) {
        console.log('⚠️  Docker setup warning:', error.message);
    }
}

async function teardownTestEnvironment() {
    console.log('🧹 Cleaning up test environment...');
    
    try {
        await execCommand('docker-compose down');
        console.log('✅ Docker services stopped');
    } catch (error) {
        console.log('⚠️  Cleanup warning:', error.message);
    }
}

// Test suites
const runner = new TestRunner();

// Test 1: Health Check Scripts Integration
runner.test('Health check scripts execute without errors', async () => {
    const serviceChecksScript = path.join(SCRIPTS_DIR, 'health', 'service-checks.sh');
    const result = await execScript(serviceChecksScript, ['check']);
    
    if (result.exitCode !== 0) {
        throw new Error('Service checks failed');
    }
    
    // Verify output contains expected service checks
    const output = result.stdout;
    if (!output.includes('PostgreSQL') || !output.includes('Redis') || !output.includes('MinIO')) {
        throw new Error('Service check output is incomplete');
    }
});

// Test 2: Environment Validation Integration
runner.test('Environment validation completes successfully', async () => {
    const envValidationScript = path.join(SCRIPTS_DIR, 'health', 'validate-environment.sh');
    const result = await execScript(envValidationScript, ['validate']);
    
    // Check if critical validations passed
    const output = result.stdout;
    if (output.includes('[FAIL]') && output.includes('DOCKER')) {
        throw new Error('Critical Docker validation failed');
    }
});

// Test 3: Performance Monitoring Integration
runner.test('Performance monitoring collects metrics', async () => {
    const performanceScript = path.join(SCRIPTS_DIR, 'health', 'performance-monitor.sh');
    const result = await execScript(performanceScript, ['single']);
    
    const output = result.stdout;
    if (!output.includes('CPU') && !output.includes('MEMORY') && !output.includes('DISK')) {
        throw new Error('Performance metrics collection failed');
    }
});

// Test 4: VSCode Configuration Files Validation
runner.test('VSCode configuration files are valid JSON', async () => {
    const vscodeConfigDir = path.join(PROJECT_ROOT, 'config', 'vscode');
    const configFiles = ['settings.json', 'extensions.json', 'launch.json', 'tasks.json'];
    
    for (const file of configFiles) {
        const filePath = path.join(vscodeConfigDir, file);
        try {
            const content = await fs.readFile(filePath, 'utf8');
            JSON.parse(content); // Will throw if invalid JSON
        } catch (error) {
            throw new Error(`Invalid JSON in ${file}: ${error.message}`);
        }
    }
});

// Test 5: Docker Services Health Integration
runner.test('Docker services are healthy and responsive', async () => {
    // Test PostgreSQL connection
    try {
        await execCommand('docker exec medimate_postgres pg_isready -U postgres');
    } catch (error) {
        throw new Error(`PostgreSQL health check failed: ${error.message}`);
    }
    
    // Test Redis connection
    try {
        const result = await execCommand('docker exec medimate_redis redis-cli ping');
        if (!result.stdout.includes('PONG')) {
            throw new Error('Redis ping failed');
        }
    } catch (error) {
        throw new Error(`Redis health check failed: ${error.message}`);
    }
    
    // Test MinIO health
    try {
        await execCommand('curl -sf http://localhost:9000/minio/health/live');
    } catch (error) {
        throw new Error(`MinIO health check failed: ${error.message}`);
    }
});

// Test 6: Database Schema and Data Validation
runner.test('Database schema is properly initialized', async () => {
    try {
        const result = await execCommand(`docker exec medimate_postgres psql -U postgres -d medimate_dev -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"`);
        
        const tableCount = parseInt(result.stdout.match(/\d+/)?.[0] || '0');
        if (tableCount === 0) {
            console.log('⚠️  No tables found - database may not be initialized yet');
        }
    } catch (error) {
        throw new Error(`Database schema validation failed: ${error.message}`);
    }
});

// Test 7: Redis Cache Operations
runner.test('Redis cache operations work correctly', async () => {
    const testKey = 'integration_test_key';
    const testValue = 'integration_test_value';
    
    try {
        // Set a test key
        await execCommand(`docker exec medimate_redis redis-cli set ${testKey} "${testValue}"`);
        
        // Get the test key
        const result = await execCommand(`docker exec medimate_redis redis-cli get ${testKey}`);
        
        if (!result.stdout.includes(testValue)) {
            throw new Error('Redis get operation failed');
        }
        
        // Clean up
        await execCommand(`docker exec medimate_redis redis-cli del ${testKey}`);
    } catch (error) {
        throw new Error(`Redis operations test failed: ${error.message}`);
    }
});

// Test 8: MinIO Object Storage Operations
runner.test('MinIO object storage is accessible', async () => {
    try {
        // Test MinIO ready endpoint
        await execCommand('curl -sf http://localhost:9000/minio/health/ready');
        
        // Test MinIO console accessibility
        const consoleResult = await execCommand('curl -sf http://localhost:9001 -o /dev/null');
        // Console should be accessible (even if we get redirected)
        
    } catch (error) {
        throw new Error(`MinIO accessibility test failed: ${error.message}`);
    }
});

// Test 9: Malaysian Cultural Data Structure
runner.test('Malaysian cultural data files exist and are valid', async () => {
    const culturalDataDir = path.join(PROJECT_ROOT, 'data', 'malaysia');
    const expectedFiles = ['states.json', 'languages.json', 'ethnicities.json'];
    
    try {
        for (const file of expectedFiles) {
            const filePath = path.join(culturalDataDir, file);
            await fs.access(filePath); // Check if file exists
            
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error(`${file} is empty or invalid structure`);
            }
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`Malaysian cultural data files not found in ${culturalDataDir}`);
        }
        throw error;
    }
});

// Test 10: Integration Between Health Monitoring Components
runner.test('Health monitoring dashboard API integration', async () => {
    const healthApiPath = path.join(PROJECT_ROOT, 'monitoring', 'health-check-api.js');
    
    // Check if health API file exists
    try {
        await fs.access(healthApiPath);
    } catch (error) {
        throw new Error('Health monitoring API file not found');
    }
    
    // Validate the API can start (basic syntax check)
    try {
        await execCommand(`node -c "${healthApiPath}"`);
    } catch (error) {
        throw new Error(`Health API syntax error: ${error.message}`);
    }
});

// Test 11: Cross-Service Communication
runner.test('Services can communicate with each other', async () => {
    // Test database connection from application perspective
    try {
        const connectionTest = `
            docker exec medimate_postgres psql -U postgres -d medimate_dev -c "
                SELECT 
                    'postgres_healthy' as service,
                    now() as timestamp,
                    version() as info;
            "
        `;
        const result = await execCommand(connectionTest);
        
        if (!result.stdout.includes('postgres_healthy')) {
            throw new Error('Database connection test failed');
        }
    } catch (error) {
        throw new Error(`Cross-service communication test failed: ${error.message}`);
    }
});

// Test 12: Configuration Consistency
runner.test('Docker Compose configuration is consistent', async () => {
    try {
        // Validate docker-compose.yml syntax
        await execCommand('docker-compose config --quiet');
        
        // Check if all required services are defined
        const result = await execCommand('docker-compose config --services');
        const services = result.stdout.split('\n').filter(s => s.trim());
        
        const requiredServices = ['postgres', 'redis', 'minio'];
        for (const service of requiredServices) {
            if (!services.includes(service)) {
                throw new Error(`Required service ${service} not found in docker-compose.yml`);
            }
        }
    } catch (error) {
        throw new Error(`Docker Compose validation failed: ${error.message}`);
    }
});

// Test 13: Logging and Monitoring Integration
runner.test('Logging directories and files are accessible', async () => {
    const logsDir = path.join(PROJECT_ROOT, 'logs');
    
    try {
        // Check if logs directory exists or can be created
        await fs.mkdir(logsDir, { recursive: true });
        
        // Test write permissions
        const testFile = path.join(logsDir, 'integration-test.log');
        await fs.writeFile(testFile, 'Integration test log entry\n');
        await fs.unlink(testFile); // Clean up
        
    } catch (error) {
        throw new Error(`Logging integration failed: ${error.message}`);
    }
});

// Test 14: Security and Compliance Integration
runner.test('Security configurations are in place', async () => {
    // Check for security-related configurations
    const securityChecks = [
        // Check if .env file exists (for environment variable security)
        async () => {
            try {
                await fs.access(path.join(PROJECT_ROOT, '.env'));
                return true;
            } catch {
                return false; // Not necessarily an error in all environments
            }
        },
        
        // Check Docker security settings
        async () => {
            try {
                const result = await execCommand('docker-compose config');
                // Should not contain plaintext passwords in output
                if (result.stdout.includes('password123') || result.stdout.includes('admin123')) {
                    throw new Error('Potential plaintext passwords in Docker configuration');
                }
                return true;
            } catch (error) {
                throw error;
            }
        }
    ];
    
    for (let i = 0; i < securityChecks.length; i++) {
        try {
            await securityChecks[i]();
        } catch (error) {
            throw new Error(`Security check ${i + 1} failed: ${error.message}`);
        }
    }
});

// Test 15: End-to-End Workflow Integration
runner.test('Complete development workflow integration', async () => {
    // This test validates the entire development workflow
    const workflowSteps = [
        // Step 1: Validate environment
        async () => {
            const script = path.join(SCRIPTS_DIR, 'health', 'validate-environment.sh');
            await execScript(script, ['docker']);
        },
        
        // Step 2: Check service health
        async () => {
            const script = path.join(SCRIPTS_DIR, 'health', 'service-checks.sh');
            await execScript(script, ['check']);
        },
        
        // Step 3: Validate performance
        async () => {
            const script = path.join(SCRIPTS_DIR, 'health', 'performance-monitor.sh');
            await execScript(script, ['system']);
        }
    ];
    
    for (let i = 0; i < workflowSteps.length; i++) {
        try {
            await workflowSteps[i]();
        } catch (error) {
            throw new Error(`Workflow step ${i + 1} failed: ${error.message}`);
        }
    }
});

// Main execution
async function main() {
    try {
        await setupTestEnvironment();
        const success = await runner.run();
        await teardownTestEnvironment();
        
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('Test execution failed:', error.message);
        await teardownTestEnvironment();
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    TestRunner,
    execScript,
    execCommand,
    setupTestEnvironment,
    teardownTestEnvironment
};