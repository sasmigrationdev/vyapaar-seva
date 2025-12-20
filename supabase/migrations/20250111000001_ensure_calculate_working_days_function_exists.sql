-- Ensure calculate_working_days_in_month function exists
-- This function is required by the update_employee_salary_calculations trigger

CREATE OR REPLACE FUNCTION public.calculate_working_days_in_month(
  working_days TEXT[],
  target_month INTEGER,
  target_year INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  day_count INT := 0;
  loop_date DATE;
  day_of_week INT;
  day_name TEXT;
BEGIN
  -- Return 0 if working_days is null or empty
  IF working_days IS NULL OR array_length(working_days, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Loop through all days in the month
  FOR i IN 1..31 LOOP
    BEGIN
      loop_date := make_date(target_year, target_month, i);

      -- Exit if we've gone past the end of the month
      IF EXTRACT(MONTH FROM loop_date) != target_month THEN
        EXIT;
      END IF;

      -- Get day of week (0 = Sunday, 6 = Saturday)
      day_of_week := EXTRACT(DOW FROM loop_date);

      -- Convert to day name (lowercase to match working_days array)
      day_name := CASE day_of_week
        WHEN 0 THEN 'sunday'
        WHEN 1 THEN 'monday'
        WHEN 2 THEN 'tuesday'
        WHEN 3 THEN 'wednesday'
        WHEN 4 THEN 'thursday'
        WHEN 5 THEN 'friday'
        WHEN 6 THEN 'saturday'
      END;

      -- Check if this day is a working day
      IF day_name = ANY(working_days) THEN
        day_count := day_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Invalid date, exit loop
      EXIT;
    END;
  END LOOP;

  RETURN day_count;
END;
$$;

-- Also update the trigger function to be more defensive
CREATE OR REPLACE FUNCTION public.update_employee_salary_calculations()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_month INT;
  current_year INT;
  working_days_count INT;
BEGIN
  -- Only calculate if base_salary and daily_working_hours are set
  IF NEW.base_salary IS NULL OR NEW.base_salary = 0 OR
     NEW.daily_working_hours IS NULL OR NEW.daily_working_hours = 0 THEN
    NEW.monthly_total_hours := 0;
    NEW.hourly_rate := 0;
    RETURN NEW;
  END IF;

  -- Get current month and year
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);

  -- Calculate working days in current month
  -- Check if working_days array has elements
  IF NEW.working_days IS NOT NULL AND array_length(NEW.working_days, 1) > 0 THEN
    BEGIN
      working_days_count := calculate_working_days_in_month(
        NEW.working_days,
        current_month,
        current_year
      );

      -- Calculate monthly total hours
      NEW.monthly_total_hours := working_days_count * NEW.daily_working_hours;

      -- Calculate hourly rate
      IF NEW.monthly_total_hours > 0 THEN
        NEW.hourly_rate := NEW.base_salary / NEW.monthly_total_hours;
      ELSE
        NEW.hourly_rate := 0;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- If calculation fails, set to 0
      NEW.monthly_total_hours := 0;
      NEW.hourly_rate := 0;
    END;
  ELSE
    -- No working days defined, set to 0
    NEW.monthly_total_hours := 0;
    NEW.hourly_rate := 0;
  END IF;

  RETURN NEW;
END;
$$;
