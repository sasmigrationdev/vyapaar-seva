# Push Notifications Implementation Plan

A comprehensive guide for implementing bidirectional push notifications using **Expo Push Notifications** + **Supabase Edge Functions** in the Khatabook app.

---

## Overview

**Architecture Flow**:
```
Action occurs (leave/break/join request)
    ↓
Mutation calls notificationMutations.createNotification()
    ↓
Notification row inserted into `notifications` table
    ↓
Database webhook triggers `push` edge function
    ↓
Edge function looks up user's expo_push_token
    ↓
Edge function sends push via Expo Push API
    ↓
User receives push notification on device
```

---

## Notification Events

| Action | Sender | Recipient | Notification Type | Related Type |
|--------|--------|-----------|-------------------|--------------|
| Leave request created | Employee | HR | `leave` | `leave_request` |
| Leave request approved/rejected | HR | Employee | `leave` | `leave_request` |
| Break request created | Employee | HR | `attendance` | `break_request` |
| Break request approved/rejected | HR | Employee | `attendance` | `break_request` |
| Join request created | Employee | HR | `system` | `join_request` |
| Join request approved/rejected | HR | Employee | `system` | `join_request` |

---

## Phase 1: Expo Account Setup

### Step 1.1: Create Expo Account & Access Token

1. **Create Expo Account** (if not already done):
   - Go to https://expo.dev/signup
   - Sign up with email or GitHub

2. **Create Expo Project**:
   - Navigate to https://expo.dev/accounts/_/projects
   - Click "Create Project"
   - Name it "khatabook"
   - Note the project ID

3. **Generate Access Token**:
   - Go to https://expo.dev/accounts/_/settings/access-tokens
   - Click "Create Token"
   - Name: "Supabase Push Notifications"
   - Select "Full access" scope
   - **Important**: Toggle ON "Enhanced Security for Push Notifications"
   - Copy and save the token securely (format: `expo_...`)

### Step 1.2: Link Expo Project to App

```bash
npm install --global eas-cli
eas init --id <your-expo-project-id>
```

---

## Phase 2: Install Dependencies

```bash
npx expo install expo-notifications expo-device expo-constants
```

---

## Phase 3: Database Migration

Add `expo_push_token` column to the users table:

```sql
-- Add expo_push_token column to users table
ALTER TABLE public.users
ADD COLUMN expo_push_token text;

-- Add comment for documentation
COMMENT ON COLUMN public.users.expo_push_token IS 'Expo push notification token for the user device';

-- Create index for faster lookups
CREATE INDEX idx_users_expo_push_token ON public.users(expo_push_token) WHERE expo_push_token IS NOT NULL;
```

---

## Phase 4: Update app.json

**File**: `/app.json`

Add expo-notifications to the plugins array:

```json
{
  "expo": {
    "plugins": [
      // ... existing plugins
      [
        "expo-notifications",
        {
          "icon": "./assets/images/icon.png",
          "color": "#138808",
          "mode": "production"
        }
      ]
    ],
    "android": {
      "permissions": [
        // ... existing permissions
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE"
      ]
    }
  }
}
```

---

## Phase 5: Create Supabase Edge Function

### Edge Function Code

