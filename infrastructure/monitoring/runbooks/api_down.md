# Runbook: Education Hub API Completely Down

**Severity:** P0 (Critical)

**Alert Name:** `api_completely_down`

**Symptoms:**
- All API endpoints returning errors or timing out
- Health check failing
- No healthy ECS tasks
- Users completely unable to access Education Hub

## Immediate Actions (First 5 minutes)

### 1. Verify Outage
```bash
# Check API health endpoint
curl -I https://api.medimate.my/education/health

# Check ECS service status
aws ecs describe-services \
  --cluster medimate-production \
  --services education-hub-api \
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}'

# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:ap-southeast-1:ACCOUNT:targetgroup/education-hub-api/ID
```

### 2. Assess Blast Radius
```bash
# Check if other services affected
curl -I https://api.medimate.my/health
curl -I https://api.medimate.my/appointments/health
curl -I https://api.medimate.my/medications/health

# Check recent changes
git log --since="2 hours ago" --oneline
```

### 3. Notify Stakeholders
Post to Slack #medimate-incidents:
```
:rotating_light: P0 INCIDENT: Education Hub API COMPLETELY DOWN

Impact: ALL users cannot access Education Hub
Start Time: [TIME]
Status: INVESTIGATING

Immediate actions in progress:
- Checking ECS task health
- Reviewing recent deployments
- Investigating infrastructure issues

Updates every 10 minutes.
```

## Investigation Steps

### 1. Check ECS Service Health

```bash
# Get service details
aws ecs describe-services \
  --cluster medimate-production \
  --services education-hub-api

# Check task status
aws ecs list-tasks \
  --cluster medimate-production \
  --service-name education-hub-api \
  --desired-status RUNNING

# Get task failure reasons
aws ecs describe-tasks \
  --cluster medimate-production \
  --tasks $(aws ecs list-tasks --cluster medimate-production --service-name education-hub-api --query 'taskArns' --output text)
```

**Common issues:**
- Tasks failing health checks
- Tasks stuck in PENDING state
- Tasks crashing on startup
- No tasks running

### 2. Check Recent Deployments

```bash
# Get deployment history
aws ecs describe-services \
  --cluster medimate-production \
  --services education-hub-api \
  --query 'services[0].deployments'

# Check when last deployment started
aws ecs describe-services \
  --cluster medimate-production \
  --services education-hub-api \
  --query 'services[0].deployments[0].createdAt'
```

### 3. Check Application Logs

```bash
# Get recent error logs
aws logs tail /aws/ecs/medimate-education-hub \
  --since 30m \
  --filter-pattern "ERROR"

# Check for startup errors
aws logs tail /aws/ecs/medimate-education-hub \
  --since 30m \
  --filter-pattern "Fatal"
```

### 4. Check Infrastructure

```bash
# Check ALB health
aws elbv2 describe-load-balancers \
  --names medimate-alb-production

# Check security groups
aws ec2 describe-security-groups \
  --group-ids sg-EDUCATION_HUB_SG

# Check VPC/subnets
aws ec2 describe-subnets \
  --subnet-ids subnet-PRIVATE_SUBNET_1 subnet-PRIVATE_SUBNET_2
```

### 5. Check Database Connectivity

```bash
# Test database connection
psql -h $DB_HOST -U $DB_USER -d medimate_production -c "SELECT 1;"

# Check RDS instance status
aws rds describe-db-instances \
  --db-instance-identifier medimate-db-production \
  --query 'DBInstances[0].DBInstanceStatus'
```

## Resolution Steps

### Scenario 1: Failed Deployment
**Symptoms:** Service went down after recent deployment, tasks failing health checks

**Immediate Rollback:**
```bash
# Get previous task definition
CURRENT_TASK_DEF=$(aws ecs describe-services \
  --cluster medimate-production \
  --services education-hub-api \
  --query 'services[0].taskDefinition' \
  --output text)

# Extract version number and decrement
PREVIOUS_VERSION=$(($(echo $CURRENT_TASK_DEF | grep -oP ':\K\d+') - 1))

# Rollback
aws ecs update-service \
  --cluster medimate-production \
  --service education-hub-api \
  --task-definition education-hub-api:$PREVIOUS_VERSION \
  --force-new-deployment

# Monitor rollback
watch -n 10 'aws ecs describe-services \
  --cluster medimate-production \
  --services education-hub-api \
  --query "services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}"'
```

### Scenario 2: All Tasks Failing Health Checks
**Symptoms:** Tasks starting but immediately failing health checks

**Investigation:**
```bash
# Check health check configuration
aws elbv2 describe-target-groups \
  --target-group-arns arn:aws:elasticloadbalancing:ap-southeast-1:ACCOUNT:targetgroup/education-hub-api/ID \
  --query 'TargetGroups[0].HealthCheckPath'

# Test health endpoint manually
TASK_IP=$(aws ecs describe-tasks \
  --cluster medimate-production \
  --tasks $(aws ecs list-tasks --cluster medimate-production --service-name education-hub-api --query 'taskArns[0]' --output text) \
  --query 'tasks[0].containers[0].networkInterfaces[0].privateIpv4Address' \
  --output text)

curl http://$TASK_IP:3000/health
```

