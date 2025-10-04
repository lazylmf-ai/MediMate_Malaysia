# Runbook: High Video Playback Failure Rate

**Severity:** P1 (Warning)

**Alert Name:** `video_playback_failure_rate`

**Symptoms:**
- Video playback failure rate exceeds 5%
- Users reporting videos won't play or keep buffering
- Increased video error events in analytics

## Immediate Actions (First 15 minutes)

### 1. Assess Scope
```bash
# Check current video failure rate
aws cloudwatch get-metric-statistics \
  --namespace MediMate/EducationHub \
  --metric-name VideoPlaybackErrorRate \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# Get total video starts vs errors
aws cloudwatch get-metric-statistics \
  --namespace MediMate/EducationHub \
  --metric-name VideoPlaybackStarts \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### 2. Identify Affected Videos
```bash
# Query video error logs
aws logs insights query \
  --log-group-name /aws/ecs/medimate-education-hub \
  --query-string 'fields @timestamp, video_id, error_code, error_message | filter event_type = "video_error" | stats count() by video_id, error_code | sort count desc' \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s)
```

### 3. Check CDN Status
```bash
# Check CloudFront distribution status
aws cloudfront get-distribution \
  --id E1234567890ABC \
  --query 'Distribution.Status'

# Check CloudFront error rates
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name 5xxErrorRate \
  --dimensions Name=DistributionId,Value=E1234567890ABC \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

## Investigation Steps

### 1. Analyze Error Patterns

**Check error distribution:**
```sql
-- Query video error logs
SELECT
  error_code,
  error_message,
  COUNT(*) as error_count,
  COUNT(DISTINCT video_id) as affected_videos,
  COUNT(DISTINCT user_id) as affected_users
FROM video_error_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY error_code, error_message
ORDER BY error_count DESC;
```

**Common error codes:**
- `MEDIA_ERR_ABORTED` (1) - User aborted playback
- `MEDIA_ERR_NETWORK` (2) - Network error during download
- `MEDIA_ERR_DECODE` (3) - Video decoding error
- `MEDIA_ERR_SRC_NOT_SUPPORTED` (4) - Video format not supported
- `MEDIA_ERR_ENCRYPTED` (5) - Encrypted media error

### 2. Check Video File Integrity

```bash
# Test video file accessibility
VIDEO_URL="https://cdn.medimate.my/education/videos/sample-video.mp4"
curl -I $VIDEO_URL

# Check video file headers
curl -I $VIDEO_URL | grep -E "Content-Type|Content-Length|Cache-Control"

# Download and check video file
curl -o /tmp/test-video.mp4 $VIDEO_URL
file /tmp/test-video.mp4
ffprobe /tmp/test-video.mp4
```

### 3. Check S3 Bucket Health

```bash
# Check S3 bucket exists and accessible
aws s3 ls s3://medimate-education-content/videos/

# Check bucket CORS configuration
aws s3api get-bucket-cors --bucket medimate-education-content

# Check bucket policy
aws s3api get-bucket-policy --bucket medimate-education-content

# Test S3 object retrieval
aws s3 cp s3://medimate-education-content/videos/sample-video.mp4 /tmp/test.mp4
```

### 4. Check CDN Configuration

```bash
# Check CloudFront origin settings
aws cloudfront get-distribution-config \
  --id E1234567890ABC \
  --query 'DistributionConfig.Origins'

# Check cache behaviors
aws cloudfront get-distribution-config \
  --id E1234567890ABC \
  --query 'DistributionConfig.CacheBehaviors'

# Check CloudFront invalidations
aws cloudfront list-invalidations \
  --distribution-id E1234567890ABC \
  --max-items 10
```

### 5. Check Signed URL Generation

```bash
# Test signed URL generation
curl "https://api.medimate.my/education/v1/content/VIDEO_ID/stream-url"

# Verify signed URL is valid
SIGNED_URL=$(curl -s "https://api.medimate.my/education/v1/content/VIDEO_ID/stream-url" | jq -r '.streamUrl')
curl -I "$SIGNED_URL"

# Check URL expiration
echo $SIGNED_URL | grep -oP 'Expires=\K\d+' | xargs -I {} date -d @{}
```

## Resolution Steps

### Scenario 1: CDN/CloudFront Issues
**Symptoms:** High 5xx errors from CloudFront, videos fail to load

**Resolution:**
```bash
# Check CloudFront distribution status
aws cloudfront get-distribution \
  --id E1234567890ABC \
  --query 'Distribution.{Status:Status,Enabled:DistributionConfig.Enabled}'

# If distribution disabled, enable it
aws cloudfront update-distribution \
  --id E1234567890ABC \
  --if-match ETAG \
  --distribution-config file://distribution-config.json

# Create invalidation for affected videos
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/videos/*"

# Monitor invalidation progress
aws cloudfront get-invalidation \
  --distribution-id E1234567890ABC \
  --id INVALIDATION_ID
```

### Scenario 2: S3 Bucket Access Issues
**Symptoms:** 403 Forbidden errors, videos not accessible

**Resolution:**
```bash
# Check S3 bucket policy
aws s3api get-bucket-policy \
  --bucket medimate-education-content \
  | jq '.Policy | fromjson'

# Update bucket policy to allow CloudFront access
cat > /tmp/bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontAccess",
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity E1234567890ABC"
    },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::medimate-education-content/videos/*"
  }]
}
EOF

aws s3api put-bucket-policy \
  --bucket medimate-education-content \
  --policy file:///tmp/bucket-policy.json
```

