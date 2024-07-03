import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import base64 from 'base-64';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import process from 'process';
import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import path from 'path';
import Bull from 'bull';

const fileQueue = new Bull('fileQueue', {
    redis: {
        host: '127.0.0.1',
        port: 6379
    }
});

export default class FilesController {
    static async postUpload(req, res) {
        const token = req.header('X-Token');
        const key = `auth_${token}`;
        try {
            const userId = await redisClient.get(key);
            if (!userId) {
                return res.status(401).send({ error: "Unauthorized" });
            }

            let { name, type, parentId, isPublic, data } = req.body;
            const acceptedTypes = ['folder', 'file', 'image'];
            
            if (!name) {
                return res.status(400).send({ error: "Missing file" });
            }

            if (!type || acceptedTypes.indexOf(type) === -1) {
                return res.status(400).send({ error: "Missing type" });
            }

            if (!parentId) {
                parentId = 0;
            } else {
                const parent = await dbClient.filesCollection.findOne({ _id: ObjectId(parentId) });
                if (!parent) {
                    return res.status(400).send({ error: "Parent not found" });
                }
                if (parent.type !== 'folder') {
                    return res.status(400).send({ error: "Parent is not a folder" });
                }
            }

            if (!data && type !== 'folder') {
                return res.status(400).send({ error: "Missing data" });
            }

            if (isPublic === undefined) isPublic = false;

            const file = {
                userId: ObjectId(userId),
                name,
                type,
                parentId,
                isPublic
            };

            if (type === 'folder') {
                const result = await dbClient.filesCollection.insertOne(file);
                file._id = result.insertedId;

                const fileToReturn = { ...file, id: file._id };
                delete fileToReturn._id;
                return res.status(201).send(fileToReturn);
            } else {
                const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
                const localPath = `${folderPath}/${uuidv4()}`;

                await fs.promises.mkdir(folderPath, { recursive: true})

                await fs.promises.writeFile(localPath, Buffer.from(data, 'base64'))

                file['localPath'] = localPath;
                const result = await dbClient.filesCollection.insertOne(file);
                file._id = result.insertedId;

                if (type === 'image') {
                    fileQueue.add({ userId: file.userId, fileId: file._id });
                }

                const fileToReturn = { ...file, id: file._id };
                delete fileToReturn._id;
                delete fileToReturn.localPath;

                return res.status(201).send(fileToReturn);
            }
        } catch(err) {
            console.error(err);
            return res.status(401).send({ error: "Unauthorized" });
        }
    }

    static async getShow(req, res) {
        const { id } = req.params;
        const token = req.header('X-Token');
        const key = `auth_${token}`;

        try {
            const userId = await redisClient.get(key);
            if (!userId) {
                return res.status(401).send({ error: "Unauthorized" });
            }

            const file = await dbClient.filesCollection.findOne({
                _id: new ObjectId(id),
                userId: new ObjectId(userId)
            });

            if (!file) {
                return res.status(404).send({ error: "Not found" });
            }

            const { _id, ...rest } = file;
            const responseFile = { id: _id, ...rest };

            delete responseFile.localPath;
            return res.status(200).send(responseFile);
        } catch(err) {
            console.error(err);
            return res.status(401).send({ error: "Unauthorized" });
        }
    }

    static async getIndex(req, res) {
        const parentId  = req.query.parentId || 0;
        const page = parseInt(req.query.page, 10) || 0;
        const pageSize = 20;
        const token = req.header('X-Token');
        const key = `auth_${token}`;

        try {
            const userId = await redisClient.get(key);
            if (!userId) {
                return res.status(401).send({ error: "Unauthorized" });
            }

            const query = { parentId };

            const filesCursor = await dbClient.filesCollection.find(query,
                { projection: { localPath: 0 } }
            )
                .skip(page * pageSize)
                .limit(pageSize);
    
            const files = await filesCursor.toArray();
    
            const resultFiles = files.map(file => {
                // delete file.localPath;
                const { _id, ...rest } = file;
                return { id: _id, ...rest };
            });
    
            res.status(200).send(resultFiles);
        } catch (err) {
            console.error(err);
            return res.status(401).send({ error: "Unauthorized" });
        }
    }

