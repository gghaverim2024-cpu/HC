import { Router } from 'express';
import { nanoid } from 'nanoid';
import { get, run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { targetType, targetId, reason } = req.body || {};
    if (!['user', 'message', 'post'].includes(targetType) || !targetId || !reason?.trim()) {
      return res.status(400).json({ error: 'נתוני דיווח לא תקינים' });
    }
    const id = nanoid();
    await run('INSERT INTO reports (id, reporter_id, target_type, target_id, reason) VALUES (?,?,?,?,?)', [
      id,
      req.user.id,
      targetType,
      targetId,
      reason,
    ]);
    res.status(201).json({ ok: true });
  })
);

export default router;
