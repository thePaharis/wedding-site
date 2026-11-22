import nextEnv from '@next/env';
import pg from 'pg';
import {deploymentProblems} from '../lib/deployment-config.mjs';
import {postgresOptions} from '../lib/postgres-options.mjs';
nextEnv.loadEnvConfig(process.cwd());
const problems=deploymentProblems();
if(problems.length){for(const message of problems)console.error('- '+message);process.exitCode=1;}
else if(!process.argv.includes('--database'))console.log('Configuration checks passed. Run with --database to check connectivity, migrations and an admin account.');
else {
 const client=new pg.Client(postgresOptions());
 try{await client.connect();const migrated=await client.query('SELECT 1 FROM schema_migrations WHERE name=$1',['005_nepali_language.sql']);if(!migrated.rowCount)throw Error();const admins=await client.query('SELECT 1 FROM admin_users LIMIT 1');if(!admins.rowCount)throw Error();console.log('Database connectivity, migration history and admin account checks passed.');}
 catch{console.error('Database check failed. Check connectivity, run migrations and create or restore the admin account. No credentials printed.');process.exitCode=1;}
 finally{await client.end();}
}
