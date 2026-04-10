import { GoogleGenerativeAI, FunctionDeclaration, SchemaType, ChatSession } from '@google/generative-ai';
import { databaseMongoClient } from '~/services/database.services';
import Roadmap from '~/models/schemas/Roadmap.schema';
import { ObjectId } from 'mongodb';

// 1. Khai báo Function Tool cho Gemini (Agent Action)
const generateSkillTreeDeclaration: FunctionDeclaration = {
  name: "generateSkillTree",
  description: "Trình kích hoạt hành động! Gọi CÔNG CỤ NÀY khi mục đích của ứng viên là yêu cầu CẤP hoặc VẼ MỘT LỘ TRÌNH mới. Bạn phải đẩy đủ dữ liệu lộ trình vào đây.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      targetRole: { type: SchemaType.STRING, description: "Vị trí ứng viên nhắm tới" },
      level: { type: SchemaType.STRING, description: "Trình độ đánh giá (Ví dụ: Intern, Fresher)" },
      phases: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            phaseName: { type: SchemaType.STRING },
            duration: { type: SchemaType.STRING },
            topics: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  topicId: { type: SchemaType.STRING },
                  title: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  isCompleted: { type: SchemaType.BOOLEAN },
                  isRequired: { type: SchemaType.BOOLEAN, description: "true = Khuyến nghị bắt buộc, false = Tuỳ chọn bổ sung" },
                  resources: {
                    type: SchemaType.ARRAY,
                    description: "ĐÂY LÀ PHẦN LẤY TỪ RAG. Đảm bảo URL là thật 100%.",
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        type: { type: SchemaType.STRING },
                        url: { type: SchemaType.STRING },
                        label: { type: SchemaType.STRING },
                        isPremium: { type: SchemaType.BOOLEAN }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    required: ["targetRole", "level", "phases"]
  }
};

// 1.5. Khai báo Function Tool duyệt Web
const searchWebDeclaration: FunctionDeclaration = {
  name: "searchWebForCourses",
  description: "TRÌNH DUYỆT WEB TỰ ĐỘNG! Gọi công cụ này KHI BẠN KHÔNG CÓ SẴN (hoặc cạn kiệt) URL thật trong Context RAG để gán vào Roadmap, hoặc khi muốn lướt mạng để tìm khóa học mới nhất. Bạn CÓ THỂ GỌI TOOL NÀY NHIỀU LẦN để dò tìm URL cho từng chủ đề (Ví dụ: HTML, AWS).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: "Từ khóa tra cứu (Ví dụ: 'AWS course youtube', 'ReactJS docs')" }
    },
    required: ["query"]
  }
};

class AIService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("LỖI NGHIÊM TRỌNG: Thiếu biến môi trường GEMINI_API_KEY. Vui lòng thêm vào file .env!");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  // Model đơn giản cho AI Tutor chatbox (không cần tools)
  public getModel = () => {
    return this.genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
  }

  // 2. Khởi tạo một Phiên Chat (Agent Session) Độc lập
  public createAgentSession = (): ChatSession => {
    const systemInstruction =
      "Bạn là Agent Mentor AI chuyên tạo lộ trình học lập trình. " +
      "Khi được yêu cầu, hãy GỌI TOOL 'generateSkillTree' NGAY LẬP TỨC với đầy đủ resources cho mỗi topic. " +
      "Bạn ĐƯỢC PHÉP dùng URL chính thức nổi tiếng (reactjs.org, nodejs.org, developer.mozilla.org, youtube.com, udemy.com, freecodecamp.org). " +
      "Mỗi topic phải có TỐI THIỂU 2-3 resources gồm: article/docs, video YouTube, và course. " +
      "YÊU CẦU CHẤT LƯỢNG LINK: TUYỆT ĐỐI chỉ chọn các tài liệu, video có NĂM SẢN XUẤT MỚI NHẤT (ưu tiên 2023, 2024), LƯỢT VIEW CAO để đảm bảo không bị lỗi thời. " +
      "Mỗi topic phải có trường isRequired: true (khuyến nghị bắt buộc) hoặc false (tuỳ chọn bổ sung). " +
      "Mỗi Phase nên có 2-3 topic khuyến nghị + 1-2 topic tuỳ chọn. " +
      "CHỈ gọi 'searchWebForCourses' khi được yêu cầu cụ thể, KHÔNG tự ý gọi.";

    const model = this.genAI.getGenerativeModel({ 
      model: "gemini-3.1-flash-lite-preview",
      systemInstruction,
      tools: [
        { functionDeclarations: [generateSkillTreeDeclaration, searchWebDeclaration] }
      ]
    });

    return model.startChat();
  }

  // 3. Xử lý Logic Code cho cú Functional Call (Post-process + Lưu DB)
  public async executeAgentAction(functionCallArgs: any, userId: string) {
    if(!functionCallArgs || !functionCallArgs.phases) return null;

    // Post-process: Thay thế TẤT CẢ link YouTube bịa đặt bằng video thật từ yt-search
    // @ts-ignore
    const ytSearch = (await import('yt-search')).default;
    let ytVideoIndex = 0; // Tránh trùng video giữa các topic

    for (const phase of functionCallArgs.phases) {
       for (const topic of phase.topics) {
          if (!topic.resources || !Array.isArray(topic.resources)) continue;
          
          for (const r of topic.resources) {
             const isYouTubeLink = r.url === 'NEED_SEARCH_YT' 
                || (r.url && r.url.includes('youtube.com'))
                || (r.url && r.url.includes('youtu.be'))
                || r.type?.toLowerCase() === 'video';

             if (isYouTubeLink) {
                try {
                   const query = `${topic.title} ${r.label || ''} tutorial 2024`;
                   console.log(`[YT-Search] Tìm video thật cho: "${query}"`);
                   const ytRes = await ytSearch(query);
                   
                   if (ytRes?.videos?.length > 0) {
                      // Lọc video > 3 phút (tránh shorts) và chọn video có view cao
                      const validVideos = ytRes.videos
                         .filter((v: any) => v.seconds > 180)
                         .sort((a: any, b: any) => (b.views || 0) - (a.views || 0));
                      
                      // Lấy video theo index để tránh trùng lặp giữa các resource
                      const pick = validVideos[ytVideoIndex % validVideos.length] || ytRes.videos[0];
                      r.url = pick.url;
                      r.label = r.label || pick.title;
                      ytVideoIndex++;
                   } else {
                      r.url = `https://www.youtube.com/results?search_query=${encodeURIComponent(topic.title)}`;
                   }
                } catch (e) {
                   console.error(`[YT-Search] Lỗi khi tìm: ${r.label}`, e);
                   r.url = `https://www.youtube.com/results?search_query=${encodeURIComponent(topic.title)}`;
                }
             }
          }
       }
    }

    const newRoadmap = new Roadmap({
      userId: new ObjectId(userId),
      targetRole: functionCallArgs.targetRole,
      level: functionCallArgs.level,
      phases: functionCallArgs.phases
    });

    const result = await databaseMongoClient.roadmaps.insertOne(newRoadmap);
    return { 
      message: "Data has been successfully saved to DB", 
      roadmapId: result.insertedId 
    };
  }
}

export const aiService = new AIService();
