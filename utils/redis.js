import redis from 'redis';
import util from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient();

    this.client.on('error', (err) => {
      console.error(err);
    });
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    try {
      const promisifiedClient = util.promisify(this.client.get).bind(this.client);
      const value = await promisifiedClient(key);

      return value;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async set(key, value, duration) {
    try {
      const promisifiedClient = util.promisify(this.client.setex).bind(this.client);
      await promisifiedClient(key, duration, value);
    } catch (err) {
      console.error(err);
    }
  }

  async del(key) {
    try {
      const promisifiedClient = util.promisify(this.client.del).bind(this.client);
      await promisifiedClient(key);
    } catch (err) {
      console.error(err);
    }
  }
}

const redisClient = new RedisClient();
export default redisClient;
