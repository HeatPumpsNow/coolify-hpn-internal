import { Pool, PoolClient, QueryResult } from 'pg'
import { logger } from '@/lib/utils'

let pool: Pool | null = null

// Database connection configuration
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'heat_pumps_now',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
  application_name: 'heatpumps-internal', // Application name for monitoring
}

// Initialize connection pool
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(dbConfig)
    
    pool.on('connect', () => {
      logger.debug('Database connection established')
    })
    
    pool.on('error', (err) => {
      logger.error('Database connection error', err)
      // Don't exit process, let the application handle the error
    })
  }
  
  return pool
}

// Generic query function
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const start = Date.now()
  const client = getPool()
  
  try {
    const result = await client.query(text, params)
    const duration = Date.now() - start
    
    logger.debug('Database query executed', {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration,
      rows: result.rowCount
    })
    
    return result
  } catch (error) {
    const duration = Date.now() - start
    logger.error('Database query failed', error as Error, {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      duration,
      params: params?.length || 0
    })
    throw error
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect()
  
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as timestamp, version() as version')
    logger.info('Database connection test successful', {
      timestamp: result.rows[0]?.timestamp,
      version: result.rows[0]?.version?.substring(0, 50)
    })
    return true
  } catch (error) {
    logger.error('Database connection test failed', error as Error)
    return false
  }
}

// Close all connections (for graceful shutdown)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    logger.info('Database pool closed')
  }
}

// Export the pool for direct access if needed
export { pool }
export default getPool