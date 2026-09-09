import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { answerQuery } from '../lib/hcAi.js';

const router = Router();

router.post(
  '/ask',
  optionalAuth,
  rateLimit({ max: 15, windowMs: 30000 }),
  asyncHandler(async (req, res) => {
    const { message } = req.body || {};
    const result = await answerQuery(message, { excludeUserId: req.user?.id });
    res.json(result);
  })
);

export default router;
