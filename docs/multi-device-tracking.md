# Multi-Device Session Tracking

## Current Implementation

The current device/session tracking feature shows only the **current active session** (i.e., the device you're currently using). This is because:

1. **Supabase Client API Limitation**: The client-side Supabase API (`supabase.auth.getSession()`) only returns the current session associated with the current device/browser.

2. **Security by Design**: User session data across all devices is not exposed to client-side code for security reasons. This prevents malicious scripts from accessing information about all logged-in sessions.

## Why You See "1 Device" Even When Logged In Elsewhere

When you log in to the same account on multiple devices:
- Each device gets its own **independent session** with its own access token and refresh token
- The Supabase client on Device A cannot see the session from Device B
- Each client only knows about its own session

**Current behavior:**
```
Device A → Shows 1 device (itself)
Device B → Shows 1 device (itself)
```

## How to Implement Full Multi-Device Tracking

To track all active sessions across devices, you need to use **Supabase Admin API** via a backend/serverless function.

### Option 1: Supabase Edge Function (Recommended)

Create a Supabase Edge Function that uses the Admin API:

#### Step 1: Create Edge Function

```typescript
// supabase/functions/list-user-sessions/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // List all sessions for this user using Admin API
    const { data, error } = await supabaseAdmin.auth.admin.listSessions({
      user_id: user.id,
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Transform session data to include useful information
    const sessions = data?.sessions?.map((session: any) => ({
      id: session.id,
      userId: session.user_id,
      deviceInfo: session.user_agent,
      lastActive: session.refreshed_at || session.created_at,
      ipAddress: session.ip,
      createdAt: session.created_at,
    })) || []

    return new Response(
      JSON.stringify({
        count: sessions.length,
        sessions,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
```

#### Step 2: Deploy Edge Function

```bash
# Deploy the function
supabase functions deploy list-user-sessions

# Set environment variables
supabase secrets set SUPABASE_URL=your-project-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Step 3: Update Client Code

```typescript
// lib/api/queries/session.queries.ts
export const sessionQueries = {
  /**
   * Get all active sessions for the current user
   */
  getAllSessions: async (): Promise<SessionInfo[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/list-user-sessions`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }

    const data = await response.json();
    return data.sessions || [];
  },

  /**
   * Get count of all active sessions
   */
  getSessionCount: async (): Promise<number> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 0;

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/list-user-sessions`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) return 1; // Fallback to showing current session

    const data = await response.json();
    return data.count || 1;
  },

  /**
   * Sign out a specific session by ID
   */
  signOutSession: async (sessionId: string): Promise<void> => {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/revoke-session`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to sign out session');
    }
  },
};
```

### Option 2: Custom Session Tracking Table

Alternatively, create a custom table to track sessions:

#### Step 1: Create Table

```sql
-- Create user_sessions table
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT,
  device_type TEXT,
  platform TEXT,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON user_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_last_active ON user_sessions(last_active);
```

#### Step 2: Track Sessions on Login

```typescript
// Track session when user logs in
export const trackSession = async () => {
  const deviceName = Platform.OS === 'ios' ? 'iPhone/iPad' : 
                     Platform.OS === 'android' ? 'Android Device' : 
                     'Web Browser';
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await supabase.from('user_sessions').insert({
    user_id: session.user.id,
    device_name: deviceName,
    device_type: Platform.OS === 'web' ? 'Desktop/Web' : 'Mobile',
    platform: Platform.OS,
    user_agent: navigator.userAgent,
    last_active: new Date().toISOString(),
  });
};
```

#### Step 3: Update Last Active Periodically

```typescript
// Update last active timestamp every 5 minutes
useEffect(() => {
  const interval = setInterval(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('user_sessions')
        .update({ last_active: new Date().toISOString() })
        .eq('user_id', session.user.id)
        .eq('platform', Platform.OS);
    }
  }, 5 * 60 * 1000); // 5 minutes

  return () => clearInterval(interval);
}, []);
```

## Comparison of Approaches

| Feature | Supabase Admin API | Custom Session Table |
|---------|-------------------|---------------------|
| **Accuracy** | ✅ 100% accurate | ⚠️ Depends on client updates |
| **Real-time** | ✅ Always current | ⚠️ May have stale data |
| **Setup Complexity** | Medium (Edge Function) | Low (Just tables) |
| **Security** | ✅ Server-side only | ⚠️ Depends on RLS |
| **Session Revocation** | ✅ Native support | ❌ Manual implementation |
| **Offline Detection** | ✅ Automatic | ❌ Requires cleanup job |

## Recommendation

For production apps with high security requirements, use **Option 1 (Supabase Admin API)** via Edge Functions. It provides:
- Accurate session count
- Native session management
- Automatic cleanup of expired sessions
- Server-side security

For simpler apps or MVP, use **Option 2 (Custom Table)** for basic device tracking without the complexity of Edge Functions.

## Current Implementation Status

✅ **Implemented:**
- UI for device management
- Current session display
- Sign out all devices functionality
- Modal with device details

⏳ **Pending (Requires Backend):**
- Multi-device session listing
- Individual session revocation
- Device name customization
- IP address tracking
- Last active timestamps across devices

## Next Steps

1. Choose between Admin API or Custom Table approach
2. Implement backend/Edge Function
3. Update client queries to fetch from backend
4. Test across multiple devices
5. Add session revocation UI for individual devices
