    static async putPublish(req, res) {
        const { id } = req.params;
        const token = req.header('X-Token');
        const key = `auth_${token}`;
        try {
            const userId = await redisClient.get(key);
            if (!userId) {
                return res.status(401).send({ error: "Unauthorized" });
            }

            const result = await dbClient.filesCollection.updateOne(
                { userId: new ObjectId(userId), _id: new ObjectId(id) },
                { $set: { isPublic: true } }
            );

            if (result.modifiedCount === 0) {
                return res.status(404).send({ error: "Not found"});
            }

            const updatedFile = await dbClient.filesCollection.findOne(
                { userId: new ObjectId(userId), _id: new ObjectId(id) },
                { projection: { localPath: 0 } }
            );

            const { _id, ...rest } = updatedFile;
            const responseFile = { id: _id, ...rest };

            return res.status(200).send(responseFile);
        } catch (err) {
            console.error(err);
            return res.status(401).send({ error: "Unauthorized"});
        }
    }

    static async putUnpublish(req, res) {
        const { id } = req.params;
        const token = req.header('X-Token');
        const key = `auth_${token}`;

        try {
            const userId = await redisClient.get(key);
            if (!userId) {
                return res.status(401).send({ error: "Unauthorized" });
            }

            const result = await dbClient.filesCollection.updateOne(
                { userId: new ObjectId(userId), _id: new ObjectId(id) },
                { $set: { isPublic: false } }
            );

            if (result.modifiedCount === 0) {
                return res.status(404).send({ error: "Not found" });
            }

            const updatedFile = await dbClient.filesCollection.findOne(
                { userId: new ObjectId(userId), _id: new ObjectId(id) },
                { projection: { localPath: 0 } }
            );
            const { _id, ...rest } = updatedFile;
            const responseFile = { id: _id, ...rest };
            return res.status(200).send(responseFile);
        } catch (err) {
            console.error(err);
            return res.status(401).send({ error: "Unauthorized" });
        }
    }

    static async getFile(req, res) {
        const { id } = req.params;
        const { size } = req.query;
        
        try {
            const _id = new ObjectId(id);
            const file = await dbClient.filesCollection.findOne({ _id });
            if (!file) {
                console.log(file);
                return res.status(404).send({ error: "Not found" });
            }

            if (!file.isPublic) {
                const token = req.header('X-Token');
                const userId = await redisClient.get(`auth_${token}`);
                if (!userId) { //|| file.userId !== userId) {
                    console.log(userId);
                    console.log(file.userId);
                    console.log('ispublic');
                    return res.status(404).send({ error: "Not found" });
                }
            }

            if (file.type === 'folder') {
                return res.status(400).send({ error: "A folder doesn't have content" });
            }

            let filePath = file.localPath;
            if (size) {
                const sizes = ['500', '250', '100'];
                if (!sizes.includes(size)) {
                    return res.status(400).send({ error: "Invalid size" });
                }
                filePath = `${filePath}_${size}`;
            }

            if (!fs.existsSync(filePath)) {
                return res.status(404).send({ error: "Not found" });
            }

            const mimeType = mime.lookup(filePath);
            res.set('Content-Type', mimeType);
            const data = await fs.promises.readFile(filePath);
            return res.status(200).send(data);

            // fs.readFile(filePath, 'utf8', (err, data) => {
            //     if (err) {
            //         console.error(err);
            //         return res.status(404).send({ error: "Not found" });
            //     }
            //     const mimeType = mime.contentType(file.name);
            //     res.set('Content-Type', mimeType);
            //     return res.status(200).send(data);
            // })
        } catch(err) {
            console.error(err);
            return res.status(404).send({ error: "Not found" });
        }
    }
}
