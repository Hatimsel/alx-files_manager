import { MongoClient } from 'mongodb';

class DBClient {
    constructor() {
        this.host = process.env.DB_HOST || 'localhost';
        this.port = process.env.DB_PORT || 27017;
        this.database = process.env.DB_DATABASE || 'files_manager';
        this.url = `mongodb://${this.host}:${this.port}`;

        this.mongoClient = new MongoClient(this.url, { useUnifiedTopology: true });
        this.mongoClient.connect()
            .then((client) => {
            this.db = client.db(this.database);
        })
        .catch((err) => {
            console.error(`Connection to MongoDB failed: ${err}`);
        })
    }

    isAlive() {
        return this.mongoClient.isConnected();
    }

    async nbUsers() {
        try {
            const collection = this.db.collection('users');
            const users = await collection.countDocuments();

            return users;
        } catch(err) {
            console.log(err);
            return 0;
        }
    }

    async nbFiles() {
        try {
            const collection = this.db.collection('files');
            const files = await collection.countDocuments();

            return files;
        } catch(err) {
            console.error(err);
            return 0;
        }
    }
}

const dbClient = new DBClient();
export default dbClient;
