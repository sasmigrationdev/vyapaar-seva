// Test script for create-employee Edge Function
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yardyctualuppxckvobx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhcmR5Y3R1YWx1cHB4Y2t2b2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1Nzg4NDQsImV4cCI6MjA3NTE1NDg0NH0.y8u2TsebEVbu0UCNkXuw4b-1j8zGhEqtjDV8OeIcfEk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreateEmployee() {
  console.log('🔐 Step 1: Logging in as HR...');

  // Login as HR user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'divyendra1818@gmail.com',
    password: 'your-password-here', // Replace with actual password
  });

  if (authError) {
    console.error('❌ Login failed:', authError.message);
    return;
  }

  console.log('✅ Logged in as:', authData.user.email);
  console.log('🔑 Session token:', authData.session.access_token.substring(0, 20) + '...');

  // Get organization ID
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', authData.user.id)
    .single();

  console.log('🏢 Organization ID:', userData.organization_id);

  console.log('\n👤 Step 2: Creating test employee...');

  // Generate unique email
  const timestamp = Date.now();
  const testEmployee = {
    email: `test.employee.${timestamp}@example.com`,
    password: 'TestPassword123!',
    fullName: 'Test Employee',
    employeeId: `EMP${timestamp}`,
    phone: '+1234567890',
    department: 'Engineering',
    designation: 'Software Engineer',
    role: 'employee',
    dateOfJoining: new Date().toISOString().split('T')[0],
    organizationId: userData.organization_id,
  };

  console.log('📧 Employee email:', testEmployee.email);

  // Call Edge Function
  const { data, error } = await supabase.functions.invoke('create-employee', {
    body: testEmployee,
  });

  if (error) {
    console.error('❌ Edge Function error:', error);
    return;
  }

  console.log('\n✅ Employee created successfully!');
  console.log('📋 Response:', JSON.stringify(data, null, 2));

  console.log('\n🔍 Step 3: Verifying employee in database...');

  // Verify employee exists
  const { data: employeeData, error: queryError } = await supabase
    .from('users')
    .select('*')
    .eq('email', testEmployee.email)
    .single();

  if (queryError) {
    console.error('❌ Query error:', queryError.message);
    return;
  }

  console.log('✅ Employee found in database:');
  console.log('  - ID:', employeeData.id);
  console.log('  - Email:', employeeData.email);
  console.log('  - Full Name:', employeeData.full_name);
  console.log('  - Employee ID:', employeeData.employee_id);
  console.log('  - Role:', employeeData.role);
  console.log('  - Department:', employeeData.department);
  console.log('  - Active:', employeeData.is_active);

  console.log('\n🧪 Step 4: Testing new employee login...');

  // Test if new employee can login
  const { data: newEmployeeAuth, error: loginError } = await supabase.auth.signInWithPassword({
    email: testEmployee.email,
    password: testEmployee.password,
  });

  if (loginError) {
    console.error('❌ Employee login failed:', loginError.message);
    return;
  }

  console.log('✅ New employee can login successfully!');
  console.log('  - User ID:', newEmployeeAuth.user.id);
  console.log('  - Email:', newEmployeeAuth.user.email);

  console.log('\n🎉 All tests passed!');
}

testCreateEmployee().catch(console.error);
