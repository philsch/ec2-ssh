'use strict';

const childProcess = require('child_process');
const inquirer = require('inquirer');
const configStore = require('./SshConfigStore');

/**
 * Wrapper and user workflow for SSH connections
 */
class SshConnector {

  /**
   * Try to connect to the EC2 matching the identifier.
   * Prompts user for input if this is a connection to an unknown host.
   *
   * @param {string} identifier
   * @returns {Promise}
   */
  connect(identifier) {
    const config = configStore.getConfig(identifier);

    if (!config) {
      console.log(`No EC2 instance found for identifier "${identifier}"!`);
      console.log('Enter ec2-ssh and press TAB to fetch the latest instances.');
      process.exit(1);
    }

    if (!configStore.hasCredentials(identifier)) {
      console.log('New connection...');
      return inquirer.prompt([
        { name: 'user', message: 'SSH User', default: 'ec2-user' },
        { name: 'keyPath', message: 'SSH Key', default: '~/.ssh/id_rsa' },
      ])
        .then((answers) => {
          configStore.updateConfig(config.id, undefined, answers.user, answers.keyPath);
          this._spawnSshChild(config);
        });
    }

    return Promise.resolve(this._spawnSshChild(config));
  }

  /**
   * Spawns a new SSH shell and handles exit code when this shell is closed
   *
   * @param {Object} config
   * @private
   */
  _spawnSshChild(config) {
    const ssh = childProcess.spawn('ssh', [`-i ${config.keyPath}`, `${config.user}@${config.ip}`], { shell: true, stdio: 'inherit' });

    ssh.on('close', (code) => {
      if (code !== 0 && code !== 130) {
        console.log('SSH connection failed');
        inquirer.prompt([
          { type: 'confirm', name: 'delete', message: 'Delete cached profile', default: false },
        ])
          .then((answer) => {
            if (answer.delete) {
              configStore.deleteConfig(config.id);
            }
          });
      }
    });
  }

}

module.exports = new SshConnector();
