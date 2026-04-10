import { search, SafeSearchType } from 'duck-duck-scrape';
import { embeddingService } from '~/services/embedding.service';
import Resource from '~/models/schemas/Resource.schema';
import { databaseMongoClient } from '~/services/database.services';

class ToolService {
  // Hành động Trình Duyệt: Đại diện Agent LLM bay lên Web tìm kiếm thật
  public searchWeb = async (query: string) => {
    try {
      console.log(`[Agent] Đang bật Tool Cú Cú tìm kiếm Web với từ khóa: "${query}"...`);
      
      const searchResults = await search(query, { safeSearch: SafeSearchType.MODERATE });
      
      // Lấy 3 kết quả uy tín nhất (tránh Agent bị ngộp Data Context)
      const topResults = searchResults.results.slice(0, 3).map(res => ({
        title: res.title,
        url: res.url,
        description: res.description
      }));

      // Tự nâng cấp Bản Thân (Self-Populating RAG Schema): 
      // Nạp chính những khóa học Agent vừa mò ra vào "Trí nhớ ngắn hạn Vector" cho các đời sau
      for (const item of topResults) {
        // Chỉ lưu tài liệu / Khóa học tiềm năng
        if (item.url.includes("youtube.com") || item.url.includes("udemy.com") || item.url.includes("docs") || item.url.includes("learn")) {
           try {
              const existing = await databaseMongoClient.resources.findOne({ url: item.url });
              if (!existing) {
                 // Ép Vector Nhúng
                 const vector = await embeddingService.generateEmbedding(`${item.title} - ${item.description}`);
                 const newResource = new Resource({
                    title: item.title,
                    url: item.url,
                    description: item.description,
                    type: item.url.includes("youtube") ? "youtube" : "course",
                    tags: query.split(" ").filter(w => w.length > 2), // Lọc bớt tag rác
                    embedding: vector
                 });
                 await databaseMongoClient.resources.insertOne(newResource);
                 console.log(`\n🤖 [RAG Engine] BỘ NÃO TỰ HỌC: Đã học chèn siêu tài nguyên "${item.title}" vào Database thành công!`);
              }
           } catch {
             // Im lặng bỏ qua nếu hết rate limit API Embedding
           }
        }
      }

      return topResults;
    } catch (err) {
      console.error("[Agent] Lỗi khi chạy công cụ tìm kiếm Web:", err);
      // Trả bộ rỗng, Agent sẽ tự xoay sở
      return [{ title: "Lỗi kết nối Web", url: "", description: "Hãy gán các Resource giả lập chung chung kèm cảnh báo." }];
    }
  }
}
export const toolService = new ToolService();
