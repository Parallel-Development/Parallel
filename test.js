const crypto = require('crypto');

const key = crypto.randomBytes(16);
const iv = crypto.randomBytes(16);

const hash = crypto.createHash('sha256');
hash.update(key);
const hashDigest = hash.digest();
console.log(key.toString('hex'));

const cipher = crypto.createCipheriv('aes-128-gcm', key, iv);
const cipherText = Buffer.concat([cipher.update("Hello world"), cipher.final()]);
const cipherAuthTag = cipher.getAuthTag();
console.log(cipherText);

const decipher = crypto.createDecipheriv('aes-128-gcm', key, iv);
decipher.setAuthTag(cipherAuthTag);
const decipherText = Buffer.concat([decipher.update(cipherText), decipher.final()])
console.log(decipherText.toString('utf8'));