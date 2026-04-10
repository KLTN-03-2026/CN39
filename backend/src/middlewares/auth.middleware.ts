import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HTTP_STATUS } from '~/constants/httpStatus';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { status: HTTP_STATUS.UNAUTHORIZED, message: "Không tìm thấy token xác thực" };
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: "Chưa cấu hình JWT_SECRET" };
  }

  try {
    const decoded = jwt.verify(token, secret) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    throw { status: HTTP_STATUS.UNAUTHORIZED, message: "Token không hợp lệ hoặc đã hết hạn" };
  }
};
