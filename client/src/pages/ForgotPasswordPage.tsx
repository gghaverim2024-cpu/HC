import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthShell, FormField } from '../components/layout/AuthShell';
import { Button } from '../components/ui/Primitives';
import { authApi } from '../api';

export function ForgotPasswordPage() {
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [devToken, setDevToken] = useState('');
  const [error, setError] = useState('');

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await authApi.forgotPassword(email);
    if (res.devResetToken) {
      setDevToken(res.devResetToken);
      setToken(res.devResetToken);
    }
    setStep('reset');
  }

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await authApi.resetPassword(token, newPassword);
      setStep('done');
    } catch {
      setError('הקישור לא תקין או שפג תוקפו');
    }
  }

  if (step === 'done') {
    return (
      <AuthShell title="הסיסמה עודכנה!" subtitle="כעת תוכל להתחבר עם הסיסמה החדשה">
        <Link to="/login">
          <Button className="w-full">חזרה להתחברות</Button>
        </Link>
      </AuthShell>
    );
  }

  if (step === 'reset') {
    return (
      <AuthShell title="איפוס סיסמה" subtitle="אין לנו שירות מייל מחובר בסביבה הזו, לכן הטוקן מוצג כאן ישירות">
        <form onSubmit={doReset}>
          {devToken && (
            <div className="mb-4 p-3 rounded-xl bg-hc-primary/10 border border-hc-primary/30 text-xs text-gray-300 break-all">
              קוד האיפוס שלך (דמו, ללא שליחת מייל אמיתית): <b className="text-hc-accent">{devToken}</b>
            </div>
          )}
          <FormField label="קוד איפוס" value={token} onChange={(e) => setToken(e.target.value)} required />
          <FormField
            label="סיסמה חדשה"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
          <Button type="submit" className="w-full">
            אפס סיסמה
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="שכחת סיסמה?" subtitle="הזן את כתובת המייל שלך ונשלח לך קוד איפוס">
      <form onSubmit={requestReset}>
        <FormField label="אימייל" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Button type="submit" className="w-full">
          שלח קוד איפוס
        </Button>
      </form>
      <p className="text-sm text-center mt-4">
        <Link to="/login" className="text-gray-400 hover:text-white">
          חזרה להתחברות
        </Link>
      </p>
    </AuthShell>
  );
}