**File**: `supabase/functions/push/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  related_id: string | null;
  related_type: string | null;
  created_at: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Notification;
  schema: "public";
  old_record: null | Notification;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    console.log("Received webhook payload:", JSON.stringify(payload));

    // Only process INSERT events
    if (payload.type !== "INSERT") {
      return new Response(JSON.stringify({ message: "Ignored non-INSERT event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const notification = payload.record;

    // Get user's push token
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("expo_push_token, full_name")
      .eq("id", notification.user_id)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      return new Response(JSON.stringify({ error: "User not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Skip if user has no push token
    if (!userData?.expo_push_token) {
      console.log("User has no push token, skipping push notification");
      return new Response(
        JSON.stringify({ message: "User has no push token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Validate Expo push token format
    if (!userData.expo_push_token.startsWith("ExponentPushToken[")) {
      console.log("Invalid push token format:", userData.expo_push_token);
      return new Response(
        JSON.stringify({ message: "Invalid push token format" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Send push notification via Expo
    const expoPushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("EXPO_ACCESS_TOKEN")}`,
      },
      body: JSON.stringify({
        to: userData.expo_push_token,
        sound: "default",
        title: notification.title,
        body: notification.message,
        data: {
          notificationId: notification.id,
          type: notification.type,
          relatedId: notification.related_id,
          relatedType: notification.related_type,
        },
        badge: 1,
        channelId: "default",
      }),
    });

    const expoPushResult = await expoPushResponse.json();
    console.log("Expo push response:", JSON.stringify(expoPushResult));

    // Check for push errors - clear invalid tokens
    if (expoPushResult.data?.[0]?.status === "error") {
      console.error("Push notification failed:", expoPushResult.data[0].message);

      if (expoPushResult.data[0].details?.error === "DeviceNotRegistered") {
        await supabase
          .from("users")
          .update({ expo_push_token: null })
          .eq("id", notification.user_id);
        console.log("Cleared invalid push token for user:", notification.user_id);
      }
    }

    return new Response(JSON.stringify(expoPushResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
```

### Deploy Edge Function

```bash
# Deploy the function
supabase functions deploy push

# Set the Expo access token secret
supabase secrets set EXPO_ACCESS_TOKEN=<your-expo-access-token>
```

### Create Database Webhook

In Supabase Dashboard:
1. Go to **Database > Webhooks**
2. Click "Create a new hook"
3. Configure:
   - **Name**: `push_notifications_webhook`
   - **Table**: `notifications`
   - **Events**: `INSERT`
   - **Type**: Supabase Edge Functions
   - **Function**: `push`
   - **HTTP Headers**: Add auth header with service key

---

## Phase 6: Client-Side Implementation

### 6.1: Create Push Notifications Hook

**File**: `/hooks/usePushNotifications.ts`

```typescript
import { useState, useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "expo-router";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: string | null;
  permissionStatus: Notifications.PermissionStatus | null;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<PushNotificationState>({
    expoPushToken: null,
    notification: null,
    error: null,
    permissionStatus: null,
  });

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    if (!Device.isDevice) {
      setState((prev) => ({
        ...prev,
        error: "Push notifications require a physical device",
      }));
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setState((prev) => ({ ...prev, permissionStatus: finalStatus }));

      if (finalStatus !== "granted") {
        setState((prev) => ({
          ...prev,
          error: "Permission not granted for push notifications",
        }));
        return null;
      }

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;

      setState((prev) => ({ ...prev, expoPushToken: token, error: null }));

      // Configure Android channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#138808",
          sound: "default",
        });
      }

      return token;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setState((prev) => ({ ...prev, error: errorMessage }));
      console.error("Error registering for push notifications:", error);
      return null;
    }
  }, []);

  // Save token to database
  const savePushToken = useCallback(async (token: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("users")
        .update({ expo_push_token: token })
        .eq("id", user.id);

      if (error) {
        console.error("Error saving push token:", error);
      } else {
        console.log("Push token saved successfully");
      }
    } catch (error) {
      console.error("Error saving push token:", error);
    }
  }, [user?.id]);

  // Handle notification tap - navigate to relevant screen
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      console.log("Notification tapped:", data);

      if (!data) return;

      // Navigate based on notification type
      switch (data.type) {
        case "leave":
          if (user?.role === "hr" || user?.role === "admin") {
            router.push("/(hr)/leave");
          } else {
            router.push("/(employee)/leave");
          }
          break;
        case "attendance":
          if (user?.role === "hr" || user?.role === "admin") {
            router.push("/(hr)/employees");
          } else {
            router.push("/(employee)/attendance");
          }
          break;
        case "system":
          if (data.relatedType === "join_request") {
            if (user?.role === "hr" || user?.role === "admin") {
              router.push("/(hr)/join-requests");
            }
          }
          break;
      }
    },
    [user?.role, router]
  );

  // Initialize push notifications
  useEffect(() => {
    if (!user?.id) return;

    const initializePushNotifications = async () => {
      const token = await registerForPushNotifications();
      if (token) {
        await savePushToken(token);
      }
    };

    initializePushNotifications();

    // Listen for incoming notifications (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        setState((prev) => ({ ...prev, notification }));
        console.log("Notification received:", notification);
      }
    );

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user?.id, registerForPushNotifications, savePushToken, handleNotificationResponse]);

  // Clear push token on logout
  const clearPushToken = useCallback(async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from("users")
        .update({ expo_push_token: null })
        .eq("id", user.id);
      setState((prev) => ({ ...prev, expoPushToken: null }));
    } catch (error) {
      console.error("Error clearing push token:", error);
    }
  }, [user?.id]);

  return {
    ...state,
    registerForPushNotifications,
    clearPushToken,
  };
};
```

### 6.2: Add Organization HR Query

**File**: `/lib/api/queries/organization.queries.ts`

Add this function to get HR user_id for notifications:

```typescript
/**
 * Get HR/Owner user ID for an organization
 * Used to notify HR when employees submit requests
 */
