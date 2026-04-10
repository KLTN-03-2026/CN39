import { GoogleGenerativeAI } from '@google/generative-ai';
import { databaseMongoClient } from '~/services/database.services';

class EmbeddingService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("LỖI NGHIÊM TRỌNG: Thiếu biến môi trường GEMINI_API_KEY trong EmbeddingService. Vui lòng kiểm tra file .env!");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  // Chuyển đổi văn bản thuần túy thành Không gian Vector (Embeddings)
  public generateEmbedding = async (text: string): Promise<number[]> => {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-embedding-2-preview" });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error("Lỗi tạo Embedding:", error);
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
