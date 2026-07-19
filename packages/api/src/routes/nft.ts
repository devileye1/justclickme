import { Router } from 'express';
import { getMyNFTs } from '../controllers/nft';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/my', requireAuth, getMyNFTs);

export default router;
