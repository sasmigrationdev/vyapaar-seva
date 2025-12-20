# Quick Start: Multi-Device Session Tracking

This guide will get you up and running with full multi-device session tracking in **5 minutes**.

## ⚡ Quick Deployment

```bash
# 1. Navigate to functions directory
cd /Users/divyendra/khatabook/supabase/functions

# 2. Run the deployment script
./deploy.sh

# The script will:
# - Deploy both Edge Functions
# - Prompt you to set environment secrets
# - Confirm successful deployment
```

## 📋 What You Need

Before running the deployment script, have these ready from your Supabase Dashboard:

1. **Project URL**: `https://xxx.supabase.co`
   - Find it in: **Settings → API → Project URL**

2. **Anon Key**: `eyJhbGc...`
   - Find it in: **Settings → API → anon public**

3. **Service Role Key**: `eyJhbGc...`
   - Find it in: **Settings → API → service_role**
   - ⚠️ **Keep this secret!**

## ✅ Verify It's Working

### Method 1: Using the App

1. Open your app
2. Sign in as an HR user
3. Go to **Profile** tab
4. Look at the hero section - you should see a "Devices" card showing the count
5. Tap **"Manage Devices"** (in Security section)
6. You should see all your active sessions!

### Method 2: Using curl

```bash
# Replace with your actual values
PROJECT_URL="https://your-project.supabase.co"
ACCESS_TOKEN="your-access-token"

# Test listing sessions
curl -X GET \
  "$PROJECT_URL/functions/v1/list-user-sessions" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# You should see:
# {
#   "count": 1,
#   "sessions": [...]
# }
```

## 🎯 Test Scenarios

### Scenario 1: View Your Current Device
1. Open app on one device
2. Go to Profile → Manage Devices
3. You'll see 1 device (current)

### Scenario 2: Multiple Devices
1. Sign in on Phone (Device A)
2. Sign in on another device/browser (Device B)
3. On Phone, go to Profile → Manage Devices
4. **You'll see both devices!** 🎉

### Scenario 3: Remove a Device
1. Have 2 devices logged in
2. On Device A, view Manage Devices
3. Tap "Remove Device" on Device B
4. Device B will be signed out immediately

### Scenario 4: Sign Out Everywhere
1. Have 2+ devices logged in
2. Tap "Sign Out Everywhere"
3. All devices will be signed out

## 🐛 Troubleshooting

### Still showing only 1 device?

**Check #1**: Are Edge Functions deployed?
```bash
# List deployed functions
supabase functions list

# Should show:
# - list-user-sessions
# - revoke-session
```

**Check #2**: Are secrets set?
```bash
supabase secrets list

# Should show:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
```

**Check #3**: Is user role 'hr'?
```sql
-- Run in Supabase SQL Editor
SELECT id, email, role FROM users WHERE email = 'your-email@example.com';

-- If role is not 'hr', update it:
UPDATE users SET role = 'hr' WHERE email = 'your-email@example.com';
```

**Check #4**: Check Edge Function logs
```bash
supabase functions logs list-user-sessions --follow

# Look for errors
```

### Can't remove devices?

**Check**: Is revoke-session deployed and working?
```bash
supabase functions logs revoke-session --follow
```

### Other Issues?

See detailed troubleshooting in:
- [`DEPLOYMENT.md`](supabase/functions/DEPLOYMENT.md)
- [`MULTI_DEVICE_TRACKING.md`](MULTI_DEVICE_TRACKING.md)

## 📚 Full Documentation

- **Deployment Guide**: [`supabase/functions/DEPLOYMENT.md`](supabase/functions/DEPLOYMENT.md)
- **Complete Implementation**: [`MULTI_DEVICE_TRACKING.md`](MULTI_DEVICE_TRACKING.md)
- **Original Docs**: [`docs/multi-device-tracking.md`](docs/multi-device-tracking.md)

## 🎉 That's It!

You now have full multi-device session tracking working for HR users!

**Key Features:**
- ✅ View all active sessions across all devices
- ✅ See device names, types, and last active times
- ✅ Remove individual devices
- ✅ Sign out from all devices at once
- ✅ Real-time session updates
- ✅ Secure implementation using Supabase Admin API

Enjoy! 🚀
























