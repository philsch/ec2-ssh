#! /usr/bin/env node

'use strict';

const process = require('process');
const tabtab = require('tabtab');
const ec2list = require('./lib/Ec2List');
const sshConnector = require('./lib/SshConnector');
const config = require('./config.json');

const IS_TABBED = process.env.COMP_LINE !== undefined;
const tab = tabtab({
  name: 'ec2-ssh',
  cache: false, // TODO: has problems with async process, implement own solution?
  ttl: 1000 * 60 * 60 * 24 // 24h
});

/* =========================
 *  EC2 auto-completion
 * =========================
 */
if (IS_TABBED) {
  tab.on('ec2-ssh', (data, done) => {
    if (data.words > 1) {
      return done(null, []);
    }

    const apiCalls = [];
    config.regions.forEach((region) => {
      apiCalls.push(ec2list.getReachableEc2Instances(region));
    });

    if (config.roles && Array.isArray(config.roles) && config.roles.length > 0) {
      config.roles.forEach((roleArn) => {
        config.regions.forEach((region) => {
          apiCalls.push(ec2list.getReachableEc2Instances(region, roleArn));
        });
      });
    }

    return Promise.all(apiCalls)
      .then(lists => done(null, lists.reduce((acc, list) => acc.concat(list), [])));
  });
  tab.start();

/* =========================
 *  Main handler
 * =========================
 */
} else {
  const args = process.argv.slice(2);
  const cmd = args[0] || null;

  if (cmd) {
    sshConnector.connect(cmd);
  }
}
