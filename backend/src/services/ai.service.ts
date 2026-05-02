import { GoogleGenAI, Type } from '@google/genai';
import { ObjectId } from 'mongodb';
import Roadmap from '../models/schemas/Roadmap.schema';
import { databaseMongoClient } from './database.services';

// --- Tool Definitions ---

const generateSkillTreeDeclaration = {
  name: "generateSkillTree",
  description: "Tạo danh sách các topic (lộ trình học tập) dựa trên mục tiêu nghề nghiệp và kỹ năng hiện có.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      targetRole: { type: Type.STRING, description: "Vị trí công việc mục tiêu (ví dụ: Senior React Developer)" },
      level: { type: Type.STRING, description: "Trình độ hiện tại (Intern, Fresher, Junior)" },
      topics: {
        type: Type.ARRAY,
        description: "Danh sách các topic cần học để đạt mục tiêu",
        items: {
          type: Type.OBJECT,
          required: ["topicId", "title", "description"],
          properties: {
            topicId: { type: Type.STRING, description: "slug-ify của tiêu đề (ví dụ: 'react-hooks')" },
            title: { type: Type.STRING, description: "Tiêu đề topic" },
            description: { type: Type.STRING, description: "Mô tả ngắn gọn topic" },
            isRequired: { type: Type.BOOLEAN, description: "Có bắt buộc không (true: Recommend, false: Optional)" },
            skillRoadmapSlug: { type: Type.STRING, description: "Slug của roadmap kỹ năng tương ứng nếu có (ví dụ: 'react')" }
          }
        }
      }
    },
    required: ["targetRole", "level", "topics"]
  }
};

const searchWebForCoursesDeclaration = {
  name: "searchWebForCourses",
  description: "Tìm kiếm các khóa học và tài liệu trực tuyến cho một topic cụ thể.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      topic: { type: Type.STRING, description: "Tên topic cần tìm tài liệu" }
    },
    required: ["topic"]
  }
};

export class AIService {
  private genAI: any;

  constructor() {
    this.genAI = new GoogleGenAI(process.env.GOOGLE_GENAI_API_KEY || '');
  }

  public createAgentSession() {
    return this.genAI.chats.create({
      model: "gemini-1.5-flash", // Hoặc model phù hợp
      config: {
        tools: [{ functionDeclarations: [generateSkillTreeDeclaration, searchWebForCoursesDeclaration] }]
      }
    });
  }

  public async executeAgentAction(functionCallArgs: any, userId: string) {
    // Logic thực thi action từ AI (ví dụ: lưu roadmap vào DB)
    const newRoadmap = new Roadmap({
      userId: new ObjectId(userId),
      targetRole: functionCallArgs.targetRole,
      level: functionCallArgs.level,
      topics: functionCallArgs.topics.map((t: any) => ({
        ...t,
        isCompleted: false,
        isRequired: t.isRequired !== undefined ? t.isRequired : true,
        resources: []
      }))
    });

    const result = await databaseMongoClient.roadmaps.insertOne(newRoadmap);
    return { roadmapId: result.insertedId.toString(), roadmapData: newRoadmap };
  }

  public async generateTutorReply(topic: string, message: string, history: any[], ragContext: any[] = []) {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const contextStr = ragContext.length > 0 
      ? "\nDưới đây là một số tài liệu tham khảo:\n" + ragContext.map(r => `- [${r.title}](${r.url}): ${r.description}`).join('\n')
      : "";

    const prompt = `Bạn là một AI Tutor hỗ trợ học tập cho chủ đề: ${topic}.
Hãy trả lời câu hỏi của người dùng dựa trên ngữ cảnh và lịch sử trò chuyện.
${contextStr}

Câu hỏi: ${message}`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}

export const aiService = new AIService();
