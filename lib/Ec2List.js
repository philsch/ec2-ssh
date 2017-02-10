'use strict';

const AWS = require('aws-sdk');
const SshConfigStore = require('./SshConfigStore');

/**
 * Class to retrieve EC2 instances from AWS
 */
class Ec2List {

  /**
   * Fetches a list of running and reachable (have public IP) EC2 instances
   * + prepares the SSH config store for new found instances
   *
   * @param {string} region An AWS region
   * @param {string|null} roleArn An AWS role arn to assume
   *                      (format arn:aws:iam::XXXXXXXX:role/XXXXXXXX)
   * @returns {Promise}
   */
  getReachableEc2Instances(region, roleArn = null) {
    if (roleArn) {
      return this._assumeRole(roleArn)
        .then(credentials => this._fetchInstances(region, credentials))
        .catch(() => Promise.resolve([]));
    }

    return this._fetchInstances(region);
  }

  /**
   * Fetches a list of running and reachable (have public IP) EC2 instances
   * + prepares the SSH config store for new found instances
   *
   * @param {string} region An AWS region
   * @param {AWS.Credentials} credentials Temporary AWS session credentials
   * @returns {Promise}
   * @private
   */
  _fetchInstances(region, credentials = null) {
    const ec2 = new AWS.EC2({ region, credentials });

    return new Promise((resolve) => {
      ec2.describeInstances({
        Filters: [
          { Name: 'instance-state-name', Values: ['running'] },
        ],
      }, (err, data) => {
        if (err) {
          return resolve([]);
        }

        let ec2List = [];
        if (data && data.Reservations) {
          data.Reservations.forEach((reservation) => {
            ec2List = ec2List.concat(reservation.Instances.map((rawEl) => {
              if (!rawEl.PublicIpAddress) {
                return undefined;
              }
              const tag = this._getNameTag(rawEl);
              SshConfigStore.updateConfig(
                rawEl.InstanceId,
                rawEl.PublicIpAddress,
                undefined,
                undefined,
                tag
              );
              return this._createSuggestion(tag, rawEl.PublicIpAddress);
            }));
          });
        }

        ec2List = ec2List.filter(el => el);
        return resolve(ec2List);
      });
    });
  }

  /**
   * Gets Name-Tag from API response
   *
   * @param rawInstance
   * @returns {string}
   * @private
   */
  _getNameTag(rawInstance) {
    let tagName = 'noNameTag';
    rawInstance.Tags.forEach((tag) => {
      if (tag.Key === 'Name' && tag.Value) {
        tagName = tag.Value;
      }
    });

    return SshConfigStore.getIterativeTagName(rawInstance.InstanceId, tagName);
  }

  /**
   * Returns suggestion that can be selected in shell
   *
   * @param value
   * @param description
   * @returns {string}
   * @private
   */
  _createSuggestion(value, description) {
    return `${value}:${description}`;
  }

  /**
   * Create temporary credentials object for given ARN role.
   * Resolves promise if nullable arn is given.
   *
   * @param arn
   * @returns {Promise<AWS.Credentials>}
   * @private
   */
  _assumeRole(arn) {
    const sts = new AWS.STS();
    const params = {
      DurationSeconds: 900,
      RoleSessionName: 'node-session',
      RoleArn: arn
    };

    if (!arn) {
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      sts.assumeRole(params, (err, response) => {
        if (err) {
          return reject(err);
        }

        const credentials = new AWS.Credentials(
          response.Credentials.AccessKeyId,
          response.Credentials.SecretAccessKey,
          response.Credentials.SessionToken
        );
        return resolve(credentials);
      });
    });
  }

}

module.exports = new Ec2List();
