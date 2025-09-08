-- PostgreSQL initialization script for MediMate Malaysia
-- Creates database, extensions, and basic configuration

-- Create test database if it doesn't exist
SELECT 'CREATE DATABASE medimate_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'medimate_test')\gexec

-- Connect to main database
\c medimate_dev;

-- Install required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom functions for Malaysian healthcare system
CREATE OR REPLACE FUNCTION generate_ic_hash(ic_number TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Hash Malaysian IC number for privacy compliance
    RETURN encode(digest(ic_number, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate Malaysian IC format
CREATE OR REPLACE FUNCTION validate_malaysian_ic(ic_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Malaysian IC format: YYMMDD-PP-###G
    -- Where YY=year, MM=month, DD=day, PP=place of birth, ###=sequence, G=gender
    RETURN ic_number ~ '^\d{6}-\d{2}-\d{4}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract birth date from Malaysian IC
CREATE OR REPLACE FUNCTION extract_birth_date_from_ic(ic_number TEXT)
RETURNS DATE AS $$
DECLARE
    year_part INTEGER;
    month_part INTEGER;
    day_part INTEGER;
    full_year INTEGER;
BEGIN
    IF NOT validate_malaysian_ic(ic_number) THEN
        RETURN NULL;
    END IF;
    
    year_part := SUBSTRING(ic_number FROM 1 FOR 2)::INTEGER;
    month_part := SUBSTRING(ic_number FROM 3 FOR 2)::INTEGER;
    day_part := SUBSTRING(ic_number FROM 5 FOR 2)::INTEGER;
    
    -- Determine century (assuming people born after 1950)
    IF year_part <= 30 THEN
        full_year := 2000 + year_part;
    ELSE
        full_year := 1900 + year_part;
    END IF;
    
    RETURN make_date(full_year, month_part, day_part);
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to determine gender from Malaysian IC
CREATE OR REPLACE FUNCTION extract_gender_from_ic(ic_number TEXT)
RETURNS VARCHAR(1) AS $$
DECLARE
    last_digit INTEGER;
BEGIN
    IF NOT validate_malaysian_ic(ic_number) THEN
        RETURN NULL;
    END IF;
    
    last_digit := SUBSTRING(ic_number FROM LENGTH(ic_number) FOR 1)::INTEGER;
    
    -- Even = Female, Odd = Male
    IF last_digit % 2 = 0 THEN
        RETURN 'F';
    ELSE
        RETURN 'M';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate secure medication reminder tokens
CREATE OR REPLACE FUNCTION generate_reminder_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function to calculate prayer time adjustments
CREATE OR REPLACE FUNCTION calculate_prayer_adjustment(
    scheduled_time TIME,
    prayer_times JSONB,
    buffer_minutes INTEGER DEFAULT 15
)
RETURNS TIME AS $$
DECLARE
    prayer_time TIME;
    adjusted_time TIME;
BEGIN
    -- Check if scheduled time conflicts with any prayer time
    FOR prayer_time IN 
        SELECT (value::TEXT)::TIME 
        FROM jsonb_each_text(prayer_times) 
    LOOP
        -- If within buffer minutes of prayer time, adjust
        IF ABS(EXTRACT(EPOCH FROM (scheduled_time - prayer_time))) <= (buffer_minutes * 60) THEN
            -- Move to after prayer time + buffer
            adjusted_time := prayer_time + INTERVAL '1 minute' * buffer_minutes;
            -- Ensure it's not too late (before 10 PM)
            IF adjusted_time <= '22:00:00'::TIME THEN
                RETURN adjusted_time;
            ELSE
                -- Move to before prayer time - buffer
                adjusted_time := prayer_time - INTERVAL '1 minute' * buffer_minutes;
                IF adjusted_time >= '06:00:00'::TIME THEN
                    RETURN adjusted_time;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    -- No conflict, return original time
    RETURN scheduled_time;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create audit trigger function for compliance
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, old_data, changed_by, changed_at)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), current_user, NOW());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, old_data, new_data, changed_by, changed_at)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), current_user, NOW());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, new_data, changed_by, changed_at)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), current_user, NOW());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create roles for different access levels
DO $$
BEGIN
    -- Application role
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'medimate_app') THEN
        CREATE ROLE medimate_app WITH LOGIN PASSWORD 'medimate_app_pass';
    END IF;
    
    -- Read-only analytics role
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'medimate_analytics') THEN
        CREATE ROLE medimate_analytics WITH LOGIN PASSWORD 'medimate_analytics_pass';
    END IF;
    
    -- Healthcare provider role
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'medimate_healthcare') THEN
        CREATE ROLE medimate_healthcare WITH LOGIN PASSWORD 'medimate_healthcare_pass';
    END IF;
END
$$;

-- Performance optimizations
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log slow queries
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';

COMMENT ON DATABASE medimate_dev IS 'MediMate Malaysia - Healthcare medication management platform';

-- Switch to test database and apply same setup
\c medimate_test;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

COMMENT ON DATABASE medimate_test IS 'MediMate Malaysia - Test database for automated testing';