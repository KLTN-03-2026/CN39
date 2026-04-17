import { Response } from 'express';
import { AuthRequest } from '~/middlewares/auth.middleware';
import { PDFParse } from 'pdf-parse';
import { aiService } from '~/services/ai.service';
import { toolService } from '~/services/tool.service';
import { embeddingService } from '~/services/embedding.service';
import { databaseMongoClient } from '~/services/database.services';
import { ObjectId } from 'mongodb';
import ChatMessage from '~/models/schemas/ChatMessage.schema';

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

YÊU CẦU VỀ LUÔN SUY LUẬN NGẦM & GAP ANALYSIS (TỐI QUAN TRỌNG):
1. PHÂN TÍCH KHOẢNG TRỐNG (GAP ANALYSIS): Bạn phải là một chuyên gia. Hãy đọc kỹ CV và Mục tiêu. BẠN PHẢI TỰ SUY LUẬN NGẦM các kỹ năng nền tảng mà ứng viên CHẮC CHẮN ĐÃ BIẾT dựa trên kinh nghiệm của họ. (Ví dụ: Nếu họ là Web Developer, chắc chắn họ đã biết HTTP, HTML, CSS, Javascript cơ bản).
2. LƯỢC BỎ MẦM NON: TUYỆT ĐỐI KHÔNG ĐƯA CÁC KIẾN THỨC CƠ BẢN/ĐÃ BIẾT NÀY VÀO LỘ TRÌNH! Đừng bắt họ học lại từ đầu. Đừng sinh ra các Node vô nghĩa.
3. SIÊU TẬP TRUNG VÀO KIẾN THỨC NÂNG CAO (ADVANCED GAP):
   - Toàn bộ 100% Lộ trình bạn sinh ra CHỈ ĐƯỢC CHỨA những kỹ năng họ CÒN THIẾU và CẦN THIẾT cho mục tiêu.
   - Hãy dùng TẤT CẢ bộ nhớ của bạn để đẻ ra một bản đồ cực kỳ sâu, chi chít các Phase nâng cao (ví dụ: SSR, System Design, CI/CD, Advanced Testing, Web Security, Microservices...).
   - Tạo từ 6 đến 15 Phases chuyên sâu.
4. MẬT ĐỘ TOPIC CỰC DÀY VÀ PHÂN TÁCH KHÁI NIỆM TRUYỆT ĐỐI KHẮT KHE (BẮT BUỘC):
   - TRONG MỖI PHASE CHỨA THẬT NHIỀU TOPICS (Khoảng 5 - 10 Topics mỗi Phase).
   - QUY TẮC ĐỘC LẬP NGHIÊM NGẶT CỦA MỌI TOPIC TRONG TOÀN BỘ BẢN ĐỒ: TUYỆT ĐỐI CẤM NGẶT VIỆC GỘP CHUNG BẤT KỲ KIẾN THỨC NÀO HAY SỬ DỤNG DẤU GẠCH CHÉO "/", CHỮ "VÀ/AND", HOẶC DẤU PHẨY "," TRONG TÊN NODE!
   - Mọi Framework, Khái Niệm, hoặc Ngôn ngữ ĐỀU PHẢI ĐỨNG RIÊNG THÀNH 1 NODE ĐỘC LẬP. (Ví dụ cấm gộp Next.js và SSR, cấm gộp Vite và Rollup, cấm gộp HTTP và TCP...). Mọi thứ phải TÁCH RỜI!
   - Các công nghệ lõi/tiêu chuẩn ngành -> isRequired: true
   - Đưa thêm CÀNG NHIỀU OPTION CÀNG TỐT (Lựa chọn thay thế) -> isRequired: false (Ví dụ: React là Required, Vue/Svelte là Optional).
5. TÊN TOPIC: Chỉ dùng 1 TỪ KHÓA hoặc Cụm từ ngắn (Ví dụ: "Next.js", "SSR", "Vite", "Zustand").

CÁC YÊU CẦU VỀ TÀI NGUYÊN (RESOURCES):
1. MỖI TOPIC BẮT BUỘC KHỞI TẠO ĐẦY ĐỦ TÀI NGUYÊN (Để tránh tình trạng Node trống rỗng):
   - 1 Official Docs: type "article", isPremium: false
   - Tối đa 2 Videos YouTube: type "video", isPremium: false, url "NEED_SEARCH_YT"
   - Tối đa 1 Khóa Học (isPremium: true): type "course", url search.
