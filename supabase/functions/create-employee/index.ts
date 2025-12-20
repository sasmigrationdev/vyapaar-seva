import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the request is from an authenticated HR user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is HR or admin
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (!userData || (userData.role !== 'hr' && userData.role !== 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only HR can create employees' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const requestBody = await req.json()
    console.log('Request body:', JSON.stringify(requestBody))

    const {
      email,
      password,
      fullName,
      phone,
      aadhaarNumber,
      dateOfBirth,
      department,
      designation,
      role,
      dateOfJoining,
      organizationId,
      baseSalary,
      workingDays,
      dailyWorkingHours,
      bankName,
      accountNumber,
      ifscCode,
      accountHolderName,
      branchName
    } = requestBody

    // Validate required fields
    if (!email || !fullName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, fullName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate organization matches
    if (organizationId !== userData.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Cannot create employee in different organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicate email
    const { data: existingUsers, error: duplicateCheckError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', email)

    // Ignore "no rows" error - that's what we want
    if (duplicateCheckError && duplicateCheckError.code !== 'PGRST116') {
      console.error('Duplicate check error:', duplicateCheckError)
    }

    if (existingUsers && existingUsers.length > 0) {
      return new Response(
        JSON.stringify({ error: 'An employee with this email already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use email as password if password not provided or empty
    const actualPassword = password && password.trim() ? password.trim() : email

    // Validate password strength (minimum 6 characters as per Supabase requirements)
    if (actualPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating user with email:', email, 'password length:', actualPassword.length)

    // Create auth user with metadata (trigger will create profile automatically)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: actualPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone || null,
        role: role || 'employee',
      }
    })

    if (createError) {
      console.error('Create user error:', createError)
      let errorMessage = createError.message

      // Provide more user-friendly error messages
      if (errorMessage.includes('already registered')) {
        errorMessage = 'This email is already registered'
      } else if (errorMessage.includes('invalid email')) {
        errorMessage = 'Please provide a valid email address'
      } else if (errorMessage.includes('password')) {
        errorMessage = 'Password must be at least 6 characters'
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!authData.user) {
      console.error('No user in auth data')
      return new Response(
        JSON.stringify({ error: 'Failed to create auth user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Auth user created:', authData.user.id)

    // Wait for trigger to complete with retry logic
    let profileExists = false
    let retries = 0
    const maxRetries = 10

    while (!profileExists && retries < maxRetries) {
      const { data: existingProfile } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', authData.user.id)
        .single()

      if (existingProfile) {
        profileExists = true
        console.log('Profile found after', retries, 'retries')
      } else {
        retries++
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    if (!profileExists) {
      console.error('Profile not created by trigger after', maxRetries, 'retries')
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const updateData = {
      department: department || null,
      designation: designation || null,
      date_of_joining: dateOfJoining || new Date().toISOString().split('T')[0],
      organization_id: organizationId,
      is_active: true,
      base_salary: baseSalary !== undefined ? baseSalary : null,
      working_days: (workingDays !== undefined && Array.isArray(workingDays)) ? workingDays : null,
      daily_working_hours: dailyWorkingHours !== undefined ? dailyWorkingHours : null,
      bank_name: bankName || null,
      account_number: accountNumber || null,
      ifsc_code: ifscCode || null,
      account_holder_name: accountHolderName || null,
      branch_name: branchName || null,
      aadhaar_number: aadhaarNumber || null,
      date_of_birth: dateOfBirth || null,
    }

    console.log('Updating user with:', JSON.stringify(updateData))

    // Update profile with additional fields that trigger doesn't handle
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', authData.user.id)
      .select()
      .single()

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Rollback: delete auth user if profile update fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Profile updated:', profileData.id)

    // Insert into user_role_cache (use upsert to handle duplicates)
    const { error: roleCacheError } = await supabaseAdmin
      .from('user_role_cache')
      .upsert({
        user_id: authData.user.id,
        role: role || 'employee',
      }, {
        onConflict: 'user_id'
      })

    if (roleCacheError) {
      console.error('Role cache error:', roleCacheError)
      // Non-fatal error, continue anyway
    }

    // Create employer-employee relationship history
    const { error: historyError } = await supabaseAdmin
      .from('employer_employee_history')
      .insert({
        employee_id: authData.user.id,
        organization_id: organizationId,
        joined_at: new Date().toISOString(),
        join_method: 'hr_created',
        approved_by: user.id, // The HR who created this employee
        notes: 'Employee created by HR'
      })

    if (historyError) {
      console.error('History creation error:', historyError)
      // Rollback: delete auth user and profile if history creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: 'Failed to create employee relationship. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Employee created successfully:', authData.user.id)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          authUser: authData.user,
          user: profileData,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
