import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './db/schema';

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT) || 3306,
  user: process.env.DATABASE_USER || 'local_rankings_user',
  password: process.env.DATABASE_PASSWORD || 'local_rankings_password',
  database: process.env.DATABASE_NAME || 'local_rankings',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const db = drizzle(pool, { schema, mode: 'default' });
export default pool;