### Scenario 3: Video File Corruption
**Symptoms:** Videos failing to decode, format errors

**Resolution:**
```bash
# Identify corrupted videos
aws logs insights query \
  --log-group-name /aws/ecs/medimate-education-hub \
  --query-string 'fields video_id | filter error_code = "MEDIA_ERR_DECODE" | stats count() by video_id' \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s)

# Re-transcode affected videos
for video_id in $(cat corrupted_videos.txt); do
  # Trigger re-transcode job
  aws mediaconvert create-job \
    --role arn:aws:iam::ACCOUNT:role/MediaConvertRole \
    --settings file://transcode-settings.json \
    --queue arn:aws:mediaconvert:ap-southeast-1:ACCOUNT:queues/Default
done

# Disable corrupted videos temporarily
psql -h $DB_HOST -U $DB_USER -d medimate_production -c \
  "UPDATE content SET status = 'processing' WHERE id IN (SELECT unnest(ARRAY['video1', 'video2']));"
```

### Scenario 4: Signed URL Issues
**Symptoms:** Videos fail with authentication errors, 403 errors

**Resolution:**
```bash
# Check CloudFront key pair
aws cloudfront list-cloud-front-origin-access-identities

# Verify signing key is valid
openssl rsa -in /path/to/private-key.pem -check

# Update CloudFront trusted signers
aws cloudfront get-distribution-config \
  --id E1234567890ABC \
  > current-config.json

# Edit trusted signers in config
# Then update distribution
aws cloudfront update-distribution \
  --id E1234567890ABC \
  --if-match ETAG \
  --distribution-config file://updated-config.json

# Restart API to reload signing keys
aws ecs update-service \
  --cluster medimate-production \
  --service education-hub-api \
  --force-new-deployment
```

### Scenario 5: Network/Geographic Issues
**Symptoms:** Errors concentrated in specific regions/ISPs

**Resolution:**
```bash
# Check which CloudFront edge locations are having issues
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name 5xxErrorRate \
  --dimensions Name=DistributionId,Value=E1234567890ABC \
  --start-time $(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# If specific edge location issues, create geo restriction
# or enable additional edge locations

# Update CloudFront distribution with more edge locations
# Edit distribution config to include more price classes
aws cloudfront update-distribution \
  --id E1234567890ABC \
  --if-match ETAG \
  --distribution-config file://updated-config-with-more-edges.json
```

### Scenario 6: Mobile App Playback Issues
**Symptoms:** High failure rate on specific mobile platforms

**Resolution:**
```bash
# Check video format compatibility
ffprobe -v error -show_format -show_streams video.mp4

# Ensure HLS manifest is available for mobile
aws s3 ls s3://medimate-education-content/videos/VIDEO_ID/hls/

# Generate HLS variants if missing
aws mediaconvert create-job \
  --role arn:aws:iam::ACCOUNT:role/MediaConvertRole \
  --settings file://hls-transcode-settings.json

# Update content metadata to include HLS URLs
psql -h $DB_HOST -U $DB_USER -d medimate_production -c \
  "UPDATE content SET video_hls_url = 'https://cdn.medimate.my/videos/VIDEO_ID/hls/master.m3u8' WHERE id = 'VIDEO_ID';"
```

## Verification

### 1. Test Video Playback
```bash
# Test via API
curl "https://api.medimate.my/education/v1/content/VIDEO_ID/stream-url"

# Test direct video access
STREAM_URL=$(curl -s "https://api.medimate.my/education/v1/content/VIDEO_ID/stream-url" | jq -r '.streamUrl')
curl -I "$STREAM_URL"

# Use VLC to test playback
vlc "$STREAM_URL"
```

### 2. Monitor Error Rate
```bash
# Watch error rate for 15 minutes
watch -n 60 'aws cloudwatch get-metric-statistics \
  --namespace MediMate/EducationHub \
  --metric-name VideoPlaybackErrorRate \
  --start-time $(date -u -d "15 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average'
```

### 3. Verify CDN Performance
```bash
# Check CloudFront cache hit rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=E1234567890ABC \
  --start-time $(date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

**Success criteria:**
- Video playback error rate < 1%
- CloudFront 5xx error rate < 0.1%
- Cache hit rate > 90%
- No ongoing user complaints

## Prevention

### 1. Improve Video Processing
```bash
# Implement video validation before upload
# Add to upload pipeline
ffprobe -v error -show_format -show_streams "$VIDEO_FILE"
mediainfo --Output=JSON "$VIDEO_FILE"

# Automated quality checks
# - Video codec: H.264
# - Audio codec: AAC
# - Container: MP4
# - Max bitrate: 5 Mbps
# - Resolution: 720p or 1080p
```

### 2. Enhanced Monitoring
```yaml
# Add custom metrics for video quality
- BufferingEvents per video
- PlaybackStartTime
- VideoCompletionRate
- QualitySwitches
- BitrateDistribution
```

### 3. Redundancy
```bash
# Upload videos to multiple regions
aws s3 sync s3://medimate-education-content-ap-southeast-1/ \
  s3://medimate-education-content-us-west-2/ \
  --include "videos/*"

# Use CloudFront failover origin group
# Configure secondary origin in CloudFront distribution
```

## Related Runbooks
- [CDN Performance Issues](./cdn_performance.md)
- [S3 Access Issues](./s3_access.md)
- [Content Upload Pipeline](./content_upload.md)

## Contacts
- Video Platform Team: video-platform@medimate.my
- CDN Admin: cdn-admin@medimate.my
- On-call Engineer: Check PagerDuty rotation
