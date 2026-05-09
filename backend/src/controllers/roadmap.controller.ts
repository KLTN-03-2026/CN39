import { Response } from 'express';
import { AuthRequest } from '~/middlewares/auth.middleware';
import { PDFParse } from 'pdf-parse';
import { embeddingService } from '~/services/embedding.service';
import { databaseMongoClient } from '~/services/database.services';
import { roadmapService } from '~/services/roadmap.service';
import { aiService } from '~/services/ai.service';
import { ObjectId } from 'mongodb';
import ChatMessage from '~/models/schemas/ChatMessage.schema';

class RoadmapController {
  
  /**
   * POST /api/roadmaps/generate — Sinh roadmap từ CV
   */
  public generateFromCV = async (req: AuthRequest, res: Response) => {
    const file = req.file;
    const userId = req.userId;
    const goal = req.body.goal || "Backend Developer";

    if (!userId) throw { status: 401, message: "Yêu cầu đăng nhập." };
    if (!file) throw { status: 400, message: "Không tìm thấy file CV tải lên." };

    // 1. Phân tách text từ PDF
    let cvText = "";
    try {
      const parser: any = new PDFParse({ data: file.buffer, verbosity: 0 });
      const textResult = await parser.getText();
      cvText = textResult.text || "";
      await parser.destroy();
      
      // Lọc PII, nén token
      cvText = cvText
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
        .replace(/(84|0[3|5|7|8|9])+([0-9]{8})\b/g, '')
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/[\r\n]{2,}/g, '\n')
        .substring(0, 1500);
    } catch {
      throw { status: 422, message: "Không thể trích xuất nội dung từ PDF." };
    }

    // 2. Gọi roadmapService — Flow mới (2 API calls, ~5-10s)
    const { roadmapId, roadmapData } = await roadmapService.generateFromCV(userId, goal, cvText);

