import { ObjectId } from 'mongodb';

export interface ResourceItem {
  type: string;
  url: string;
  label: string;
  isPremium: boolean;
}

export interface TopicItem {
  topicId: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean; // true = Khuyến nghị (bắt buộc để mở khoá Phase kế), false = Tuỳ chọn
  resources: ResourceItem[];
}

export interface PhaseItem {
  phaseName: string;
  duration: string;
  description?: string;
  isCompleted?: boolean;
  resources?: ResourceItem[];
  topics: TopicItem[];
}

// Lưu chung tất cả vào 1 Document theo Quy Tắc Thiết Kế MongoDB (Nhúng - Embed)
export default class Roadmap {
  _id?: ObjectId;
  userId: ObjectId;
  targetRole: string; // Vị trí người dùng muốn hướng tới
  level: string; // Trình độ được AI nhận diện (Intern, Fresher, Junior)
  phases: PhaseItem[];
  createdAt: Date;
  updatedAt: Date;

  constructor(roadmap: {
    _id?: ObjectId;
    userId: ObjectId;
    targetRole: string;
    level: string;
    phases: PhaseItem[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    this._id = roadmap._id;
    this.userId = roadmap.userId;
    this.targetRole = roadmap.targetRole;
    this.level = roadmap.level;
    this.phases = roadmap.phases.map(phase => ({
      phaseName: phase.phaseName,
      duration: phase.duration,
      description: phase.description || "",
      isCompleted: phase.isCompleted || false,
      resources: phase.resources || [],
      topics: phase.topics.map(topic => ({
        topicId: topic.topicId,
        title: topic.title,
        description: topic.description,
        isCompleted: topic.isCompleted || false,
        isRequired: topic.isRequired !== undefined ? topic.isRequired : true, // Mặc định là khuyến nghị
        resources: topic.resources || []
      }))
    }));
    this.createdAt = roadmap.createdAt || now;
    this.updatedAt = roadmap.updatedAt || now;
  }
}
