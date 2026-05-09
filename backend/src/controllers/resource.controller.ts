import { Request, Response } from 'express';
import { databaseMongoClient } from '~/services/database.services';

export class ResourceController {
  static async listResources(req: Request, res: Response) {
    try {
      const { q, type, category, page = '0', limit = '20' } = req.query;
      const skip = parseInt(page as string) * parseInt(limit as string);
      const take = parseInt(limit as string);

      // Mặc định luôn ẩn các skill roadmap (type = 'roadmap')
      let query: any = { type: { $ne: 'roadmap' } };

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

      // Filter by Category (Tags / topic_id)
      if (category && category !== 'all') {
        query.topic_id = { $regex: category, $options: 'i' };
      }

      const resources = await databaseMongoClient.resources.find(query, {
        projection: { embedding: 0 } // Ẩn vector embedding dài ngoằng
      })
        .skip(skip)
        .limit(take)
        .toArray();

      const total = await databaseMongoClient.resources.countDocuments(query);

      res.json({
        resources,
        total,
        page: parseInt(page as string),
        totalPages: Math.ceil(total / take)
      });
    } catch (error) {
      console.error('List resources error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}
