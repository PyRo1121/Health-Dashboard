import { join } from 'node:path';
import { defineConfig } from 'drizzle-kit';

const sqlitePath =
  process.env.HEALTH_DB_PATH ?? join(process.cwd(), '.data', 'personal-health-cockpit.sqlite');

export default defineConfig({
  schema: './src/lib/server/db/drizzle/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: sqlitePath,
  },
  strict: true,
  verbose: true,
});
