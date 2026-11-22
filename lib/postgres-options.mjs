import {readFileSync} from 'node:fs';
/** @param {NodeJS.ProcessEnv | Record<string,string|undefined>} env */
export function postgresOptions(env=process.env) {
 let url;
 try {url=new URL(env.DATABASE_URL||'');}catch{throw Error('Set a valid DATABASE_URL.');}
 if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||url.pathname==='/')throw Error('Set a valid PostgreSQL DATABASE_URL including the database name.');
 const local=['localhost','127.0.0.1','[::1]','db'].includes(url.hostname);
 const mode=env.DATABASE_SSL_MODE||(local?'disable':'verify-full');
 if(!['disable','verify-full'].includes(mode)||(!local&&mode==='disable'))throw Error('Remote databases require DATABASE_SSL_MODE=verify-full.');
 // pg connection-string SSL parameters can override its ssl object. Enforce our policy explicitly.
 const queryMode=url.searchParams.get('sslmode');
 if(!local&&queryMode&&queryMode!=='verify-full')throw Error('Use sslmode=verify-full or remove sslmode from the remote database URL.');
 for(const key of ['ssl','sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
 let ca;
 if(mode==='verify-full'&&env.DATABASE_SSL_CA_FILE){try{ca=readFileSync(env.DATABASE_SSL_CA_FILE,'utf8');}catch{throw Error('Unable to read DATABASE_SSL_CA_FILE.');}}
 const max=Number(env.DATABASE_MAX_CONNECTIONS||5);
 if(!Number.isInteger(max)||max<1||max>20)throw Error('DATABASE_MAX_CONNECTIONS must be between 1 and 20.');
 return {connectionString:url.toString(),max,connectionTimeoutMillis:5000,idleTimeoutMillis:30000,ssl:mode==='verify-full'?{rejectUnauthorized:true,...(ca?{ca}:{})}:false};
}
