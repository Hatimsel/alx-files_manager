import Bull from 'bull';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import { ObjectId} from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Bull('fileQueue', {
    redis: {
        host: '127.0.0.1',
        port: 6379
    }
});

fileQueue.process(async (job) => {
    const { userId, fileId } = job.data;

    if (!fileId) throw new Error('Missing fileId');
    if (!userId) throw new Error('Missing userId');

    const file = await dbClient.filesCollection.findOne({
        _id: ObjectId(fileId),
        userId: ObjectId(userId)
    });
    if (!file) throw new Error('File not found');

    const sizes = [500, 250, 100];
    for (const size of sizes) {
        const thumbnail = await imageThumbnail(file.localPath, {
            width: size
        });
        const thumbnailPath = `${file.localPath}_${size}`;
        await fs.promises.writeFile(thumbnailPath, thumbnail);
    }
});

fileQueue.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
});

fileQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed: ${err.message}`);
});
