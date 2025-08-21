#!/usr/bin/env node

/**
 * Create Test User with Multi-Role Access
 * 
 * This script creates a test user that has access to all portals:
 * - employee
 * - owner
 * - sales
 * - project
 * - service (redirect)
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Database configuration
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'heat_pumps_now',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

const pool = new Pool(dbConfig);

const testUser = {
  email: 'test@heatpumpsnow.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  phone: '(555) 123-4567',
  roles: ['employee', 'owner', 'sales', 'project', 'service']
};

async function createTestUser() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔐 Creating test user with multi-role access...');
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(testUser.password, saltRounds);
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM internal_users WHERE email = $1',
      [testUser.email]
    );
    
    let userId;
    
    if (existingUser.rows.length > 0) {
      console.log('⚠️  User already exists, updating password and roles...');
      userId = existingUser.rows[0].id;
      
      // Update password
      await client.query(
        'UPDATE internal_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [passwordHash, userId]
      );
      
      // Delete existing roles
      await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
      
    } else {
      console.log('➕ Creating new test user...');
      
      // Create user
      const userResult = await client.query(
        `INSERT INTO internal_users (email, password_hash, first_name, last_name, phone, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         RETURNING id`,
        [testUser.email, passwordHash, testUser.firstName, testUser.lastName, testUser.phone]
      );
      
      userId = userResult.rows[0].id;
    }
    
    // Add roles
    console.log('🎭 Adding portal roles...');
    for (let i = 0; i < testUser.roles.length; i++) {
      const role = testUser.roles[i];
      const isPrimary = i === 0; // First role is primary
      
      await client.query(
        `INSERT INTO user_roles (user_id, role, is_primary, permissions)
         VALUES ($1, $2, $3, $4)`,
        [userId, role, isPrimary, JSON.stringify({ full_access: true })]
      );
      
      console.log(`  ✅ Added ${role} role${isPrimary ? ' (primary)' : ''}`);
    }
    
    // Create employee record if employee role
    if (testUser.roles.includes('employee')) {
      const employeeExists = await client.query(
        'SELECT id FROM employees WHERE user_id = $1',
        [userId]
      );
      
      if (employeeExists.rows.length === 0) {
        await client.query(
          `INSERT INTO employees (user_id, first_name, last_name, email, phone, position, status, hire_date)
           VALUES ($1, $2, $3, $4, $5, 'Test Employee', 'active', CURRENT_DATE)`,
          [userId, testUser.firstName, testUser.lastName, testUser.email, testUser.phone]
        );
        console.log('  👷 Created employee record');
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Test user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${testUser.email}`);
    console.log(`🔑 Password: ${testUser.password}`);
    console.log(`👤 Name: ${testUser.firstName} ${testUser.lastName}`);
    console.log(`🎭 Roles: ${testUser.roles.join(', ')}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📍 Portal Access:');
    console.log('  • Employee Portal: /employee');
    console.log('  • Owner Portal: /owner');
    console.log('  • Sales Portal: /sales');
    console.log('  • Project Portal: /project');
    console.log('  • Service Portal: /service (redirects)');
    console.log('\n🚀 You can now test the unified portal system!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createTestUser();
  } catch (error) {
    console.error('Failed to create test user:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { createTestUser };