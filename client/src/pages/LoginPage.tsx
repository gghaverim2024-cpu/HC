import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthShell, FormField } from '../components/layout/AuthShell';
import { Button } from '../components/ui/Primitives';
import { useAuthStore } from '../store/authStore';
import { ApiError } from '../api/client';

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();
  const location = useLocation();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(usernameOrEmail, password);
      const to = (location.state as any)?.from || '/';
      navigate(to, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה בהתחברות');
    }
  }

  return (
    <AuthShell title="ברוכים השבים!" subtitle="התחבר כדי לחזור לעולם הגיימינג שלך">
      <form onSubmit={onSubmit}>
        <FormField
          label="שם משתמש או מייל"
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          autoFocus
          required
        />
        <FormField
          label="סיסמה"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'מתחבר...' : 'התחברות'}
        </Button>
      </form>
      <div className="flex items-center justify-between mt-4 text-sm">
        <Link to="/forgot-password" className="text-gray-400 hover:text-white">
          שכחת סיסמה?
        </Link>
        <Link to="/register" className="text-hc-accent font-semibold hover:underline">
          עדיין אין לך חשבון?
        </Link>
      </div>
      <p className="text-[11px] text-gray-600 text-center mt-6">
        לבדיקה מהירה: demo / demo1234
      </p>
    </AuthShell>
  );
}
