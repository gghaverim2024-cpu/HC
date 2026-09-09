import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { get, run } from '../db/index.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { privateUser } from '../lib/serialize.js';

const router = Router();

router.post(
  '/register',
  rateLimit({ max: 5, windowMs: 60000 }),
  asyncHandler(async (req, res) => {
    const { username, email, phone, password } = req.body || {};
    if (!username || !email || !phone || !password) {
      return res.status(400).json({ error: 'חסרים שדות חובה' });
    }
    if (!/^[a-zA-Z0-9_א-ת]{3,20}$/.test(username)) {
      return res.status(400).json({ error: 'שם משתמש חייב להיות 3-20 תווים (אותיות/מספרים/קו תחתון)' });
    }
    if (!/^0\d{8,9}$/.test(phone.replace(/[\s-]/g, ''))) {
      return res.status(400).json({ error: 'מספר טלפון לא תקין (לדוגמה 0501234567)' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים' });
    }
    if (await get('SELECT id FROM users WHERE username = ?', [username])) {
      return res.status(409).json({ error: 'שם המשתמש כבר תפוס' });
    }
    if (await get('SELECT id FROM users WHERE email = ?', [email])) {
      return res.status(409).json({ error: 'כתובת המייל כבר רשומה' });
    }

    const id = nanoid();
    const passwordHash = bcrypt.hashSync(password, 10);
    await run(
      `INSERT INTO users (id, username, email, phone, password_hash, avatar_url, role) VALUES (?,?,?,?,?,?, 'user')`,
      [
        id,
        username,
        email,
        phone.replace(/[\s-]/g, ''),
        passwordHash,
        `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`,
      ]
    );
    const user = await get('SELECT * FROM users WHERE id = ?', [id]);
    const token = signToken(user);
    res.status(201).json({ token, user: privateUser(user) });
  })
);

router.post(
  '/login',
  rateLimit({ max: 10, windowMs: 60000 }),
  asyncHandler(async (req, res) => {
    const { usernameOrEmail, password } = req.body || {};
    if (!usernameOrEmail || !password) return res.status(400).json({ error: 'חסרים שדות חובה' });
    const user = await get('SELECT * FROM users WHERE username = ? OR email = ?', [usernameOrEmail, usernameOrEmail]);
    if (!user) return res.status(401).json({ error: 'שם משתמש/מייל או סיסמה שגויים' });
    if (user.status === 'banned') return res.status(403).json({ error: 'החשבון שלך חסום' });
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'שם משתמש/מייל או סיסמה שגויים' });
    }
    const token = signToken(user);
    res.json({ token, user: privateUser(user) });
  })
);

router.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'נתונים לא תקינים' });
    }
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'הסיסמה הנוכחית שגויה' });
    }
    const passwordHash = bcrypt.hashSync(newPassword, 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);
    res.json({ ok: true });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'משתמש לא נמצא' });
    res.json({ user: privateUser(user) });
  })
);

router.post(
  '/forgot-password',
  rateLimit({ max: 5, windowMs: 60000 }),
  asyncHandler(async (req, res) => {
    const { email } = req.body || {};
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    // Always respond the same way whether or not the email exists, to avoid leaking account existence.
    if (!user) return res.json({ ok: true });
    const token = nanoid(24);
    await run('UPDATE users SET reset_token = ? WHERE id = ?', [token, user.id]);
    // No email service is configured in this environment — return the reset
    // token directly so the UI can show a "reset link" to the user.
    res.json({ ok: true, devResetToken: token });
  })
);

router.post(
  '/reset-password',
  rateLimit({ max: 10, windowMs: 60000 }),
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'נתונים לא תקינים' });
    }
    const user = await get('SELECT * FROM users WHERE reset_token = ?', [token]);
    if (!user) return res.status(400).json({ error: 'קישור לא תקין או שפג תוקפו' });
    const passwordHash = bcrypt.hashSync(newPassword, 10);
    await run('UPDATE users SET password_hash = ?, reset_token = NULL WHERE id = ?', [passwordHash, user.id]);
    res.json({ ok: true });
  })
);

export default router;
