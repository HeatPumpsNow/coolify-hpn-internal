/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Enable UUID extension
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  // Companies table
  pgm.createTable('companies', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    name: { type: 'varchar(255)', notNull: true },
    email: { type: 'varchar(255)', notNull: true },
    phone: { type: 'varchar(50)' },
    address: { type: 'text' },
    created_at: { type: 'timestamp with time zone', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp with time zone', default: pgm.func('CURRENT_TIMESTAMP') }
  });
  pgm.createIndex('companies', 'email', { unique: true });

  // Internal users table (unified for all portal types)
  pgm.createTable('internal_users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    first_name: { type: 'varchar(100)', notNull: true },
    last_name: { type: 'varchar(100)', notNull: true },
    phone: { type: 'varchar(50)' },
    status: { type: 'varchar(20)', notNull: true, default: 'active' },
    last_login: { type: 'timestamp with time zone' },
    created_at: { type: 'timestamp with time zone', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp with time zone', default: pgm.func('CURRENT_TIMESTAMP') }
  });
  pgm.createIndex('internal_users', 'email', { unique: true });
  pgm.createIndex('internal_users', 'status');

  // User roles table (for multi-role access)
  pgm.createTable('user_roles', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: { type: 'uuid', notNull: true, references: 'internal_users(id)', onDelete: 'CASCADE' },
    role: { type: 'varchar(50)', notNull: true },
    is_primary: { type: 'boolean', default: false },
    permissions: { type: 'jsonb', default: '{}' },
    created_at: { type: 'timestamp with time zone', default: pgm.func('CURRENT_TIMESTAMP') }
  });
  pgm.createIndex('user_roles', ['user_id', 'role'], { unique: true });
  pgm.createIndex('user_roles', 'role');

  // Employees table (for detailed employee information)
  pgm.createTable('employees', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    company_id: { type: 'uuid', notNull: true, references: 'companies(id)' },
    user_id: { type: 'uuid', references: 'internal_users(id)', onDelete: 'SET NULL' },
    first_name: { type: 'varchar(100)', notNull: true },
    last_name: { type: 'varchar(100)', notNull: true },
    email: { type: 'varchar(255)', notNull: true },
    phone: { type: 'varchar(50)' },
    role: { type: 'varchar(50)', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: 'active' },
    hire_date: { type: 'date' },
    wages: { type: 'decimal(10,2)' },
    skills: { type: 'jsonb', default: '[]' },
    certifications: { type: 'jsonb', default: '[]' },
    created_at: { type: 'timestamp with time zone', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp with time zone', default: pgm.func('CURRENT_TIMESTAMP') }
  });
  pgm.createIndex('employees', ['company_id', 'status']);
  pgm.createIndex('employees', 'user_id');

  // Customers table
  pgm.createTable('customers', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    company_id: { type: 'uuid', notNull: true, references: 'companies(id)' },
    first_name: { type: 'varchar(100)', notNull: true },
    last_name: { type: 'varchar(100)', notNull: true },
    email: { type: 'varchar(255)' },
    phone: { type: 'varchar(50)' },
    address: { type: 'text', notNull: true },
    city: { type: 'varchar(100)' },
    state: { type: 'varchar(50)' },
    zip_code: { type: 'varchar(20)' },
    notes: { type: 'text' },
    preferred_contact_method: { type: 'varchar(20)', default: 'email' },
    
    // Customer portal fields
    password_hash: { type: 'varchar(255)' },
    email_verified: { type: 'boolean', default: false },
    verification_token: { type: 'varchar(255)' },
    last_login: { type: 'timestamp with time zone' },
    portal_access_enabled: { type: 'boolean', default: false },
    registration_date: { type: 'timestamp with time zone' },
    
    created_at: { type: 'timestamp with time zone', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp with time zone', default: pgm.func('CURRENT_TIMESTAMP') }
  });
  pgm.createIndex('customers', ['company_id', 'email']);
  pgm.createIndex('customers', 'email');

  // Jobs table
  pgm.createTable('jobs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    company_id: { type: 'uuid', notNull: true, references: 'companies(id)' },
    customer_id: { type: 'uuid', references: 'customers(id)', onDelete: 'SET NULL' },
    assigned_employee_id: { type: 'uuid', references: 'employees(id)', onDelete: 'SET NULL' },
    customer_name: { type: 'varchar(255)' },
    customer_email: { type: 'varchar(255)' },
    customer_phone: { type: 'varchar(50)' },
    address: { type: 'text', notNull: true },
    service_type: { type: 'varchar(100)', notNull: true },
    description: { type: 'text' },
    priority: { type: 'varchar(20)', notNull: true, default: 'medium' },
    status: { type: 'varchar(20)', notNull: true, default: 'pending' },
    scheduled_date: { type: 'date' },
    scheduled_time_start: { type: 'time' },
    scheduled_time_end: { type: 'time' },
    estimated_duration: { type: 'integer' },
    estimated_cost: { type: 'decimal(10,2)' },
    actual_cost: { type: 'decimal(10,2)' },
    completed_at: { type: 'timestamp with time zone' },
    notes: { type: 'text' },
    created_at: { type: 'timestamp with time zone', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp with time zone', default: pgm.func('CURRENT_TIMESTAMP') }
  });
  pgm.createIndex('jobs', ['company_id', 'status']);
  pgm.createIndex('jobs', ['assigned_employee_id', 'status']);
  pgm.createIndex('jobs', 'scheduled_date');

  // Customer Equipment table
  pgm.createTable('customer_equipment', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    customer_id: { type: 'uuid', notNull: true, references: 'customers(id)', onDelete: 'CASCADE' },
    equipment_type: { type: 'varchar(50)', notNull: true },
    brand: { type: 'varchar(100)' },
    model: { type: 'varchar(100)' },
    serial_number: { type: 'varchar(100)' },
    installation_date: { type: 'date' },
    warranty_start_date: { type: 'date' },
    warranty_end_date: { type: 'date' },
    location_description: { type: 'text' },
    specifications: { type: 'jsonb', default: '{}' },
    filter_size: { type: 'varchar(50)' },
    filter_type: { type: 'varchar(50)' },
    last_filter_change: { type: 'date' },
    next_filter_change: { type: 'date' },
    system_health_score: { type: 'integer', default: 100 },
    created_at: { type: 'timestamp with time zone', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp with time zone', default: pgm.func('CURRENT_TIMESTAMP') }
  });
  pgm.createIndex('customer_equipment', 'customer_id');
  pgm.createIndex('customer_equipment', ['equipment_type', 'system_health_score']);

  // Service Requests table
  pgm.createTable('service_requests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    customer_id: { type: 'uuid', notNull: true, references: 'customers(id)', onDelete: 'CASCADE' },
    equipment_id: { type: 'uuid', references: 'customer_equipment(id)', onDelete: 'SET NULL' },
    request_type: { type: 'varchar(100)', notNull: true },
    urgency_level: { type: 'varchar(20)', notNull: true, default: 'medium' },
    title: { type: 'varchar(255)', notNull: true },
    description: { type: 'text', notNull: true },
    symptoms: { type: 'jsonb', default: '[]' },
    customer_photos: { type: 'jsonb', default: '[]' },
    voice_memo_path: { type: 'varchar(255)' },
    status: { type: 'varchar(20)', notNull: true, default: 'submitted' },
    assigned_technician_id: { type: 'uuid', references: 'employees(id)', onDelete: 'SET NULL' },
    related_job_id: { type: 'uuid', references: 'jobs(id)', onDelete: 'SET NULL' },
    resolution_notes: { type: 'text' },
    customer_satisfaction_rating: { type: 'integer' },
    resolved_at: { type: 'timestamp with time zone' },
    created_at: { type: 'timestamp with time zone', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp with time zone', default: pgm.func('CURRENT_TIMESTAMP') }
  });
  pgm.createIndex('service_requests', ['customer_id', 'status']);
  pgm.createIndex('service_requests', 'status');
  pgm.createIndex('service_requests', 'assigned_technician_id');

  // Customer Communications table
  pgm.createTable('customer_communications', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    customer_id: { type: 'uuid', notNull: true, references: 'customers(id)', onDelete: 'CASCADE' },
    employee_id: { type: 'uuid', references: 'employees(id)', onDelete: 'SET NULL' },
    service_request_id: { type: 'uuid', references: 'service_requests(id)', onDelete: 'CASCADE' },
    job_id: { type: 'uuid', references: 'jobs(id)', onDelete: 'SET NULL' },
    thread_id: { type: 'varchar(255)' },
    message_type: { type: 'varchar(50)', notNull: true, default: 'text' },
    sender_type: { type: 'varchar(20)', notNull: true },
    message: { type: 'text', notNull: true },
    attachments: { type: 'jsonb', default: '[]' },
    read_by_customer: { type: 'boolean', default: false },
    read_by_technician: { type: 'boolean', default: false },
    is_internal_note: { type: 'boolean', default: false },
    created_at: { type: 'timestamp with time zone', default: pgm.func('CURRENT_TIMESTAMP') }
  });
  pgm.createIndex('customer_communications', 'customer_id');
  pgm.createIndex('customer_communications', 'service_request_id');
  pgm.createIndex('customer_communications', 'thread_id');

  // Add updated_at triggers for relevant tables
  const tables = ['companies', 'internal_users', 'employees', 'customers', 'jobs', 'customer_equipment', 'service_requests'];
  
  pgm.createFunction('update_updated_at_column', [], {
    returns: 'TRIGGER',
    language: 'plpgsql'
  }, `
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
  `);

  tables.forEach(table => {
    pgm.createTrigger(table, 'update_updated_at', {
      when: 'BEFORE',
      operation: 'UPDATE',
      function: 'update_updated_at_column',
      functionParams: []
    });
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  // Drop tables in reverse order (due to foreign key constraints)
  pgm.dropTable('customer_communications');
  pgm.dropTable('service_requests');
  pgm.dropTable('customer_equipment');
  pgm.dropTable('jobs');
  pgm.dropTable('customers');
  pgm.dropTable('employees');
  pgm.dropTable('user_roles');
  pgm.dropTable('internal_users');
  pgm.dropTable('companies');
  
  // Drop function
  pgm.dropFunction('update_updated_at_column');
  
  // Drop extension (optional, might be used by other applications)
  // pgm.dropExtension('uuid-ossp');
};
