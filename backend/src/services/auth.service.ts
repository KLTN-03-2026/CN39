import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { databaseMongoClient } from '~/services/database.services';
import User from '~/models/schemas/User.schema';

const hashPassword = (password: string) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET as string, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET as string, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

class AuthService {
  async register(email: string, fullName: string, passwordRaw: string) {
    const existingUser = await databaseMongoClient.users.findOne({ email });
    if (existingUser) {
      throw { status: 400, message: 'Email này đã được sử dụng!' };
    }

    const passwordHash = hashPassword(passwordRaw);
    const newUser = new User({
      email,
      fullName,
      passwordHash
    });

    const result = await databaseMongoClient.users.insertOne(newUser);
    return {
      _id: result.insertedId,
      email,
      fullName
    };
  }

  async login(email: string, passwordRaw: string) {
    const user = await databaseMongoClient.users.findOne({ email });
    if (!user) {
      throw { status: 400, message: 'Tài khoản hoặc mật khẩu không chính xác' };
    }

    const passwordHash = hashPassword(passwordRaw);
    if (user.passwordHash !== passwordHash) {
      throw { status: 400, message: 'Tài khoản hoặc mật khẩu không chính xác' };
    }

    const { accessToken, refreshToken } = generateTokens(user._id!.toString());

    await databaseMongoClient.users.updateOne(
      { _id: user._id },
      { $set: { refreshToken: refreshToken } }
    );

    return {
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      accessToken,
      refreshToken
    };
  }

  async refresh(oldRefreshToken: string) {
    if (!oldRefreshToken) throw { status: 401, message: 'Yêu cầu Refresh Token' };

    try {
      const decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET as string) as { userId: string };
      
      const user = await databaseMongoClient.users.findOne({ _id: new ObjectId(decoded.userId) });
      
      if (!user || user.refreshToken !== oldRefreshToken) {
        throw { status: 403, message: 'Token không khớp trên Database hoặc đã bị thu hồi' };
      }

      const { accessToken, refreshToken } = generateTokens(decoded.userId);

      await databaseMongoClient.users.updateOne(
        { _id: user._id },
        { $set: { refreshToken: refreshToken } }
      );

      return { accessToken, refreshToken };

    } catch (error: any) {
       throw { status: 401, message: error.message || 'Refresh Token hết hạn hoặc không hợp lệ.' };
    }
  }

  async logout(userId: string) {
    await databaseMongoClient.users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { refreshToken: "" } } 
    );
  }
}

export const authService = new AuthService();
