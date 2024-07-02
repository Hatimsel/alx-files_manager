import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import base64 from 'base-64';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import process from 'process';
import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import path from 'path';

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
                const result = await dbClient.filesCollection.insertOne(file);
                file._id = result.insertedId;

                const fileToReturn = { ...file, id: file._id };
                delete fileToReturn._id;
                res.status(201).send(fileToReturn);
            } else {
                const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
                const localPath = uuidv4();

                await fs.promises.mkdir(folderPath, { recursive: true})

                await fs.promises.writeFile(`${folderPath}/${localPath}`, base64.decode(data))

                file['localPath'] = `${folderPath}/${localPath}`;
                const result = await dbClient.filesCollection.insertOne(file);
                file._id = result.insertedId;
                const fileToReturn = { ...file, id: file._id };
                delete fileToReturn._id;
                delete fileToReturn.localPath;

                res.status(201).send(fileToReturn);
            }
        } catch(err) {
            console.error(err);
            res.status(401).send({"error":"Unauthorized"});
        }
    }

    static async getShow(req, res) {
        const { id } = req.params;
        // console.log(req.params);
        // console.log(id);

        const token = req.header('X-Token');
        const key = `auth_${token}`;
        try {
            const userId = await redisClient.get(key);
            if (!userId) {
                return res.status(401).send({"error":"Unauthorized"});
            }

            const file = await dbClient.filesCollection.findOne({
                _id: new ObjectId(id),
                userId
            })
            if (!file) {
                return res.status(404).send({"error":"Not found"});
            }

            const { _id, ...rest } = file;
            const responseFile = { id: _id, ...rest };

            delete responseFile.localPath;
            res.status(200).send(responseFile);
        } catch(err) {
            console.log(err);
            res.status(401).send({"error":"Unauthorized"});
        }
    }

    static async getIndex(req, res) {
        const { parentId, page } = req.query;
        const token = req.header('X-Token');
        const key = `auth_${token}`;
        try {
            const userId = await redisClient.get(key);
            if (!userId) {
                return res.status(401).send({ "error": "Unauthorized" });
            }
    
            const pageNumber = parseInt(page, 10) || 0;
            const query = { userId };
            if (parentId) {
                query.parentId = parentId;
            }
    
            const filesCursor = await dbClient.filesCollection.find(query)
                .skip(pageNumber * 20)
                .limit(20);
    
            const files = await filesCursor.toArray();
    
            const resultFiles = files.map(file => {
                delete file.localPath;
                const { _id, ...rest } = file;
                return { id: _id, ...rest };
            });
    
            res.status(200).send(resultFiles);
        } catch (err) {
            console.error(err);
            res.status(401).send({ error: "Unauthorized"});
        }
    }

    static async putPublish(req, res) {
        const { id } = req.params;
        const token = req.header('X-Token');
        const key = `auth_${token}`;
        try {
            const _id = ObjectId(id);
            const userId = await redisClient.get(key);
            if (!userId) {
                return res.status(401).send({ error: "Unauthorized" });
            }

            const result = await dbClient.filesCollection.updateOne(
                { userId, _id },
                { $set: { isPublic: true } }
            );

            if (result.modifiedCount === 0) {
                res.status(404).send({ error: "Not found"});
            }

            const updatedFile = await dbClient.filesCollection.findOne(
                { userId, _id },
                { projection: { localPath: 0 } }
            );

            res.status(200).send(updatedFile);
            // if (updatedFile) {
            //     delete updatedFile.localPath;
            //     res.status(200).send(updatedFile);
            // }
        } catch (err) {
            console.error(err);
            res.status(401).send({ error: "Unauthorized"});
        }
    }

    static async putUnpublish(req, res) {
        const { id } = req.params;
        const token = req.header('X-Token');
        const key = `auth_${token}`;

        try {
            const _id = ObjectId(id);
            const userId = await redisClient.get(key);
            if (!userId) {
                return res.status(401).send({ error: "Unauthorized" });
            }

            const result = await dbClient.filesCollection.updateOne(
                { userId, _id },
                { $set: { isPublic: false } }
            );

            if (result.modifiedCount === 0) {
                res.status(404).send({ error: "Not found" });
            }

            const updatedFile = await dbClient.filesCollection.findOne(
                { userId, _id },
                { projection: { localPath: 0 } }
            );

            res.status(200).send(updatedFile);
            // if (updatedFile) {
            //     delete updatedFile.localPath;
            //     res.status(200).send(updatedFile);
            // }
        } catch (err) {
            console.error(err);
            res.status(401).send({ error: "Unauthorized" });
        }
    }

    static async getFile(req, res) {
        const { id } = req.params;
        
        try {
            const _id = ObjectId(id);
            const file = await dbClient.filesCollection.findOne({ _id });
            if (!file) {
                return res.status(404).send({ error: "Not found" });
            }

            if (!file.isPublic) {
                const token = req.header('X-Token');
                const userId = token ? await redisClient.get(`auth_${token}`) : null;
                if (!userId || userId !== file.userId) {
                    return res.status(404).send({ error: "Not found" });
                }
            }

            if (file.type === 'folder') {
                return res.status(400).send({ error: "A folder doesn't have content" });
            }

            const filePath = path.resolve(file.localPath);

            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    console.error(err);
                    return res.status(404).send({ error: "Not found" });
                }
                const mimeType = mime.lookup(file.name);
                res.set('Content-Type', mimeType);
                res.status(200).send(data);
            })
        } catch(err) {
            console.error(err);
            res.status(404).send({ error: "Not found" });
        }
    }
}
