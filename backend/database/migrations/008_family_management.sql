-- ============================================================================
-- MediMate Malaysia - Family Management System
-- Migration 008: Family Circles, Invitations, and Remote Monitoring
-- Date: 2025-09-18
-- ============================================================================

-- ============================================================================
-- FAMILY MANAGEMENT CORE TABLES
-- ============================================================================

-- Family circles - main family group container
CREATE TABLE family_circles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Family settings and configuration
    settings JSONB DEFAULT '{
        "maxMembers": 20,
        "emergencyNotificationDelay": 5,
        "defaultPrivacyLevel": "family",
        "culturalSettings": {
            "language": "ms",
            "prayerTimeAware": true,
            "festivalNotifications": true
        }
    }'::jsonb,

    -- Emergency contacts (outside family circle)
    emergency_contacts JSONB DEFAULT '[]'::jsonb,

    -- Cultural and preference settings
    cultural_preferences JSONB DEFAULT '{
        "primaryLanguage": "ms",
        "religiousObservance": "islamic",
        "familyHierarchy": "traditional",
        "decisionMaking": "collective"
    }'::jsonb,

    -- Family status
    active BOOLEAN DEFAULT TRUE,
    archived_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Family members - users within a family circle
CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES family_circles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role-based access control for family
    role TEXT NOT NULL CHECK (role IN ('admin', 'caregiver', 'viewer', 'emergency')),
    display_name TEXT, -- How they want to be shown to family
    relationship TEXT, -- father, mother, child, spouse, etc.

    -- Permission configuration
    permissions JSONB DEFAULT '{
        "viewMedications": true,
        "viewAdherence": true,
        "receiveEmergencyAlerts": true,
        "manageSettings": false,
        "inviteMembers": false,
        "viewHealthData": false
    }'::jsonb,

    -- Privacy settings - what this member shares
    privacy_settings JSONB DEFAULT '{
        "shareMedications": true,
        "shareAdherence": true,
        "shareHealthMetrics": false,
        "shareLocation": false,
        "emergencyOverride": true
    }'::jsonb,

    -- Member status and joining info
    status TEXT CHECK (status IN ('active', 'invited', 'suspended', 'left')) DEFAULT 'invited',
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMP WITH TIME ZONE,

    -- Malaysian cultural context
    cultural_context JSONB DEFAULT '{
        "respectLevel": "standard",
        "communicationPreference": "direct",
        "emergencyContactPriority": 1
    }'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(family_id, user_id)
);

-- Family invitations - secure invitation system
CREATE TABLE family_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES family_circles(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Invitation details
    invited_email TEXT NOT NULL,
    invited_phone TEXT, -- Malaysian phone format
    role TEXT NOT NULL CHECK (role IN ('admin', 'caregiver', 'viewer', 'emergency')),
    relationship TEXT,
    personal_message TEXT,

    -- Security features
    invite_code TEXT UNIQUE NOT NULL, -- 8-char alphanumeric
    qr_code_data TEXT, -- QR code payload for mobile scanning

    -- Expiration and usage
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 7 days default
    used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id),
    revoke_reason TEXT,

    -- Status tracking
    status TEXT CHECK (status IN ('pending', 'accepted', 'expired', 'revoked', 'failed')) DEFAULT 'pending',

    -- Attempt tracking
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    accept_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    last_attempt_ip INET,

    -- Cultural context for invitation
    cultural_greeting JSONB DEFAULT '{
        "language": "ms",
        "formality": "standard",
        "religiousGreeting": false
    }'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Family notifications - emergency and routine family alerts
