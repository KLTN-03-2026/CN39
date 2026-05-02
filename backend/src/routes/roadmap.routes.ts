import { Router } from 'express';
import { roadmapController } from '~/controllers/roadmap.controller';
import { authMiddleware } from '~/middlewares/auth.middleware';
import { uploadCV } from '~/middlewares/upload.middleware';
import { wrapAsync } from '~/utils/wrapAsync';

const router = Router();

// 1. Template Routes (Public or Auth)
router.get(
  '/templates',
  wrapAsync(roadmapController.listTemplates)
);

router.get(
  '/preview/:slug',
  wrapAsync(roadmapController.previewTemplate)
);

// 2. Generation Routes
router.post(
  '/generate',
  wrapAsync(authMiddleware),
  uploadCV.single('cv'),
  wrapAsync(roadmapController.generateFromCV)
);

// 3. Instance Routes
router.get(
  '/latest',
  wrapAsync(authMiddleware),
  wrapAsync(roadmapController.getLatestRoadmap)
);

router.get(
  '/:id',
  wrapAsync(authMiddleware),
  wrapAsync(roadmapController.getById)
);

// 4. Interaction Routes
router.post(
  '/chat',
  wrapAsync(authMiddleware),
  wrapAsync(roadmapController.chatWithTutor)
);

router.get(
  '/chat/history/:roadmapId/:topic',
  wrapAsync(authMiddleware),
  wrapAsync(roadmapController.getChatHistory)
);

router.patch(
  '/:roadmapId/topics/:topicId/complete',
  wrapAsync(authMiddleware),
  wrapAsync(roadmapController.completeTopic)
);

export default router;
