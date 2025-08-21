// Database utility - redirects to the proper database connection
import { pool, query, withTransaction, testConnection, closePool, getPool } from './database';

// Re-export the database functions
export default getPool;
export { pool, query, withTransaction, testConnection, closePool, getPool };