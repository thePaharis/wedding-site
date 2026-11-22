import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {mkdir,rename} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
await mkdir('backups',{recursive:true,mode:0o700});
const name=`backups/wedding-${new Date().toISOString().replace(/[:.]/g,'-')}.dump`;
const child=spawn('docker',['compose','--env-file','.env.compose.local','-f','compose.production.yml','exec','-T','db','pg_dump','--username=wedding_owner','--dbname=wedding_site','--format=custom','--no-owner','--no-acl'],{stdio:['ignore','pipe','pipe']});
child.stderr.resume();
try{
 await Promise.all([pipeline(child.stdout,createWriteStream(name+'.partial',{flags:'wx',mode:0o600})),new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error('Backup process failed')));})]);
 await rename(name+'.partial',name);console.log('Created '+name+'. Copy it securely off the server and verify a restore before relying on it.');
}catch{child.kill();console.error('Backup failed. Any incomplete output retains the .partial suffix.');process.exitCode=1;}
