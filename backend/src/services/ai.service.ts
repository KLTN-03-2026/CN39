import { GoogleGenAI, Type } from '@google/genai';
import { databaseMongoClient } from '~/services/database.services';
import Roadmap from '~/models/schemas/Roadmap.schema';
import { ObjectId } from 'mongodb';

// 1. Khai báo Function Tool cho Gemini (Agent Action)
const generateSkillTreeDeclaration: any = {
  name: "generateSkillTree",
  description: "Trình kích hoạt hành động! Gọi CÔNG CỤ NÀY để vẽ Bản đồ Lộ trình (Roadmap) dựa trên Khoảng trống kỹ năng. TUYỆT ĐỐI KHÔNG vẽ các kỹ năng cơ bản mà User đã biết. CHỈ VẼ CÁC KỸ NĂNG CÒN THIẾU (ADVANCED SKILLS).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      targetRole: { type: Type.STRING, description: "Vị trí ứng viên nhắm tới" },
      level: { type: Type.STRING, description: "Trình độ đánh giá (Ví dụ: Intern, Fresher)" },
      phases: {
        type: Type.ARRAY,
        description: "Mảng danh sách TOÀN BỘ các Nhánh học nâng cao CÒN THIẾU. Sinh từ 6 đến 15 nhánh tuỳ theo độ khó của mục tiêu.",
        items: {
          type: Type.OBJECT,
          properties: {
            phaseName: { type: Type.STRING, description: "Tên Bài học chính (VD: Internet, HTML, CSS)" },
            duration: { type: Type.STRING },
            description: { type: Type.STRING, description: "Giải thích chi tiết về mốc bài học chính này" },
            isCompleted: { type: Type.BOOLEAN, description: "Luôn đặt false vì lộ trình này CHỈ chứa các kiến thức user CÒN THIẾT và CHƯA BIẾT." },
            resources: {
              type: Type.ARRAY,
              description: "Tài nguyên học tập cho Bài học chính này",
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  url: { type: Type.STRING },
                  label: { type: Type.STRING },
                  isPremium: { type: Type.BOOLEAN }
                }
              }
            },
            topics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topicId: { type: Type.STRING, description: "ID độc nhất (tiếng anh không dấu, vd: react-js, css-grid)" },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  isCompleted: { type: Type.BOOLEAN, description: "Luôn đặt false vì lộ trình ngầm định đã cắt bỏ kiến thức cũ, phần này chỉ toàn kiến thức cần học." },
                  isRequired: { type: Type.BOOLEAN, description: "true = Khuyến nghị bắt buộc (Khung chuẩn), false = Tuỳ chọn thay thế/Bổ sung (Alternative Options)" },
                  resources: {
                    type: Type.ARRAY,
                    description: "ĐÂY LÀ PHẦN LẤY TỪ RAG. Đảm bảo URL là thật 100%.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING },
                        url: { type: Type.STRING },
                        label: { type: Type.STRING },
                        isPremium: { type: Type.BOOLEAN }
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
const searchWebDeclaration: any = {
  name: "searchWebForCourses",
  description: "TRÌNH DUYỆT WEB TỰ ĐỘNG! Gọi công cụ này KHI BẠN KHÔNG CÓ SẴN (hoặc cạn kiệt) URL thật trong Context RAG để gán vào Roadmap, hoặc khi muốn lướt mạng để tìm khóa học mới nhất. Bạn CÓ THỂ GỌI TOOL NÀY NHIỀU LẦN để dò tìm URL cho từng chủ đề (Ví dụ: HTML, AWS).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "Từ khóa tra cứu (Ví dụ: 'AWS course youtube', 'ReactJS docs')" }
    },
    required: ["query"]
  }
};

class AIService {
  private genAI: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("LỖI NGHIÊM TRỌNG: Thiếu biến môi trường GEMINI_API_KEY. Vui lòng thêm vào file .env!");
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  // Xử lý Tin nhắn từ học viên đến AI Tutor (Có lịch sử hội thoại + Markdown output)
  public generateTutorReply = async (
    topic: string, 
    message: string, 
    chatHistory: { role: string; content: string }[] = []
  ): Promise<string> => {
    try {
      // Xây dựng mảng contents gồm lịch sử + tin nhắn mới (tối đa 10 tin gần nhất)
      const recentHistory = chatHistory.slice(-10);
      const contents = [
        ...recentHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' as const : 'model' as const,
          parts: [{ text: msg.content }]
        })),
        { role: 'user' as const, parts: [{ text: message }] }
      ];

      const response = await this.genAI.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents,
        config: {
          systemInstruction: 
            "Bạn là AI Tutor lập trình. Học viên hỏi về: " + topic + ".\n" +
            "QUY TẮC CỐT LÕI (Bắt buộc tuân thủ để đảm bảo tốc độ và trải nghiệm):\n" +
            "1. TRẢ LỜI CỰC KỲ NGẮN GỌN (Tối đa 2-3 câu). Vào thẳng vấn đề, không chào hỏi dài dòng.\n" +
            "2. CHỈ CUNG CẤP CODE khi thực sự cần thiết để minh hoạ. Nếu dùng code, PHẢI cực kỳ ngắn (1-3 dòng).\n" +
            "3. LUÔN format output bằng định dạng Markdown (dùng **in đậm**, `code inline`, và ``` ngôn ngữ)."
        }
      });
      return response.text || "Xin lỗi, tôi không thể trả lời lúc này.";
    } catch (e) {
      console.error("[AI Tutor Error]", e);
      return "Hệ thống AI đang bị gián đoạn, vui lòng thử lại sau.";
    }
  }

  // Khởi tạo một Phiên Chat (Agent Session) Độc lập với Tool Calling
  public createAgentSession = () => {
    const systemInstruction =
      "Bạn là Agent Mentor AI chuyên tạo lộ trình học lập trình chuyên sâu. " +
      "HÀNH ĐỘNG DUY NHẤT: GỌI TOOL 'generateSkillTree' NGAY LẬP TỨC. TUYỆT ĐỐI KHÔNG gọi 'searchWebForCourses'. " +
      "Bạn PHẢI tạo lộ trình với 8-15 Phases chuyên sâu. " +
      "MỖI PHASE CHỨA 5-8 TOPICS tách bạch — NGHIÊM CẤM gộp nhiều khái niệm vào 1 node (Cấm dùng dấu '/', 'và', '&' trong tên topic). " +
      "Mỗi Topic PHẢI có trường topicId (dạng slug tiếng Anh, ví dụ: 'react-js'), description, isRequired, và resources đầy đủ (1 article + 2 video + 1 course). " +
      "Bạn ĐƯỢC PHÉP dùng URL chính thức nổi tiếng (reactjs.org, nodejs.org, developer.mozilla.org, youtube.com, udemy.com, freecodecamp.org). " +
      "Video YouTube: dùng url 'NEED_SEARCH_YT' để hệ thống ngầm tự tìm. ĐỪNG bịa link YouTube. " +
      "Mỗi topic phải có trường isRequired: true (khuyến nghị bắt buộc) hoặc false (tuỳ chọn thay thế/bổ sung). " +
      "TUYỆT ĐỐI KHÔNG gọi 'searchWebForCourses' — bạn đã có đủ dữ liệu RAG.";


    const chat = this.genAI.chats.create({ 
      model: "gemini-3.1-flash-lite-preview",
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [generateSkillTreeDeclaration, searchWebDeclaration] }]
      }
    });

    return chat;
  }

  // 3. Xử lý Logic Code cho cú Functional Call (Post-process + Lưu DB)
  public async executeAgentAction(functionCallArgs: any, userId: string) {
    if(!functionCallArgs || !functionCallArgs.phases) return null;

    // Post-process: Thay thế TẤT CẢ link YouTube bịa đặt bằng video thật từ yt-search
    // @ts-ignore
    const ytSearch = (await import('yt-search')).default;
    let ytVideoIndex = 0; // Tránh trùng video giữa các topic

    // Hàm xử lý chung để tái cấu trúc lại mảng resource (Dò tìm yt-search)
    const processResources = async (resources: any[], titleTitle: string) => {
       if (!resources || !Array.isArray(resources)) return;
       for (const r of resources) {
          const isYouTubeLink = r.url === 'NEED_SEARCH_YT' 
             || (r.url && r.url.includes('youtube.com'))
             || (r.url && r.url.includes('youtu.be'))
             || r.type?.toLowerCase() === 'video';

          if (isYouTubeLink) {
             try {
                const query = `${titleTitle} ${r.label || ''} tutorial 2024`;
                const ytRes = await ytSearch(query);
                
                if (ytRes?.videos?.length > 0) {
                   const validVideos = ytRes.videos
                      .filter((v: any) => v.seconds > 180)
                      .sort((a: any, b: any) => (b.views || 0) - (a.views || 0));
                   
                   const pick = validVideos[ytVideoIndex % validVideos.length] || ytRes.videos[0];
                   r.url = pick.url;
                   r.label = r.label || pick.title;
                   ytVideoIndex++;
                } else {
                   r.url = `https://www.youtube.com/results?search_query=${encodeURIComponent(titleTitle)}`;
                }
             } catch (e) {
                r.url = `https://www.youtube.com/results?search_query=${encodeURIComponent(titleTitle)}`;
             }
          }
       }
    };

    // Duyệt yt-search cho vòng lặp Phase (Main Topic) và Topics (Sub Topics)
    for (const phase of functionCallArgs.phases) {
       await processResources(phase.resources, phase.phaseName);
       for (const topic of phase.topics) {
          await processResources(topic.resources, topic.title);
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
