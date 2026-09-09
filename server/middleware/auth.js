import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'hc-israel-dev-secret-change-me';

export function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: '30d',
  });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'לא מחובר' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: 'טוקן לא תקין' });
  }
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = { id: payload.sub, username: payload.username, role: payload.role };
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}
