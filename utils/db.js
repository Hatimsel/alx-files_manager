import { MongoClient } from 'mongodb';
import process from 'process';

class DBClient {
  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';
    this.url = `mongodb://${this.host}:${this.port}`;
    this.isConnected = false;

    MongoClient.connect(this.url, { useUnifiedTopology: true }, (err, client) => {
      if (err) {
        console.error(err.message);
      } else {
        this.db = client.db(this.database);
        this.usersCollection = this.db.collection('users');
        this.filesCollection = this.db.collection('files');
        this.isConnected = true;
      }
    });
  }

  isAlive() {
    return this.isConnected;
  }

  async nbUsers() {
    try {
      // const usersCollection = this.db.collection('users');
      const usersCount = await this.usersCollection.countDocuments();

      return usersCount;
    } catch (err) {
      console.log(err);
      return 0;
    }
  }

  async nbFiles() {
    try {
      // const usersCollection = this.db.collection('files');
      const filesCount = await this.filesCollection.countDocuments();
      return filesCount;
    } catch (err) {
      console.error(err);
      return 0;
    }
  }
}

const dbClient = new DBClient();
export default dbClient;
