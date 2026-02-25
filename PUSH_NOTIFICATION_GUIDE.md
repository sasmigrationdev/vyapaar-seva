# Push Notifications: Expo + Supabase Implementation Guide

Architecture and process guide for push notifications using **Expo**, **Supabase**, and the **Expo Push API**.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Expo Account Setup](#2-expo-account-setup)
3. [Firebase Setup (Android)](#3-firebase-setup-android)
4. [Dependencies & App Config](#4-dependencies--app-config)
5. [Supabase Database Setup](#5-supabase-database-setup)
6. [Supabase Database Webhook](#6-supabase-database-webhook)
7. [Supabase Edge Function](#7-supabase-edge-function)
8. [Client-Side Code](#8-client-side-code)
9. [Testing & Troubleshooting](#9-testing--troubleshooting)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PUSH NOTIFICATION FLOW                       │
│                                                                     │
│  1. App Action (e.g. HR approves leave)                             │
│  2. Client calls supabase.rpc('create_notification', {...})         │
│  3. RPC function INSERTs into `notifications` table                 │
│       (SECURITY DEFINER — bypasses RLS)                             │
│  4. Database Webhook Trigger fires on INSERT                        │
│       (AFTER INSERT → supabase_functions.http_request)              │
│  5. Edge Function `push` receives webhook payload                   │
│  6. Edge Function looks up user's `expo_push_token`                 │
│  7. Edge Function sends to Expo Push API                            │
│  8. Expo Push API routes to APNs (iOS) or FCM (Android)             │
│  9. Device receives push notification                               │
│  10. App handles notification (foreground alert / tap navigation)    │
└─────────────────────────────────────────────────────────────────────┘
```

**Why this architecture?**
- **SECURITY DEFINER RPC** — any authenticated user can create notifications for others without direct INSERT access
- **Database webhook** — decouples delivery from client; client only inserts a row
- **Edge Function** — handles token validation, push delivery, and stale token cleanup

---

## 2. Expo Account Setup

1. Sign up at [expo.dev](https://expo.dev), create/link a project (`eas init`)
2. Generate an access token at **Account Settings → Access Tokens** (Robot type for prod)
   - Provides higher rate limits and spoofed-token protection
   - You'll set this as a Supabase Edge Function secret later
3. Get your project ID: `npx expo config --type public | grep projectId` (or check `app.json` → `extra.eas.projectId`)

---

## 3. Firebase Setup (Android)

iOS uses APNs (handled automatically by Expo via your Apple Developer account).

1. [Firebase Console](https://console.firebase.google.com/) → **Add Project** → add an **Android app** with your `android.package`
2. Download `google-services.json` → place in project root → add to `.gitignore`
3. Upload FCM V1 credentials:
   ```bash
   eas credentials
   # → Android → production → Google Service Account Key for FCM V1
   ```
   Or: Firebase **Project Settings → Service accounts → Generate new private key**, then upload via `eas credentials` or Expo dashboard

---

## 4. Dependencies & App Config

```bash
npx expo install expo-notifications expo-device expo-constants
```

In `app.json`, add under `expo`:
```jsonc
{
  "android": {
    "googleServicesFile": "./google-services.json",
    "permissions": ["android.permission.RECEIVE_BOOT_COMPLETED"]
  },
  "plugins": [
    ["expo-notifications", {
      "icon": "./assets/images/notification-icon.png",
      "color": "#your-brand-color",
      "mode": "production"
    }]
  ]
}
```

> Push notifications do NOT work in Expo Go (SDK 53+). Use a dev build: `npx expo run:android`, `npx expo run:ios`, or `eas build --profile development`.

---

## 5. Supabase Database Setup

### 5.1 Notifications Table

```sql
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  related_id UUID,
  related_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications FOR INSERT WITH CHECK (true);
```

### 5.2 Push Token Column

```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
```

### 5.3 Create Notification RPC (SECURITY DEFINER)

```sql
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID, p_title TEXT, p_message TEXT, p_type TEXT,
  p_related_id UUID DEFAULT NULL, p_related_type TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
  VALUES (p_user_id, p_title, p_message, p_type, p_related_id, p_related_type)
  RETURNING id INTO v_notification_id;
  RETURN v_notification_id;
END; $$;
```

Executes as function owner (postgres) so User A can notify User B. `SET search_path` prevents search path injection.

---

## 6. Supabase Database Webhook

### Option A: Dashboard (Recommended)

1. **Dashboard → Database → Webhooks → Create**
2. Name: `push_notifications_webhook`, Table: `notifications`, Events: **INSERT only**
3. Type: **Supabase Edge Function** → select `push`
4. Header: `Authorization: Bearer <service-role-key>`, Timeout: `5000` ms

### Option B: SQL

```sql
CREATE TRIGGER "push_notifications_webhook"
  AFTER INSERT ON public.notifications FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://<project-ref>.supabase.co/functions/v1/push', 'POST',
    '{"Content-type":"application/json","Authorization":"Bearer <service-role-key>"}',
    '{}', '5000'
  );
```

> Service role key: **Dashboard → Settings → API → `service_role`**. It stays server-side in `pg_trigger`.

### Verify

Insert a test row and check Edge Function logs at **Dashboard → Edge Functions → push → Logs**.

---

## 7. Supabase Edge Function

### Logic Flow (`supabase/functions/push/index.ts`)

The edge function handles the webhook payload and delivers the push notification:

1. **CORS** — handle OPTIONS preflight
2. **Parse** webhook payload (`{ type, table, record, schema, old_record }`)
3. **Filter** — only process `INSERT` events, ignore UPDATE/DELETE
4. **Lookup** — query `users` table for `expo_push_token` and `full_name` using `record.user_id`
5. **Validate** — skip if no token or token doesn't start with `ExponentPushToken[`
6. **Send** — POST to `https://exp.host/--/api/v2/push/send` with:
   - Auth header: `Bearer $EXPO_ACCESS_TOKEN`
   - Body: `{ to, sound: "default", title, body, data: { notificationId, type, relatedId, relatedType }, badge: 1, channelId: "default" }`
7. **Cleanup** — if Expo returns `DeviceNotRegistered`, set `expo_push_token = null` for that user
8. **Error handling** — catch all, return JSON error with 500

Uses `createClient` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (both auto-available in Edge Functions).

### Deploy

```bash
supabase functions deploy push --project-ref <project-ref>
supabase secrets set EXPO_ACCESS_TOKEN=<your-expo-access-token> --project-ref <project-ref>
supabase functions list --project-ref <project-ref>  # verify status: ACTIVE
```

---

## 8. Client-Side Code

### 8.1 Push Notification Hook — `hooks/usePushNotifications.ts`

**Exports:** `usePushNotifications(userId)` → `{ expoPushToken, notification, error, permissionStatus, isRegistering, isExpoGo, registerForPushNotifications, retryRegistration, clearPushToken }`

**Responsibilities:**
- Detects Expo Go (unsupported) via `Constants.appOwnership`
- Sets `Notifications.setNotificationHandler` for foreground display (only in dev builds)
- `registerForPushNotifications()` — checks device, requests permissions, calls `getExpoPushTokenAsync({ projectId })`, creates Android notification channel (`default`, MAX importance)
- Includes registration lock + 5s debounce to prevent duplicate calls and FCM rate limits
- Handles specific errors: `FirebaseApp not initialized`, `TOO_MANY_REGISTRATIONS`
- `savePushToken(token)` — updates `users.expo_push_token` via Supabase
- `retryRegistration()` — manual retry (register + save), exposes `isRegistering` state
- `handleNotificationResponse` — navigates on tap based on `data.type` (`leave`, `attendance`, `salary`, or default → `/notifications`)
- `useEffect` on `userId` — auto-initializes once per user, sets up foreground + tap listeners, cleans up on unmount
- `clearPushToken()` — nulls `expo_push_token` in DB (call on logout)

### 8.2 Query Functions — `lib/api/queries/notification.queries.ts`

**Exports:** `notificationQueries` object with:
- `getUserNotifications(userId, limit?)` — select all, ordered by `created_at` desc
- `getUnreadNotificationsCount(userId)` — count-only query with `head: true`, filtered by `is_read = false`
- `getUnreadNotifications(userId)` — full rows where `is_read = false`
- `getNotificationById(notificationId)` — single row, handles `PGRST116` (not found)

### 8.3 Mutation Functions — `lib/api/mutations/notification.mutations.ts`

**Exports:** `notificationMutations` object with:
- `markAsRead(notificationId)` — update `is_read = true`
- `markAllAsRead(userId)` — update all unread for user
- `deleteNotification(notificationId)` — delete single row
- `createNotification({ userId, title, message, type, relatedId?, relatedType? })` — calls `supabase.rpc('create_notification', ...)`, validates `userId` before calling

### 8.4 Query Hooks — `hooks/queries/useNotification.ts`

**Query key factory:** `notificationKeys` — `all`, `list(userId, limit?)`, `unreadCount(userId)`, `unread(userId)`, `byId(id)`

**Hooks:**
- `useUserNotifications(userId, limit?)` — staleTime 2min
- `useUnreadNotificationsCount(userId)` — staleTime 1min, refetchInterval 3min (polling)
- `useUnreadNotifications(userId)` — staleTime 2min
- `useNotificationById(notificationId)` — staleTime 5min, enabled only when ID is truthy

### 8.5 Mutation Hooks — `hooks/mutations/useNotificationMutations.ts`

Each hook invalidates the appropriate query keys on success:
- `useCreateNotification()` — invalidates recipient's list, unreadCount, unread
- `useMarkAsRead(userId)` — invalidates list, unreadCount, unread, and the specific byId
- `useMarkAllAsRead(userId)` — invalidates all notification keys
- `useDeleteNotification(userId)` — invalidates list, unreadCount, unread

### 8.6 Integration: Triggering Notifications

Call `notificationMutations.createNotification()` in the `onSuccess` of existing mutation hooks. Wrap in try/catch so notification failure doesn't break the primary action. Example: when HR approves leave, notify the employee with `type: "leave"` and `relatedId: requestId`.

### 8.7 App Layout Init

In `app/_layout.tsx`, call `usePushNotifications(user?.id)` to auto-register on login. Log `pushError` and `expoPushToken` for debugging.

### 8.8 Logout

Call `clearPushToken()` before `supabase.auth.signOut()` to stop notifications for the signed-out device.

---

## 9. Testing & Troubleshooting

### Pre-Flight Checklist

- [ ] Expo account created, project linked (`eas init`)
- [ ] `EXPO_ACCESS_TOKEN` set as Edge Function secret
- [ ] Firebase project created, `google-services.json` in project root
- [ ] FCM V1 credentials uploaded via `eas credentials`
- [ ] `expo-notifications`, `expo-device`, `expo-constants` installed
- [ ] `app.json` has `expo-notifications` plugin + `googleServicesFile`
- [ ] `notifications` table created with RLS policies
- [ ] `expo_push_token` column on users table
- [ ] `create_notification` RPC function deployed
- [ ] Database webhook: INSERT on notifications → push edge function
- [ ] `push` edge function deployed and ACTIVE
- [ ] App built as dev build (NOT Expo Go)
- [ ] Testing on physical device (not simulator)

### Testing Methods

**1. Edge function directly:** `curl -X POST` to `/functions/v1/push` with service-role-key auth and a fake webhook payload (`type: "INSERT"`, `record: { user_id, title, message, type }`)

**2. Full pipeline (DB → Webhook → Edge Function → Push):**
```sql
SELECT create_notification('<user-id>'::uuid, 'Test', 'Full pipeline test', 'system');
```

**3. From client:** call `notificationMutations.createNotification({ userId, title, message, type: "system" })`

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| No push in Expo Go | SDK 53+ dropped support | Use dev build (`npx expo run:android` or `eas build --profile development`) |
| `TOO_MANY_REGISTRATIONS` | FCM rate limit | Wait 24h. Hook has built-in rate limiting. |
| `FirebaseApp is not initialized` | Missing `google-services.json` | Add file and rebuild |
| Webhook not firing | Trigger misconfigured | Check Dashboard → Database → Webhooks |
| Edge function 401 | Missing auth header in webhook | Add `Authorization: Bearer <service-role-key>` header |
| Push sent but not received | Token expired/device unregistered | Check Edge Function logs; stale tokens auto-cleared |
| No alert on receive | Missing Android notification channel | Hook creates `default` channel; ensure `channelId` matches |
| No tap navigation | Response listener missing | Ensure `usePushNotifications` initialized in root layout |

### Logs

```bash
supabase functions logs push --project-ref <project-ref>
# Or: Dashboard → Edge Functions → push → Logs
```

---

## Quick Reference

### File Structure

```
your-project/
├── app/_layout.tsx                                 # Initialize usePushNotifications
├── hooks/
│   ├── usePushNotifications.ts                     # Token registration, listeners, permissions
│   ├── queries/useNotification.ts                  # Query hooks + query keys
│   └── mutations/useNotificationMutations.ts       # Mutation hooks
├── lib/api/
│   ├── queries/notification.queries.ts             # Pure query functions
│   └── mutations/notification.mutations.ts         # Pure mutation functions (inc. RPC)
├── supabase/functions/push/index.ts                # Edge function: webhook → Expo Push API
├── google-services.json                            # Firebase config — .gitignore this
└── app.json                                        # expo-notifications plugin config
```

### Database Objects

| Object | Type | Purpose |
|--------|------|---------|
| `notifications` | Table | Stores all in-app notifications |
| `users.expo_push_token` | Column | Device's Expo push token |
| `create_notification()` | RPC Function | SECURITY DEFINER insert |
| `push_notifications_webhook` | Trigger | INSERT → calls push edge function |
| `push` | Edge Function | Sends push via Expo Push API |
