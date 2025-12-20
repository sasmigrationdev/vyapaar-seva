import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create admin client with service role key
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

    // Create regular client to verify user token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify the user's JWT token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get user role from database
    const { data: userData, error: roleError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Only allow HR users to access this endpoint
    if (userData.role !== 'hr') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Only HR users can access this feature' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Call the database function to get user sessions
    const { data: sessionsData, error: sessionsError } = await supabaseAdmin
      .rpc('get_user_sessions', { target_user_id: user.id })

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      return new Response(
        JSON.stringify({ error: sessionsError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get current session ID from the JWT
    // Decode the JWT to get the session_id claim
    const token = authHeader.replace('Bearer ', '')
    let currentSessionId: string | null = null
    
    try {
      // Decode JWT payload (middle part)
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const payload = JSON.parse(atob(base64))
      currentSessionId = payload.session_id
    } catch (e) {
      console.error('Error decoding JWT:', e)
    }
    
    // Transform session data to include useful information
    const sessions = (sessionsData || []).map((session: any) => {
      const isCurrent = session.id === currentSessionId
      
      // Parse user agent to get device info
      const userAgent = session.user_agent || ''
      let deviceName = 'Unknown Device'
      let platform = 'unknown'
      
      if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        deviceName = userAgent.includes('iPad') ? 'iPad' : 'iPhone'
        platform = 'ios'
      } else if (userAgent.includes('Android')) {
        deviceName = 'Android Device'
        platform = 'android'
      } else if (userAgent.includes('Windows')) {
        deviceName = 'Windows PC'
        platform = 'web'
      } else if (userAgent.includes('Macintosh')) {
        deviceName = 'Mac'
        platform = 'web'
      } else if (userAgent.includes('Linux')) {
        deviceName = 'Linux PC'
        platform = 'web'
      } else if (userAgent.includes('Expo')) {
        // Handle Expo/React Native apps
        if (userAgent.includes('ios') || userAgent.includes('iOS')) {
          deviceName = 'iPhone/iPad (Expo)'
          platform = 'ios'
        } else if (userAgent.includes('android') || userAgent.includes('Android')) {
          deviceName = 'Android Device (Expo)'
          platform = 'android'
        } else {
          deviceName = 'Mobile App'
          platform = 'mobile'
        }
      } else if (userAgent.includes('okhttp')) {
        // Handle Android apps using okhttp
        deviceName = 'Android Device'
        platform = 'android'
      }

      return {
        id: session.id,
        userId: session.user_id,
        deviceName,
        deviceType: platform === 'web' ? 'Desktop/Web' : 'Mobile',
        platform,
        lastActive: session.refreshed_at || session.updated_at || session.created_at,
        ipAddress: session.ip,
        isCurrent,
        userAgent: session.user_agent,
        createdAt: session.created_at,
      }
    })

    return new Response(
      JSON.stringify({
        count: sessions.length,
        sessions,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

