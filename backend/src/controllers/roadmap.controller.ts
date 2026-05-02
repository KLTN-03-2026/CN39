import { Response } from 'express';
import { AuthRequest } from '~/middlewares/auth.middleware';
import { PDFParse } from 'pdf-parse';
import { aiService } from '~/services/ai.service';
import { roadmapService } from '~/services/roadmap.service';
import { toolService } from '~/services/tool.service';
import { embeddingService } from '~/services/embedding.service';
import { databaseMongoClient } from '~/services/database.services';
import { ObjectId } from 'mongodb';
import ChatMessage from '~/models/schemas/ChatMessage.schema';

class RoadmapController {
  
  public generateFromCV = async (req: AuthRequest, res: Response) => {
    const file = req.file;
    const userId = req.userId;
    const goal = req.body.goal || "Frontend Developer";

    if (!userId) throw { status: 401, message: "Yêu cầu đăng nhập." };
    if (!file) throw { status: 400, message: "Không tìm thấy file CV tải lên." };

    let cvText = "";
    try {
      const parser: any = new PDFParse({ verbosity: 0 });
      await parser.load(file.buffer);
      const textResult = await parser.getText();
      cvText = typeof textResult === 'string' ? textResult : String(textResult);
      
      let cleanText = cvText.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
      cleanText = cleanText.replace(/(84|0[3|5|7|8|9])+([0-9]{8})\b/g, '');
      cleanText = cleanText.replace(/https?:\/\/[^\s]+/g, '');
      cleanText = cleanText.replace(/[\r\n]{2,}/g, '\n');
      cvText = cleanText.substring(0, 1500);
    } catch (parseError) {
      console.error("[PDF Parse Error]:", parseError);
      throw { status: 422, message: "Không thể trích xuất nội dung từ PDF." };
    }

    const chatSession = aiService.createAgentSession();
    const prompt = `Mục tiêu: ${goal}. CV: ${cvText}. Hãy tạo lộ trình học tập gap-analysis. Gọi generateSkillTree.`;
    
    const result = await chatSession.sendMessage({ message: prompt });
    let functionCalls = result.functionCalls;
    let dbRoadmap: any = null;
    let agentFinalText = "";

    try {
      if (functionCalls && functionCalls.length > 0 && functionCalls[0].name === "generateSkillTree") {
        const args = functionCalls[0].args as any;
        const executionResult = await aiService.executeAgentAction(args, userId);
        dbRoadmap = executionResult?.roadmapData;
        const roadmapId = executionResult?.roadmapId;

        res.status(201).json({
          message: "Hoàn tất sinh lộ trình từ CV",
          agentChat: result.text || "",
          roadmapId: roadmapId,
          roadmapData: dbRoadmap
        });
        return;
      }
    } catch (err) {
      console.error("[Agent Error]:", err);
      throw { status: 500, message: "Lỗi trong quá trình sinh lộ trình." };
    }

    throw { status: 502, message: "AI không tạo được lộ trình. Vui lòng thử lại." };
  }

  public getById = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.userId;
    if (!userId) throw { status: 401, message: "Yêu cầu đăng nhập." };

    const roadmap = await databaseMongoClient.roadmaps.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId)
    });

    if (!roadmap) throw { status: 404, message: "Không tìm thấy lộ trình." };
    res.status(200).json({ roadmapData: roadmap });
  }

  public listTemplates = async (req: AuthRequest, res: Response) => {
    const templates = await roadmapService.listTemplates();
    res.status(200).json({ templates });
  }

  public previewTemplate = async (req: AuthRequest, res: Response) => {
    const { slug } = req.params;
    const template = await roadmapService.getTemplateBySlug(slug);
    if (!template) throw { status: 404, message: "Không tìm thấy template." };
    res.status(200).json({ roadmapData: template });
  }

  public chatWithTutor = async (req: AuthRequest, res: Response) => {
    const { message, topic, roadmapId } = req.body;
    if (!message) throw { status: 400, message: "Vui lòng nhập câu hỏi." };

    // RAG context
    const ragResults = await embeddingService.searchByTopic(message, topic, 3);
    const ragContext = ragResults.map(r => ({
      title: r.title,
      url: r.url,
      description: r.description
    }));

    const reply = await aiService.generateTutorReply(topic, message, [], ragContext);
    res.status(200).json({ reply });
  }
}

export const roadmapController = new RoadmapController();
