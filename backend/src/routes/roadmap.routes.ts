import { Router } from 'express';
import { roadmapController } from '~/controllers/roadmap.controller';
import { authMiddleware } from '~/middlewares/auth.middleware';
import { uploadCV } from '~/middlewares/upload.middleware';
import { wrapAsync } from '~/utils/wrapAsync';

const router = Router();

// Route: POST /api/roadmaps/generate
router.post(
  '/generate',
  wrapAsync(authMiddleware),
  uploadCV.single('cv'),
  wrapAsync(roadmapController.generateFromCV)
);

// Route: GET /api/roadmaps/latest
router.get(
  '/latest',
  wrapAsync(authMiddleware),
  wrapAsync(roadmapController.getLatestRoadmap)
);

// Route: POST /api/roadmaps/chat  (AI Tutor chatbox)
router.post(
  '/chat',
  wrapAsync(authMiddleware),
  wrapAsync(roadmapController.chatWithTutor)
);

// Route: GET /api/roadmaps/chat/history/:roadmapId/:topic
router.get(
  '/chat/history/:roadmapId/:topic',
  wrapAsync(authMiddleware),
  wrapAsync(roadmapController.getChatHistory)
);

// Route: PATCH /api/roadmaps/:roadmapId/topics/:topicId/complete
router.patch(
  '/:roadmapId/topics/:topicId/complete',
  wrapAsync(authMiddleware),
  wrapAsync(roadmapController.completeTopic)
);

export default router;
