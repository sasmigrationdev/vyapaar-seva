-- Make employee_id nullable to support employee signup without organization
-- Employees will get employee_id when they join an organization

-- First, update any empty string employee_ids to NULL
UPDATE public.users 
SET employee_id = NULL 
WHERE employee_id = '';

-- Then alter the column to remove NOT NULL constraint
ALTER TABLE public.users 
ALTER COLUMN employee_id DROP NOT NULL;

-- Update the trigger function to use NULL instead of empty string
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    employee_id,
    phone,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'employee_id', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
