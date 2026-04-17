import { ObjectId } from 'mongodb';

interface RequestTokenType {
  _id?: ObjectId;
  token: string;
  user_id: ObjectId;
  created_at?: Date;
}

export default class RequestToken {
  _id?: ObjectId;
  token: string;
  user_id: ObjectId;
  created_at: Date;

  constructor({ _id, token, user_id, created_at }: RequestTokenType) {
    this._id = _id;
    this.token = token;
    this.user_id = typeof user_id === 'string' ? new ObjectId(user_id) : user_id;
    this.created_at = created_at || new Date();
  }
}
