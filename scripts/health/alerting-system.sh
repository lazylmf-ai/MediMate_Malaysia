#!/bin/bash
#
# Alerting System for MediMate Malaysia
# Comprehensive alerting and notification system for health monitoring
#

set -euo pipefail

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

# Configuration
ALERT_CONFIG_FILE="${SCRIPT_DIR}/../../config/alerting.json"
ALERT_LOG_FILE="${SCRIPT_DIR}/../../logs/alerts/alert-$(date +%Y%m%d).log"
ALERT_STATE_FILE="${SCRIPT_DIR}/../../logs/alerts/alert-state.json"
WEBHOOK_TIMEOUT=30

# Alert levels
declare -A ALERT_LEVELS=(
    ["CRITICAL"]=1
    ["WARNING"]=2
    ["INFO"]=3
    ["DEBUG"]=4
)

# Alert channels
declare -A ALERT_CHANNELS=()

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to display alert output
print_alert() {
    local level="$1"
    local component="$2"
    local message="$3"
    local details="${4:-}"
    local color
    
    case "$level" in
        "CRITICAL") color="$RED" ;;
        "WARNING") color="$YELLOW" ;;
        "INFO") color="$BLUE" ;;
        "DEBUG") color="$CYAN" ;;
        "SUCCESS") color="$GREEN" ;;
        *) color="$NC" ;;
    esac
    
    local timestamp
    timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    
    printf "${color}[%-8s]${NC} [%s] %-15s %s\n" "$level" "$timestamp" "$component" "$message"
    
    if [[ -n "$details" ]]; then
        echo "         $details"
    fi
    
    # Log to file
    mkdir -p "$(dirname "$ALERT_LOG_FILE")"
    echo "[$level] [$timestamp] [$component] $message${details:+ - $details}" >> "$ALERT_LOG_FILE"
}

# Function to load alerting configuration
load_alert_config() {
    print_alert "DEBUG" "CONFIG" "Loading alerting configuration..."
    
    if [[ -f "$ALERT_CONFIG_FILE" ]]; then
        if jq empty "$ALERT_CONFIG_FILE" 2>/dev/null; then
            # Load alert channels
            while IFS= read -r channel; do
                local channel_name
                channel_name=$(echo "$channel" | jq -r '.name')
                local channel_type
                channel_type=$(echo "$channel" | jq -r '.type')
                local channel_endpoint
                channel_endpoint=$(echo "$channel" | jq -r '.endpoint')
                local channel_enabled
                channel_enabled=$(echo "$channel" | jq -r '.enabled // true')
                
                if [[ "$channel_enabled" == "true" ]]; then
                    ALERT_CHANNELS["$channel_name"]="$channel_type|$channel_endpoint"
                    print_alert "DEBUG" "CONFIG" "Loaded alert channel: $channel_name ($channel_type)"
                fi
            done < <(jq -c '.channels[]?' "$ALERT_CONFIG_FILE" 2>/dev/null || echo "")
            
            print_alert "SUCCESS" "CONFIG" "Alerting configuration loaded successfully" "${#ALERT_CHANNELS[@]} channels"
        else
            print_alert "WARNING" "CONFIG" "Invalid JSON in alerting configuration"
            create_default_config
        fi
    else
        print_alert "INFO" "CONFIG" "Alerting configuration not found, creating default"
        create_default_config
    fi
}

