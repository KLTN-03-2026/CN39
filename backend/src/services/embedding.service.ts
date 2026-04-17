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

  // Chuyển đổi văn bản thuần túy thành Không gian Vector (Local Embeddings - 384 dimensions)
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
  public searchResources = async (queryText: string, limit = 3) => {
    try {
      const queryVector = await this.generateEmbedding(queryText);
      
      const results = await databaseMongoClient.resources.aggregate([
        {
          $vectorSearch: {
            index: "vector_index", // QUAN TRỌNG: Phải khớp với tên Index tự tạo trên Atlas UI
            path: "embedding",
            queryVector: queryVector,
            numCandidates: 20,
            limit: limit
          }
        },
        {
          $project: {
            embedding: 0, // Ẩn chuỗi số mảng vector dài ngoằng đi
            score: { $meta: "vectorSearchScore" }
          }
        }
      ]).toArray();
      
      return results;
    } catch (error) {
      // Nếu collection resources rỗng hoặc chưa tạo vector_index trên Atlas → trả mảng rỗng
      // Agent sẽ tự gọi Tool searchWebForCourses để tìm tài nguyên mới
      console.warn("[RAG] Vector Search thất bại (collection rỗng hoặc chưa tạo index):", (error as Error).message);
      return [];
    }
  }
}

export const embeddingService = new EmbeddingService();
