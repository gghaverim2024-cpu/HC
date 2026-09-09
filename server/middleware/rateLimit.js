const hits = new Map(); // userId -> timestamps[]

// simple in-memory sliding window: max N actions per windowMs per user
export function rateLimit({ max = 5, windowMs = 5000 } = {}) {
  return (req, res, next) => {
    const key = req.user?.id || req.ip;
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) {
      return res.status(429).json({ error: 'לאט מדי, נסה שוב בעוד רגע' });
    }
    arr.push(now);
    hits.set(key, arr);
    next();
  };
}
