import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw Error('Set DATABASE_URL in .env.local first.');
const client = new pg.Client({connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000});
try {
 await client.connect();
 await client.query('SELECT pg_advisory_lock(2702027)');
 await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
 for(const name of (await readdir('database')).filter(n=>/^\d+.*\.sql$/.test(n)).sort()) {
  if ((await client.query('SELECT 1 FROM schema_migrations WHERE name=$1',[name])).rowCount) continue;
  let sql=await readFile('database/'+name,'utf8');
  // The initial migration previously contained transaction statements.
  sql=sql.replace(/^BEGIN;\s*$/gm,'').replace(/^COMMIT;\s*$/gm,'');
  await client.query('BEGIN');
  try {await client.query(sql);await client.query('INSERT INTO schema_migrations(name) VALUES ($1)',[name]);await client.query('COMMIT');console.log('Applied '+name);}catch(e){await client.query('ROLLBACK');throw e;}
 }
 console.log('Database is up to date.');
} catch { console.error('Migration failed. Check that PostgreSQL is running, DATABASE_URL is correct, and the database is empty on first setup. No credentials were printed.');process.exitCode=1; }
finally {await client.end();}
