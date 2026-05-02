import { pipeline } from '@xenova/transformers';
import { databaseMongoClient } from '~/services/database.services';

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

  // Chuyển đổi văn bản thuần túy thành Không gian Vector
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

  // Truy vấn Vector trên MongoDB Atlas (RAG)
  public searchResources = async (queryText: string, limit = 5) => {
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

  // Tìm kiếm tài nguyên theo ngữ cảnh Topic (Context-Aware RAG cho Chatbox)
  public searchByTopic = async (queryText: string, topicKeyword: string, limit = 5) => {
    try {
      const queryVector = await this.generateEmbedding(queryText);
      
      // Filter theo topic_id trước, sau đó vector search trong kết quả đó (nếu Atlas hỗ trợ pre-filter)
      // Hoặc đơn giản là query theo topic_id nếu không muốn dùng vector
      const results = await databaseMongoClient.resources.find(
        { topic_id: topicKeyword },
        { projection: { embedding: 0 }, limit: limit }
      ).toArray();

      if (results.length > 0) return results;

      // Nếu không tìm thấy theo topic_id, fallback về vector search toàn cục
      return this.searchResources(queryText, limit);
    } catch (error) {
      console.error("Lỗi searchByTopic:", error);
      return [];
    }
  }
}

export const embeddingService = new EmbeddingService();
