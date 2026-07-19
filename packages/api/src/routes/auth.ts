import { Router } from 'express';
import { getNonce, login } from '../controllers/auth';

const router = Router();

router.post('/nonce', getNonce);
router.post('/login', login);

export default router;
