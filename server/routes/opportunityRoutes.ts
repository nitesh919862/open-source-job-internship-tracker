import { Router } from 'express';
import {
  getOpportunityById,
  getPublicStats,
  listMySubmissions,
  listPublicOpportunities,
  submitOpportunity,
} from '../controllers/opportunityController.ts';
import { optionalAuth, protect } from '../middleware/auth.ts';

const router = Router();

router.get('/', listPublicOpportunities);
router.get('/stats', getPublicStats);
router.get('/my-submissions', protect, listMySubmissions);
router.post('/submit', protect, submitOpportunity);
router.get('/:id', optionalAuth, getOpportunityById);

export default router;
