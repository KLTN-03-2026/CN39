import { Router } from 'express';
import { ResourceController } from '../controllers/resource.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Route lấy danh sách tài nguyên (có search & phân trang)
router.get('/', ResourceController.listResources);

export default router;