# Function to create default alerting configuration
create_default_config() {
    mkdir -p "$(dirname "$ALERT_CONFIG_FILE")"
    
    cat > "$ALERT_CONFIG_FILE" << 'EOF'
{
  "version": "1.0.0",
  "enabled": true,
  "default_level": "WARNING",
  "rate_limiting": {
    "enabled": true,
    "max_alerts_per_hour": 50,
    "duplicate_suppression_minutes": 10
  },
  "escalation": {
    "critical_escalation_minutes": 15,
    "warning_escalation_minutes": 60
  },
  "channels": [
    {
      "name": "console",
      "type": "console",
      "enabled": true,
      "levels": ["CRITICAL", "WARNING", "INFO"]
    },
    {
      "name": "log_file",
      "type": "file",
      "endpoint": "./logs/alerts/alerts.log",
      "enabled": true,
      "levels": ["CRITICAL", "WARNING", "INFO", "DEBUG"]
    },
    {
      "name": "email",
      "type": "email",
      "endpoint": "admin@medimate.local",
      "enabled": false,
      "levels": ["CRITICAL", "WARNING"],
      "smtp_config": {
        "server": "smtp.gmail.com",
        "port": 587,
        "username": "",
        "password": "",
        "tls": true
      }
    },
    {
      "name": "slack",
      "type": "webhook",
      "endpoint": "",
      "enabled": false,
      "levels": ["CRITICAL", "WARNING"],
      "headers": {
        "Content-Type": "application/json"
      }
    },
    {
      "name": "teams",
      "type": "webhook",
      "endpoint": "",
      "enabled": false,
      "levels": ["CRITICAL", "WARNING"],
      "headers": {
        "Content-Type": "application/json"
      }
    }
  ],
  "thresholds": {
    "cpu_usage_critical": 90,
    "cpu_usage_warning": 80,
    "memory_usage_critical": 95,
    "memory_usage_warning": 85,
    "disk_usage_critical": 95,
    "disk_usage_warning": 90,
    "response_time_critical_ms": 5000,
    "response_time_warning_ms": 2000,
    "error_rate_critical_percent": 5,
    "error_rate_warning_percent": 2
  },
  "malaysian_specific": {
    "business_hours": {
      "start": "08:00",
      "end": "18:00",
      "timezone": "Asia/Kuala_Lumpur"
    },
    "public_holidays_suppress": true,
    "cultural_considerations": {
      "ramadan_hours_adjustment": true,
      "chinese_new_year_suppression": true
    }
  }
}
EOF
    
    print_alert "SUCCESS" "CONFIG" "Default alerting configuration created" "$ALERT_CONFIG_FILE"
    
    # Reload configuration
    load_alert_config
}

# Function to check rate limiting
check_rate_limiting() {
    local alert_key="$1"
    local current_time
    current_time=$(date +%s)
    
    # Load alert state
    local alert_state="{}"
    if [[ -f "$ALERT_STATE_FILE" ]]; then
        alert_state=$(cat "$ALERT_STATE_FILE" 2>/dev/null || echo "{}")
    fi
    
    # Check if alert was sent recently
    local last_sent
    last_sent=$(echo "$alert_state" | jq -r ".\"$alert_key\".last_sent // 0" 2>/dev/null || echo "0")
    
    local suppression_seconds
    suppression_seconds=$(jq -r '.rate_limiting.duplicate_suppression_minutes // 10' "$ALERT_CONFIG_FILE" 2>/dev/null || echo "10")
    suppression_seconds=$((suppression_seconds * 60))
    
    local time_diff=$((current_time - last_sent))
    
    if [[ $time_diff -lt $suppression_seconds ]]; then
        print_alert "DEBUG" "RATE_LIMIT" "Alert suppressed due to rate limiting" "$alert_key (${time_diff}s ago)"
        return 1
    fi
    
    # Update alert state
    mkdir -p "$(dirname "$ALERT_STATE_FILE")"
    local updated_state
    updated_state=$(echo "$alert_state" | jq ".\"$alert_key\" = {\"last_sent\": $current_time, \"count\": (.\"$alert_key\".count // 0) + 1}")
    echo "$updated_state" > "$ALERT_STATE_FILE"
    
    return 0
}

# Function to send alert to console
send_console_alert() {
    local level="$1"
    local component="$2"
    local message="$3"
    local details="$4"
    
    print_alert "$level" "$component" "$message" "$details"
}

