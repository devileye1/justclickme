import { Router } from 'express';
import { getMe, getDashboard } from '../controllers/user';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/me', requireAuth, getMe);
router.get('/dashboard', requireAuth, getDashboard);

export default router;
