import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell, FormField } from '../components/layout/AuthShell';
import { Button } from '../components/ui/Primitives';
import { useAuthStore } from '../store/authStore';
import { ApiError } from '../api/client';

export function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await register(username, email, phone, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'שגיאה בהרשמה');
    }
  }

  return (
    <AuthShell title="הצטרפו ל-HC Israel" subtitle="הבית של הגיימרים בישראל מחכה לך">
      <form onSubmit={onSubmit}>
        <FormField
          label="שם משתמש"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          required
          minLength={3}
          maxLength={20}
        />
        <FormField label="אימייל" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <FormField
          label="מספר טלפון"
          type="tel"
          placeholder="0501234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          pattern="0\d{8,9}"
        />
        <FormField
          label="סיסמה"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'נרשם...' : 'הרשמה'}
        </Button>
      </form>
      <p className="text-sm text-center mt-4 text-gray-400">
        כבר יש לך חשבון?{' '}
        <Link to="/login" className="text-hc-accent font-semibold hover:underline">
          התחבר
        </Link>
      </p>
    </AuthShell>
  );
}
