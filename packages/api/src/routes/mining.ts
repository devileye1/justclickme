import { Router } from 'express';
import { subscribe, claim, getStatus } from '../controllers/mining';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/subscribe', requireAuth, subscribe);
router.post('/claim', requireAuth, claim);
router.get('/status', requireAuth, getStatus);

export default router;
