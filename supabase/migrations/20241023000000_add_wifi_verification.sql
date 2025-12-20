-- WiFi Verification System Migration
-- Created: 2024-10-23
-- Purpose: Add WiFi-based attendance verification
-- Note: This migration was applied via Supabase MCP

-- =====================================================
-- 1. Create office_wifi_networks table
-- =====================================================
-- Applied via migration: add_office_wifi_networks_table
CREATE TABLE IF NOT EXISTS office_wifi_networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ssid TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure unique SSID per organization
    UNIQUE(organization_id, ssid)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_office_wifi_networks_org_active 
    ON office_wifi_networks(organization_id, is_active);

-- Add comment
COMMENT ON TABLE office_wifi_networks IS 'Office WiFi networks for attendance location verification';

-- Enable RLS
ALTER TABLE office_wifi_networks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- HR can view all networks in their organization
CREATE POLICY "HR can view office WiFi networks"
    ON office_wifi_networks
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid() 
            AND role IN ('hr', 'admin')
        )
    );

-- HR can insert networks
CREATE POLICY "HR can insert office WiFi networks"
    ON office_wifi_networks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid() 
            AND role IN ('hr', 'admin')
        )
    );

-- HR can update networks
CREATE POLICY "HR can update office WiFi networks"
    ON office_wifi_networks
    FOR UPDATE
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid() 
            AND role IN ('hr', 'admin')
        )
    );

-- HR can delete networks
CREATE POLICY "HR can delete office WiFi networks"
    ON office_wifi_networks
    FOR DELETE
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid() 
            AND role IN ('hr', 'admin')
        )
    );

-- Employees can view active networks in their organization
CREATE POLICY "Employees can view active WiFi networks"
    ON office_wifi_networks
    FOR SELECT
    TO authenticated
    USING (
        is_active = true
        AND organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

-- Auto update timestamp trigger
CREATE OR REPLACE FUNCTION update_office_wifi_networks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_office_wifi_networks_updated_at
    BEFORE UPDATE ON office_wifi_networks
    FOR EACH ROW
    EXECUTE FUNCTION update_office_wifi_networks_updated_at();

-- =====================================================
-- 2. Add WiFi verification to users table
-- =====================================================
-- Applied via migration: add_wifi_verification_to_users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS wifi_verification_required BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN users.wifi_verification_required IS 'Whether employee must be connected to office WiFi for attendance check-in/out';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_wifi_verification 
    ON users(wifi_verification_required) 
    WHERE wifi_verification_required = true;

-- =====================================================
-- 3. Add WiFi tracking to attendance_records table
-- =====================================================
-- Applied via migration: add_wifi_tracking_to_attendance
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS check_in_wifi_ssid TEXT,
ADD COLUMN IF NOT EXISTS check_in_wifi_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS check_out_wifi_ssid TEXT,
ADD COLUMN IF NOT EXISTS check_out_wifi_verified BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN attendance_records.check_in_wifi_ssid IS 'WiFi SSID at check-in time';
COMMENT ON COLUMN attendance_records.check_in_wifi_verified IS 'Whether check-in WiFi was verified against office networks';
COMMENT ON COLUMN attendance_records.check_out_wifi_ssid IS 'WiFi SSID at check-out time';
COMMENT ON COLUMN attendance_records.check_out_wifi_verified IS 'Whether check-out WiFi was verified against office networks';

-- Create index for WiFi verification queries
CREATE INDEX IF NOT EXISTS idx_attendance_wifi_verification 
    ON attendance_records(check_in_wifi_verified, check_out_wifi_verified);
