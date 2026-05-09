import { ObjectId } from 'mongodb';

// Schema cho collection `roadmap_templates` — Chỉ metadata nhẹ
// Topics được lưu riêng trong collection `topics` (referenced)
export default class RoadmapTemplate {
  _id?: ObjectId;
  slug: string;           // "frontend", "backend", "ai-agents"
  title: string;          // "Frontend Developer"
  category: 'role' | 'skill';
  createdAt: Date;
  updatedAt: Date;

  constructor(template: {
    _id?: ObjectId;
    slug: string;
    title: string;
    category: 'role' | 'skill';
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    this._id = template._id;
    this.slug = template.slug;
    this.title = template.title;
    this.category = template.category;
    this.createdAt = template.createdAt || now;
    this.updatedAt = template.updatedAt || now;
  }
}
