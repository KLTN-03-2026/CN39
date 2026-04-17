import { ObjectId } from 'mongodb';

interface ChatMessageType {
  _id?: ObjectId;
  user_id: ObjectId;
  roadmap_id: ObjectId;
  topic_id: string;
  role: 'user' | 'model';
  content: string;
  created_at?: Date;
}

export default class ChatMessage {
  _id?: ObjectId;
  user_id: ObjectId;
  roadmap_id: ObjectId;
  topic_id: string; 
  role: 'user' | 'model';
  content: string;
  created_at: Date;

  constructor({ _id, user_id, roadmap_id, topic_id, role, content, created_at }: ChatMessageType) {
    this._id = _id;
    this.user_id = typeof user_id === 'string' ? new ObjectId(user_id) : user_id;
    this.roadmap_id = typeof roadmap_id === 'string' ? new ObjectId(roadmap_id) : roadmap_id;
    this.topic_id = topic_id;
    this.role = role;
    this.content = content;
    this.created_at = created_at || new Date();
  }
}
