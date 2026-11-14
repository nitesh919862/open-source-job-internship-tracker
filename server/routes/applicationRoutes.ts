import { Router } from 'express';
import {
  createApplication,
  deleteApplication,
  getMyApplications,
  updateApplication,
} from '../controllers/applicationController.ts';
import { protect } from '../middleware/auth.ts';

const router = Router();

router.use(protect);
router.post('/', createApplication);
router.get('/my', getMyApplications);
router.patch('/:id', updateApplication);
router.delete('/:id', deleteApplication);

export default router;