**Resolution:**
```bash
# If health endpoint is broken, temporarily disable health checks
aws elbv2 modify-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:ap-southeast-1:ACCOUNT:targetgroup/education-hub-api/ID \
  --health-check-enabled false

# Allow tasks to stay up, then fix health endpoint and re-enable
```

### Scenario 3: Database Connection Failure
**Symptoms:** All tasks failing with database connection errors

**Resolution:**
```bash
# Check database connectivity from ECS
aws ecs run-task \
  --cluster medimate-production \
  --task-definition education-hub-api \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-XXX],securityGroups=[sg-XXX]}" \
  --overrides '{"containerOverrides":[{"name":"education-hub-api","command":["sh","-c","psql -h $DB_HOST -U $DB_USER -d medimate_production -c \"SELECT 1;\""]}]}'

# Check RDS security group allows ECS tasks
aws ec2 describe-security-groups \
  --group-ids sg-RDS_SG \
  --query 'SecurityGroups[0].IpPermissions'

# Add ECS security group to RDS if missing
aws ec2 authorize-security-group-ingress \
  --group-id sg-RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group sg-ECS_SG
```

### Scenario 4: Infrastructure Failure
**Symptoms:** AWS infrastructure issues (ALB down, VPC issues, etc.)

**Resolution:**
```bash
# Check AWS service health
aws health describe-events \
  --filter eventTypeCategories=issue,accountSpecific \
  --query 'events[?service==`EC2` || service==`ECS` || service==`RDS`]'

# If ALB issue, create new ALB target group
aws elbv2 create-target-group \
  --name education-hub-api-backup \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-XXX

# Update ECS service to use new target group
aws ecs update-service \
  --cluster medimate-production \
  --service education-hub-api \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=education-hub-api,containerPort=3000
```

### Scenario 5: Resource Exhaustion (No Available IPs/Capacity)
**Symptoms:** Tasks stuck in PENDING, "no container instances" errors

**Resolution:**
```bash
# Check available IPs in subnets
aws ec2 describe-subnets \
  --subnet-ids subnet-XXX subnet-YYY \
  --query 'Subnets[*].AvailableIpAddressCount'

# Scale down to free up resources, then scale back up
aws ecs update-service \
  --cluster medimate-production \
  --service education-hub-api \
  --desired-count 2

# Wait 2 minutes, then scale back up
aws ecs update-service \
  --cluster medimate-production \
  --service education-hub-api \
  --desired-count 4

# If IP exhaustion, add new subnet to service
# Or increase CIDR block size
```

### Scenario 6: Configuration/Secrets Issue
**Symptoms:** Tasks failing to start, environment variable errors

**Resolution:**
```bash
# Check Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id medimate/education-hub/production

# Check Systems Manager parameters
aws ssm get-parameters-by-path \
  --path /medimate/education-hub/production \
  --recursive

# Verify task definition has correct secret ARNs
aws ecs describe-task-definition \
  --task-definition education-hub-api \
  --query 'taskDefinition.containerDefinitions[0].secrets'
```

## Verification

### 1. Verify Service Recovery
```bash
# Check healthy task count
aws ecs describe-services \
  --cluster medimate-production \
  --services education-hub-api \
  --query 'services[0].runningCount'

# Check target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:ap-southeast-1:ACCOUNT:targetgroup/education-hub-api/ID \
  --query 'TargetHealthDescriptions[*].TargetHealth.State'

# Test API endpoint
curl https://api.medimate.my/education/health
curl https://api.medimate.my/education/v1/content?limit=5
```

### 2. Monitor Error Rates
```bash
# Check error rate is normal
aws cloudwatch get-metric-statistics \
  --namespace MediMate/EducationHub \
  --metric-name ErrorRate \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average
```

### 3. Verify User Access
- Test login flow
- Browse content
- View video
- Complete quiz
- Check search functionality

**Success criteria:**
- All ECS tasks healthy (runningCount == desiredCount)
- All ALB targets healthy
- API responding within normal latency (<500ms)
- Error rate <0.1%
- User flows working end-to-end

## Communication

### Resolution Message
```
:white_check_mark: RESOLVED: Education Hub API

Duration: [X minutes]
Root Cause: [Brief summary]
Resolution: [What was done]

Service is now fully operational. Monitoring for stability.

Post-mortem scheduled for [DATE/TIME].
```

## Post-Incident

### Immediate (within 1 hour)
- Document detailed timeline
- Capture all logs and metrics
- Create incident report in wiki
- Schedule post-mortem (within 24 hours)

### Post-Mortem Agenda
1. Timeline review
2. Root cause analysis (5 Whys)
3. What went well / what didn't
4. Action items to prevent recurrence
5. Runbook improvements

### Prevention Measures
- Improve deployment process (canary, blue-green)
- Add pre-deployment checks
- Improve health check robustness
- Add circuit breakers
- Improve monitoring/alerting
- Add automated rollback

## Escalation

If unable to resolve within 30 minutes:
- Escalate to Engineering Manager: eng-manager@medimate.my
- Escalate to CTO: cto@medimate.my
- Consider engaging AWS Support (Enterprise support)

## Related Runbooks
- [High API Error Rate](./api_error_rate.md)
- [Database Connection Issues](./database_connection.md)
- [Slow API Performance](./slow_api.md)
