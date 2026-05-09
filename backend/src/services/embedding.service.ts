import { pipeline } from '@xenova/transformers';
import { databaseMongoClient } from '~/services/database.services';
import { ObjectId } from 'mongodb';

class EmbeddingService {
  private embedder: any = null;

  constructor() {}

  // Khởi tạo mô hình Local AI (chỉ tải 1 lần)
  private async getEmbedder() {
    if (!this.embedder) {
      this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return this.embedder;
  }

  // Chuyển đổi văn bản thành Vector Embedding (384 dimensions)
  public generateEmbedding = async (text: string): Promise<number[]> => {
    try {
      const embedder = await this.getEmbedder();
      const output = await embedder(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    } catch (error) {
      console.error("Lỗi tạo Local Embedding:", error);
      throw error;
    }
  }

  /**
   * Tìm resources theo topicOldId — Direct lookup (nhanh, chính xác)
   * Fallback: Vector search nếu direct lookup không đủ
   */
  public searchByTopic = async (query: string, topicOldId: string, limit = 5) => {
    try {
      // 1. Direct lookup: Tìm topic → lấy resourceIds → query resources
      const topic = await databaseMongoClient.topics.findOne({ oldId: topicOldId });
      let results: any[] = [];

      if (topic && topic.resourceIds?.length > 0) {
        results = await databaseMongoClient.resources.find(
          { _id: { $in: topic.resourceIds.map((id: any) => new ObjectId(id)) } },
          { projection: { embedding: 0 } }
        ).limit(limit).toArray();
      }

      // 2. Nếu direct lookup không đủ → bổ sung bằng text search theo topic_id
      if (results.length < limit && topicOldId) {
        const textResults = await databaseMongoClient.resources.find(
          { topic_id: topicOldId, _id: { $nin: results.map(r => r._id) } },
          { projection: { embedding: 0 } }
        ).limit(limit - results.length).toArray();
        results.push(...textResults);
      }

      // 3. Nếu vẫn thiếu → fallback vector search
      if (results.length < limit) {
        const vectorResults = await this.searchResources(query, limit - results.length);
        const existingIds = new Set(results.map(r => r._id.toString()));
        for (const vr of vectorResults) {
          if (!existingIds.has(vr._id.toString())) {
            results.push(vr);
          }
        }
      }

      return results.slice(0, limit);
    } catch (error) {
      console.warn('[RAG] searchByTopic thất bại:', (error as Error).message);
      return [];
    }
  }

  // Truy vấn Vector trên MongoDB Atlas (RAG)
  public searchResources = async (queryText: string, limit = 3) => {
    try {
      const queryVector = await this.generateEmbedding(queryText);
      
      const results = await databaseMongoClient.resources.aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector: queryVector,
            numCandidates: 20,
            limit: limit
          }
        },
        {
          $project: {
            embedding: 0,
            score: { $meta: "vectorSearchScore" }
          }
        }
      ]).toArray();
      
      return results;
    } catch (error) {
      console.warn("[RAG] Vector Search thất bại:", (error as Error).message);
      return [];
    }
  }
}

export const embeddingService = new EmbeddingService();
