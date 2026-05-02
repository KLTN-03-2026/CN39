import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import { databaseMongoClient } from '~/services/database.services';
import Roadmap from '~/models/schemas/Roadmap.schema';

export class RoadmapService {
  private templatesDir = path.join(process.cwd(), 'src/models/templates/timeline-v2');

  // Lấy danh sách tất cả templates (Role + Skill)
  public async listTemplates() {
    if (!fs.existsSync(this.templatesDir)) return [];
    
    const files = fs.readdirSync(this.templatesDir).filter(f => f.endsWith('.json'));
    const templates = files.map(file => {
      const content = JSON.parse(fs.readFileSync(path.join(this.templatesDir, file), 'utf8'));
      return {
        slug: file.replace('.json', ''),
        title: content.title || content.goal,
        type: content.type || 'role',
        description: content.description || ''
      };
    });
    return templates;
  }

  // Lấy nội dung chi tiết của 1 template theo slug
  public async getTemplateBySlug(slug: string) {
    const filePath = path.join(this.templatesDir, `${slug}.json`);
    if (!fs.existsSync(filePath)) return null;
    
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return content;
  }

  // Tạo roadmap thực tế từ Template (dùng cho tính năng "Start Roadmap" từ Landing Page)
  public async createFromTemplate(slug: string, userId: string) {
    const template = await this.getTemplateBySlug(slug);
    if (!template) return null;

    const newRoadmap = new Roadmap({
      userId: new ObjectId(userId),
      targetRole: template.title || template.goal,
      level: template.level || 'All Levels',
      topics: template.topics.map((t: any) => ({
        ...t,
        isCompleted: false,
        status: 'not_started',
        resources: t.resources || []
      }))
    });

    const result = await databaseMongoClient.roadmaps.insertOne(newRoadmap);
    return { roadmapId: result.insertedId, roadmapData: newRoadmap };
  }
}

export const roadmapService = new RoadmapService();
