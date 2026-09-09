import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { requireAuth } from '../middleware/auth.js';
import { uploadBuffer } from '../lib/storage.js';

const ALLOWED = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) return cb(new Error('סוג קובץ לא נתמך'));
    cb(null, true);
  },
});

const router = Router();

router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'לא הועלה קובץ' });
  const ext = path.extname(req.file.originalname).slice(0, 10) || '.jpg';
  const url = await uploadBuffer(req.file.buffer, `images/${nanoid()}${ext}`, req.file.mimetype);
  res.status(201).json({ url });
});

export default router;
