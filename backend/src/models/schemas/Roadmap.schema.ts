import { ObjectId } from 'mongodb';

/**
 * Schema cho collection `roadmaps` — Lưu lộ trình + tiến trình học của user
 * Mỗi user có thể có nhiều roadmap (main + skill deep-dive)
 */
export default class Roadmap {
  _id?: ObjectId;
  userId: ObjectId;
  roadmapTemplateId: ObjectId;  // ref → roadmap_templates._id
  name: string;                 // Tên hiển thị (VD: "AI Engineer Roadmap", "Transformer Deep-dive")
  // Tiến trình: key = topicOldId (slug), value = 'pending' | 'done' | 'in_progress' | 'skip'
  topicStatuses: Record<string, string>;
  topicNotes: Record<string, string>;
  bookmarkedResourceIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;

  constructor(roadmap: {
    _id?: ObjectId;
    userId: ObjectId;
    roadmapTemplateId: ObjectId;
    name: string;
    topicStatuses?: Record<string, string>;
    topicNotes?: Record<string, string>;
    bookmarkedResourceIds?: ObjectId[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    this._id = roadmap._id;
    this.userId = roadmap.userId;
    this.roadmapTemplateId = roadmap.roadmapTemplateId;
    this.name = roadmap.name;
    this.topicStatuses = roadmap.topicStatuses || {};
    this.topicNotes = roadmap.topicNotes || {};
    this.bookmarkedResourceIds = roadmap.bookmarkedResourceIds || [];
    this.createdAt = roadmap.createdAt || now;
    this.updatedAt = roadmap.updatedAt || now;
  }
}
