#!/usr/bin/env node

var spawn = require('child_process').spawn;

var async = require('async');
var _ = require('underscore');

var userNotFound = /User ID not found/;
var pub = /^pub\s+.+\/(.{8})/;
var sig = /^sig\s+\d?\s+(.{8})/;
var uid = /^uid\s+(.+)\s+<(.+)>/;

var Gpg = function(keychain) {
  this.keychain = keychain;
  this.users = {};
  this.signatureOutput = [];
};

Gpg.prototype.createD3Tree = function(callback) {
  var tree,
      nodes = [];

  tree = {
    nodes: [],
    links: []
  };

  if (Object.keys(this.users).length === 0) {
    callback();
    return;
  }

  // Generate Nodes
  _.each(this.users, function(user, fingerprint) {
    nodes.push(fingerprint);
    tree.nodes.push({
      fingerprint: fingerprint,
      name: user.name,
      email: user.email,
      sigCount: user.signatures.length
    });
  });

  _.each(this.users, function(user, fingerprint) {
    var dst;

    dst = nodes.indexOf(fingerprint);

    user.signatures.forEach(function(sig) {
      if (nodes.indexOf(sig) !== -1) {
        tree.links.push({
          target: dst,
          source: nodes.indexOf(sig),
          sigCount: user.signatures.length
        });
      }
    });
  });

  console.log(JSON.stringify(tree));
  callback();
};

Gpg.prototype.parseSignatureOutput = function(callback) {
  var self = this,
      info;

  this.signatureOutput.forEach(function(user) {
    var userObj = {},
        fingerprint;

    user.forEach(function(userInfo) {
      var sigFingerprint;

      if (userNotFound.test(userInfo)) {
        return;
      } else if (pub.test(userInfo)) {
        fingerprint = pub.exec(userInfo)[1].toString();
      } else if (uid.test(userInfo)) {
        userInfo = uid.exec(userInfo);
        userObj.name = userInfo[1];
        userObj.email = userInfo[2];
      } else if (sig.test(userInfo)) {
        userObj.signatures = userObj.signatures || [];

        sigFingerprint = sig.exec(userInfo)[1];
        if (sigFingerprint && sigFingerprint !== fingerprint && userObj.signatures.indexOf(sigFingerprint) === -1) {
          userObj.signatures.push(sigFingerprint);
        }
      }
    });

    self.users[fingerprint] = userObj;
  });

  callback();
};

Gpg.prototype.getSignatures = function(callback) {
  var self = this,
      sigs = spawn('gpg', ['--list-sigs']),
      output = [];

  sigs.stdout.on('data', function(data) {
    output.push(data.toString());
  });

  sigs.on('exit', function(code) {
    var pos = 0,
        splitOutput = [];

    output.join('').split('\n').forEach(function(line) {
      if (line === '') {
        pos++;
        return;
      }

      splitOutput[pos] = splitOutput[pos] || [];
      splitOutput[pos].push(line);
    });

    self.signatureOutput = splitOutput;
    callback();
  });
};

function main() {
  var gpg = new Gpg();

  async.series([
    gpg.getSignatures.bind(gpg),

    gpg.parseSignatureOutput.bind(gpg),

    gpg.createD3Tree.bind(gpg)

  ], function(err) {
  });
}

main();
