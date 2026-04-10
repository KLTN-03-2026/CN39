import { Collection, Db, MongoClient } from 'mongodb';
import User from '~/models/schemas/User.schema';
import Roadmap from '~/models/schemas/Roadmap.schema';
import Resource from '~/models/schemas/Resource.schema';

const uri = process.env.MONGODB_URI as string;

class DatabaseMongoClient {
  private client: MongoClient;
  private db: Db;

  constructor() {
    this.client = new MongoClient(uri);
    // process.env.DB_NAME or defaults to 'ai_career_roadmap'
    this.db = this.client.db(process.env.DB_NAME);
  }

  async connect() {
    try {
      await this.db.command({ ping: 1 });
      console.log('Pinged your deployment. You successfully connected to MongoDB!');

      // Indexing logic
      await this.users.createIndex({ email: 1 }, { unique: true });
      await this.db.collection('roadmaps').createIndex({ userId: 1 });
      await this.db.collection('chat_messages').createIndex({ roadmapId: 1 });

    } catch (error) {
      console.log('MongoDB connection error:', error);
      throw error;
    }
  }

  get users(): Collection<User> {
    return this.db.collection('users');
  }

  get roadmaps(): Collection<Roadmap> {
    return this.db.collection('roadmaps');
  }

  get resources(): Collection<any> {
    return this.db.collection('resources');
  }

  get chat_messages(): Collection<any> {
    return this.db.collection('chat_messages');
  }
}

export const databaseMongoClient = new DatabaseMongoClient();
