import dbClient from "../utils/db";
import sha1 from 'sha1';
import redisClient from "../utils/redis";
const { ObjectId } = require('mongodb');


export default class UsersController {
    static async postNew(req, res) {
        const { email, password } = req.body;

        if (!email) {
            res.status(400).send({"error": "Missing email"});
        } else if (!password) {
            res.status(400).send({"error": "Missing password"});
        } else {
            const emailExist = await dbClient.db.collection('users').findOne({email});
            if (emailExist) res.status(400).send({"error": "Already exist"});
    
            const hashedPass = sha1(password);
    
            try {
                const newUser = await dbClient.db.collection('users')
                    .insertOne({email, hashedPass});
                res.status(201).send({"id": newUser.insertedId, "email": email});
            } catch(err) {
                res.status(500).send('Failed to add user');
            }
        }
    }

    static async getMe(req, res) {
        try {
            const token = req.header('X-Token');
            const key = `auth_${token}`;
            const userId = await redisClient.get(key);
            const userCursor = await dbClient.usersCollection
                        .find({_id: new ObjectId(userId)});
            const user = await userCursor.toArray();

            if (user.length === 0) {
                res.status(401).send({"error":"Unauthorized"});
            } else {
                res.status(200).send({"id": user[0]._id, "email": user[0].email});
            }
        } catch(err) {
            console.log(err);
            res.status(401).send({"error":"Unauthorized"});
        }
    }
}