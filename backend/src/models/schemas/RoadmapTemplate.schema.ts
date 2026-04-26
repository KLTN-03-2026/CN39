import { ObjectId } from 'mongodb';
import { databaseMongoClient } from '~/services/database.services';

export interface TimelineCardItem {
  id: string; // The semantic ID like 'topic-internet'
  title: string;
  description: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'LOCKED' | 'NOT_STARTED';
  resources: { title: string, url: string }[];
  dependencies: string[]; // IDs of items this depends on
}

export interface TimelinePhase {
  title: string;
  level: string; // Beginner | Intermediate | Advanced
  items: TimelineCardItem[];
}

export default class RoadmapTemplate {
  _id?: ObjectId;
  slug: string; // Tên file, vd: 'frontend', 'backend'
  title: string;
  phases: TimelinePhase[];
  createdAt: Date;
  updatedAt: Date;

  constructor(template: {
    _id?: ObjectId;
    slug: string;
    title: string;
    phases: TimelinePhase[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    const now = new Date();
    this._id = template._id;
    this.slug = template.slug;
    this.title = template.title;
    this.phases = template.phases;
    this.createdAt = template.createdAt || now;
    this.updatedAt = template.updatedAt || now;
  }
}
