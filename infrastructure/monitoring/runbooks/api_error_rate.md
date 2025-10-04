# Runbook: High API Error Rate

**Severity:** P0 (Critical) if >1%, P1 (Warning) if >0.5%

**Alert Name:** `api_error_rate_critical` or `api_error_rate_warning`

**Symptoms:**
- Elevated 5xx error responses from Education Hub APIs
- User complaints about features not working
- Error rate metrics showing spike in CloudWatch dashboard

## Immediate Actions (First 15 minutes)

### 1. Assess Severity
```bash
# Check current error rate
aws cloudwatch get-metric-statistics \
  --namespace MediMate/EducationHub \
  --metric-name ErrorRate \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### 2. Check Recent Deployments
```bash
# Check recent ECS deployments
aws ecs describe-services \
  --cluster medimate-production \
  --services education-hub-api

# Check deployment history
aws ecs list-task-definition-families \
  --family-prefix education-hub-api \
  | head -5
```

### 3. Review Error Logs
```bash
# Check CloudWatch Logs for errors
aws logs filter-log-events \
  --log-group-name /aws/ecs/medimate-education-hub \
  --filter-pattern "ERROR" \
  --start-time $(date -d '30 minutes ago' +%s)000

# Get error breakdown by endpoint
aws logs insights query \
  --log-group-name /aws/ecs/medimate-education-hub \
  --query-string 'fields @timestamp, endpoint, error_type, error_message | filter @message like /ERROR/ | stats count() by endpoint, error_type' \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s)
```

## Investigation Steps

### 1. Identify Error Pattern

**Check error distribution:**
```bash
# Errors by endpoint
SELECT endpoint, COUNT(*) as error_count
FROM logs
WHERE level = 'ERROR'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY endpoint
ORDER BY error_count DESC;
```

**Common error patterns:**
- Database connection errors → Check database health
- Authentication errors → Check auth service
- External API errors → Check third-party dependencies
- Validation errors → Check recent code changes

### 2. Database Health Check
```bash
# Check RDS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=medimate-db-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# Check for connection pool exhaustion
psql -h $DB_HOST -U $DB_USER -d medimate_production -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

### 3. Check Dependencies
```bash
# Check external API availability
curl -I https://api.external-service.com/health

# Check Redis availability
redis-cli -h $REDIS_HOST ping

# Check S3 bucket access
aws s3 ls s3://medimate-education-content/ --summarize
```

### 4. Resource Utilization
```bash
# Check ECS task CPU/Memory
aws ecs describe-tasks \
  --cluster medimate-production \
  --tasks $(aws ecs list-tasks --cluster medimate-production --service-name education-hub-api --query 'taskArns[0]' --output text)

# Check application memory usage
curl http://localhost:3000/metrics | grep heap
```

## Resolution Steps

### Scenario 1: Recent Deployment Issue
**Symptoms:** Errors started immediately after deployment

**Resolution:**
```bash
# Rollback to previous task definition
aws ecs update-service \
  --cluster medimate-production \
  --service education-hub-api \
  --task-definition education-hub-api:PREVIOUS_VERSION

# Monitor error rate after rollback
watch -n 30 'aws cloudwatch get-metric-statistics --namespace MediMate/EducationHub --metric-name ErrorRate ...'
```

### Scenario 2: Database Connection Exhaustion
**Symptoms:** "Too many connections" errors, high connection count

**Resolution:**
```bash
# Kill idle connections
psql -h $DB_HOST -U $DB_USER -d medimate_production -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE state = 'idle' AND state_change < NOW() - INTERVAL '5 minutes';"

# Scale up connection pool (if needed)
# Update environment variable MAX_DB_CONNECTIONS
aws ecs update-service \
  --cluster medimate-production \
  --service education-hub-api \
  --force-new-deployment
```

### Scenario 3: External API Failure
**Symptoms:** Errors when calling third-party services (CDN, storage, etc.)

**Resolution:**
```bash
# Enable fallback/degraded mode
# Set feature flag to bypass failing service
aws ssm put-parameter \
  --name /medimate/education-hub/feature-flags/disable-external-service \
  --value "true" \
  --type String \
  --overwrite

# Restart service to pick up new config
aws ecs update-service \
  --cluster medimate-production \
  --service education-hub-api \
  --force-new-deployment
```

### Scenario 4: Resource Exhaustion
**Symptoms:** High CPU/memory, slow responses, timeouts

**Resolution:**
```bash
# Scale up container count
aws ecs update-service \
  --cluster medimate-production \
  --service education-hub-api \
  --desired-count 6  # Double current count

# Or increase container resources
# Update task definition with more CPU/memory
# Then deploy new task definition
```

### Scenario 5: Code Bug in New Feature
**Symptoms:** Errors in specific endpoint, validation failures

**Resolution:**
```bash
# Disable problematic feature via feature flag
aws ssm put-parameter \
  --name /medimate/education-hub/feature-flags/new-feature-enabled \
  --value "false" \
  --type String \
  --overwrite

# If urgent, rollback deployment (see Scenario 1)
# Then create hotfix and deploy
```

## Verification

After applying fix, verify error rate has decreased:

```bash
# Monitor error rate for 15 minutes
watch -n 60 'aws cloudwatch get-metric-statistics \
  --namespace MediMate/EducationHub \
  --metric-name ErrorRate \
  --start-time $(date -u -d "15 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average'

# Check error logs decreased
aws logs filter-log-events \
  --log-group-name /aws/ecs/medimate-education-hub \
  --filter-pattern "ERROR" \
  --start-time $(date -d '5 minutes ago' +%s)000 \
  | jq '.events | length'
```

**Success criteria:**
- Error rate < 0.5%
- No new error patterns in logs
- User-reported issues resolved

## Communication

### During Incident
**Slack message template:**
```
:rotating_light: INCIDENT: Education Hub API Error Rate Elevated

Status: INVESTIGATING / IDENTIFIED / RESOLVING / RESOLVED
Severity: P0
Impact: Users experiencing errors when [accessing content/taking quizzes/etc.]
Error Rate: X.X%

Actions taken:
- [List actions]

Next steps:
- [List next steps]

ETA: [Estimated resolution time]
```

### Post-Resolution
Update incident channel with:
- Root cause summary
- Resolution steps taken
- Monitoring to ensure stability
- Post-mortem scheduled (for P0 incidents)

## Post-Incident

### 1. Create Post-Mortem (P0 only)
- Schedule post-mortem meeting within 48 hours
- Document timeline, root cause, resolution
- Identify preventive measures
- Create action items

### 2. Update Monitoring
If incident revealed monitoring gaps:
- Add new alerts
- Improve dashboards
- Update thresholds

### 3. Code Improvements
- Add error handling
- Improve logging
- Add circuit breakers
- Improve graceful degradation

## Related Runbooks
- [API Down](./api_down.md)
- [Database Connection Issues](./database_connection.md)
- [Slow API Performance](./slow_api.md)

## Contacts
- On-call Engineer: Check PagerDuty rotation
- Database Admin: dba@medimate.my
- DevOps Lead: devops-lead@medimate.my
- Engineering Manager: eng-manager@medimate.my
