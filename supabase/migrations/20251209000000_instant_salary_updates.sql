-- Migration: Enable instant salary updates
-- This migration updates the salary system to apply changes immediately instead of scheduling for next month

-- 1. Create helper function to get the applicable hourly rate for a specific date
CREATE OR REPLACE FUNCTION public.get_hourly_rate_for_date(
  p_user_id UUID,
  p_date DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  -- Get the hourly rate that was effective on the given date
  -- Look at salary_history for the most recent entry where effective_from <= p_date
  SELECT new_hourly_rate INTO v_rate
  FROM salary_history
  WHERE user_id = p_user_id
    AND effective_from <= p_date
  ORDER BY effective_from DESC, created_at DESC
  LIMIT 1;

  -- If no history found, fall back to current rate in users table
  IF v_rate IS NULL THEN
    SELECT hourly_rate INTO v_rate
    FROM users
    WHERE id = p_user_id;
  END IF;

  RETURN COALESCE(v_rate, 0);
END;
$$;

-- 2. Create function to recalculate monthly earnings for a user
CREATE OR REPLACE FUNCTION public.recalculate_monthly_earnings(
  p_user_id UUID,
  p_month INT,
  p_year INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_hours NUMERIC := 0;
  v_total_earned NUMERIC := 0;
  v_expected_hours NUMERIC;
  r_attendance RECORD;
  v_applicable_rate NUMERIC;
BEGIN
  -- Get expected hours from current user config
  SELECT monthly_total_hours INTO v_expected_hours
  FROM users WHERE id = p_user_id;

  -- Loop through all attendance records for the month
  FOR r_attendance IN
    SELECT date, total_hours
    FROM attendance_records
    WHERE user_id = p_user_id
      AND EXTRACT(MONTH FROM date) = p_month
      AND EXTRACT(YEAR FROM date) = p_year
      AND total_hours IS NOT NULL
      AND total_hours > 0
  LOOP
    -- Get applicable rate for each day
    v_applicable_rate := get_hourly_rate_for_date(p_user_id, r_attendance.date);
    v_total_hours := v_total_hours + r_attendance.total_hours;
    v_total_earned := v_total_earned + (r_attendance.total_hours * v_applicable_rate);
  END LOOP;

  -- Update or insert monthly earnings
  INSERT INTO employee_monthly_earnings (
    user_id, month, year, total_hours_worked, earned_salary, expected_hours
  ) VALUES (
    p_user_id, p_month, p_year, v_total_hours, v_total_earned, COALESCE(v_expected_hours, 0)
  )
  ON CONFLICT (user_id, month, year)
  DO UPDATE SET
    total_hours_worked = v_total_hours,
    earned_salary = v_total_earned,
    expected_hours = COALESCE(v_expected_hours, 0),
    updated_at = NOW();
END;
$$;

-- 3. Update the main update_employee_salary function for instant updates
CREATE OR REPLACE FUNCTION public.update_employee_salary(
  p_user_id UUID,
  p_new_base_salary NUMERIC,
  p_new_working_days TEXT[],
  p_new_daily_hours NUMERIC,
  p_changed_by UUID,
  p_change_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_effective_from DATE DEFAULT CURRENT_DATE  -- Changed default from first day of next month to TODAY
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_salary NUMERIC;
  v_old_working_days TEXT[];
  v_old_daily_hours NUMERIC;
  v_old_hourly_rate NUMERIC;
  v_new_hourly_rate NUMERIC;
  v_history_id UUID;
  v_is_immediate BOOLEAN := FALSE;
  v_current_month INT;
  v_current_year INT;
BEGIN
  -- Get current values from users table
  SELECT base_salary, working_days, daily_working_hours, hourly_rate
  INTO v_old_salary, v_old_working_days, v_old_daily_hours, v_old_hourly_rate
  FROM users
  WHERE id = p_user_id;

  -- Check if change should be applied immediately (today or past date)
  IF p_effective_from <= CURRENT_DATE THEN
    v_is_immediate := TRUE;

    -- Update users table directly (trigger will calculate hourly_rate automatically)
    UPDATE users
    SET
      base_salary = p_new_base_salary,
      working_days = p_new_working_days,
      daily_working_hours = p_new_daily_hours,
      updated_at = NOW()
    WHERE id = p_user_id;

    -- Get the new hourly rate after trigger calculation
    SELECT hourly_rate INTO v_new_hourly_rate
    FROM users WHERE id = p_user_id;
  ELSE
    -- For future dates, just calculate what the new hourly rate would be
    -- (This is an approximation based on current month)
    v_current_month := EXTRACT(MONTH FROM CURRENT_DATE);
    v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);

    DECLARE
      v_working_days_count INT;
      v_monthly_hours NUMERIC;
    BEGIN
      v_working_days_count := calculate_working_days_in_month(
        p_new_working_days,
        v_current_month,
        v_current_year
      );
      v_monthly_hours := v_working_days_count * p_new_daily_hours;

      IF v_monthly_hours > 0 THEN
        v_new_hourly_rate := p_new_base_salary / v_monthly_hours;
      ELSE
        v_new_hourly_rate := 0;
      END IF;
    END;
  END IF;

  -- Create salary history record
  INSERT INTO salary_history (
    user_id,
    old_salary,
    new_salary,
    old_working_days,
    new_working_days,
    old_daily_working_hours,
    new_daily_working_hours,
    old_hourly_rate,
    new_hourly_rate,
    effective_from,
    changed_by,
    change_reason,
    notes
  ) VALUES (
    p_user_id,
    v_old_salary,
    p_new_base_salary,
    v_old_working_days,
    p_new_working_days,
    v_old_daily_hours,
    p_new_daily_hours,
    v_old_hourly_rate,
    COALESCE(v_new_hourly_rate, 0),
    p_effective_from,
    p_changed_by,
    p_change_reason,
    p_notes
  )
  RETURNING id INTO v_history_id;

  -- If immediate update, recalculate current month's earnings
  IF v_is_immediate THEN
    v_current_month := EXTRACT(MONTH FROM CURRENT_DATE);
    v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);

    PERFORM recalculate_monthly_earnings(p_user_id, v_current_month, v_current_year);
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'history_id', v_history_id,
    'immediate_update', v_is_immediate,
    'new_hourly_rate', v_new_hourly_rate,
    'old_hourly_rate', v_old_hourly_rate
  );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_hourly_rate_for_date(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_monthly_earnings(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_employee_salary(UUID, NUMERIC, TEXT[], NUMERIC, UUID, TEXT, TEXT, DATE) TO authenticated;
