import React, { useState } from 'react';
import { loginAdmin } from '../api';
import { Printer, Lock, Mail, AlertCircle, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@quickprint.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await loginAdmin(email, password);
      const token = data.token || data.accessToken;
      if (!token) {
        throw new Error('No authentication token received from server');
      }
      localStorage.setItem('admin_jwt_token', token);
      localStorage.setItem('admin_user_data', JSON.stringify(data));
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Invalid email or password credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#E2E2E2] shadow-xs p-8 sm:p-10 space-y-8">
        {/* Brand & Heading */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#111111] text-white flex items-center justify-center mx-auto shadow-xs">
            <Printer className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight">Shop Owner Portal</h1>
          <p className="text-sm text-[#6B6B6B]">Sign in to manage print queue & pricing</p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Shop Admin Email</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-neutral-400 absolute left-4 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@quickprint.com"
                className="input-field pl-12 h-12 text-base"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-neutral-400 absolute left-4 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-12 h-12 text-base"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full h-14 text-base font-bold mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="p-4 bg-neutral-50 rounded-xl border border-[#E2E2E2] text-xs text-[#6B6B6B] flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Demo Shop: QuickPrint Jamshedpur</span>
        </div>
      </div>
    </div>
  );
};
