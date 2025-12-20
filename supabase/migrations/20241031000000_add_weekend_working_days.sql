-- Add Saturday and Sunday as working days for all employees
-- This migration safely adds these days without removing any existing working days

-- Update all users to include Saturday and Sunday in their working_days array
-- Only adds days that are not already present
UPDATE users
SET working_days = ARRAY(
  SELECT DISTINCT unnest(
    COALESCE(working_days, ARRAY[]::text[]) ||
    ARRAY['Saturday', 'Sunday']
  )
)
WHERE
  -- Only update if Saturday or Sunday is not already in the array
  (working_days IS NULL
   OR NOT (working_days @> ARRAY['Saturday', 'Sunday']));

-- Add comment to explain the working days column
COMMENT ON COLUMN users.working_days IS 'Array of working days for the employee. Can include: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday';
