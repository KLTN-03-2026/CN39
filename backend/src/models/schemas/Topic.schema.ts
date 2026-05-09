import { ObjectId } from 'mongodb';

// Schema cho collection `topics` — Dùng cho CẢ topic lẫn subtopic
// parentId = null → topic gốc
// parentId = ObjectId → subtopic (thuộc topic có _id = parentId)
// target = ObjectId → topic/subtopic TIẾP THEO cùng cấp (linked list)
// target = null → cuối chuỗi
export default class Topic {
  _id?: ObjectId;
  oldId: string;              // Slug gốc từ migration-mapping, vd: "internet", "what-is-http"
  roadmapId: ObjectId;        // ref → roadmapTemplates._id
  title: string;
  description: string;
  parentId: ObjectId | null;  // null = topic gốc, ObjectId = subtopic
  target: ObjectId | null;    // _id của node tiếp theo cùng cấp (linked list)
  resourceIds: ObjectId[];    // ref → resources._id
  order: number;              // Thứ tự (dùng để sort khi cần)

  constructor(topic: {
    _id?: ObjectId;
    oldId: string;
    roadmapId: ObjectId;
    title: string;
    description: string;
    parentId?: ObjectId | null;
    target?: ObjectId | null;
    resourceIds?: ObjectId[];
    order?: number;
  }) {
    this._id = topic._id;
    this.oldId = topic.oldId;
    this.roadmapId = topic.roadmapId;
    this.title = topic.title;
    this.description = topic.description;
    this.parentId = topic.parentId ?? null;
    this.target = topic.target ?? null;
    this.resourceIds = topic.resourceIds || [];
    this.order = topic.order || 0;
  }
}
