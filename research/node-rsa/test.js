
var nodeRsa = require('node-rsa');
var fs = require('fs');

var key = new nodeRsa(fs.readFileSync('./private.key'));
var key2 = new nodeRsa();

//key2.importKey(fs.readFileSync('./public.crt').toString(), 'pkcs8-public');

console.log('is private', key.isPublic(true));
var encrypted = key.encrypt('test', 'base64');

console.log(encrypted);

var decrypted = key.decryptPublic(encrypted, 'utf8');

console.log(decrypted);
