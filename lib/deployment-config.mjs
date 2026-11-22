import {postgresOptions} from './postgres-options.mjs';
/** @param {NodeJS.ProcessEnv | Record<string,string|undefined>} env */
export function deploymentProblems(env=process.env) {
 const problems=[];
 try{const url=new URL(env.SITE_URL||'');if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error();}catch{problems.push('Set SITE_URL to your live HTTPS website origin.');}
 if(!/^[a-f0-9]{64}$/i.test(env.INVITATION_ENCRYPTION_KEY||''))problems.push('Set the existing 64-character INVITATION_ENCRYPTION_KEY.');
 try{postgresOptions(env);}catch(error){problems.push(error instanceof Error?error.message:'Check database configuration.');}
 if(env.ADMIN_PASSWORD)problems.push('Remove ADMIN_PASSWORD after creating the admin account.');
 if(env.EMAIL_SENDING_ENABLED==='true'&&(!env.AWS_REGION||!env.SES_FROM_EMAIL))problems.push('Enabled email sending requires AWS_REGION and SES_FROM_EMAIL.');
 return problems;
}
