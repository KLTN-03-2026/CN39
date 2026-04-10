import { Response } from 'express';
import { AuthRequest } from '~/middlewares/auth.middleware';
import { PDFParse } from 'pdf-parse';
import { aiService } from '~/services/ai.service';
import { toolService } from '~/services/tool.service';
import { embeddingService } from '~/services/embedding.service';
import { databaseMongoClient } from '~/services/database.services';
import { ObjectId } from 'mongodb';

class RoadmapController {
  
  public generateFromCV = async (req: AuthRequest, res: Response) => {
    const file = req.file;
    const userId = req.userId;
    const goal = req.body.goal || "Chuyên gia lập trình"; // e.g. "Backend NodeJS"

    if (!userId) {
      throw { status: 401, message: "Yêu cầu đăng nhập." };
    }
    if (!file) {
      throw { status: 400, message: "Không tìm thấy file CV tải lên." };
    }

    // 1. Phân tách Text CV (pdf-parse v2 API: class-based, yêu cầu Uint8Array)
    let cvText = "";
    try {
      const uint8Data = new Uint8Array(file.buffer);
      const parser = new PDFParse({ data: uint8Data });
      const result = await parser.getText();
      
      // Lọc CV cốt lõi (Loại PII, nén token)
      let cleanText = result.text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, ''); // Email
      cleanText = cleanText.replace(/(84|0[3|5|7|8|9])+([0-9]{8})\b/g, ''); // Phone
      cleanText = cleanText.replace(/https?:\/\/[^\s]+/g, ''); // URLs
      cleanText = cleanText.replace(/[\r\n]{2,}/g, '\n'); // Remove blanks
      
      cvText = cleanText.substring(0, 1500); // Lấy 1500 kí tự quan trọng đầu tiên chứa nhóm học vấn/kĩ năng
      
      await parser.destroy(); // Giải phóng bộ nhớ
    } catch (parseError) {
      console.error("[PDF Parse Error]:", parseError);
      throw { status: 422, message: "Không thể trích xuất nội dung từ PDF." };
    }

    // 2. Tìm Base Roadmap (Lộ trình gốc) cùng Target Role để tái sử dụng (Phase 2 Optimization)
    let baseRoadmapJSON = "NONE";
    const baseRoadmap = await databaseMongoClient.roadmaps.findOne(
      { targetRole: { $regex: new RegExp(`^${goal}$`, "i") } } // regex match sát nghĩa
    );
    
    if (baseRoadmap) {
      baseRoadmapJSON = JSON.stringify(baseRoadmap.phases);
      console.log(`[Agent Optimization] Tìm thấy Base Roadmap cho "${goal}", tiến hành tái sử dụng giảm tải API!`);
    }

    // 3. Kích hoạt Vector RAG Search: Tìm kiếm tài nguyên học tập chuẩn xác nhất 
    // liên quan mục tiêu hoặc khóa học từ MongoDB Atlas
    const RAG_Context = await embeddingService.searchResources(goal, 10);
    const ragKnowledge = JSON.stringify(RAG_Context.map(r => ({ title: r.title, url: r.url })));

    // 4. Chuẩn bị Agent Session
    const chatSession = aiService.createAgentSession();
    const prompt = `
Mục tiêu nghề nghiệp: ${goal}. CV của tôi (đã lọc):
---
${cvText}
---

BASE ROADMAP (BỘ KHUNG CÓ SẴN ĐỂ TÁI SỬ DỤNG):
${baseRoadmapJSON !== "NONE" ? baseRoadmapJSON : "Chưa có khung."}

KHO TRI THỨC HỆ THỐNG (RAG): ${ragKnowledge}

YÊU CẦU VỀ CẤU TRÚC GAME SKILL TREE:
- Lộ trình phải đồ sộ và chuyên sâu. PHẢI tạo ÍT NHẤT 4-5 Giai đoạn (Phases).
- MỖI Phase PHẢI chứa 3-5 Topics. Trong đó:
  + 2-3 Topic đặt isRequired: true (KHUYẾN NGHỊ - bắt buộc hoàn thành để mở khoá Phase kế tiếp)
  + 1-2 Topic đặt isRequired: false (TUỲ CHỌN - bổ sung nếu muốn, không ảnh hưởng mở khoá)
- TÊN TOPIC: Phải là TÊN CÔNG NGHỆ HOẶC KHÁI NIỆM NGẮN GỌN CỤ THỂ (Ví dụ: "React", "Vue.js", "MongoDB", "Redis", "Docker", "GraphQL"). TUYỆT ĐỐI KHÔNG dùng câu mô tả dài dòng như "Kiến trúc hệ thống nâng cao" hay "Thành thạo Frontend".

CÁC YÊU CẦU KHÁC:
1. Phân tích CV so với Mục tiêu. NẾU CÓ [BASE ROADMAP], tái sử dụng các Topic và Resources phù hợp. Tuyệt đối không lấy resource sai chủ đề.
2. Mỗi topic bắt buộc có ĐẦY ĐỦ 4 tài liệu sau (không được thiếu):
   - Đúng Tối đa 1 Official Docs: type "article", isPremium: false
   - Đúng Tối đa 2 Videos YouTube: type "video", isPremium: false, url "NEED_SEARCH_YT"
   - Đúng Tối đa 1 Khóa Học (isPremium: true): type "course"
8. XỬ LÝ LINK (QUAN TRỌNG ĐỂ TRÁNH LINK RÁC/404): 
   - Video YouTube: Ghi URL là: "NEED_SEARCH_YT". Hệ thống ngầm sẽ tự tìm Video thật. TUYỆT ĐỐI KHÔNG tự bịa link Youtube.
   - Khoá học Premium (isPremium: true): Bắt buộc dùng link TÌM KIẾM của nhiều nền tảng khác nhau để tránh 404. (Ví dụ: https://www.udemy.com/courses/search/?q=[Từ+Khóa], https://scrimba.com/search?q=[Từ+Khoá], https://www.coursera.org/search?query=[Từ+Khóa]). KHÔNG tự bịa link chi tiết khoá học.
   - Docs (Official): Chỉ dùng domain trang chủ (Ví dụ: https://react.dev).
5. Khi trả lời text, CHỈ viết TỐI ĐA 2 câu ngắn gọn.
`;

