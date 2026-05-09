import { ObjectId } from 'mongodb';

interface UserType {
  _id?: ObjectId;
  email: string;
  fullName: string;
  passwordHash: string;
  bookmarkedResources?: ObjectId[];
  createdAt?: Date;
}

export default class User {
  _id?: ObjectId;
  email: string;
  fullName: string;
  passwordHash: string;
  bookmarkedResources: ObjectId[];
  createdAt: Date;

  constructor(user: UserType) {
    this._id = user._id;
    this.email = user.email;
    this.fullName = user.fullName;
    this.passwordHash = user.passwordHash;
    this.bookmarkedResources = user.bookmarkedResources || [];
    this.createdAt = user.createdAt || new Date();
  }
}
