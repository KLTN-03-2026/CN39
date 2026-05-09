import { Router } from 'express';
import { roadmapController } from '~/controllers/roadmap.controller';
import { authMiddleware } from '~/middlewares/auth.middleware';
import { uploadCV } from '~/middlewares/upload.middleware';
import { wrapAsync } from '~/utils/wrapAsync';

const router = Router();

// ═══ Generate ═══
router.post('/generate', wrapAsync(authMiddleware), uploadCV.single('cv'), wrapAsync(roadmapController.generateFromCV));

// ═══ Roadmap CRUD ═══
router.get('/latest', wrapAsync(authMiddleware), wrapAsync(roadmapController.getLatestRoadmap));
router.get('/my', wrapAsync(authMiddleware), wrapAsync(roadmapController.getMyRoadmaps));
router.get('/templates', wrapAsync(roadmapController.listTemplates));
router.get('/preview/:slug', wrapAsync(roadmapController.previewTemplate));
router.get('/:id', wrapAsync(authMiddleware), wrapAsync(roadmapController.getById));

// ═══ Skill Roadmap Deep-dive ═══
router.post('/skill/:slug', wrapAsync(authMiddleware), wrapAsync(roadmapController.createSkillRoadmap));

// ═══ Topic Status ═══
router.patch('/:roadmapId/topics/:topicSlug/status', wrapAsync(authMiddleware), wrapAsync(roadmapController.updateTopicStatus));
router.get('/progress/:roadmapId', wrapAsync(authMiddleware), wrapAsync(roadmapController.getProgress));

// ═══ Bookmark ═══
router.patch('/:roadmapId/bookmark/:resourceId', wrapAsync(authMiddleware), wrapAsync(roadmapController.toggleBookmark));
router.get('/:roadmapId/bookmarks', wrapAsync(authMiddleware), wrapAsync(roadmapController.getBookmarks));

// ═══ AI Tutor Chat ═══
router.post('/chat', wrapAsync(authMiddleware), wrapAsync(roadmapController.chatWithTutor));
router.get('/chat/history/:roadmapId/:topic', wrapAsync(authMiddleware), wrapAsync(roadmapController.getChatHistory));

export default router;