    // 4. Kích hoạt Suy luận Model & Bắt tín hiệu Call Tool
    const result = await chatSession.sendMessage(prompt);
    
    // VÒNG LẶP ĐẠI LÝ (AUTONOMOUS AGENT LOOP)
    let functionCalls = result.response.functionCalls();
    let dbRoadmap: any = null;
    let agentFinalText = "";
    try { agentFinalText = result.response.text(); } catch {}
    
    console.log(`[Agent] Initial response - functionCalls: ${functionCalls?.length || 0}, hasText: ${!!agentFinalText}`);
    
    let loopCount = 0;
    const MAX_LOOPS = 8;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    let searchCount = 0; // Giới hạn số lần searchWeb để tránh rate limit
    const MAX_SEARCH = 2; // Tối đa 2 lần tìm kiếm web

    try {
      while (functionCalls && functionCalls.length > 0 && loopCount < MAX_LOOPS) {
         loopCount++;
         const call = functionCalls[0];
         console.log(`[Agent Loop ${loopCount}] Tool: ${call.name}`);

         if (call.name === "searchWebForCourses" && searchCount < MAX_SEARCH) {
            searchCount++;
            const args = call.args as any;
            const searchResults = await toolService.searchWeb(args.query);
            
            await delay(13000); // 60s / 5 RPM = 12s tối thiểu, dùng 13s cho an toàn
            const nextTurn = await chatSession.sendMessage([{
              functionResponse: {
                 name: "searchWebForCourses",
                 response: { results: searchResults }
              }
            }]);
            
            functionCalls = nextTurn.response.functionCalls();
            try { agentFinalText = nextTurn.response.text(); } catch {}

         } else if (call.name === "searchWebForCourses" && searchCount >= MAX_SEARCH) {
            // Đã search đủ rồi → trả kết quả rỗng ép AI chuyển sang generateSkillTree
            console.log(`[Agent] Đã search ${MAX_SEARCH} lần, ép chuyển sang generateSkillTree`);
            await delay(13000);
            const nextTurn = await chatSession.sendMessage([{
              functionResponse: {
                 name: "searchWebForCourses",
                 response: { results: [], message: "Đã đủ dữ liệu. Hãy gọi generateSkillTree ngay." }
              }
            }]);
            functionCalls = nextTurn.response.functionCalls();
            try { agentFinalText = nextTurn.response.text(); } catch {}

         } else if (call.name === "generateSkillTree") {
            const args = call.args as any;
            const executionResult = await aiService.executeAgentAction(args, userId);
            dbRoadmap = await databaseMongoClient.roadmaps.findOne(
              { _id: executionResult?.roadmapId },
              { projection: { userId: 0 } }
            );
            console.log(`[Agent] SkillTree saved! roadmapId: ${executionResult?.roadmapId}`);
            break; // Đã tạo xong → thoát vòng lặp luôn, KHÔNG cần sendMessage thêm
         } else {
            console.log(`[Agent] Unknown tool: ${call.name}, breaking...`);
            break;
         }
      }
    } catch (loopErr: any) {
      const errMsg = (loopErr as Error).message || '';
      console.error("[Agent Loop Error]:", errMsg);
      // Phát hiện rate limit 429 → trả lỗi rõ ràng cho frontend
      if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        throw { status: 429, message: "API Gemini đã hết quota (giới hạn miễn phí: 20 request/ngày). Vui lòng thử lại sau vài giờ hoặc đổi API key." };
      }
    }

    // FALLBACK: Nếu Agent chưa gọi generateSkillTree → ép buộc tối đa 2 lần
    if (!dbRoadmap) {
      for (let retry = 0; retry < 2 && !dbRoadmap; retry++) {
        console.log(`[Agent Fallback ${retry + 1}] Ép buộc gọi generateSkillTree...`);
        await delay(13000);
        try {
          const forceResult = await chatSession.sendMessage(
            "LỆNH HỆ THỐNG: Bạn PHẢI gọi tool 'generateSkillTree' ngay bây giờ. Hãy tạo lộ trình dựa trên thông tin CV đã có. KHÔNG được trả lời bằng text."
          );
          const forceCalls = forceResult.response.functionCalls();
          try { agentFinalText = forceResult.response.text(); } catch {}
          
          console.log(`[Agent Fallback ${retry + 1}] functionCalls: ${forceCalls?.length || 0}`);

          if (forceCalls && forceCalls.length > 0 && forceCalls[0].name === "generateSkillTree") {
            const args = forceCalls[0].args as any;
            const executionResult = await aiService.executeAgentAction(args, userId);
            dbRoadmap = await databaseMongoClient.roadmaps.findOne(
              { _id: executionResult?.roadmapId },
              { projection: { userId: 0 } }
            );
            console.log(`[Agent Fallback] SkillTree saved! roadmapId: ${executionResult?.roadmapId}`);
          }
        } catch (fallbackErr: any) {
          const msg = (fallbackErr as Error).message || '';
          console.error(`[Agent Fallback ${retry + 1}] Error:`, msg);
          if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
            throw { status: 429, message: "API Gemini đã hết quota. Vui lòng thử lại sau vài giờ hoặc đổi API key." };
          }
        }
      }
    }

    // 5. Kết thúc. Trả cho Client:
    if (!dbRoadmap) {
      throw { status: 502, message: "AI Agent không tạo được lộ trình sau nhiều lần thử. Vui lòng thử lại." };
    }

    res.status(201).json({
      message: "Hoàn tất RAG & AI Agentic Flow",
      agentChat: agentFinalText,
      roadmapData: dbRoadmap
    });
  }

  // Lấy lộ trình mới nhất của User (để resume mà không cần upload CV)
  public getLatestRoadmap = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) throw { status: 401, message: "Yêu cầu đăng nhập." };

    const roadmap = await databaseMongoClient.roadmaps.findOne(
      { userId: new ObjectId(userId) },
      { sort: { _id: -1 } }
    );

    res.status(200).json({ roadmapData: roadmap });
  }

  // AI Tutor Chatbox — Trả lời câu hỏi của user về topic cụ thể
  public chatWithTutor = async (req: AuthRequest, res: Response) => {
    const { message, topic, roadmapId } = req.body;
    if (!message) {
      throw { status: 400, message: "Vui lòng nhập câu hỏi." };
    }

    // Lưu tin nhắn user vào DB
    if (roadmapId && topic) {
       await databaseMongoClient.chat_messages.insertOne({
          roadmapId: new ObjectId(roadmapId),
          topic,
          role: 'user',
          text: message,
          createdAt: new Date()
       });
    }

    const model = aiService.getModel();
    const result = await model.generateContent(
      `Bạn là AI Tutor chuyên dạy lập trình. Học viên đang hỏi về chủ đề "${topic || 'lập trình'}". ` +
      `Trả lời ngắn gọn, dễ hiểu, tối đa 3-4 câu. Câu hỏi: "${message}"`
    );
    
    let reply = "";
    try { reply = result.response.text(); } catch { reply = "Xin lỗi, tôi không thể trả lời lúc này."; }

    // Lưu tin nhắn AI vào DB
    if (roadmapId && topic) {
       await databaseMongoClient.chat_messages.insertOne({
          roadmapId: new ObjectId(roadmapId),
          topic,
          role: 'ai',
          text: reply,
          createdAt: new Date()
       });
    }

    res.status(200).json({ reply });
  }

  // Lấy lịch sử chat của 1 topic
  public getChatHistory = async (req: AuthRequest, res: Response) => {
    const { roadmapId, topic } = req.params;
    if (!roadmapId || !topic) {
       throw { status: 400, message: "Thiếu tham số." };
    }

    const messages = await databaseMongoClient.chat_messages.find(
       { roadmapId: new ObjectId(roadmapId), topic },
       { sort: { createdAt: 1 } }
    ).toArray();

    // Map lại để trả về mảng { role, text } cho frontend
    const history = messages.map(m => ({ role: m.role, text: m.text }));
    res.status(200).json({ history });
  }
  // Đánh dấu hoàn thành Topic
  public completeTopic = async (req: AuthRequest, res: Response) => {
    const { roadmapId, topicId } = req.params;
    const userId = req.userId;
    
    if (!roadmapId || !topicId || !userId) {
      throw { status: 400, message: "Thiếu tham số." };
    }

    // Update the specific topic's isCompleted field to true
    const result = await databaseMongoClient.roadmaps.updateOne(
      { 
        _id: new ObjectId(roadmapId),
        userId: new ObjectId(userId),
        "phases.topics.topicId": topicId
      },
      { 
        $set: { "phases.$[].topics.$[topic].isCompleted": true } 
      },
      {
        arrayFilters: [{ "topic.topicId": topicId }]
      }
    );

    if (result.matchedCount === 0) {
      throw { status: 404, message: "Không tìm thấy Topic hoặc Roadmap." };
    }

    res.status(200).json({ message: "Đã đánh dấu hoàn thành kỹ năng!" });
  }
}

export const roadmapController = new RoadmapController();
