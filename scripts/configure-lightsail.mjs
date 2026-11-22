import nextEnv from '@next/env';
import {randomBytes} from 'node:crypto';
import {access,writeFile} from 'node:fs/promises';
nextEnv.loadEnvConfig(process.cwd(),true);
const key=process.env.INVITATION_ENCRYPTION_KEY;
if(!/^[a-f0-9]{64}$/i.test(key||''))throw Error('Set your existing INVITATION_ENCRYPTION_KEY in .env.local first. Preserve the same key used by your invitation data.');
const domain=process.argv[process.argv.indexOf('--domain')+1];
if(!process.argv.includes('--domain')||!domain||!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain))throw Error('Supply --domain nischalandbhumika.com (without https://).');
const version=Number(process.argv[process.argv.indexOf('--postgres-version')+1]);
if(!process.argv.includes('--postgres-version')||!Number.isInteger(version)||version<14||version>99)throw Error('Supply --postgres-version matching your local PostgreSQL major version, for example 18.');
const files=['.env.postgres.local','.env.production.local','.env.migrations.local','.env.compose.local'];
for(const file of files){let exists=false;try{await access(file);exists=true;}catch{}if(exists)throw Error('Deployment environment files already exist. They were not overwritten.');}
const ownerPassword=randomBytes(32).toString('hex');const appPassword=randomBytes(32).toString('hex');
const common=`SITE_DOMAIN=${domain}\nSITE_URL=https://${domain}\nDATABASE_SSL_MODE=disable\nINVITATION_ENCRYPTION_KEY=${key}\nEMAIL_SENDING_ENABLED=false\n`;
const contents=[`POSTGRES_USER=wedding_owner\nPOSTGRES_DB=wedding_site\nPOSTGRES_PASSWORD=${ownerPassword}\nAPP_DB_PASSWORD=${appPassword}\n`,common+`DATABASE_URL=postgresql://wedding_app:${appPassword}@db:5432/wedding_site\n`,common+`DATABASE_URL=postgresql://wedding_owner:${ownerPassword}@db:5432/wedding_site\n`,`POSTGRES_MAJOR_VERSION=${version}\nPOSTGRES_DATA_DIR=${version>=18?'/var/lib/postgresql':'/var/lib/postgresql/data'}\n`];
for(let i=0;i<files.length;i++)await writeFile(files[i],contents[i],{mode:0o600,flag:'wx'});
console.log('Created four private deployment environment files without printing secrets. Keep them out of Git. Transfer them securely to your server. Email sending stays disabled.');
