import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import base64 from 'base-64';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import process from 'process';

export default class FilesController {
    static async postUpload(req, res) {
        const token = req.header('X-Token');
        const key = `auth_${token}`;
        try {
            const userId = await redisClient.get(key);
            if (!userId) {
                return res.status(401).send({"error":"Unauthorized"});
            }

            let { name, type, parentId, isPublic, data } = req.body;
            const acceptedTypes = ['folder', 'file', 'image'];
            
            if (!name) {
                res.status(400).send({"error":"Missing file"});
            }

            if (!type || acceptedTypes.indexOf(type) === -1) {
                res.status(400).send({"error":"Missing type"});
            }

            if (!parentId) {
                parentId = 0;
            } else {
                const parent = await dbClient.filesCollection.find({parentId});
                if (!parent) {
                    res.status(400).send({"error":"Parent not found"});
                }
                if (parent.type !== 'folder') {
                    res.status(400).send({"error":"Parent is not a folder"});
                }
            }

            if (!data && type !== 'folder') {
                res.status(400).send('Missing type');
            }

            if (!isPublic) isPublic = false;

            const file = {
                userId,
                name,
                type,
                parentId,
                isPublic
            };

            if (type === 'folder') {
                await dbClient.filesCollection.insertOne(file);
                res.status(201).send(file);
            } else {
                const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
                const localPath = uuidv4();

                await fs.promises.mkdir(folderPath, { recursive: true})

                await fs.promises.writeFile(`${folderPath}/${localPath}`, base64.decode(data))

                file['localPath'] = `${folderPath}/${localPath}`;
                await dbClient.filesCollection.insertOne(file);
                res.status(201).send(file);
            }
        } catch(err) {
            console.error(err);
            res.status(401).send({"error":"Unauthorized"});
        }
    }
}
