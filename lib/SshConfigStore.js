'use strict';

const fs = require('fs');

const STORE_FILE = `${__dirname}/../ec2.json`;

/**
 * Store for SSH configs
 *  - persists SSH configurations
 *  - maps different identifier to that config
 */
class SshConfigStore {

  /**
   *
   */
  constructor() {
    if (fs.existsSync(STORE_FILE)) {
      this.store = JSON.parse(fs.readFileSync(STORE_FILE));
    } else {
      this.store = { items: {}, map: {} };
    }
    this._refreshTagMap();
  }

  /**
   * Retrieves connection cofig for given key.
   *
   * @param {string} key Can be EC2-id, (iterative) Tag-Name, IP
   * @returns {*}
   */
  getConfig(key) {
    const index = this.store.map[key];
    if (!index) {
      return null;
    }
    return this.store.items[index];
  }

  /**
   * Checks if the config for the given key has a user and keyPath set
   *
   * @param {string} key Can be EC2-id, (iterative) Tag-Name, IP
   * @returns {Boolean}
   */
  hasCredentials(key) {
    const config = this.getConfig(key);

    return config && config.user && config.keyPath;
  }


  /**
   * Updates a stored EC2 instance or creates a new entry.
   * Undefined values will not replace existing values in the store.
   *
   * @param id Ec2 ID
   * @param ip Ec2 public ip
   * @param user SSH user
   * @param keyPath SSH key path
   * @param tag EC2 tag name
   */
  updateConfig(id, ip, user, keyPath, tag) {
    const item = { ip, id, user, keyPath, tag };
    const index = id || this.store.map[ip] || this.store.map[tag];
    const exists = this.store.items[index];

    if (!exists) {
      this.store.items[id] = item;
      if (ip) {
        this.store.map[ip] = id;
      }
      if (tag) {
        this.store.map[tag] = id;
      }
    } else {
      Object.keys(item).forEach((key) => {
        if (item[key]) {
          this.store.items[index][key] = item[key];
        }
      });
    }
    this._refreshTagMap();
    this._save();
  }

  /**
   * Delete stored config for the given EC2 ID
   *
   * @param id EC2 ID
   */
  deleteConfig(id) {
    console.log(`Deleting ${id}`);
    delete this.store.items[id];
    Object.keys(this.store.map).forEach((mapKey) => {
      if (this.store.map[mapKey] === id) {
        delete this.store.map[mapKey];
      }
    });

    this._save();
  }

  /**
   * Write config to JSON file
   *
   * @private
   */
  _save() {
    // TODO: check if async with file system (multiple shells problem)
    fs.writeFileSync(STORE_FILE, JSON.stringify(this.store), { mode: 0o600 });
  }

  /**
   * Refresh an internal map TagName => InstanceID
   *
   * @private
   */
  _refreshTagMap() {
    this.tagMap = {};

    Object.keys(this.store.items).forEach((id) => {
      const item = this.store.items[id];
      if (item.tag) {
        this.tagMap[item.tag] = item.id;
      }
    });
  }

  /**
   * Searches for already known tag names in the store and returns a new unique identifier
   *
   * @param id
   * @param originalTag
   * @return {string}
   */
  getIterativeTagName(id, originalTag) {
    let cnt = 0;
    const originalTagRegex = originalTag.replace(/[\-\[\]\/{}()*+?.\\\^$|]/g, '\\$&'); // eslint-disable-line no-useless-escape
    const regex = new RegExp(`^${originalTagRegex}$|^${originalTagRegex} \\([0-9]*\\)`);

    let foundTag = null;
    Object.keys(this.tagMap).some((tag) => {
      if (regex.test(tag)) {
        if (this.tagMap[tag] === id) {
          foundTag = tag;
          return true; // we know this machine, break
        }
        cnt += 1;
      }
      return false;
    });

    if (foundTag) {
      return foundTag;
    }

    if (cnt === 0) {
      return originalTag;
    }

    return `${originalTag} (${cnt})`;
  }

}

module.exports = new SshConfigStore();
