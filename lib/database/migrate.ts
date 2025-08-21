#!/usr/bin/env node

import { migrate } from 'node-pg-migrate'
import { getPool } from './index'
import path from 'path'
import { logger } from '@/lib/utils'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'heat_pumps_now',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
}

export async function runMigrations(direction: 'up' | 'down' = 'up'): Promise<void> {
  try {
    logger.info(`Starting database migrations (${direction})...`)
    
    const migrationsPath = path.resolve(process.cwd(), 'migrations')
    
    const migrations = await migrate({
      databaseUrl: dbConfig,
      migrationsTable: 'pgmigrations',
      dir: migrationsPath,
      direction,
      count: direction === 'down' ? 1 : undefined, // Only rollback one migration at a time
      createSchema: true,
      createMigrationsSchema: true,
      log: (msg) => logger.info(msg),
      verbose: true,
    })

    logger.info(`Database migrations completed`, {
      migrationsRun: migrations.length,
      direction
    })
    
    if (migrations.length === 0) {
      logger.info('No migrations to run')
    } else {
      migrations.forEach((migration) => {
        logger.info(`Applied migration: ${migration.name}`)
      })
    }
    
  } catch (error) {
    logger.error('Migration failed', error as Error)
    throw error
  }
}

export async function createMigration(name: string): Promise<void> {
  try {
    const migrationsPath = path.resolve(process.cwd(), 'migrations')
    
    await migrate({
      databaseUrl: dbConfig,
      migrationsTable: 'pgmigrations',
      dir: migrationsPath,
      createMigrationsSchema: true,
      direction: 'up',
      count: 0, // Don't run migrations, just create the file
      log: (msg) => logger.info(msg),
    })
    
    // The migration file creation logic would go here
    // node-pg-migrate CLI handles this, but we can implement it if needed
    logger.info(`Migration template would be created: ${name}`)
    
  } catch (error) {
    logger.error('Failed to create migration', error as Error)
    throw error
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2]
  const arg = process.argv[3]

  switch (command) {
    case 'up':
      runMigrations('up')
        .then(() => process.exit(0))
        .catch(() => process.exit(1))
      break
      
    case 'down':
      runMigrations('down')
        .then(() => process.exit(0))
        .catch(() => process.exit(1))
      break
      
    case 'create':
      if (!arg) {
        console.error('Migration name is required')
        process.exit(1)
      }
      createMigration(arg)
        .then(() => process.exit(0))
        .catch(() => process.exit(1))
      break
      
    default:
      console.log('Usage:')
      console.log('  npm run migrate up    - Run pending migrations')
      console.log('  npm run migrate down  - Rollback last migration')
      console.log('  npm run migrate create <name> - Create new migration')
      process.exit(1)
  }
}