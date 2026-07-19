import { Router } from 'express';
import {
  getStats,
  listUsers,
  getUserDetail,
  suspendUser,
  adjustBalance,
  listAuditLogs,
  listSessions,
  listContractEvents,
  listFinancialTransactions,
  getAnalytics,
  updateConfig,
  releaseAirdrop,
} from '../controllers/admin';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/stats', requireAuth, requireAdmin, getStats);
router.get('/users', requireAuth, requireAdmin, listUsers);
router.get('/users/:id', requireAuth, requireAdmin, getUserDetail);
router.post('/users/:id/suspend', requireAuth, requireAdmin, suspendUser);
router.post('/users/:id/adjust-balance', requireAuth, requireAdmin, adjustBalance);
router.get('/audit', requireAuth, requireAdmin, listAuditLogs);
router.get('/sessions', requireAuth, requireAdmin, listSessions);
router.get('/events', requireAuth, requireAdmin, listContractEvents);
router.get('/transactions', requireAuth, requireAdmin, listFinancialTransactions);
router.get('/analytics', requireAuth, requireAdmin, getAnalytics);
router.put('/config', requireAuth, requireAdmin, updateConfig);
router.post('/airdrop/release', requireAuth, requireAdmin, releaseAirdrop);

export default router;
