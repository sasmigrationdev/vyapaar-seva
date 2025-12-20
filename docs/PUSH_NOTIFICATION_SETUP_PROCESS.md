# Push Notification Setup Process

A step-by-step guide documenting the complete push notification integration process for VyapaarSeva app.

---

## Overview

**Tech Stack:**
- Expo SDK 53+ (React Native)
- Supabase (Backend + Edge Functions)
- Firebase Cloud Messaging (FCM) for Android
- Expo Push Notification Service

**Architecture:**
```
User Action (leave/break request)
    ↓
App creates notification record in Supabase
    ↓
Database webhook triggers Edge Function
    ↓
Edge Function sends push via Expo Push API
    ↓
Expo routes to FCM (Android) / APNs (iOS)
    ↓
User receives notification on device
```

---

## Phase 1: Account & Project Setup

### YOUR TASKS

| Task | Status | Notes |
|------|--------|-------|
| Create Expo account | ✅ | https://expo.dev/signup |
| Create Expo project | ✅ | Project ID: `45c749af-e9ff-4d61-99d8-c81434a33854` |
| Generate Expo Access Token | ✅ | Format: `expo_...` with "Enhanced Security" enabled |
| Create Firebase project | ✅ | Project: `vyapaar-c1323` |
| Download `google-services.json` | ✅ | From Firebase Console → Project Settings → Android app |
| Place `google-services.json` in project root | ✅ | Required for FCM on Android |
| Set up FCM V1 Service Account | ✅ | `eas credentials` → Google Service Account → FCM V1 |
| Set Supabase secret | ✅ | `supabase secrets set EXPO_ACCESS_TOKEN=<token>` |
| Create database webhook | ✅ | Supabase Dashboard → Database → Webhooks |

### Expo Access Token Setup
1. Go to https://expo.dev/accounts/_/settings/access-tokens
2. Click "Create Token"
3. Name: "Supabase Push Notifications"
4. **Important**: Toggle ON "Enhanced Security for Push Notifications"
5. Copy token (starts with `expo_`)

### Firebase Setup (Android)
1. Go to https://console.firebase.google.com/
2. Create or select project
3. Add Android app with package name: `com.vyapaarseva.app`
4. Download `google-services.json`
5. Place in project root directory

### Google Service Account Key for FCM V1 (EAS Credentials)

**Why is this needed?**
- FCM Legacy API is deprecated - Google requires FCM V1 for new apps
- EAS needs this key to send push notifications through Firebase
- Without it, push notifications won't be delivered on Android

**When to do this?**
- After creating Firebase project
- Before your first EAS build
- One-time setup per project

**Steps:**

1. **Create Service Account in Firebase Console:**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file (keep it secure!)

2. **Upload to EAS:**
   ```bash
   eas credentials
   ```

3. **Select options in order:**
   - Select platform: `Android`
   - Select profile: `production`
   - What do you want to do? → `Google Service Account`
   - What do you want to do? → `Set up a Google Service Account Key for Push Notifications (FCM V1)`
   - Upload your JSON key file when prompted

4. **Verify setup:**
   ```
   Push Notifications (FCM V1): Google Service Account Key For FCM V1
   Project ID      vyapaar-c1323
   Client Email    firebase-adminsdk-fbsvc@vyapaar-c1323.iam.gserviceaccount.com
   Client ID       106044565270584209659
   Private Key ID  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

**Current Configuration:**
| Field | Value |
|-------|-------|
| Project ID | `vyapaar-c1323` |
| Client Email | `firebase-adminsdk-fbsvc@vyapaar-c1323.iam.gserviceaccount.com` |
| Client ID | `106044565270584209659` |
| Status | ✅ Configured |

### Database Webhook Setup
1. Go to Supabase Dashboard → Database → Webhooks
2. Create new webhook:
   - **Name**: `push_notifications_webhook`
   - **Table**: `notifications`
   - **Events**: `INSERT` only
   - **Type**: Supabase Edge Functions
   - **Function**: `push`

---

## Phase 2: Dependencies & Configuration

### CLAUDE'S TASKS

| Task | File | Description |
|------|------|-------------|
| Install expo packages | - | `npx expo install expo-notifications expo-device expo-constants` |
| Update app.json | `app.json` | Add expo-notifications plugin and Android permissions |
| Create database migration | Supabase | Add `expo_push_token` column to users table |
| Deploy edge function | `supabase/functions/push/` | Push notification sender |

### app.json Changes
```json
{
  "expo": {
    "plugins": [
      ["expo-notifications", {
        "icon": "./assets/images/icon.png",
        "color": "#138808",
        "mode": "production"
      }]
    ],
    "android": {
      "googleServicesFile": "./google-services.json",
      "permissions": [
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE"
      ]
    }
  }
}
```

### Database Migration
```sql
ALTER TABLE public.users ADD COLUMN expo_push_token text;
CREATE INDEX idx_users_expo_push_token ON public.users(expo_push_token)
  WHERE expo_push_token IS NOT NULL;
