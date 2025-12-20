-- Create a function to get user sessions from auth.sessions
-- This function can only be called with service_role key
CREATE OR REPLACE FUNCTION public.get_user_sessions(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  refreshed_at TIMESTAMP,
  user_agent TEXT,
  ip INET
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.created_at,
    s.updated_at,
    s.refreshed_at,
    s.user_agent,
    s.ip
  FROM auth.sessions s
  WHERE s.user_id = target_user_id
  ORDER BY s.updated_at DESC;
END;
$$;

-- Grant execute permission to service_role only
REVOKE ALL ON FUNCTION public.get_user_sessions(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_sessions(UUID) TO service_role;
























