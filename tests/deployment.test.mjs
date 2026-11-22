import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {postgresOptions} from '../lib/postgres-options.mjs';
import {deploymentProblems} from '../lib/deployment-config.mjs';
test('remote PostgreSQL verifies certificates and rejects insecure URL overrides',()=>{
 const remote=postgresOptions({DATABASE_URL:'postgresql://app:secret@database.example.com/wedding_site'});assert.equal(remote.ssl.rejectUnauthorized,true);
 for(const params of ['sslmode=disable','sslmode=require','sslmode=no-verify'])assert.throws(()=>postgresOptions({DATABASE_URL:'postgresql://app:secret@database.example.com/wedding_site?'+params}),/verify-full/);
 assert.throws(()=>postgresOptions({DATABASE_URL:'postgresql://app:secret@database.example.com/wedding_site',DATABASE_SSL_MODE:'disable'}),/verify-full/);
 const safe=postgresOptions({DATABASE_URL:'postgresql://app:secret@database.example.com/wedding_site?sslmode=verify-full'});assert.equal(safe.ssl.rejectUnauthorized,true);assert(!safe.connectionString.includes('sslmode'));
});
test('local development and private Lightsail database remain supported',()=>{
 for(const host of ['localhost','127.0.0.1','db'])assert.equal(postgresOptions({DATABASE_URL:`postgresql://app:secret@${host}/wedding_site`}).ssl,false);
 assert.throws(()=>postgresOptions({DATABASE_URL:'invalid'}),/valid/);
 assert.throws(()=>postgresOptions({DATABASE_URL:'postgresql://app:secret@db/wedding_site',DATABASE_MAX_CONNECTIONS:'500'}),/between/);
});
test('production checks require a live origin and existing invitation key, and flag leftover setup passwords',()=>{
 const good={DATABASE_URL:'postgresql://app:secret@db/wedding_site',SITE_URL:'https://nischalandbhumika.com',INVITATION_ENCRYPTION_KEY:'a'.repeat(64),EMAIL_SENDING_ENABLED:'false'};
 assert.deepEqual(deploymentProblems(good),[]);
 assert(deploymentProblems({...good,SITE_URL:'http://localhost:3000'}).length);
 assert(deploymentProblems({...good,INVITATION_ENCRYPTION_KEY:''}).length);
 assert(deploymentProblems({...good,ADMIN_PASSWORD:'dummy'}).some(s=>s.includes('ADMIN_PASSWORD')));
 assert(!JSON.stringify(deploymentProblems({...good,DATABASE_URL:'broken-secret'})).includes('broken-secret'));
});
test('container setup keeps secrets out of builds and exposes only the HTTPS proxy',async()=>{
 const ignore=await readFile(new URL('../.dockerignore',import.meta.url),'utf8');assert(ignore.includes('.env*'));assert(ignore.includes('.git'));assert(ignore.includes('*.dump'));
 const compose=await readFile(new URL('../compose.production.yml',import.meta.url),'utf8');assert(!compose.includes('5432:5432'));assert(!compose.includes('3000:3000'));assert(compose.includes('internal: true'));assert(compose.includes('POSTGRES_MAJOR_VERSION'));
 const docker=await readFile(new URL('../Dockerfile',import.meta.url),'utf8');assert(docker.includes('USER node'));assert(docker.includes('.next/standalone'));
});
test('Lightsail configuration preserves invitation key, generates matching private credentials, and refuses overwrites',async()=>{
 const {mkdtemp,stat}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');
 const run=promisify(execFile);const cwd=await mkdtemp(join(tmpdir(),'wedding-deploy-test-'));const script=new URL('../scripts/configure-lightsail.mjs',import.meta.url).pathname;
 const env={...process.env,INVITATION_ENCRYPTION_KEY:'b'.repeat(64)};
 const result=await run(process.execPath,[script,'--domain','nischalandbhumika.com','--postgres-version','18'],{cwd,env});
 const runtime=await readFile(join(cwd,'.env.production.local'),'utf8');const owner=await readFile(join(cwd,'.env.migrations.local'),'utf8');const database=await readFile(join(cwd,'.env.postgres.local'),'utf8');const compose=await readFile(join(cwd,'.env.compose.local'),'utf8');
 assert(runtime.includes('INVITATION_ENCRYPTION_KEY='+'b'.repeat(64)));assert(runtime.includes('EMAIL_SENDING_ENABLED=false'));assert(!runtime.includes('wedding_owner'));
 const appPassword=database.match(/APP_DB_PASSWORD=(.*)/)[1];assert(runtime.includes('wedding_app:'+appPassword+'@db'));const ownerPassword=database.match(/POSTGRES_PASSWORD=(.*)/)[1];assert(owner.includes('wedding_owner:'+ownerPassword+'@db'));assert(!result.stdout.includes(appPassword));assert(!result.stdout.includes(ownerPassword));assert(!result.stdout.includes('b'.repeat(64)));
 assert(compose.includes('POSTGRES_MAJOR_VERSION=18'));assert(compose.includes('POSTGRES_DATA_DIR=/var/lib/postgresql\n'));
 if(process.platform!=='win32')assert.equal((await stat(join(cwd,'.env.production.local'))).mode&0o777,0o600);
 await assert.rejects(()=>run(process.execPath,[script,'--domain','nischalandbhumika.com','--postgres-version','18'],{cwd,env}));assert.equal(await readFile(join(cwd,'.env.production.local'),'utf8'),runtime);
});
