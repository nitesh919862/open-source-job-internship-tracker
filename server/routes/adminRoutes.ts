import { Router } from 'express';
import {
  adminCreateOpportunity,
  adminDeleteOpportunity,
  adminListUsers,
  adminPurgeSampleData,
  adminUpdateOpportunity,
  adminUpdateUserRole,
  getAdminDashboard,
  listAdminSubmissions,
  moderateSubmission,
} from '../controllers/adminController.ts';
import { protect, requireAdmin } from '../middleware/auth.ts';

const router = Router();

router.use(protect, requireAdmin);
router.get('/dashboard', getAdminDashboard);
router.get('/submissions', listAdminSubmissions);
router.patch('/submissions/:id', moderateSubmission);
router.post('/opportunities', adminCreateOpportunity);
router.put('/opportunities/:id', adminUpdateOpportunity);
router.delete('/opportunities/:id', adminDeleteOpportunity);
router.delete('/sample-data', adminPurgeSampleData);
router.get('/users', adminListUsers);
router.patch('/users/:id/role', adminUpdateUserRole);

export default router;
