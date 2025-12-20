-- Create overtime_requests table for employee overtime approval workflow
-- Note: This table stores overtime requests submitted by employees that require HR approval

CREATE TABLE IF NOT EXISTS public.overtime_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  attendance_record_id UUID NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  request_date DATE NOT NULL,

  -- Overtime details
  requested_hours NUMERIC(4,2) NOT NULL CHECK (requested_hours > 0 AND requested_hours <= 10),
  reason TEXT,

  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_hours NUMERIC(4,2),

  -- Review metadata
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints - one overtime request per attendance record
  CONSTRAINT unique_overtime_request_per_attendance UNIQUE (attendance_record_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_overtime_requests_user_id ON public.overtime_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_status ON public.overtime_requests(status);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_request_date ON public.overtime_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_attendance_record_id ON public.overtime_requests(attendance_record_id);

-- Add comment for documentation
COMMENT ON TABLE public.overtime_requests IS 'Stores overtime approval requests submitted by employees for HR approval';

-- Enable Row Level Security
ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Employees can view their own requests
CREATE POLICY "Users can view own overtime requests"
  ON public.overtime_requests FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Employees can insert their own requests
CREATE POLICY "Users can insert own overtime requests"
  ON public.overtime_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: HR can view all requests in their organization
CREATE POLICY "HR can view org overtime requests"
  ON public.overtime_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = public.overtime_requests.user_id
      AND u.organization_id = (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
      AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('hr', 'admin')
    )
  );

-- RLS Policy: HR can update any request in their organization
CREATE POLICY "HR can update org overtime requests"
  ON public.overtime_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = public.overtime_requests.user_id
      AND u.organization_id = (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
      AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('hr', 'admin')
    )
  );

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_overtime_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_overtime_requests_updated_at ON public.overtime_requests;
CREATE TRIGGER update_overtime_requests_updated_at
  BEFORE UPDATE ON public.overtime_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_overtime_requests_updated_at();

-- Trigger function to sync approved overtime to attendance_records
CREATE OR REPLACE FUNCTION sync_overtime_to_attendance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') AND NEW.approved_hours IS NOT NULL THEN
    UPDATE public.attendance_records
    SET
      overtime_hours = NEW.approved_hours,
      overtime_reason = NEW.reason,
      updated_at = NOW()
    WHERE id = NEW.attendance_record_id;
  END IF;

  -- Clear overtime from attendance_records if request is rejected
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status <> 'rejected') THEN
    UPDATE public.attendance_records
    SET
      overtime_hours = NULL,
      overtime_reason = NULL,
      updated_at = NOW()
    WHERE id = NEW.attendance_record_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for syncing overtime on approval/rejection
DROP TRIGGER IF EXISTS sync_overtime_on_status_change ON public.overtime_requests;
CREATE TRIGGER sync_overtime_on_status_change
  AFTER UPDATE OF status ON public.overtime_requests
  FOR EACH ROW
  EXECUTE FUNCTION sync_overtime_to_attendance();
