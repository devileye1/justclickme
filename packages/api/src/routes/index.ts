import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './user';
import adRoutes from './ad';
import miningRoutes from './mining';
import matrixRoutes from './matrix';
import nftRoutes from './nft';
import adminRoutes from './admin';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/ad', adRoutes);
router.use('/mining', miningRoutes);
router.use('/matrix', matrixRoutes);
router.use('/nft', nftRoutes);
router.use('/admin', adminRoutes);

export default router;
