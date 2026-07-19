import { Router } from 'express';
import { watchAd, getBalance } from '../controllers/ad';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/watch', requireAuth, watchAd);
router.get('/balance', requireAuth, getBalance);

export default router;
