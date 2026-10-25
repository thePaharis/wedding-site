import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
import pg from 'pg';
import { randomBytes, scryptSync } from 'node:crypto';
loadEnvConfig(process.cwd());
const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password=process.env.ADMIN_PASSWORD;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 14 || password.length>256) throw Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (14–256 characters) in .env.local.');
const salt=randomBytes(16).toString('hex');
const hash=scryptSync(password,salt,64).toString('hex');
const client=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});
try {
 await client.connect();await client.query('BEGIN');
 const result=await client.query('INSERT INTO admin_users(email,password_hash) VALUES ($1,$2) ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id',[email,`scrypt:${salt}:${hash}`]);
 await client.query('DELETE FROM admin_sessions WHERE admin_id=$1',[result.rows[0].id]);
 await client.query('COMMIT');console.log('Admin account created or password updated. Remove ADMIN_PASSWORD from .env.local now.');
} catch {console.error('Admin setup failed. Run npm run db:migrate first and check your local settings.');process.exitCode=1;}
finally {await client.end();}