getOrganizationHR: async (organizationId: string): Promise<string | null> => {
  // First try to get the organization owner
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('owner_id')
    .eq('id', organizationId)
    .single();

  if (orgError && orgError.code !== 'PGRST116') throw orgError;

  if (org?.owner_id) {
    return org.owner_id;
  }

  // Fallback: Get any HR user in the organization
  const { data: hrUser, error: hrError } = await supabase
    .from('users')
    .select('id')
    .eq('organization_id', organizationId)
    .in('role', ['hr', 'admin'])
    .eq('is_active', true)
    .limit(1)
    .single();

  if (hrError && hrError.code !== 'PGRST116') throw hrError;

  return hrUser?.id || null;
},
```

---

## Phase 7: Integrate Notifications into Mutations

### 7.1: Leave Mutations

**File**: `/hooks/mutations/useLeaveMutations.ts`

```typescript
// In useCreateLeaveRequest - after creating leave request, notify HR
mutationFn: async (params) => {
  const leaveRequest = await leaveMutations.createLeaveRequest({ ...params, userId });

  // Create notification for HR
  if (organizationId) {
    try {
      const hrUserId = await organizationQueries.getOrganizationHR(organizationId);
      const employee = await userQueries.getUserById(userId);

      if (hrUserId && employee) {
        await notificationMutations.createNotification({
          userId: hrUserId,
          title: 'New Leave Request',
          message: `${employee.full_name} has submitted a ${params.leaveType} leave request from ${params.startDate} to ${params.endDate}`,
          type: 'leave',
          relatedId: leaveRequest.id,
          relatedType: 'leave_request',
        });
      }
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  }

  return leaveRequest;
},

// In useReviewLeaveRequest - after review, notify employee
mutationFn: async ({ requestId, status, reviewedBy, reviewerNotes }) => {
  const leaveRequest = await leaveMutations.reviewLeaveRequest(requestId, status, reviewedBy, reviewerNotes);

  // Create notification for employee
  try {
    const statusText = status === 'approved' ? 'Approved' : 'Rejected';

    await notificationMutations.createNotification({
      userId: leaveRequest.user_id,
      title: `Leave Request ${statusText}`,
      message: `Your leave request has been ${status}${reviewerNotes ? `: ${reviewerNotes}` : ''}`,
      type: 'leave',
      relatedId: leaveRequest.id,
      relatedType: 'leave_request',
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }

  return leaveRequest;
},
```

### 7.2: Break Request Mutations

**File**: `/hooks/mutations/useBreakRequestMutations.ts`

Similar pattern - notify HR on creation, notify employee on approval/rejection.

### 7.3: Employer Mutations (Join Requests)

**File**: `/hooks/mutations/useEmployerMutations.ts`

Similar pattern - notify HR on join request, notify employee on approval/rejection.

---

## Phase 8: Initialize in App Layout

**File**: `/app/_layout.tsx`

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

function RootLayoutNav() {
  const { session, user, loading } = useAuth();

  // Initialize push notifications after auth is loaded
  const { expoPushToken, error: pushError } = usePushNotifications();

  useEffect(() => {
    if (pushError) {
      console.warn('Push notification error:', pushError);
    }
    if (expoPushToken) {
      console.log('Push token registered:', expoPushToken);
    }
  }, [expoPushToken, pushError]);

  // ... rest of layout
}
```

---

## Phase 9: Regenerate Types

After applying the migration:

```bash
supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
```

---

## Files Summary

| File | Action |
|------|--------|
| `app.json` | Add expo-notifications plugin + Android permissions |
| `hooks/usePushNotifications.ts` | **CREATE** - Push notification hook |
| `lib/api/queries/organization.queries.ts` | Add `getOrganizationHR` query |
| `hooks/mutations/useLeaveMutations.ts` | Add notification creation |
| `hooks/mutations/useBreakRequestMutations.ts` | Add notification creation |
| `hooks/mutations/useEmployerMutations.ts` | Add notification creation |
| `app/_layout.tsx` | Initialize push notifications |
| `lib/supabase/types.ts` | Regenerate after migration |

---

## Testing Checklist

- [ ] Expo account created and token generated
- [ ] Dependencies installed (`expo-notifications`, `expo-device`, `expo-constants`)
- [ ] Migration applied (`expo_push_token` column exists)
- [ ] `app.json` configured with expo-notifications plugin
- [ ] Edge function `push` deployed
- [ ] `EXPO_ACCESS_TOKEN` secret set
- [ ] Database webhook created on `notifications` table
- [ ] Push token saves to database on app login
- [ ] Leave request creates notification for HR
- [ ] Leave review creates notification for employee
- [ ] Break request creates notification for HR
- [ ] Break review creates notification for employee
- [ ] Join request creates notification for HR
- [ ] Join review creates notification for employee
- [ ] Notification tap navigates to correct screen
- [ ] Invalid tokens are cleared automatically

---

## Security Considerations

1. **Token Security**: Expo push tokens are stored only in the users table and accessed only by the edge function with service role
2. **Enhanced Security**: Using Expo's enhanced security feature requires access tokens for push API calls
3. **Token Validation**: Edge function validates token format before sending
4. **Token Cleanup**: Invalid/expired tokens are automatically cleared from the database
5. **RLS**: Row Level Security ensures users can only update their own push token
