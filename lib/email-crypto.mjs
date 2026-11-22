import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
/** @returns {Buffer | null} */
function key() {
 const raw=process.env.INVITATION_ENCRYPTION_KEY;
 if(!raw)return null;
 if(!/^[a-f0-9]{64}$/i.test(raw))throw Error('INVITATION_ENCRYPTION_KEY must be 64 hexadecimal characters.');
 return Buffer.from(raw,'hex');
}
/** @param {string} token @returns {string | null} */
export function encryptInvitation(token) {
 const secret=key();if(!secret)return null;
 const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',secret,iv);
 const encrypted=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);
 return ['v1',iv.toString('hex'),cipher.getAuthTag().toString('hex'),encrypted.toString('hex')].join(':');
}
/** @param {string} value @returns {string} */
export function decryptInvitation(value) {
 const secret=key();if(!secret)throw Error('Invitation encryption key is not configured.');
 const [version,iv,tag,data]=value.split(':');
 if(version!=='v1'||!iv||!tag||!data)throw Error('Invalid encrypted invitation.');
 const decipher=createDecipheriv('aes-256-gcm',secret,Buffer.from(iv,'hex'));decipher.setAuthTag(Buffer.from(tag,'hex'));
 return Buffer.concat([decipher.update(Buffer.from(data,'hex')),decipher.final()]).toString('utf8');
}
