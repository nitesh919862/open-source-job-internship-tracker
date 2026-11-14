import { Router } from 'express';
import {
  createBookmark,
  deleteBookmark,
  getMyBookmarks,
} from '../controllers/bookmarkController.ts';
import { protect } from '../middleware/auth.ts';

const router = Router();

router.use(protect);
router.post('/', createBookmark);
router.get('/', getMyBookmarks);
router.delete('/:id', deleteBookmark);

export default router;