# Function to send alert via webhook
send_webhook_alert() {
    local webhook_url="$1"
    local level="$2"
    local component="$3"
    local message="$4"
    local details="$5"
    
    local webhook_payload
    webhook_payload=$(cat << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "service": "MediMate Malaysia",
  "level": "$level",
  "component": "$component",
  "message": "$message",
  "details": "$details",
  "hostname": "$(hostname)",
  "alert_id": "$(uuidgen 2>/dev/null || echo "$(date +%s)-$$")"
}
EOF
    )
    
    if command -v curl >/dev/null 2>&1; then
        if curl -sf -X POST -H "Content-Type: application/json" -d "$webhook_payload" --max-time "$WEBHOOK_TIMEOUT" "$webhook_url" >/dev/null 2>&1; then
            print_alert "DEBUG" "WEBHOOK" "Alert sent successfully" "$webhook_url"
            return 0
        else
            print_alert "WARNING" "WEBHOOK" "Failed to send webhook alert" "$webhook_url"
            return 1
        fi
    else
        print_alert "WARNING" "WEBHOOK" "curl not available for webhook alerts"
        return 1
    fi
}

# Function to send alert via email
send_email_alert() {
    local email_address="$1"
    local level="$2"
    local component="$3"
    local message="$4"
    local details="$5"
    
    local subject="MediMate Malaysia Alert - $level: $component"
    local body="Alert Details:

Service: MediMate Malaysia 🇲🇾
Level: $level
Component: $component
Time: $(date)
Host: $(hostname)

Message: $message

Details: $details

This is an automated alert from the MediMate Malaysia health monitoring system.
Please review the system status and take appropriate action if required.

Dashboard: http://$(hostname):8080/
Health API: http://$(hostname):8080/health

Thank you,
MediMate Malaysia Monitoring System"
    
    if command -v mail >/dev/null 2>&1; then
        if echo "$body" | mail -s "$subject" "$email_address" 2>/dev/null; then
            print_alert "DEBUG" "EMAIL" "Alert sent successfully" "$email_address"
            return 0
        else
            print_alert "WARNING" "EMAIL" "Failed to send email alert" "$email_address"
            return 1
        fi
    else
        print_alert "WARNING" "EMAIL" "mail command not available for email alerts"
        return 1
    fi
}

# Function to format Slack webhook payload
format_slack_payload() {
    local level="$1"
    local component="$2"
    local message="$3"
    local details="$4"
    
    local color
    case "$level" in
        "CRITICAL") color="danger" ;;
        "WARNING") color="warning" ;;
        "INFO") color="good" ;;
        *) color="good" ;;
    esac
    
    local emoji
    case "$level" in
        "CRITICAL") emoji="🚨" ;;
        "WARNING") emoji="⚠️" ;;
        "INFO") emoji="ℹ️" ;;
        *) emoji="📊" ;;
    esac
    
    cat << EOF
{
  "username": "MediMate Malaysia Monitor",
  "icon_emoji": ":hospital:",
  "attachments": [
    {
      "color": "$color",
      "title": "$emoji MediMate Malaysia Alert - $level",
      "fields": [
        {
          "title": "Component",
          "value": "$component",
          "short": true
        },
        {
          "title": "Level",
          "value": "$level",
          "short": true
        },
        {
          "title": "Message",
          "value": "$message",
          "short": false
        },
        {
          "title": "Details",
          "value": "$details",
          "short": false
        },
        {
          "title": "Host",
          "value": "$(hostname)",
          "short": true
        },
        {
          "title": "Time",
          "value": "$(date)",
          "short": true
        }
      ],
      "footer": "MediMate Malaysia 🇲🇾",
      "ts": $(date +%s)
    }
  ]
}
EOF
}

