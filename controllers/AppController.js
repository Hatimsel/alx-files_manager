import redisClient from '../utils/redis';
import dbClient from '../utils/db';

export default class AppContoller {
  static getStatus(req, res) {
    const response = { redis: redisClient.isAlive(), db: dbClient.isAlive() };
    return res.status(200).send(response);
  }

  static async getStats(req, res) {
    try {
      const response = {
        users: await dbClient.nbUsers(),
        files: await dbClient.nbFiles(),
      };

      return res.status(200).send(response);
    } catch (err) {
      return res.status(500).send(`Error occurred: ${err}`);
    }
  }
}
