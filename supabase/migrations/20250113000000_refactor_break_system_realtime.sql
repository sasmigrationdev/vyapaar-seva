-- Migration: Refactor Break System to Real-Time Check-in/Check-out Style
-- This migration updates the break_requests table to support real-time break marking
-- similar to attendance check-in/check-out flow

-- 1. Add new columns for real-time break tracking
ALTER TABLE break_requests
ADD COLUMN IF NOT EXISTS actual_start_time timestamptz,
ADD COLUMN IF NOT EXISTS actual_end_time timestamptz,
ADD COLUMN IF NOT EXISTS start_wifi_ssid text,
ADD COLUMN IF NOT EXISTS start_wifi_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS end_wifi_ssid text,
ADD COLUMN IF NOT EXISTS end_wifi_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;

-- 2. Drop old status constraint temporarily
ALTER TABLE break_requests DROP CONSTRAINT IF EXISTS break_requests_status_check;

-- 3. Make requested_end_time nullable (no longer required at request time)
ALTER TABLE break_requests
ALTER COLUMN requested_end_time DROP NOT NULL;

-- 4. Add comments for clarity
COMMENT ON COLUMN break_requests.requested_start_time IS 'When employee requests to start break (timestamp when request is created)';
COMMENT ON COLUMN break_requests.requested_end_time IS 'DEPRECATED - No longer used in real-time flow';
COMMENT ON COLUMN break_requests.actual_start_time IS 'When break actually started (when HR approves or employee starts)';
COMMENT ON COLUMN break_requests.actual_end_time IS 'When break actually ended (when employee marks end)';
COMMENT ON COLUMN break_requests.approved_start_time IS 'DEPRECATED - Use actual_start_time instead';
COMMENT ON COLUMN break_requests.approved_end_time IS 'DEPRECATED - Use actual_end_time instead';
COMMENT ON COLUMN break_requests.start_wifi_ssid IS 'WiFi SSID when break started';
COMMENT ON COLUMN break_requests.start_wifi_verified IS 'Whether WiFi was verified at break start';
COMMENT ON COLUMN break_requests.end_wifi_ssid IS 'WiFi SSID when break ended';
COMMENT ON COLUMN break_requests.end_wifi_verified IS 'Whether WiFi was verified at break end';
COMMENT ON COLUMN break_requests.is_active IS 'Whether break is currently active (started but not ended)';
COMMENT ON COLUMN break_requests.status IS 'Status: pending_start (awaiting approval), active (approved, ongoing), completed (ended), rejected, cancelled';

-- 5. Create index for frequently queried active breaks
CREATE INDEX IF NOT EXISTS idx_break_requests_active
ON break_requests(user_id, is_active)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_break_requests_status_date
ON break_requests(status, request_date, user_id);

-- 6. Add constraint: only one active break per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_break_per_user
ON break_requests(user_id)
WHERE is_active = true;

-- 7. Update RLS policies if needed (maintain existing policies)
-- Existing policies should continue to work, but we'll add policy for active breaks

-- Policy: Users can view their own active breaks
DROP POLICY IF EXISTS "Users can view their own active breaks" ON break_requests;
CREATE POLICY "Users can view their own active breaks"
ON break_requests
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  auth.uid() IN (
    SELECT id FROM users WHERE organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ) AND role IN ('hr', 'admin')
  )
);

-- Policy: Users can end their own active breaks
DROP POLICY IF EXISTS "Users can end their own active breaks" ON break_requests;
CREATE POLICY "Users can end their own active breaks"
ON break_requests
FOR UPDATE
USING (
  auth.uid() = user_id AND is_active = true
  OR
  auth.uid() IN (
    SELECT id FROM users WHERE organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ) AND role IN ('hr', 'admin')
  )
);

-- 8. Create trigger to automatically calculate duration when break ends
CREATE OR REPLACE FUNCTION calculate_break_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if break is being ended
  IF NEW.actual_end_time IS NOT NULL AND OLD.actual_end_time IS NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.actual_end_time - NEW.actual_start_time)) / 60;
    NEW.is_active := false;
    NEW.status := 'completed';
  END IF;

  -- If break is being started (approved)
  IF NEW.actual_start_time IS NOT NULL AND OLD.actual_start_time IS NULL THEN
    NEW.is_active := true;
    NEW.status := 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_break_duration ON break_requests;
CREATE TRIGGER trigger_calculate_break_duration
BEFORE UPDATE ON break_requests
FOR EACH ROW
EXECUTE FUNCTION calculate_break_duration();

-- 9. Create function to check if user can start a new break
CREATE OR REPLACE FUNCTION can_start_break(p_user_id uuid, p_date date)
RETURNS boolean AS $$
DECLARE
  v_active_break_count integer;
  v_checked_in boolean;
BEGIN
  -- Check if user has any active breaks
  SELECT COUNT(*) INTO v_active_break_count
  FROM break_requests
  WHERE user_id = p_user_id AND is_active = true;

  IF v_active_break_count > 0 THEN
    RETURN false;
  END IF;

  -- Check if user is checked in for the day
  SELECT (check_in_time IS NOT NULL AND check_out_time IS NULL) INTO v_checked_in
  FROM attendance_records
  WHERE user_id = p_user_id AND date = p_date;

  IF v_checked_in IS NULL OR v_checked_in = false THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to check if user can check out (no active breaks)
CREATE OR REPLACE FUNCTION can_check_out(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_active_break_count integer;
BEGIN
  SELECT COUNT(*) INTO v_active_break_count
  FROM break_requests
  WHERE user_id = p_user_id AND is_active = true;

  RETURN v_active_break_count = 0;
END;
$$ LANGUAGE plpgsql;

-- 11. Migrate existing data before adding new constraint
-- Migrate existing 'approved' records to have actual times
UPDATE break_requests
SET
  actual_start_time = COALESCE(approved_start_time, requested_start_time),
  actual_end_time = COALESCE(approved_end_time, requested_end_time),
  is_active = false
WHERE status = 'approved' AND actual_start_time IS NULL;

-- Update status values
UPDATE break_requests SET status = 'pending_start' WHERE status = 'pending';
UPDATE break_requests SET status = 'completed' WHERE status = 'approved';

-- 12. Add new status constraint
ALTER TABLE break_requests
ADD CONSTRAINT break_requests_status_check
CHECK (status = ANY (ARRAY['pending_start'::text, 'active'::text, 'completed'::text, 'rejected'::text, 'cancelled'::text]));
