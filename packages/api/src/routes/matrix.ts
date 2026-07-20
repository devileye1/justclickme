import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getPosition, getDashboard, getTree, getPoolStatus, retopUp, requestWithdrawal } from '../controllers/matrix';

const router = Router();

router.get('/position', requireAuth, getPosition);
router.get('/dashboard', requireAuth, getDashboard);
router.get('/tree', requireAuth, getTree);
router.get('/pool-status', requireAuth, getPoolStatus);
router.post('/retopup', requireAuth, retopUp);
router.post('/withdraw', requireAuth, requestWithdrawal);

export default router;
