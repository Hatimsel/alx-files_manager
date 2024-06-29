import sha1 from 'sha1';
import base64 from 'base-64';
import utf8 from 'utf8';
import dbClient from '../utils/db';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';

export default class AuthController {
    static async getConnect(req, res) {
        const Authorization = req.header('Authorization');
        let credentials = Authorization.split(' ')[1];
        credentials = base64.decode(credentials);
        credentials = utf8.decode(credentials);
        credentials = credentials.split(':');

        const email = credentials[0];
        const hashedPass = sha1(credentials[1]);

        try {
            const user = await dbClient.db.collection('users')
                        .findOne({email, hashedPass});
            const token = uuidv4();
            const key = `auth_${token}`;
            const duration = 86400;

            redisClient.set(key, user._id.toString(), duration);

            res.status(200).send({"token":token});
        } catch(err) {
            console.log(err);
            res.status(401).send({"error":"Unauthorized"});
        }
    }

    static async getDisconnect(req, res) {
        const token = req.header('X-Token');
        const key = `auth_${token}`;
        try {
            await redisClient.del(key);
            res.status(204).send();
        } catch(err) {
            console.log(err);
            res.status(401).send({"error":"Unauthorized"});
        }
    }
}
