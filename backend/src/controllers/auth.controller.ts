import { Request, Response } from 'express';
import { authService } from '~/services/auth.service';
import { AuthRequest } from '~/middlewares/auth.middleware';

class AuthController {
  public register = async (req: Request, res: Response) => {
    const { email, fullName, password } = req.body;
    if (!email || !fullName || !password) {
      throw { status: 400, message: 'Vui lòng nhập đủ thông tin' };
    }
    
    const user = await authService.register(email, fullName, password);
    res.status(201).json({ message: 'Đăng ký thành công', user });
  };

  public login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      throw { status: 400, message: 'Vui lòng cung cấp email và mật khẩu' };
    }

    const session = await authService.login(email, password);
    
    res.cookie('refreshToken', session.refreshToken, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'strict',
       maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
       message: 'Đăng nhập thành công',
       user: {
         id: session.userId,
         email: session.email,
         fullName: session.fullName
       },
       accessToken: session.accessToken
    });
  };

  public refresh = async (req: Request, res: Response) => {
    const oldRefreshToken = req.headers.cookie
       ?.split('; ')
       ?.find(row => row.startsWith('refreshToken='))
       ?.split('=')[1];

    if (!oldRefreshToken) {
       throw { status: 401, message: 'Không có token refresh' };
    }

    try {
      const { accessToken, refreshToken } = await authService.refresh(oldRefreshToken);

      res.cookie('refreshToken', refreshToken, {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: 'strict',
         maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(200).json({ accessToken });
    } catch(err) {
      res.clearCookie('refreshToken');
      throw err;
    }
  };

  public logout = async (req: AuthRequest, res: Response) => {
    if (req.userId) {
       await authService.logout(req.userId);
    }
    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Đăng xuất an toàn thành công' });
  };
}

export const authController = new AuthController();
