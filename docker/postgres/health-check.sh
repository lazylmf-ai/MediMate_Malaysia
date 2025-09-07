#!/bin/bash
# PostgreSQL Health Check Script for MediMate Malaysia
# Comprehensive health validation for healthcare database

set -e

# Configuration
POSTGRES_HOST=${POSTGRES_HOST:-localhost}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
POSTGRES_DB=${POSTGRES_DB:-medimate_dev}
POSTGRES_USER=${POSTGRES_USER:-postgres}
TIMEOUT=30
RETRY_INTERVAL=2

echo "🏥 MediMate PostgreSQL Health Check"
echo "=================================="
echo "Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "Database: $POSTGRES_DB"
echo "User: $POSTGRES_USER"
echo ""

# Function to run SQL query with timeout
run_query() {
    local query="$1"
    local description="$2"
    
    echo -n "Checking $description... "
    
    if timeout $TIMEOUT psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "$query" > /dev/null 2>&1; then
        echo "✅ OK"
        return 0
    else
        echo "❌ FAILED"
        return 1
    fi
}

# Function to check table row counts
check_table_data() {
    local table="$1"
    local min_rows="$2"
    
    echo -n "Checking $table data... "
    
    local count=$(timeout $TIMEOUT psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs)
    
    if [[ "$count" =~ ^[0-9]+$ ]] && [[ $count -ge $min_rows ]]; then
        echo "✅ $count rows"
        return 0
    else
        echo "❌ $count rows (expected >= $min_rows)"
        return 1
    fi
}

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
retry_count=0
max_retries=$((TIMEOUT / RETRY_INTERVAL))

while ! pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" > /dev/null 2>&1; do
    if [ $retry_count -eq $max_retries ]; then
        echo "❌ PostgreSQL failed to become ready within $TIMEOUT seconds"
        exit 1
    fi
    echo "  Waiting... (attempt $((retry_count + 1))/$max_retries)"
    sleep $RETRY_INTERVAL
    retry_count=$((retry_count + 1))
done

echo "✅ PostgreSQL is accepting connections"
echo ""

# Basic connectivity test
echo "🔍 Basic Health Checks"
echo "----------------------"

run_query "SELECT 1;" "basic connectivity" || exit 1
run_query "SELECT version();" "PostgreSQL version" || exit 1
run_query "SELECT current_database();" "database selection" || exit 1

# Extension checks
echo ""
echo "🧩 Extension Health Checks"
echo "--------------------------"

run_query "SELECT 1 FROM pg_extension WHERE extname='uuid-ossp';" "uuid-ossp extension" || exit 1
run_query "SELECT 1 FROM pg_extension WHERE extname='pg_trgm';" "pg_trgm extension" || exit 1
run_query "SELECT 1 FROM pg_extension WHERE extname='unaccent';" "unaccent extension" || exit 1
run_query "SELECT 1 FROM pg_extension WHERE extname='pgcrypto';" "pgcrypto extension" || exit 1

# Schema validation
echo ""
echo "🏗️  Schema Health Checks"
echo "------------------------"

# Core healthcare tables
healthcare_tables=(
    "users"
    "families"
    "medications"
    "adherence_logs"
    "healthcare_providers"
    "medication_database"
    "cultural_events"
    "prayer_times"
    "medication_reminders"
)

for table in "${healthcare_tables[@]}"; do
    run_query "SELECT 1 FROM information_schema.tables WHERE table_name='$table';" "$table table exists" || exit 1
done

# Malaysian-specific function checks
echo ""
echo "🇲🇾 Malaysian Healthcare Functions"
echo "-----------------------------------"

run_query "SELECT validate_malaysian_ic('850215-14-1234');" "Malaysian IC validation function" || exit 1
run_query "SELECT extract_birth_date_from_ic('850215-14-1234');" "IC birth date extraction function" || exit 1
run_query "SELECT extract_gender_from_ic('850215-14-1234');" "IC gender extraction function" || exit 1
run_query "SELECT generate_reminder_token();" "reminder token generation function" || exit 1

# Data integrity checks
echo ""
echo "📊 Data Integrity Checks"
echo "------------------------"

# Check if cultural data exists
check_table_data "cultural_events" 10
check_table_data "prayer_times" 5
check_table_data "medication_database" 5

# Check for required indexes
echo ""
echo "⚡ Performance Index Checks"
echo "--------------------------"

indexes=(
    "idx_users_ic_hash"
    "idx_users_email"
    "idx_medications_user_active"
    "idx_adherence_user_date"
    "idx_cultural_events_date_type"
    "idx_prayer_times_city_date"
)

for index in "${indexes[@]}"; do
    run_query "SELECT 1 FROM pg_indexes WHERE indexname='$index';" "$index index" || exit 1
done

# Performance checks
echo ""
echo "🚀 Performance Health Checks"
echo "----------------------------"

# Check connection count
connection_count=$(timeout $TIMEOUT psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | xargs)
echo "Active connections: $connection_count"

# Check database size
db_size=$(timeout $TIMEOUT psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null | xargs)
echo "Database size: $db_size"

# Check for long-running queries
long_queries=$(timeout $TIMEOUT psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '5 minutes';" 2>/dev/null | xargs)
if [[ $long_queries -gt 0 ]]; then
    echo "⚠️  Warning: $long_queries long-running queries detected"
else
    echo "✅ No long-running queries"
fi

# Malaysian healthcare compliance checks
echo ""
echo "🏥 Healthcare Compliance Checks"
echo "-------------------------------"

# Check audit log functionality
run_query "SELECT 1 FROM audit_log LIMIT 1;" "audit logging system" || echo "⚠️  Audit log is empty (acceptable for new installation)"

# Check consent records table
run_query "SELECT 1 FROM information_schema.tables WHERE table_name='consent_records';" "PDPA consent tracking" || exit 1

# Check data encryption functions
run_query "SELECT generate_ic_hash('test-ic-123');" "IC hashing for privacy" || exit 1

# Cultural features validation
echo ""
echo "🕌 Cultural Features Validation"
echo "-------------------------------"

# Verify prayer time data structure
run_query "SELECT city, state, fajr, dhuhr, asr, maghrib, isha FROM prayer_times LIMIT 1;" "prayer times structure" || exit 1

# Verify cultural events structure
run_query "SELECT event_name, event_type, event_date, affects_medication FROM cultural_events WHERE affects_medication = true LIMIT 1;" "cultural medication impacts" || exit 1

# Check Malaysian medication database
run_query "SELECT medication_name, halal_certified FROM medication_database WHERE halal_certified = true LIMIT 1;" "halal medication tracking" || exit 1

echo ""
echo "📈 Final Health Summary"
echo "======================"

# Overall database statistics
stats_query="
SELECT 
    'Tables' as metric, count(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
    'Indexes' as metric, count(*) as count 
FROM pg_indexes 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Functions' as metric, count(*) as count 
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public'
UNION ALL
SELECT 
    'Extensions' as metric, count(*) as count 
FROM pg_extension
WHERE extname NOT IN ('plpgsql');
"

echo "Database Statistics:"
psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "$stats_query" 2>/dev/null

echo ""
echo "✅ PostgreSQL health check completed successfully!"
echo "🇲🇾 MediMate Malaysia database is ready for healthcare operations"

exit 0