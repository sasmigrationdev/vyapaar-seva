# Edge Functions Deployment Guide

This guide explains how to deploy the Supabase Edge Functions for multi-device session tracking.

## Prerequisites

1. **Supabase CLI** installed
   ```bash
   npm install -g supabase
   ```

2. **Supabase project** linked
   ```bash
   supabase login
   supabase link --project-ref your-project-ref
   ```

3. **Service Role Key** - Available in Supabase Dashboard → Settings → API → service_role key

## Edge Functions Overview

### 1. `list-user-sessions`
- **Purpose**: Lists all active sessions for the authenticated HR user
- **Method**: GET
- **Auth Required**: Yes (HR role only)
- **Returns**: Array of session objects with device information

### 2. `revoke-session`
- **Purpose**: Revokes a specific session by ID
- **Method**: POST
- **Auth Required**: Yes (HR role only)
- **Body**: `{ "sessionId": "uuid" }`

## Deployment Steps

### Step 1: Deploy Edge Functions

Deploy both functions to Supabase:

```bash
# Navigate to project root
cd /Users/divyendra/khatabook

# Deploy list-user-sessions function
supabase functions deploy list-user-sessions

# Deploy revoke-session function
supabase functions deploy revoke-session
```

### Step 2: Set Environment Secrets

The Edge Functions need access to environment variables. Set them using the Supabase CLI:

```bash
# Set the Supabase URL
supabase secrets set SUPABASE_URL=your-project-url

# Set the Service Role Key (from Supabase Dashboard)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Set the Anon Key (from Supabase Dashboard)
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
```

**Where to find these keys:**
- Go to Supabase Dashboard
- Navigate to: **Settings → API**
- Copy:
  - **Project URL** → `SUPABASE_URL`
  - **anon public** key → `SUPABASE_ANON_KEY`
  - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Never expose this key in client code!**

### Step 3: Verify Deployment

Test the functions using curl or your mobile app:

```bash
# Get your access token (from your app or Supabase Dashboard)
ACCESS_TOKEN="your-access-token"

# Test list-user-sessions
curl -X GET \
  "https://your-project-ref.supabase.co/functions/v1/list-user-sessions" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Test revoke-session
curl -X POST \
  "https://your-project-ref.supabase.co/functions/v1/revoke-session" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session-uuid-here"}'
```

### Step 4: Test in Mobile App

1. Open the app and sign in as an HR user
2. Navigate to Profile → Security → Manage Devices
3. You should see all active sessions listed
4. Try removing a session from another device
5. Verify the device is signed out

## Troubleshooting

### Error: "No authorization header"
- **Cause**: Missing or invalid access token
- **Fix**: Ensure you're passing `Authorization: Bearer <token>` header

### Error: "Unauthorized: Only HR users can access this feature"
- **Cause**: User role is not 'hr'
- **Fix**: Update user role in database:
  ```sql
  UPDATE users SET role = 'hr' WHERE email = 'your-email@example.com';
  ```

### Error: "Invalid token"
- **Cause**: Access token is expired or invalid
- **Fix**: Re-authenticate and get a fresh token

### Error: "SUPABASE_SERVICE_ROLE_KEY is not set"
- **Cause**: Environment secrets not configured
- **Fix**: Run `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key`

### Sessions not showing up
- **Cause**: Edge Function URL might be incorrect in client code
- **Fix**: Verify `EXPO_PUBLIC_SUPABASE_URL` in your `.env` file matches your project URL

## Monitoring

View Edge Function logs in real-time:

```bash
# View logs for list-user-sessions
supabase functions logs list-user-sessions --follow

# View logs for revoke-session
supabase functions logs revoke-session --follow
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Service Role Key**: Never expose the service role key in client-side code
2. **Edge Functions**: Always run server-side operations in Edge Functions
3. **Role Verification**: Functions verify HR role before granting access
4. **Token Validation**: Each request validates the user's JWT token

## Updating Functions

To update a function after making changes:

```bash
# Make changes to the function code
# Then redeploy
supabase functions deploy list-user-sessions

# Or deploy all functions at once
supabase functions deploy
```

## Local Development

Test functions locally before deploying:

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve

# The functions will be available at:
# http://localhost:54321/functions/v1/list-user-sessions
# http://localhost:54321/functions/v1/revoke-session
```

## Cost Considerations

Edge Functions pricing (as of 2024):
- **Free tier**: 500K function invocations per month
- **Pro tier**: 2M invocations included, then $2 per 1M
- Each device check = 1 invocation
- Each session removal = 1 invocation

**Optimization tips:**
- Cache session data in React Query (already implemented with 30s stale time)
- Only refetch when modal is opened
- Consider increasing refetch interval if needed

## Next Steps

After successful deployment:

1. ✅ Test with multiple devices
2. ✅ Verify session removal works
3. ✅ Test "Sign Out Everywhere" functionality
4. ✅ Monitor Edge Function logs for errors
5. ✅ Set up alerts for Edge Function failures (optional)

## Support

For issues:
1. Check Supabase Edge Function logs
2. Verify environment secrets are set
3. Test with curl before testing in app
4. Check Supabase Dashboard for function errors
























