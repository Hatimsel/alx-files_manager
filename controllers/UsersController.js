import sha1 from 'sha1';
import Bull from 'bull';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const userQueue = new Bull('userQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
});

export default class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).send({ error: 'Missing email' });
    } if (!password) {
      return res.status(400).send({ error: 'Missing password' });
    }
    const emailExist = await dbClient.db.collection('users').findOne({ email });
    if (emailExist) {
      return res.status(400).send({ error: 'Already exist' });
    }

    const hashedPass = sha1(password);
    try {
      const newUser = await dbClient.db.collection('users')
        .insertOne({ email, password: hashedPass });

      await userQueue.add({ userId: newUser._id });
      return res.status(201).send({ id: newUser.insertedId, email });
    } catch (err) {
      console.log(err);
      return res.status(401).send('Failed to add user');
    }
  }

  static async getMe(req, res) {
    try {
      const token = req.header('X-Token');
      const key = `auth_${token}`;
      const userId = await redisClient.get(key);
      const user = await dbClient.usersCollection.findOne(
        { _id: userId },
      );

      if (user) {
        return res.status(200).send({ id: userId, email: user.email });
      }
      return res.status(401).send({ error: 'Unauthorized' });
    } catch (err) {
      console.log(err);
      return res.status(401).send({ error: 'Unauthorized' });
    }
  }
}
