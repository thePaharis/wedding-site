import {randomBytes} from 'node:crypto';
console.log('Add this new key to your local .env.local. Keep a secure backup; do not commit it or share it. Do not replace an existing key without reissuing invitation links.');
console.log('INVITATION_ENCRYPTION_KEY='+randomBytes(32).toString('hex'));
