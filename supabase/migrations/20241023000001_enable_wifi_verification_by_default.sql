-- Enable WiFi verification for all existing employees
UPDATE users 
SET wifi_verification_required = true 
WHERE role = 'employee';

-- Set default value to true for new employees
ALTER TABLE users 
ALTER COLUMN wifi_verification_required SET DEFAULT true;

-- Add comment to explain the default
COMMENT ON COLUMN users.wifi_verification_required IS 'Whether WiFi verification is required for this user during attendance check-in/check-out. Defaults to true for employees.';