CREATE TABLE family_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES family_circles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id), -- null for system notifications

    -- Notification content
    notification_type TEXT NOT NULL, -- medication_missed, emergency_alert, family_update, etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',

    -- Targeting and delivery
    target_members UUID[] DEFAULT '{}', -- specific members, empty = all
    delivery_channels TEXT[] DEFAULT '{"push"}', -- push, sms, email, voice

    -- Metadata and context
    metadata JSONB DEFAULT '{}', -- medication_id, user_id, etc.
    cultural_context JSONB DEFAULT '{
        "prayerTimeAware": true,
        "urgencyOverridesPrayer": false,
        "languagePreference": "auto"
    }'::jsonb,

    -- Delivery tracking
    delivery_status JSONB DEFAULT '{}', -- per-member delivery status
    delivery_attempts INTEGER DEFAULT 0,
    last_delivery_attempt TIMESTAMP WITH TIME ZONE,

    -- Resolution and follow-up
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Family activity log - comprehensive audit trail
CREATE TABLE family_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES family_circles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Activity details
    action_type TEXT NOT NULL, -- joined_family, medication_taken, emergency_triggered, etc.
    resource_type TEXT, -- medication, member, setting, invitation
    resource_id TEXT, -- UUID or identifier of affected resource

    -- Activity description
    action_description TEXT NOT NULL,
    previous_values JSONB, -- for update operations
    new_values JSONB, -- for update operations

    -- Request context
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,

    -- Cultural and contextual info
    cultural_context JSONB DEFAULT '{}',
    location_context JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Family medication sharing - tracks what medications are shared with family
CREATE TABLE family_medication_sharing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES family_circles(id) ON DELETE CASCADE,
    medication_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medication_id TEXT NOT NULL, -- References medication from core system

    -- Sharing configuration
    shared_with UUID[] DEFAULT '{}', -- specific family members, empty = all with permission
    sharing_level TEXT CHECK (sharing_level IN ('none', 'basic', 'full', 'emergency_only')) DEFAULT 'basic',

    -- What data is shared
    shared_data JSONB DEFAULT '{
        "medicationName": true,
        "dosage": true,
        "schedule": true,
        "adherenceStatus": true,
        "sideEffects": false,
        "notes": false
    }'::jsonb,

    -- Emergency override settings
    emergency_override BOOLEAN DEFAULT TRUE,
    emergency_share_level TEXT DEFAULT 'full',

    -- Temporal sharing (e.g., only during travel)
    active_from TIMESTAMP WITH TIME ZONE,
    active_until TIMESTAMP WITH TIME ZONE,

    -- Audit trail
    shared_by UUID NOT NULL REFERENCES users(id),
    sharing_reason TEXT,

    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(family_id, medication_owner_id, medication_id)
);

-- Family emergency escalation rules
CREATE TABLE family_emergency_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES family_circles(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),

    -- Rule configuration
    rule_name TEXT NOT NULL,
    trigger_conditions JSONB NOT NULL, -- what triggers this rule

    -- Escalation steps
    escalation_steps JSONB NOT NULL DEFAULT '[{
        "delay": 0,
        "methods": ["push"],
        "recipients": "primary_caregivers",
        "message": "Emergency alert: {patient_name} needs immediate attention"
    }]'::jsonb,

    -- Cultural considerations for escalation
    cultural_escalation JSONB DEFAULT '{
        "respectPrayerTimes": true,
        "emergencyOverride": true,
        "familyHierarchyAware": true,
        "languagePreferences": "auto"
    }'::jsonb,

    -- Rule status
    active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1, -- 1=highest priority

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR FAMILY MANAGEMENT PERFORMANCE
-- ============================================================================

-- Family circles indexes
CREATE INDEX idx_family_circles_created_by ON family_circles (created_by, active);
CREATE INDEX idx_family_circles_active ON family_circles (active, created_at DESC);

-- Family members indexes
CREATE INDEX idx_family_members_family_active ON family_members (family_id, status) WHERE status = 'active';
CREATE INDEX idx_family_members_user ON family_members (user_id, status);
CREATE INDEX idx_family_members_role ON family_members (family_id, role, status);

