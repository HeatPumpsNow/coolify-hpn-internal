#!/usr/bin/env node

/**
 * Create Test User in Supabase with Multi-Role Access
 * 
 * This script creates a test user that has access to all portals using Supabase Auth
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const testUser = {
  email: 'test@heatpumpsnow.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  phone: '(555) 123-4567',
  roles: ['employee', 'owner', 'sales', 'project', 'service']
};

async function createTestUser() {
  try {
    console.log('🔐 Creating test user in Supabase...');
    
    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
      user_metadata: {
        first_name: testUser.firstName,
        last_name: testUser.lastName,
        phone: testUser.phone,
        roles: testUser.roles
      }
    });
    
    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log('⚠️  User already exists in auth, updating...');
        
        // Get existing user
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === testUser.email);
        
        if (existingUser) {
          // Update user metadata
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            {
              password: testUser.password,
              user_metadata: {
                first_name: testUser.firstName,
                last_name: testUser.lastName,
                phone: testUser.phone,
                roles: testUser.roles
              }
            }
          );
          
          if (updateError) throw updateError;
          
          console.log('✅ Updated existing auth user');
          return { authUser: existingUser, isNew: false };
        }
      } else {
        throw authError;
      }
    }
    
    if (!authUser?.user) {
      throw new Error('Failed to create or find auth user');
    }
    
    console.log('✅ Auth user created/updated successfully');
    
    // Check if internal user exists
    const { data: existingInternalUser } = await supabase
      .from('internal_users')
      .select('*')
      .eq('supabase_user_id', authUser.user.id)
      .single();
    
    let internalUserId;
    
    if (existingInternalUser) {
      console.log('⚠️  Internal user record exists, updating...');
      
      const { error: updateError } = await supabase
        .from('internal_users')
        .update({
          email: testUser.email,
          first_name: testUser.firstName,
          last_name: testUser.lastName,
          phone: testUser.phone,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingInternalUser.id);
      
      if (updateError) throw updateError;
      
      internalUserId = existingInternalUser.id;
      console.log('✅ Updated internal user record');
    } else {
      console.log('➕ Creating internal user record...');
      
      const { data: internalUser, error: internalError } = await supabase
        .from('internal_users')
        .insert({
          supabase_user_id: authUser.user.id,
          email: testUser.email,
          first_name: testUser.firstName,
          last_name: testUser.lastName,
          phone: testUser.phone,
          status: 'active'
        })
        .select()
        .single();
      
      if (internalError) throw internalError;
      
      internalUserId = internalUser.id;
      console.log('✅ Created internal user record');
    }
    
    // Delete existing roles
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', internalUserId);
    
    // Add new roles
    console.log('🎭 Adding portal roles...');
    const roleInserts = testUser.roles.map((role, index) => ({
      user_id: internalUserId,
      role: role,
      is_primary: index === 0, // First role is primary
      permissions: { full_access: true }
    }));
    
    const { error: rolesError } = await supabase
      .from('user_roles')
      .insert(roleInserts);
    
    if (rolesError) throw rolesError;
    
    // Create employee record if doesn't exist
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', internalUserId)
      .single();
    
    if (!existingEmployee) {
      const { error: employeeError } = await supabase
        .from('employees')
        .insert({
          user_id: internalUserId,
          employee_number: 'EMP001',
          first_name: testUser.firstName,
          last_name: testUser.lastName,
          email: testUser.email,
          phone: testUser.phone,
          position: 'Test Employee',
          department: 'Testing',
          status: 'active',
          hire_date: new Date().toISOString().split('T')[0],
          skill_level: 'senior'
        });
      
      if (employeeError) throw employeeError;
      console.log('👷 Created employee record');
    }
    
    console.log('\n🎉 Test user created successfully in Supabase!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${testUser.email}`);
    console.log(`🔑 Password: ${testUser.password}`);
    console.log(`👤 Name: ${testUser.firstName} ${testUser.lastName}`);
    console.log(`🎭 Roles: ${testUser.roles.join(', ')}`);
    console.log(`🆔 Auth ID: ${authUser.user.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📍 Portal Access:');
    console.log('  • Employee Portal: /employee');
    console.log('  • Owner Portal: /owner');
    console.log('  • Sales Portal: /sales');
    console.log('  • Project Portal: /project');
    console.log('  • Service Portal: /service (redirects)');
    console.log('\n🚀 Ready to test the unified Supabase portal system!');
    
    return { authUser: authUser.user, internalUserId, isNew: true };
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  }
}

async function main() {
  try {
    await createTestUser();
  } catch (error) {
    console.error('Failed to create test user:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createTestUser };