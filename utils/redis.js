import redis from 'redis';
import { promisify } from 'util';

/**
 * Redis client.
 */
class RedisClient {
  /**
   * RedisClient instance.
   */
  constructor() {
    this.client = redis.createClient();
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);

    this.client.on('error', (error) => {
      console.error(`Redis client error: ${error}`);
    });
  }

  /**
   * Checks client's connection with the Redis server.
   * @returns {boolean}
   */
  isAlive() {
    return this.client.connected;
  }

  /**
   * gets value of the key.
   * @param {String} key is not here bruh.
   * @returns {String | Object}
   */
  async get(key) {
    try {
      return await this.getAsync(key);
    } catch (error) {
      console.error(`Error getting key ${key}: ${error}`);
      return null;
    }
  }

  /**
   * Sets a key-value pair in Redis with an optional expiration.
   * @param {String} key The Redis key to set.
   * @param {String | Number | Boolean} value The value to associate with the key.
   * @param {Number} duration The expiration time in seconds (optional).
   * @returns {Promise<void>}
   */
  async set(key, value, duration) {
    try {
      await this.setAsync(key, value, 'EX', duration);
    } catch (error) {
      console.error(`Error setting key ${key}: ${error}`);
    }
  }

  /**
   * Deletes a key from Redis.
   * @param {String} key The Redis key to delete.
   * @returns {Promise<void>}
   */
  async del(key) {
    try {
      await this.delAsync(key);
    } catch (error) {
      console.error(`Error deleting key ${key}: ${error}`);
    }
  }
}

const redisClient = new RedisClient();
export default redisClient;