# Function to send alert through all configured channels
send_alert() {
    local level="$1"
    local component="$2"
    local message="$3"
    local details="${4:-}"
    
    # Check if alerting is enabled
    local alerting_enabled
    alerting_enabled=$(jq -r '.enabled // true' "$ALERT_CONFIG_FILE" 2>/dev/null || echo "true")
    
    if [[ "$alerting_enabled" != "true" ]]; then
        print_alert "DEBUG" "ALERT" "Alerting is disabled, skipping alert"
        return 0
    fi
    
    # Check alert level threshold
    local default_level
    default_level=$(jq -r '.default_level // "WARNING"' "$ALERT_CONFIG_FILE" 2>/dev/null || echo "WARNING")
    
    if [[ ${ALERT_LEVELS[$level]:-4} -gt ${ALERT_LEVELS[$default_level]:-2} ]]; then
        print_alert "DEBUG" "ALERT" "Alert level below threshold, skipping" "$level < $default_level"
        return 0
    fi
    
    # Check rate limiting
    local alert_key="${component}_${level}_$(echo "$message" | md5sum | cut -d' ' -f1 2>/dev/null || echo "unknown")"
    if ! check_rate_limiting "$alert_key"; then
        return 0
    fi
    
    # Send alerts through all configured channels
    local alerts_sent=0
    
    for channel_name in "${!ALERT_CHANNELS[@]}"; do
        local channel_info="${ALERT_CHANNELS[$channel_name]}"
        local channel_type="${channel_info%%|*}"
        local channel_endpoint="${channel_info#*|}"
        
        # Check if this channel should receive this alert level
        local channel_levels
        channel_levels=$(jq -r ".channels[] | select(.name == \"$channel_name\") | .levels[]?" "$ALERT_CONFIG_FILE" 2>/dev/null || echo "")
        
        local should_send=false
        while IFS= read -r channel_level; do
            if [[ "$channel_level" == "$level" ]]; then
                should_send=true
                break
            fi
        done <<< "$channel_levels"
        
        if [[ "$should_send" != "true" ]]; then
            continue
        fi
        
        case "$channel_type" in
            "console")
                send_console_alert "$level" "$component" "$message" "$details"
                ((alerts_sent++))
                ;;
            "webhook")
                if [[ -n "$channel_endpoint" && "$channel_endpoint" != "null" ]]; then
                    if [[ "$channel_name" == "slack" ]]; then
                        local slack_payload
                        slack_payload=$(format_slack_payload "$level" "$component" "$message" "$details")
                        if curl -sf -X POST -H "Content-Type: application/json" -d "$slack_payload" --max-time "$WEBHOOK_TIMEOUT" "$channel_endpoint" >/dev/null 2>&1; then
                            print_alert "DEBUG" "SLACK" "Alert sent successfully"
                            ((alerts_sent++))
                        fi
                    else
                        if send_webhook_alert "$channel_endpoint" "$level" "$component" "$message" "$details"; then
                            ((alerts_sent++))
                        fi
                    fi
                fi
                ;;
            "email")
                if [[ -n "$channel_endpoint" && "$channel_endpoint" != "null" ]]; then
                    if send_email_alert "$channel_endpoint" "$level" "$component" "$message" "$details"; then
                        ((alerts_sent++))
                    fi
                fi
                ;;
            "file")
                local file_path="$channel_endpoint"
                mkdir -p "$(dirname "$file_path")"
                echo "[$(date)] [$level] [$component] $message${details:+ - $details}" >> "$file_path"
                ((alerts_sent++))
                ;;
        esac
    done
    
    print_alert "INFO" "ALERT" "Alert sent through $alerts_sent channels" "$level: $component - $message"
    
    return 0
}

# Function to test alert channels
test_alert_channels() {
    print_alert "INFO" "TEST" "Testing all configured alert channels..."
    
    local test_level="INFO"
    local test_component="TEST"
    local test_message="Alert system test message"
    local test_details="This is a test alert to verify the alerting system is working correctly."
    
    send_alert "$test_level" "$test_component" "$test_message" "$test_details"
    
    print_alert "SUCCESS" "TEST" "Alert channel test completed"
}

