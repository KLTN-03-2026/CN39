import { Collection, Db, MongoClient } from 'mongodb';
import User from '~/models/schemas/User.schema';
import Roadmap from '~/models/schemas/Roadmap.schema';
import RoadmapTemplate from '~/models/schemas/RoadmapTemplate.schema';
import Topic from '~/models/schemas/Topic.schema';
import Resource from '~/models/schemas/Resource.schema';
import RequestToken from '~/models/schemas/RequestToken.schema';
import ChatMessage from '~/models/schemas/ChatMessage.schema';

const uri = process.env.MONGODB_URI as string;

class DatabaseMongoClient {
  private client: MongoClient;
  private db: Db;

  constructor() {
    this.client = new MongoClient(uri);
    this.db = this.client.db(process.env.DB_NAME);
  }

  async connect() {
    try {
      await this.db.command({ ping: 1 });
      console.log('Pinged your deployment. You successfully connected to MongoDB!');

      // Indexing — Sử dụng Native Driver để tối ưu hiệu suất
      await this.users.createIndex({ email: 1 }, { unique: true });
      await this.roadmaps.createIndex({ userId: 1 });
      await this.chat_messages.createIndex({ roadmap_id: 1, topic_id: 1 });
      await this.request_tokens.createIndex({ token: 1 });
      await this.request_tokens.createIndex({ user_id: 1 });
      
      // Index cho collection topics
      await this.topics.createIndex({ roadmapId: 1 });
      await this.topics.createIndex({ parentId: 1 });
      await this.topics.createIndex({ roadmapId: 1, parentId: 1 });
      await this.topics.createIndex({ oldId: 1 });

      // Index cho resources
      await this.resources.createIndex({ type: 1 });
      await this.resources.createIndex({ tags: 1 });
      await this.resources.createIndex({ topic_id: 1 });
      console.log('[Database] Index đã thiết lập thành công.');

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

  get resources(): Collection<Resource> {
    return this.db.collection('resources');
  }

  get chat_messages(): Collection<ChatMessage> {
    return this.db.collection('chat_messages');
  }

  get request_tokens(): Collection<RequestToken> {
    return this.db.collection('request_tokens');
  }

  get roadmapTemplates(): Collection<RoadmapTemplate> {
    return this.db.collection('roadmap_templates');
  }

  get topics(): Collection<Topic> {
    return this.db.collection('topics');
  }
}

export const databaseMongoClient = new DatabaseMongoClient();
