import { ObjectId } from 'mongodb';

export default class Resource {
  _id?: ObjectId;
  title: string;
  url: string;
  description: string;
  type: string; // 'youtube', 'course_premium', 'document'
  tags: string[]; // Các từ khóa e.g., 'Node.js', 'SQL', 'Backend'
  embedding?: number[]; // Vector Embedding dùng cho RAG Search
  createdAt: Date;

  constructor(resource: {
    _id?: ObjectId;
    title: string;
    url: string;
    description: string;
    type: string;
    tags: string[];
    embedding?: number[];
  }) {
    this._id = resource._id;
    this.title = resource.title;
    this.url = resource.url;
    this.description = resource.description;
    this.type = resource.type;
    this.tags = resource.tags;
    this.embedding = resource.embedding;
    this.createdAt = new Date();
  }
}