# Function to monitor health metrics and trigger alerts
monitor_and_alert() {
    print_alert "INFO" "MONITOR" "Starting health monitoring with alerting..."
    
    # Get health data from performance monitor
    local health_script="${SCRIPT_DIR}/performance-monitor.sh"
    local service_script="${SCRIPT_DIR}/service-checks.sh"
    
    if [[ -x "$health_script" ]]; then
        print_alert "DEBUG" "MONITOR" "Running performance monitoring..."
        
        # Run performance monitor and capture output
        local perf_output
        if perf_output=$("$health_script" single 2>&1); then
            # Parse output for alert conditions
            while IFS= read -r line; do
                if [[ "$line" =~ \[CRITICAL\] ]]; then
                    local component
                    component=$(echo "$line" | sed -n 's/.*\[\([^]]*\)\].*/\1/p' | head -n1)
                    local message
                    message=$(echo "$line" | sed 's/.*\] //')
                    send_alert "CRITICAL" "${component:-PERFORMANCE}" "$message"
                elif [[ "$line" =~ \[WARNING\] ]]; then
                    local component
                    component=$(echo "$line" | sed -n 's/.*\[\([^]]*\)\].*/\1/p' | head -n1)
                    local message
                    message=$(echo "$line" | sed 's/.*\] //')
                    send_alert "WARNING" "${component:-PERFORMANCE}" "$message"
                fi
            done <<< "$perf_output"
        else
            send_alert "CRITICAL" "PERFORMANCE" "Performance monitoring script failed" "$perf_output"
        fi
    fi
    
    if [[ -x "$service_script" ]]; then
        print_alert "DEBUG" "MONITOR" "Running service health checks..."
        
        # Run service checks and capture output
        local service_output
        if service_output=$("$service_script" check 2>&1); then
            # Parse output for service failures
            while IFS= read -r line; do
                if [[ "$line" =~ \[FAIL\] ]] && [[ "$line" =~ (PostgreSQL|Redis|MinIO|Docker) ]]; then
                    local service
                    service=$(echo "$line" | grep -oE "(PostgreSQL|Redis|MinIO|Docker)" | head -n1)
                    local message
                    message=$(echo "$line" | sed 's/.*\] //')
                    send_alert "CRITICAL" "SERVICE_${service^^}" "$message"
                elif [[ "$line" =~ \[WARN\] ]] && [[ "$line" =~ (PostgreSQL|Redis|MinIO|Docker) ]]; then
                    local service
                    service=$(echo "$line" | grep -oE "(PostgreSQL|Redis|MinIO|Docker)" | head -n1)
                    local message
                    message=$(echo "$line" | sed 's/.*\] //')
                    send_alert "WARNING" "SERVICE_${service^^}" "$message"
                fi
            done <<< "$service_output"
        else
            send_alert "CRITICAL" "SERVICES" "Service health check script failed" "$service_output"
        fi
    fi
    
    print_alert "SUCCESS" "MONITOR" "Health monitoring cycle completed"
}

# Function to run continuous monitoring with alerting
run_continuous_monitoring() {
    local interval="${1:-300}"  # 5 minutes default
    local duration="${2:-0}"    # 0 means infinite
    
    print_alert "INFO" "CONTINUOUS" "Starting continuous monitoring with alerting" "Interval: ${interval}s"
    
    local start_time
    start_time=$(date +%s)
    
    # Send startup alert
    send_alert "INFO" "SYSTEM" "MediMate Malaysia monitoring system started" "Continuous monitoring active with ${interval}s interval"
    
    while true; do
        monitor_and_alert
        
        # Check if duration limit reached
        if [[ $duration -gt 0 ]]; then
            local current_time
            current_time=$(date +%s)
            local elapsed=$(( current_time - start_time ))
            if [[ $elapsed -ge $duration ]]; then
                print_alert "INFO" "CONTINUOUS" "Monitoring duration completed" "${duration}s"
                break
            fi
        fi
        
        print_alert "DEBUG" "CONTINUOUS" "Waiting for next monitoring cycle" "${interval}s"
        sleep "$interval"
    done
    
    # Send shutdown alert
    send_alert "INFO" "SYSTEM" "MediMate Malaysia monitoring system stopped" "Continuous monitoring ended"
}

