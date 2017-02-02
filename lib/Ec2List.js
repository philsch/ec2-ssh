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
   * @param region
   * @param credentials
   * @returns {Promise}
   */
  getReachableEc2Instances(region, credentials = null) {
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

}

module.exports = new Ec2List();