```

---

## Phase 3: Client-Side Implementation

### CLAUDE'S TASKS

| Task | File | Description |
|------|------|-------------|
| Create push hook | `hooks/usePushNotifications.ts` | Token registration, listeners, navigation |
| Add HR query | `lib/api/queries/organization.queries.ts` | Get HR user ID for notifications |
| Create notification mutations | `lib/api/mutations/notification.mutations.ts` | Insert notification records |
| Update leave mutations | `hooks/mutations/useLeaveMutations.ts` | Trigger notifications on leave actions |
| Update break mutations | `hooks/mutations/useBreakRequestMutations.ts` | Trigger notifications on break actions |
| Update employer mutations | `hooks/mutations/useEmployerMutations.ts` | Trigger notifications on join requests |
| Initialize in layout | `app/_layout.tsx` | Auto-register on app start |

---

## Phase 4: Edge Function Deployment

### YOUR TASKS

| Task | Command | Notes |
|------|---------|-------|
| Deploy push function | `supabase functions deploy push` | Run from project root |
| Set Expo token secret | `supabase secrets set EXPO_ACCESS_TOKEN=<token>` | Required for Expo API auth |
| Verify deployment | Check Supabase Dashboard → Edge Functions | Should show `push` function |

### CLAUDE'S TASKS

| Task | File | Description |
|------|------|-------------|
| Write edge function | `supabase/functions/push/index.ts` | Webhook handler → Expo Push API |

---

## Phase 5: Profile UI for Token Management

### CLAUDE'S TASKS

| Task | File | Description |
|------|------|-------------|
| Add push status to HR profile | `app/(hr)/profile.tsx` | Shows token status, enable button |
| Add push status to Employee profile | `app/(employee)/profile.tsx` | Shows token status, enable button |

**Features Added:**
- Shows "Enabled" with checkmark if token registered
- Shows error message if registration failed
- "Enable" button to manually retry registration
- Loading state during registration

---

## Phase 6: Bug Fixes & Improvements

### Issue: FCM Rate Limit (TOO_MANY_REGISTRATIONS)

**Problem:** Multiple registration attempts caused FCM rate limiting

### CLAUDE'S TASKS

| Fix | Description |
|-----|-------------|
| Add registration lock | Prevent concurrent registration attempts |
| Add debounce | 5-second minimum between retries |
| Add initialization tracking | Prevent re-registration for same user |
| Improve error messages | Guide user to wait or try different device |

### YOUR TASKS (if rate limited)

| Task | Description |
|------|-------------|
| Clear Google Play Services cache | Settings → Apps → Google Play Services → Storage → Clear Cache |
| Uninstall and reinstall app | Clears FCM registration |
| Wait 24 hours | FCM rate limits reset over time |
| Try different device | To verify code works |

---

## Phase 7: Building & Testing

### YOUR TASKS

| Task | Command | Notes |
|------|---------|-------|
| Build for testing | `eas build -p android --profile preview` | Internal testing APK |
| Build for production | `eas build -p android --profile production` | Play Store AAB |
| Build locally | `eas build -p android --profile production --local` | Requires Android SDK |
| Clear cache build | `eas build -p android --profile production --clear-cache` | Fresh build |

### Testing Checklist

- [ ] App requests notification permission on first launch
- [ ] Token saves to database (check `users.expo_push_token`)
- [ ] Profile shows "Enabled" status
- [ ] Employee submits leave request → HR gets notification
- [ ] HR approves/rejects → Employee gets notification
- [ ] Notification tap opens correct screen
- [ ] Works when app is closed (background)

---

## Files Modified/Created

### Created by Claude

| File | Purpose |
|------|---------|
| `hooks/usePushNotifications.ts` | Main push notification hook |
| `lib/api/mutations/notification.mutations.ts` | Notification creation functions |
| `supabase/functions/push/index.ts` | Edge function for sending pushes |
| `docs/PUSH_NOTIFICATIONS.md` | Detailed implementation guide |

### Modified by Claude

| File | Changes |
|------|---------|
| `app.json` | Added expo-notifications plugin, permissions |
| `app/_layout.tsx` | Initialize push notifications |
| `app/(hr)/profile.tsx` | Added push status UI |
| `app/(employee)/profile.tsx` | Added push status UI |
| `hooks/mutations/useLeaveMutations.ts` | Added notification triggers |
| `hooks/mutations/useBreakRequestMutations.ts` | Added notification triggers |
| `hooks/mutations/useEmployerMutations.ts` | Added notification triggers |
| `lib/api/queries/organization.queries.ts` | Added getOrganizationHR query |

### Created/Configured by You

| File/Config | Purpose |
|-------------|---------|
| `google-services.json` | Firebase config for Android FCM |
| Expo Access Token | Auth for Expo Push API |
| Supabase Webhook | Triggers edge function on notification insert |
| Supabase Secret | Stores EXPO_ACCESS_TOKEN |

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| No notifications | Token not saved | Check profile for "Enable" button, tap it |
| "FCM rate limit" | Too many registration attempts | Wait 24 hours or try different device |
| "Firebase not configured" | Missing google-services.json | Download from Firebase and rebuild |
| "Expo Go not supported" | SDK 53+ limitation | Use EAS build (APK/AAB) |
| Notifications not received (app closed) | Token not registered | Ensure token shows in database |

---

## Quick Reference Commands

```bash
# Install dependencies
npx expo install expo-notifications expo-device expo-constants

# Deploy edge function
supabase functions deploy push

# Set secret
supabase secrets set EXPO_ACCESS_TOKEN=your_token_here

# Build APK (testing)
eas build -p android --profile preview

# Build AAB (production)
eas build -p android --profile production

# Build locally
eas build -p android --profile production --local

# Clear cache and build
rm -rf node_modules && npm install && eas build -p android --profile production --clear-cache
```

---

## Security Notes

1. **Expo Access Token**: Never commit to git, use Supabase secrets
2. **google-services.json**: Add to `.gitignore` if repo is public
3. **Service Role Key**: Only used server-side in edge function
4. **Token Cleanup**: Invalid tokens auto-cleared from database
