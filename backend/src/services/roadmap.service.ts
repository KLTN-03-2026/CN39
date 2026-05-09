import { ObjectId } from 'mongodb';
import { databaseMongoClient } from '~/services/database.services';
import { aiService } from '~/services/ai.service';
import Roadmap from '~/models/schemas/Roadmap.schema';

class RoadmapService {

  /**
   * Sinh roadmap từ CV: Tìm template → Lấy topics từ DB → AI Gap Analysis → Lưu Roadmap
   * Flow mới: 2 API calls thay vì agent loop (~5-10s thay vì 40-80s)
   */
  public async generateFromCV(userId: string, goal: string, cvText: string) {
    // 1. Lấy danh sách template slugs có sẵn trong DB
    const templates = await databaseMongoClient.roadmapTemplates.find(
      {}, { projection: { slug: 1 } }
    ).toArray();
    const availableSlugs = templates.map(t => (t as any).slug).filter(Boolean);

    if (availableSlugs.length === 0) {
      throw { status: 500, message: 'Chưa có roadmap template nào trong database.' };
    }

    // 2. AI tìm template slug phù hợp nhất (1 API call)
    const templateSlug = await aiService.findMatchingTemplate(goal, availableSlugs);
    const template = await databaseMongoClient.roadmapTemplates.findOne(
      { slug: templateSlug } as any
    );

    if (!template) {
      throw { status: 404, message: `Template "${templateSlug}" không tồn tại.` };
    }

    // 3. Lấy tất cả topics (main + sub) thuộc template này từ collection topics
    const allTopics = await databaseMongoClient.topics.find(
      { roadmapId: template._id },
      { projection: { embedding: 0 } }
    ).toArray();

    // Chỉ lấy main topics (parentId = null) cho gap analysis
    const mainTopics = allTopics.filter(t => !t.parentId);
    const topicSlugs = mainTopics.map(t => t.oldId).filter(Boolean);

    // 4. AI Gap Analysis — trả về danh sách slug đã biết (1 API call)
    const completedSlugs = await aiService.analyzeCVGap(goal, cvText, topicSlugs);

    // 5. Tạo topicStatuses và topicNotes map
    const topicStatuses: Record<string, string> = {};
    const topicNotes: Record<string, string> = {};
    let foundFirstGap = false;

    for (const topic of allTopics) {
      const slug = topic.oldId;
      if (!slug) continue;

      if (completedSlugs.includes(slug)) {
        topicStatuses[slug] = 'done';
        topicNotes[slug] = 'Đã có kinh nghiệm từ CV';
      } else if (!foundFirstGap && !topic.parentId) {
        topicStatuses[slug] = 'in_progress';
        foundFirstGap = true;
      } else {
        topicStatuses[slug] = 'pending';
      }
    }

    // 6. Lưu Roadmap vào DB
    const roadmapDoc = new Roadmap({
      userId: new ObjectId(userId),
      roadmapTemplateId: template._id!,
      name: `${goal} Roadmap`,
      topicStatuses,
      topicNotes,
    });

    const result = await databaseMongoClient.roadmaps.insertOne(roadmapDoc);
    const roadmapId = result.insertedId;

    return { roadmapId, roadmapData: { ...roadmapDoc, _id: roadmapId } };
  }

  /**
   * Tạo skill roadmap (deep-dive) — Không cần gap analysis
   * Tất cả topics mặc định = 'pending'
   */
  public async createSkillRoadmap(userId: string, templateSlug: string) {
    const template = await databaseMongoClient.roadmapTemplates.findOne(
      { slug: templateSlug } as any
    );

    if (!template) {
      throw { status: 404, message: `Template "${templateSlug}" không tồn tại.` };
    }

    // Kiểm tra user đã có roadmap này chưa
    const existing = await databaseMongoClient.roadmaps.findOne({
      userId: new ObjectId(userId),
      roadmapTemplateId: template._id!
    });

    if (existing) {
      return { roadmapId: existing._id, roadmapData: existing, isExisting: true };
    }

    // Lấy topics → tạo status map (all pending)
    const allTopics = await databaseMongoClient.topics.find(
      { roadmapId: template._id },
      { projection: { oldId: 1 } }
    ).toArray();

    const topicStatuses: Record<string, string> = {};
    for (const t of allTopics) {
      if (t.oldId) topicStatuses[t.oldId] = 'pending';
    }

    const roadmapDoc = new Roadmap({
      userId: new ObjectId(userId),
      roadmapTemplateId: template._id!,
      name: `${(template as any).title || templateSlug} Deep-dive`,
      topicStatuses,
    });

    const result = await databaseMongoClient.roadmaps.insertOne(roadmapDoc);

    return { roadmapId: result.insertedId, roadmapData: { ...roadmapDoc, _id: result.insertedId }, isExisting: false };
  }
}

export const roadmapService = new RoadmapService();