    res.status(201).json({
      message: "Tạo lộ trình thành công",
      roadmapId,
      roadmapData
    });
  }

  /**
   * GET /api/roadmaps/latest — Lấy roadmap mới nhất
   */
  public getLatestRoadmap = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) throw { status: 401, message: "Yêu cầu đăng nhập." };

    const roadmap = await databaseMongoClient.roadmaps.findOne(
      { userId: new ObjectId(userId) },
      { sort: { _id: -1 } }
    );

    res.status(200).json({ roadmapData: roadmap });
  }

  /**
   * GET /api/roadmaps/my — Lấy tất cả roadmaps của user
   */
  public getMyRoadmaps = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    if (!userId) throw { status: 401, message: "Yêu cầu đăng nhập." };

    const roadmaps = await databaseMongoClient.roadmaps.find(
      { userId: new ObjectId(userId) },
      { sort: { updatedAt: -1 } }
    ).toArray();

    res.status(200).json({ roadmaps });
  }

  /**
   * GET /api/roadmaps/:id — Lấy roadmap theo ID
   */
  public getById = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    if (!id) throw { status: 400, message: "Thiếu ID lộ trình." };

    const roadmap = await databaseMongoClient.roadmaps.findOne({ _id: new ObjectId(id) });
    if (!roadmap) throw { status: 404, message: "Không tìm thấy lộ trình." };

    // Lấy topics thuộc roadmap template
    const topics = await databaseMongoClient.topics.find(
      { roadmapId: roadmap.roadmapTemplateId },
      { projection: { embedding: 0 } }
    ).sort({ order: 1 }).toArray();

    res.status(200).json({ roadmapData: roadmap, topics });
  }

  /**
   * GET /api/roadmaps/preview/:slug — Xem template (không cần auth)
   */
  public previewTemplate = async (req: AuthRequest, res: Response) => {
    const { slug } = req.params;
    
    const template = await databaseMongoClient.roadmapTemplates.findOne({ slug } as any);
    if (!template) throw { status: 404, message: `Template "${slug}" không tồn tại.` };

    const topics = await databaseMongoClient.topics.find(
      { roadmapId: template._id },
      { projection: { embedding: 0 } }
    ).sort({ order: 1 }).toArray();

    res.status(200).json({
      template: {
        _id: template._id,
        title: (template as any).title || slug,
        slug: (template as any).slug,
        description: (template as any).description || `Lộ trình chuyên sâu về ${slug}`,
      },
      topics
    });
  }

  /**
   * GET /api/roadmaps/templates — Liệt kê templates
   */
  public listTemplates = async (_req: AuthRequest, res: Response) => {
    const templates = await databaseMongoClient.roadmapTemplates.find(
      {},
      { projection: { slug: 1, title: 1, category: 1, description: 1 } }
    ).toArray();

    res.status(200).json({ templates });
  }

  // ═══════════ Topic Status ═══════════

  /**
   * PATCH /api/roadmaps/:roadmapId/topics/:topicSlug/status
   * Body: { status: 'pending' | 'done' | 'in_progress' | 'skip' }
   */
  public updateTopicStatus = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { roadmapId, topicSlug } = req.params;
    const { status } = req.body;
    if (!userId) throw { status: 401, message: 'Yêu cầu đăng nhập.' };

    const validStatuses = ['pending', 'done', 'in_progress', 'skip'];
    if (!validStatuses.includes(status)) {
      throw { status: 400, message: `Status không hợp lệ. Chỉ chấp nhận: ${validStatuses.join(', ')}` };
    }

    await databaseMongoClient.roadmaps.updateOne(
      { _id: new ObjectId(roadmapId), userId: new ObjectId(userId) },
      { $set: { [`topicStatuses.${topicSlug}`]: status, updatedAt: new Date() } }
    );

    res.status(200).json({ message: 'Status updated', topicSlug, status });
  }

  /**
   * GET /api/roadmaps/:roadmapId/progress — Lấy tiến trình
   */
  public getProgress = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { roadmapId } = req.params;
    if (!userId) throw { status: 401, message: 'Yêu cầu đăng nhập.' };

    const roadmap = await databaseMongoClient.roadmaps.findOne({
      _id: new ObjectId(roadmapId),
      userId: new ObjectId(userId)
    });

    const statuses = roadmap?.topicStatuses || {};
    const total = Object.keys(statuses).length;
    const done = Object.values(statuses).filter(s => s === 'done').length;
    const inProgress = Object.values(statuses).filter(s => s === 'in_progress').length;
    const skipped = Object.values(statuses).filter(s => s === 'skip').length;
    const remaining = total - done - skipped;
    const percent = total > 0 ? Math.round(((done + skipped) / total) * 100) : 0;

    res.status(200).json({
      topicStatuses: statuses,
      stats: { total, done, inProgress, skipped, remaining, percent }
    });
  }

  // ═══════════ Bookmark ═══════════

  /**
   * PATCH /api/roadmaps/:roadmapId/bookmark/:resourceId — Toggle bookmark
   */
  public toggleBookmark = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { roadmapId, resourceId } = req.params;
    if (!userId) throw { status: 401, message: 'Yêu cầu đăng nhập.' };

    const resObjId = new ObjectId(resourceId);
    const roadmap = await databaseMongoClient.roadmaps.findOne({
      _id: new ObjectId(roadmapId),
      userId: new ObjectId(userId)
    });

    if (!roadmap) throw { status: 404, message: 'Roadmap không tồn tại.' };

    const isBookmarked = roadmap.bookmarkedResourceIds?.some(
      (id: any) => id.toString() === resourceId
    );

    if (isBookmarked) {
      await databaseMongoClient.roadmaps.updateOne(
        { _id: new ObjectId(roadmapId) },
        { $pull: { bookmarkedResourceIds: resObjId } as any }
      );
    } else {
      await databaseMongoClient.roadmaps.updateOne(
        { _id: new ObjectId(roadmapId) },
        { $addToSet: { bookmarkedResourceIds: resObjId } as any }
      );
    }

    res.status(200).json({ bookmarked: !isBookmarked });
  }

  /**
   * GET /api/roadmaps/:roadmapId/bookmarks — Lấy resources đã bookmark
   */
  public getBookmarks = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { roadmapId } = req.params;
    if (!userId) throw { status: 401, message: 'Yêu cầu đăng nhập.' };

    const roadmap = await databaseMongoClient.roadmaps.findOne({
      _id: new ObjectId(roadmapId),
      userId: new ObjectId(userId)
    });

    if (!roadmap || !roadmap.bookmarkedResourceIds?.length) {
      res.status(200).json({ resources: [] });
      return;
    }

    const resources = await databaseMongoClient.resources.find(
      { _id: { $in: roadmap.bookmarkedResourceIds } },
      { projection: { embedding: 0 } }
    ).toArray();

    res.status(200).json({ resources });
  }

  // ═══════════ Skill Roadmap Deep-dive ═══════════

  /**
   * POST /api/roadmaps/skill/:slug — Tạo skill roadmap (deep-dive)
   */
  public createSkillRoadmap = async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { slug } = req.params;
    if (!userId) throw { status: 401, message: 'Yêu cầu đăng nhập.' };

    const result = await roadmapService.createSkillRoadmap(userId, slug);
    res.status(result.isExisting ? 200 : 201).json(result);
  }

  // ═══════════ AI Tutor Chatbox ═══════════

  /**
   * POST /api/roadmaps/chat — Chat với AI Tutor
   */
  public chatWithTutor = async (req: AuthRequest, res: Response) => {
    const { message, topicSlug, roadmapId } = req.body;
    if (!message) throw { status: 400, message: "Vui lòng nhập câu hỏi." };

    // Lấy lịch sử chat
    let chatHistory: { role: string; content: string }[] = [];
    if (roadmapId && topicSlug && req.userId) {
      const historyDocs = await databaseMongoClient.chat_messages.find(
        { roadmap_id: new ObjectId(roadmapId), topic_id: topicSlug },
        { sort: { created_at: 1 } }
      ).toArray();
      chatHistory = historyDocs.map(m => ({ role: m.role, content: m.content }));
    }

    // Lưu tin nhắn user
    if (roadmapId && topicSlug && req.userId) {
      await databaseMongoClient.chat_messages.insertOne(new ChatMessage({
        user_id: new ObjectId(req.userId),
        roadmap_id: new ObjectId(roadmapId),
        topic_id: topicSlug,
        role: 'user',
        content: message,
        created_at: new Date()
      }));
    }

    // RAG: 3 tầng tìm kiếm (direct → text → vector)
    const ragResults = await embeddingService.searchByTopic(message, topicSlug || '', 5);
    const ragContext = ragResults.map(r => ({
      title: r.title || '', url: r.url || '', type: r.type || 'article', description: r.description || ''
    }));

    // Lấy topic title từ DB để AI biết context
    let topicTitle = topicSlug || 'General';
    if (topicSlug) {
      const topic = await databaseMongoClient.topics.findOne({ oldId: topicSlug });
      if (topic) topicTitle = topic.title;
    }

    const reply = await aiService.generateTutorReply(topicTitle, message, chatHistory, ragContext);

    // Lưu tin nhắn AI
    if (roadmapId && topicSlug && req.userId) {
      await databaseMongoClient.chat_messages.insertOne(new ChatMessage({
        user_id: new ObjectId(req.userId),
        roadmap_id: new ObjectId(roadmapId),
        topic_id: topicSlug,
        role: 'model',
        content: reply,
        created_at: new Date()
      }));
    }

    res.status(200).json({ reply });
  }

  /**
   * GET /api/roadmaps/chat/history/:roadmapId/:topic — Lấy lịch sử chat
   */
  public getChatHistory = async (req: AuthRequest, res: Response) => {
    const { roadmapId, topic } = req.params;
    if (!roadmapId || !topic) throw { status: 400, message: "Thiếu tham số." };

    const messages = await databaseMongoClient.chat_messages.find(
      { roadmap_id: new ObjectId(roadmapId), topic_id: topic },
      { sort: { created_at: 1 } }
    ).toArray();

    const history = messages.map(m => ({ role: m.role, text: m.content }));
    res.status(200).json({ history });
  }
}

export const roadmapController = new RoadmapController();
