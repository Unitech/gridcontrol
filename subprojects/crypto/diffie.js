
var crypto = require('crypto');

var alice = crypto.createDiffieHellman(256);
var alice_public = alice.generateKeys('base64');
var alice_prime = alice.getPrime();

// Send prime and keys

var bob = crypto.createDiffieHellman(alice_prime);
var bob_public = bob.generateKeys('base64');

var bob_secret = bob.computeSecret(alice_public, 'base64', 'base64');

var alice_secret = alice.computeSecret(bob_public, 'base64', 'base64');

console.log(bob_public, bob_secret);
console.log(alice_secret.toString('hex') ==  bob_secret.toString('hex'));

var DATA_TO_BOB = JSON.stringify({ fuck : 'you' });


function secure(msg, key) {
  var cipher = crypto.createCipher('aes-256-ctr', key);
  var hmac = crypto.createHmac('sha256', key);
  var plaintext = (typeof msg === "object") ? JSON.stringify(msg) : msg.toString();

  var ciphertext = cipher.update(plaintext, 'utf8', 'base64') + cipher.final('base64');

  hmac.update(ciphertext);
  var mac = hmac.digest('base64');

  return {payload: ciphertext, mac: mac};
};

function verify(msg, key) {
  var hmac = crypto.createHmac('sha256', key);

  hmac.update(msg.payload);
  var mac = hmac.digest('base64');

  if (mac === msg.mac) {
    var decipher = crypto.createDecipher('aes-256-ctr', key);
    var plaintext = decipher.update(msg.payload, 'base64', 'utf8') + decipher.final('utf8');

    // attempt to parse as json
    try {
      return JSON.parse(plaintext);
    }
    catch(err) {
      // if failed, return plaintext directly
      return plaintext;
    }
  }
};

var fs = require('fs');

var sec = secure(fs.readFileSync('test.tar.gz').toString('hex'), alice_secret);

var ver = verify(sec, bob_secret);

//console.log(ver);
