import { MongoClient } from 'mongodb';

class DBClient {
    constructor() {
        this.host = process.env.DB_HOST || 'localhost';
        this.port = process.env.DB_PORT || 27017;
        this.database = process.env.DB_DATABASE || 'files_manager';
        this.url = `mongodb://${this.host}:${this.port}`;

        MongoClient.connect(this.url, { useUnifiedTopology: true }, (err, client) => {
            if (err) {
                console.error(err.message);
                this.isConnected = false;
            } else {
                this.db = client.db(this.database);
                this.usersCollection = this.db.collection('users');
                this.filesCollection = this.db.collection('files');
                this.isConnected = true;
            }
        })
    }
        // this.mongoClient = new MongoClient(this.url, { useUnifiedTopology: true });
        // this.isConnected = false;

        // this.mongoClient.connect()
        //     .then((client) => {
        //         // console.log(`Connected to the database: ${this.database}`);
        //         this.db = client.db(this.database);
        //         this.isConnected = true;
        //     })
        //     .catch((err) => {
        //         console.error(`Connection to MongoDB failed: ${err}`);
        //     })
        // this.mongoClient.on('close', () => {
        //     this.isConnected = false;
        //     console.log('MongoDB connection closed');
        // });

    isAlive() {
        return this.isConnected;
    }

    async nbUsers() {
        try {
            // const usersCollection = this.db.collection('users');
            const usersCount = await this.usersCollection.countDocuments();

            return usersCount;
        } catch(err) {
            console.log(err);
            return 0;
        }
    }

    async nbFiles() {
        try {
            // const usersCollection = this.db.collection('files');
            const filesCount = await this.usersCollection.countDocuments();
            return filesCount;
        } catch(err) {
            console.error(err);
            return 0;
        }
    }
}

const dbClient = new DBClient();
export default dbClient;
