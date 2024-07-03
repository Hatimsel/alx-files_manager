import dbClient from "../utils/db";
import sha1 from 'sha1';
import redisClient from "../utils/redis";
import ObjectId from 'mongodb';


export default class UsersController {
    static async postNew(req, res) {
        const { email, password } = req.body;

        if (!email) {
            return res.status(400).send({"error": "Missing email"});
        } else if (!password) {
            return res.status(400).send({"error": "Missing password"});
        } else {
            const emailExist = await dbClient.db.collection('users').findOne({email});
            if (emailExist) {
                return res.status(400).send({"error": "Already exist"});
            }

            const hashedPass = sha1(password);
            try {
                const newUser = await dbClient.db.collection('users')
                    .insertOne({email, password: hashedPass});
                return res.status(201).send({"id": newUser.insertedId, "email": email});
            } catch(err) {
                console.log(err);
                return res.status(401).send('Failed to add user');
            }
        }
    }

    static async getMe(req, res) {
        try {
            const token = req.header('X-Token');
            const key = `auth_${token}`;
            const userId = await redisClient.get(key);
            const user = await dbClient.usersCollection.findOne(
                { _id: new ObjectId(userId) }
            );
            
            if (user) {
                return res.status(200).send({"id": userId, "email": user.email});
            } else {
                return res.status(401).send({"error":"Unauthorized"});
            }
        } catch(err) {
            console.log(err);
            return res.status(401).send({"error":"Unauthorized"});
        }
    }
}
