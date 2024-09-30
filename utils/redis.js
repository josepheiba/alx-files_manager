import redis from "redis";
import { promisify } from "util";

/**
 * Represents a Redis client.
 */
class RedisClient {
  /**
   * Creates a new RedisClient instance.
   */
  constructor() {
    this.client = redis.createClient();

    this.client.on("error", (error) => {
      console.error(`Redis client error: ${error}`);
    });

    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    try {
      return await this.getAsync(key);
    } catch (error) {
      console.error(`Error getting key ${key}: ${error}`);
      return null;
    }
  }

  async set(key, value, duration) {
    try {
      await this.setAsync(key, value, "EX", duration);
    } catch (error) {
      console.error(`Error setting key ${key}: ${error}`);
    }
  }

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
