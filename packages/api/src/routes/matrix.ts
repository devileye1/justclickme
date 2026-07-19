import { Router } from 'express';
import { getPosition, retopUp } from '../controllers/matrix';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/position', requireAuth, getPosition);
router.post('/retopup', requireAuth, retopUp);

export default router;