-- Family invitations indexes
CREATE INDEX idx_family_invitations_code ON family_invitations (invite_code) WHERE status = 'pending';
CREATE INDEX idx_family_invitations_email ON family_invitations (invited_email, status);
CREATE INDEX idx_family_invitations_family_status ON family_invitations (family_id, status, created_at DESC);
CREATE INDEX idx_family_invitations_expires ON family_invitations (expires_at, status) WHERE status = 'pending';

-- Family notifications indexes
CREATE INDEX idx_family_notifications_family_type ON family_notifications (family_id, notification_type, created_at DESC);
CREATE INDEX idx_family_notifications_severity ON family_notifications (severity, created_at DESC) WHERE severity IN ('high', 'critical');
CREATE INDEX idx_family_notifications_unresolved ON family_notifications (family_id, resolved_at) WHERE resolved_at IS NULL;

-- Family activity log indexes
CREATE INDEX idx_family_activity_family_time ON family_activity_log (family_id, created_at DESC);
CREATE INDEX idx_family_activity_user_time ON family_activity_log (user_id, created_at DESC);
CREATE INDEX idx_family_activity_type ON family_activity_log (action_type, created_at DESC);

-- Family medication sharing indexes
CREATE INDEX idx_family_med_sharing_family ON family_medication_sharing (family_id, active);
CREATE INDEX idx_family_med_sharing_owner ON family_medication_sharing (medication_owner_id, active);
CREATE INDEX idx_family_med_sharing_medication ON family_medication_sharing (medication_id, active);

-- Family emergency rules indexes
CREATE INDEX idx_family_emergency_rules_family ON family_emergency_rules (family_id, active, priority);

-- ============================================================================
-- FAMILY MANAGEMENT VIEWS
-- ============================================================================

-- Family members with user details
CREATE VIEW family_members_details AS
SELECT
    fm.id as membership_id,
    fm.family_id,
    fc.name as family_name,
    fm.user_id,
    u.full_name,
    u.email,
    u.phone,
    fm.role,
    fm.display_name,
    fm.relationship,
    fm.permissions,
    fm.privacy_settings,
    fm.status,
    fm.joined_at,
    fm.cultural_context
FROM family_members fm
JOIN family_circles fc ON fm.family_id = fc.id
JOIN users u ON fm.user_id = u.id
WHERE fm.status = 'active' AND fc.active = TRUE;

-- Active family invitations with family details
CREATE VIEW active_family_invitations AS
SELECT
    fi.id as invitation_id,
    fi.family_id,
    fc.name as family_name,
    fi.invited_email,
    fi.role,
    fi.relationship,
    fi.invite_code,
    fi.expires_at,
    fi.status,
    fi.view_count,
    u.full_name as invited_by_name,
    fi.created_at
FROM family_invitations fi
JOIN family_circles fc ON fi.family_id = fc.id
JOIN users u ON fi.invited_by = u.id
WHERE fi.status = 'pending'
  AND fi.expires_at > NOW()
  AND fc.active = TRUE;

-- Family emergency contacts with hierarchy
CREATE VIEW family_emergency_hierarchy AS
SELECT
    fc.id as family_id,
    fc.name as family_name,
    fm.user_id,
    u.full_name,
    u.phone,
    u.email,
    fm.role,
    fm.relationship,
    CASE
        WHEN fm.role = 'admin' THEN 1
        WHEN fm.role = 'caregiver' THEN 2
        WHEN fm.role = 'emergency' THEN 3
        ELSE 4
    END as contact_priority,
    fm.permissions,
    fm.cultural_context
FROM family_circles fc
JOIN family_members fm ON fc.id = fm.family_id
JOIN users u ON fm.user_id = u.id
WHERE fc.active = TRUE
  AND fm.status = 'active'
  AND (fm.permissions->>'receiveEmergencyAlerts')::boolean = TRUE
ORDER BY fc.id, contact_priority, fm.joined_at;

-- ============================================================================
-- FAMILY MANAGEMENT FUNCTIONS
-- ============================================================================