2. XỬ LÝ LINK: 
   - Video YouTube: Dùng URL: "NEED_SEARCH_YT". Lõi ngầm tự kiếm. ĐỪNG tự bịa link Youtube.
   - Khoá học Premium: Dùng search link (VD: https://www.udemy.com/courses/search/?q=[Từ+Khóa]). Không tự bịa URL chi tiết.
   - Docs (Official): Dùng đúng domain trang chủ (VD: https://react.dev).
3. HÀNH ĐỘNG: GỌI NGAY FUNCTION 'generateSkillTree' để dựng JSON. KHI TRẢ LỜI TEXT, XIN CHÚC MỪNG VÀ BÁO RẰNG BẠN ĐÃ LƯỢC BỎ CÁC KIẾN THỨC CƠ BẢN.`;

    // 4. Kích hoạt Suy luận Model & Bắt tín hiệu Call Tool
    const result = await chatSession.sendMessage({ message: prompt });
    
    // VÒNG LẶP ĐẠI LÝ (AUTONOMOUS AGENT LOOP)
    let functionCalls = result.functionCalls;
    let dbRoadmap: any = null;
    // Chỉ truy cập .text khi KHÔNG có functionCalls (tránh SDK throw error "non-text parts")
    let agentFinalText = "";
    if (!functionCalls || functionCalls.length === 0) {
      try { agentFinalText = result.text || ""; } catch { agentFinalText = ""; }
    }
    
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
            const nextTurn = await chatSession.sendMessage({ message: [{
              functionResponse: {
                 name: "searchWebForCourses",
                 response: { results: searchResults }
              }
            }]});
            
            functionCalls = nextTurn.functionCalls;
            if (!functionCalls || functionCalls.length === 0) {
              try { agentFinalText = nextTurn.text || ""; } catch { agentFinalText = ""; }
            }

         } else if (call.name === "searchWebForCourses" && searchCount >= MAX_SEARCH) {
            // Đã search đủ rồi → trả kết quả rỗng ép AI chuyển sang generateSkillTree
            console.log(`[Agent] Đã search ${MAX_SEARCH} lần, ép chuyển sang generateSkillTree`);
            await delay(13000);
            const nextTurn = await chatSession.sendMessage({ message: [{
              functionResponse: {
                 name: "searchWebForCourses",
                 response: { results: [], message: "Đã đủ dữ liệu. Hãy gọi generateSkillTree ngay." }
              }
            }]});
            functionCalls = nextTurn.functionCalls;
            if (!functionCalls || functionCalls.length === 0) {
              try { agentFinalText = nextTurn.text || ""; } catch { agentFinalText = ""; }
            }

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
          const forceResult = await chatSession.sendMessage({ message:
            "LỆNH HỆ THỐNG: Bạn PHẢI gọi tool 'generateSkillTree' ngay bây giờ. Hãy tạo lộ trình dựa trên thông tin CV đã có. KHÔNG được trả lời bằng text."
          });
          const forceCalls = forceResult.functionCalls;
          try { agentFinalText = forceResult.text || ""; } catch {}
          
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

    // Lấy lịch sử hội thoại gần nhất (chưa bao gồm tin vừa gửi) để truyền cho AI làm context
    let chatHistory: { role: string; content: string }[] = [];
    if (roadmapId && topic && req.userId) {
       const historyDocs = await databaseMongoClient.chat_messages.find(
          { roadmap_id: new ObjectId(roadmapId), topic_id: topic },
          { sort: { created_at: 1 } }
       ).toArray();
       chatHistory = historyDocs.map(m => ({ role: m.role, content: m.content }));
    }

    // Lưu tin nhắn user vào DB (sau khi đã clone lịch sử cũ)
    if (roadmapId && topic && req.userId) {
       await databaseMongoClient.chat_messages.insertOne(new ChatMessage({
          user_id: new ObjectId(req.userId),
          roadmap_id: new ObjectId(roadmapId),
          topic_id: topic,
          role: 'user',
          content: message,
          created_at: new Date()
       }));
    }

    const reply = await aiService.generateTutorReply(topic, message, chatHistory);

    // Lưu tin nhắn AI vào DB
    if (roadmapId && topic && req.userId) {
       await databaseMongoClient.chat_messages.insertOne(new ChatMessage({
          user_id: new ObjectId(req.userId),
          roadmap_id: new ObjectId(roadmapId),
          topic_id: topic,
          role: 'model',
          content: reply,
          created_at: new Date()
       }));
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
       { roadmap_id: new ObjectId(roadmapId), topic_id: topic },
       { sort: { created_at: 1 } }
    ).toArray();

    // Map lại để trả về mảng { role, text } cho frontend
    const history = messages.map(m => ({ role: m.role, text: m.content }));
    res.status(200).json({ history });
  }
  // Đánh dấu hoàn thành Topic
  public completeTopic = async (req: AuthRequest, res: Response) => {
    const { roadmapId, topicId } = req.params;
    const { phaseIndex } = req.body; // Frontend gửi kèm phaseIndex để update chính xác
    const userId = req.userId;
    
    if (!roadmapId || !topicId || !userId) {
      throw { status: 400, message: "Thiếu tham số." };
    }

    // Nếu là Phase Node (Ví dụ: "phase-0", "phase-1")
    if (topicId.startsWith('phase-')) {
      const pIdx = parseInt(topicId.split('-')[1], 10);
      const result = await databaseMongoClient.roadmaps.updateOne(
        { _id: new ObjectId(roadmapId), userId: new ObjectId(userId) },
        { $set: { [`phases.${pIdx}.isCompleted`]: true } }
      );
      if (result.matchedCount === 0) throw { status: 404, message: "Không tìm thấy Roadmap." };
      res.status(200).json({ message: "Đã đánh dấu hoàn thành 1 Giai đoạn!" });
      return;
    }

    // CHIẾN LƯỢC MỚI: Luôn dùng phaseIndex + tìm topicIndex trong mảng để dùng đường dẫn trực tiếp
    // Đây là cách đáng tin cậy nhất vì MongoDB arrayFilters thường fail với nested arrays
    if (phaseIndex !== undefined && phaseIndex !== null) {
      const pIdx = parseInt(phaseIndex, 10);
      
      // Lấy roadmap từ DB để tìm index chính xác của topic
      const roadmap = await databaseMongoClient.roadmaps.findOne(
        { _id: new ObjectId(roadmapId), userId: new ObjectId(userId) }
      );
      
      if (!roadmap) throw { status: 404, message: "Không tìm thấy Roadmap." };
      
      const phase = roadmap.phases?.[pIdx];
      if (!phase) throw { status: 404, message: "Không tìm thấy Phase." };
      
      // Tìm topic bằng topicId hoặc fallback index
      let topicIndex = -1;
      const fallbackMatch = topicId.match(/^topic-(\d+)-(\d+)$/);
      
      if (fallbackMatch) {
        topicIndex = parseInt(fallbackMatch[2], 10);
      } else {
        topicIndex = phase.topics.findIndex((t: any) => t.topicId === topicId);
      }
      
      if (topicIndex < 0 || topicIndex >= phase.topics.length) {
        throw { status: 404, message: "Không tìm thấy Topic trong Phase." };
      }
      
      // Update trực tiếp bằng đường dẫn array index — KHÔNG dùng arrayFilters
      const result = await databaseMongoClient.roadmaps.updateOne(
        { _id: new ObjectId(roadmapId), userId: new ObjectId(userId) },
        { $set: { [`phases.${pIdx}.topics.${topicIndex}.isCompleted`]: true } }
      );
      
      console.log(`[completeTopic] Updated phases.${pIdx}.topics.${topicIndex}.isCompleted = true (matched: ${result.matchedCount}, modified: ${result.modifiedCount})`);
      
      if (result.matchedCount === 0) {
        throw { status: 404, message: "Không tìm thấy Roadmap." };
      }
      
      res.status(200).json({ message: "Đã đánh dấu hoàn thành kỹ năng!" });
      return;
    }
    
    // Fallback cũ cho trường hợp không có phaseIndex (backward compatibility)
    const fallbackMatch = topicId.match(/^topic-(\d+)-(\d+)$/);
    if (fallbackMatch) {
      const pIdx = parseInt(fallbackMatch[1], 10);
      const tIdx = parseInt(fallbackMatch[2], 10);
      const result = await databaseMongoClient.roadmaps.updateOne(
        { _id: new ObjectId(roadmapId), userId: new ObjectId(userId) },
        { $set: { [`phases.${pIdx}.topics.${tIdx}.isCompleted`]: true } }
      );
      if (result.matchedCount === 0) throw { status: 404, message: "Không tìm thấy Roadmap." };
      res.status(200).json({ message: "Đã đánh dấu hoàn thành kỹ năng!" });
      return;
    }

    throw { status: 400, message: "Không thể xác định vị trí Topic. Vui lòng thử lại." };
  }
}

export const roadmapController = new RoadmapController();
