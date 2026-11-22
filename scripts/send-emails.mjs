import nextEnv from '@next/env';
import pg from 'pg';
import {SESv2Client,SendEmailCommand} from '@aws-sdk/client-sesv2';
import {dispatchOne} from '../lib/messaging-store.ts';
nextEnv.loadEnvConfig(process.cwd());
if(process.env.EMAIL_SENDING_ENABLED!=='true')throw Error('Email sending is disabled. Review EMAIL_SETUP.md first.');
if(!process.env.AWS_REGION||!process.env.SES_FROM_EMAIL||!/^\S+@[^\s@]+\.[^\s@]+$/.test(process.env.SES_FROM_EMAIL))throw Error('Set AWS_REGION and a verified SES_FROM_EMAIL.');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:5000});
const ses=new SESv2Client({region:process.env.AWS_REGION,maxAttempts:1,requestHandler:{requestTimeout:15000}});
try {
 await ses.config.credentials();
 let processed=0;
 while(await dispatchOne(pool,async mail=>{
  const response=await ses.send(new SendEmailCommand({FromEmailAddress:process.env.SES_FROM_EMAIL,Destination:{ToAddresses:[mail.to]},Content:{Simple:{Subject:{Data:mail.subject,Charset:'UTF-8'},Body:{Text:{Data:mail.text,Charset:'UTF-8'},Html:{Data:mail.html,Charset:'UTF-8'}}}}}));
  if(!response.MessageId)throw Error('No SES message ID');
  return response.MessageId;
 })) {processed++;console.log(`Processed ${processed} recipient(s). Check Admin → Messages for outcomes.`);await new Promise(resolve=>setTimeout(resolve,1100));}
 console.log('No queued recipients remain. Accepted means SES accepted the email, not confirmed delivery.');
}catch {console.error('Email worker stopped. Check configuration and Admin → Messages. No recipient addresses or secrets printed.');process.exitCode=1;}
finally{ses.destroy();await pool.end();}