-- Generate secure family invitation code
CREATE OR REPLACE FUNCTION generate_family_invite_code() RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code (no ambiguous chars)
        SELECT upper(
            array_to_string(
                ARRAY(
                    SELECT chr((48 + round(random() * 33))::integer)
                    FROM generate_series(1,8)
                ), ''
            )
        ) INTO code;

        -- Replace ambiguous characters
        code := replace(code, '0', 'A');
        code := replace(code, '1', 'B');
        code := replace(code, 'O', 'C');
        code := replace(code, 'I', 'D');

        -- Check if code already exists
        SELECT EXISTS(
            SELECT 1 FROM family_invitations
            WHERE invite_code = code AND status = 'pending'
        ) INTO exists;

        EXIT WHEN NOT exists;
    END LOOP;

    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Check if user can perform action on family
CREATE OR REPLACE FUNCTION user_has_family_permission(
    p_user_id UUID,
    p_family_id UUID,
    p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
    user_role TEXT;
    permissions JSONB;
BEGIN
    -- Get user's role and permissions in family
    SELECT fm.role, fm.permissions
    INTO user_role, permissions
    FROM family_members fm
    WHERE fm.user_id = p_user_id
      AND fm.family_id = p_family_id
      AND fm.status = 'active';

    -- If user is not a family member, return false
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Admin has all permissions
    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- Check specific permission in JSONB
    has_permission := COALESCE((permissions->>p_permission)::boolean, FALSE);

    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- Get family members with medication sharing permissions
CREATE OR REPLACE FUNCTION get_family_medication_viewers(
    p_family_id UUID,
    p_medication_owner_id UUID
) RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    role TEXT,
    can_view_basic BOOLEAN,
    can_view_adherence BOOLEAN,
    emergency_contact BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        fm.user_id,
        u.full_name,
        fm.role,
        COALESCE((fm.permissions->>'viewMedications')::boolean, FALSE) as can_view_basic,
        COALESCE((fm.permissions->>'viewAdherence')::boolean, FALSE) as can_view_adherence,
        COALESCE((fm.permissions->>'receiveEmergencyAlerts')::boolean, FALSE) as emergency_contact
    FROM family_members fm
    JOIN users u ON fm.user_id = u.id
    WHERE fm.family_id = p_family_id
      AND fm.status = 'active'
      AND fm.user_id != p_medication_owner_id
      AND (
          COALESCE((fm.permissions->>'viewMedications')::boolean, FALSE) = TRUE
          OR COALESCE((fm.permissions->>'viewAdherence')::boolean, FALSE) = TRUE
      );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR FAMILY MANAGEMENT
-- ============================================================================

-- Update timestamp triggers
CREATE TRIGGER update_family_circles_timestamp
    BEFORE UPDATE ON family_circles
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_family_members_timestamp
    BEFORE UPDATE ON family_members
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_family_medication_sharing_timestamp
    BEFORE UPDATE ON family_medication_sharing
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_family_emergency_rules_timestamp
    BEFORE UPDATE ON family_emergency_rules
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Audit triggers for family management
CREATE TRIGGER audit_family_circles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON family_circles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_family_members_trigger
    AFTER INSERT OR UPDATE OR DELETE ON family_members
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_family_invitations_trigger
    AFTER INSERT OR UPDATE OR DELETE ON family_invitations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Auto-generate invitation code trigger
CREATE OR REPLACE FUNCTION set_invitation_code_trigger() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
        NEW.invite_code := generate_family_invite_code();
    END IF;

    -- Set default expiration if not provided (7 days)
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at := NOW() + INTERVAL '7 days';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invitation_code_trigger
    BEFORE INSERT ON family_invitations
    FOR EACH ROW EXECUTE FUNCTION set_invitation_code_trigger();

-- Auto-log family activities trigger
CREATE OR REPLACE FUNCTION log_family_activity_trigger() RETURNS TRIGGER AS $$
DECLARE
    family_id_val UUID;
    user_id_val UUID;
    action_desc TEXT;
BEGIN
    -- Determine family_id and user_id based on table
    IF TG_TABLE_NAME = 'family_members' THEN
        family_id_val := COALESCE(NEW.family_id, OLD.family_id);
        user_id_val := COALESCE(NEW.user_id, OLD.user_id);

        IF TG_OP = 'INSERT' THEN
            action_desc := 'Member joined family';
        ELSIF TG_OP = 'UPDATE' THEN
            action_desc := 'Member details updated';
        ELSIF TG_OP = 'DELETE' THEN
            action_desc := 'Member left family';
        END IF;

    ELSIF TG_TABLE_NAME = 'family_invitations' THEN
        family_id_val := COALESCE(NEW.family_id, OLD.family_id);
        user_id_val := COALESCE(NEW.invited_by, OLD.invited_by);

        IF TG_OP = 'INSERT' THEN
            action_desc := 'Family invitation sent';
        ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' THEN
            action_desc := 'Family invitation accepted';
        ELSIF TG_OP = 'UPDATE' AND NEW.status = 'revoked' THEN
            action_desc := 'Family invitation revoked';
        END IF;
    END IF;

    -- Insert activity log
    IF family_id_val IS NOT NULL AND user_id_val IS NOT NULL THEN
        INSERT INTO family_activity_log (
            family_id, user_id, action_type, resource_type, resource_id,
            action_description, previous_values, new_values
        ) VALUES (
            family_id_val, user_id_val, TG_OP, TG_TABLE_NAME,
            COALESCE(NEW.id::text, OLD.id::text),
            action_desc,
            CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_family_members_activity_trigger
    AFTER INSERT OR UPDATE OR DELETE ON family_members
    FOR EACH ROW EXECUTE FUNCTION log_family_activity_trigger();

CREATE TRIGGER log_family_invitations_activity_trigger
    AFTER INSERT OR UPDATE OR DELETE ON family_invitations
    FOR EACH ROW EXECUTE FUNCTION log_family_activity_trigger();

-- ============================================================================
-- GRANTS AND PERMISSIONS FOR FAMILY MANAGEMENT
-- ============================================================================

-- Grant permissions to application role
GRANT SELECT, INSERT, UPDATE, DELETE ON
    family_circles, family_members, family_invitations,
    family_notifications, family_activity_log, family_medication_sharing,
    family_emergency_rules
TO medimate_app;

-- Grant access to views
GRANT SELECT ON
    family_members_details, active_family_invitations, family_emergency_hierarchy
TO medimate_app;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO medimate_app;

-- Grant read-only access to analytics role
GRANT SELECT ON
    family_activity_log, family_notifications, family_emergency_hierarchy
TO medimate_analytics;

-- Grant healthcare provider limited family access
GRANT SELECT ON
    family_members_details, family_emergency_hierarchy
TO medimate_healthcare;

-- ============================================================================
-- TABLE COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE family_circles IS 'Malaysian family circles supporting up to 20 members with cultural settings';
COMMENT ON TABLE family_members IS 'Family members with role-based permissions and Malaysian cultural context';
COMMENT ON TABLE family_invitations IS 'Secure 7-day family invitations with QR code support';
COMMENT ON TABLE family_notifications IS 'Family emergency and routine notifications with cultural awareness';
COMMENT ON TABLE family_activity_log IS 'Comprehensive audit trail for family activities and PDPA compliance';
COMMENT ON TABLE family_medication_sharing IS 'Granular medication sharing controls between family members';
COMMENT ON TABLE family_emergency_rules IS 'Configurable emergency escalation rules with cultural considerations';

-- ============================================================================
-- INITIAL DATA FOR FAMILY ROLE PERMISSIONS
-- ============================================================================

-- This would be populated by the application during initialization
-- Default permission templates for each family role:
--
-- Admin: Full control over family settings, invitations, and member management
-- Caregiver: View medications, receive alerts, manage patient care
-- Viewer: Basic visibility into family health status, limited alerts
-- Emergency: Access only during emergencies, receives critical alerts only

-- End of Migration 008