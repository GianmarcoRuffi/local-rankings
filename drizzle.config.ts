import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './database/migrations',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 3306,
    user: process.env.DATABASE_USER || 'local_rankings_user',
    password: process.env.DATABASE_PASSWORD || 'local_rankings_password',
    database: process.env.DATABASE_NAME || 'local_rankings',
  },
  verbose: true,
  strict: true,
});