# Function to create alert dashboard
create_alert_dashboard() {
    local dashboard_file="${SCRIPT_DIR}/../../monitoring/alerts-dashboard.html"
    
    print_alert "INFO" "DASHBOARD" "Creating alerts dashboard..."
    
    cat > "$dashboard_file" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MediMate Malaysia - Alerts Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            margin: 0;
            padding: 20px;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .alert-card {
            background: white;
            margin: 10px 0;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #ddd;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .alert-critical { border-left-color: #e74c3c; }
        .alert-warning { border-left-color: #f39c12; }
        .alert-info { border-left-color: #3498db; }
        .alert-success { border-left-color: #2ecc71; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🇲🇾 MediMate Malaysia - Alerts Dashboard</h1>
        <p>Real-time monitoring alerts and system notifications</p>
    </div>
    
    <div id="alerts-container">
        <div class="alert-card alert-info">
            <h3>System Status</h3>
            <p>Alerts dashboard is running. Configure alert channels in the alerting configuration.</p>
        </div>
    </div>
    
    <script>
        // Refresh alerts every 30 seconds
        setInterval(() => {
            location.reload();
        }, 30000);
    </script>
</body>
</html>
EOF
    
    print_alert "SUCCESS" "DASHBOARD" "Alerts dashboard created" "$dashboard_file"
}

# Main function
main() {
    local command="${1:-help}"
    local param1="${2:-}"
    local param2="${3:-}"
    
    # Load configuration first
    load_alert_config
    
    case "$command" in
        "send")
            if [[ -n "$param1" && -n "$param2" ]]; then
                local level="${param1^^}"
                local component="MANUAL"
                local message="$param2"
                local details="${3:-}"
                send_alert "$level" "$component" "$message" "$details"
            else
                echo "Usage: $0 send <level> <message> [details]"
                exit 1
            fi
            ;;
        "test")
            test_alert_channels
            ;;
        "monitor")
            monitor_and_alert
            ;;
        "continuous")
            run_continuous_monitoring "$param1" "$param2"
            ;;
        "dashboard")
            create_alert_dashboard
            ;;
        "config")
            if [[ "$param1" == "create" ]]; then
                create_default_config
            else
                echo "Current configuration: $ALERT_CONFIG_FILE"
                if [[ -f "$ALERT_CONFIG_FILE" ]]; then
                    jq . "$ALERT_CONFIG_FILE"
                else
                    echo "Configuration file not found"
                fi
            fi
            ;;
        "logs")
            if [[ -f "$ALERT_LOG_FILE" ]]; then
                tail -f "$ALERT_LOG_FILE"
            else
                echo "Alert log file not found: $ALERT_LOG_FILE"
            fi
            ;;
        *)
            echo "Usage: $0 {send|test|monitor|continuous|dashboard|config|logs}"
            echo ""
            echo "Commands:"
            echo "  send <level> <message> [details]  - Send manual alert"
            echo "  test                              - Test all alert channels"
            echo "  monitor                           - Run single monitoring cycle"
            echo "  continuous [interval] [duration]  - Run continuous monitoring"
            echo "  dashboard                         - Create alerts dashboard"
            echo "  config [create]                   - Show or create configuration"
            echo "  logs                              - Tail alert logs"
            echo ""
            echo "Alert Levels: CRITICAL, WARNING, INFO, DEBUG"
            echo ""
            echo "Examples:"
            echo "  $0 send CRITICAL \"Database connection failed\""
            echo "  $0 continuous 300 3600  # Monitor every 5min for 1hr"
            echo "  $0 test                 # Test all channels"
            exit 1
            ;;
    esac
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi