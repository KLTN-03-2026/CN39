import { Router } from 'express';
import { authController } from '~/controllers/auth.controller';
import { authMiddleware } from '~/middlewares/auth.middleware';
import { wrapAsync } from '~/utils/wrapAsync';

const router = Router();

router.post('/register', wrapAsync(authController.register));
router.post('/login', wrapAsync(authController.login));
router.post('/refresh-token', wrapAsync(authController.refresh));

// Protected Route
router.post('/logout', wrapAsync(authMiddleware), wrapAsync(authController.logout));

export default router;
