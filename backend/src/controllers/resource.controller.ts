import { Request, Response } from 'express';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const dbName = process.env.DB_NAME || 'KLTN_AI-Career-RoadMap';

export class ResourceController {
  static async listResources(req: Request, res: Response) {
    const client = new MongoClient(uri);
    try {
      const { q, type, category, page = '0', limit = '20' } = req.query;
      const skip = parseInt(page as string) * parseInt(limit as string);
      const take = parseInt(limit as string);

      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection('resources');

      let query: any = {};
      
      // Filter by Search Term
      if (q) {
        query.$or = [
          { title: { $regex: q, $options: 'i' } },
          { tags: { $in: [new RegExp(q as string, 'i')] } }
        ];
      }

      // Filter by Type (Video, Document, etc.)
      if (type && type !== 'all') {
        query.type = { $regex: type, $options: 'i' };
      }

      // Filter by Category (Tags)
      if (category && category !== 'all') {
        if (!query.tags) query.tags = { $in: [] };
        query.tags.$in.push(new RegExp(category as string, 'i'));
      }

      const resources = await collection.find(query)
        .skip(skip)
        .limit(take)
        .toArray();

      const total = await collection.countDocuments(query);

      res.json({
        resources,
        total,
        page: parseInt(page as string),
        totalPages: Math.ceil(total / take)
      });
    } catch (error) {
      console.error('List resources error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } finally {
      await client.close();
    }
  }
}
