import Bull from 'bull';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import dbClient from './utils/db';

const fileQueue = new Bull('fileQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
});

fileQueue.process(async (job) => {
  if (!job.fileId) throw new Error('Missing fileId');
  if (!job.userId) throw new Error('Missing userId');

  const file = await dbClient.filesCollection.findOne({
    _id: job.fileId,
    userId: job.userId,
  });
  if (!file) throw new Error('File not found');

  try {
    const thumbnail500 = await imageThumbnail(file.localPath, {
      width: 500,
    });
    await fs.promises.writeFile(`${file.localPath}_500`, thumbnail500);

    const thumbnail250 = await imageThumbnail(file.localPath, {
      width: 250,
    });
    await fs.promises.writeFile(`${file.localPath}_250`, thumbnail250);

    const thumbnail100 = await imageThumbnail(file.localPath, {
      width: 100,
    });
    await fs.promises.writeFile(`${file.localPath}_100`, thumbnail100);
  } catch (err) {
    console.error(err);
  }
});

const userQueue = new Bull('userQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
});

userQueue.process(async (job) => {
  if (!job.userId) throw new Error('Missing userId');
  try {
    const user = await dbClient.usersCollection.findOne({
      // _id: ObjectId(job.userId)
      _id: job.userId,
    });
    if (!user) throw new Error('User not found');
    console.log(`Welcome ${user.email}!`);
  } catch (err) {
    console.error(err);
  }
});
