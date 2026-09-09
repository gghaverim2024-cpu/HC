export const ROLE_RANK = {
  user: 0,
  verified: 1,
  helper: 2,
  moderator: 3,
  admin: 4,
  owner: 5,
};

export function requireRole(minRole) {
  return (req, res, next) => {
    const rank = ROLE_RANK[req.user?.role] ?? 0;
    if (rank < ROLE_RANK[minRole]) {
      return res.status(403).json({ error: 'אין לך הרשאה לפעולה זו' });
    }
    next();
  };
}
