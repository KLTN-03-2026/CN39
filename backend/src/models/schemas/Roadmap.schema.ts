import { ObjectId } from 'mongodb';

export interface ResourceItem {
  title: string;
  url: string;
  type: string;
  description?: string;
  isPremium?: boolean;
}

export interface TopicItem {
  topicId: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
  resources: ResourceItem[];
  subTopics?: TopicItem[];
  skillRoadmapSlug?: string;
  status?: 'not_started' | 'in_progress' | 'completed';
}

export default class Roadmap {
  _id?: ObjectId;
  userId: ObjectId;
  targetRole: string;
  level: string;
  topics: TopicItem[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    totalTopics: number;
    completedTopics: number;
    estimatedDays: number;
  };

  constructor(roadmap: {
    _id?: ObjectId;
    userId: ObjectId;
    targetRole: string;
    level: string;
    topics: TopicItem[];
    createdAt?: Date;
    updatedAt?: Date;
    metadata?: any;
  }) {
    const now = new Date();
    this._id = roadmap._id;
    this.userId = roadmap.userId;
    this.targetRole = roadmap.targetRole;
    this.level = roadmap.level;
    this.topics = roadmap.topics || [];
    this.createdAt = roadmap.createdAt || now;
    this.updatedAt = roadmap.updatedAt || now;
    this.metadata = roadmap.metadata || {
      totalTopics: this.topics.length,
      completedTopics: 0,
      estimatedDays: 30
    };
  }
}
