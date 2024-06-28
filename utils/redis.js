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
      const asyncGet = util.promisify(this.client.get).bind(this.client);
      const value = await asyncGet(key);

      return value;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async set(key, value, duration) {
    try {
      const asyncSet = util.promisify(this.client.setex).bind(this.client);
      await asyncSet(key, duration, value);
    } catch (err) {
      console.error(err);
    }
  }

  async del(key) {
    try {
      const asyncDel = util.promisify(this.client.del).bind(this.client);
      await asyncDel(key);
    } catch (err) {
      console.error(err);
    }
  }
}

const redisClient = new RedisClient();
export default redisClient;
