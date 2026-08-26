import React, { useState } from "react";
import { loginAdmin, signupAdmin, forgotPassword, resetPassword } from "../api";
import {
  Printer,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Loader2,
  User,
  Phone
} from "lucide-react";

export const AuthPage = ({ onLoginSuccess }) => {
  const [view, setView] = useState("login"); // login, signup, forgot, reset
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");

  const clearMessages = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      const data = await loginAdmin(email, password);
      const jwtToken = data.token || data.accessToken;
      if (!jwtToken) throw new Error("No authentication token received");
      
      localStorage.setItem("admin_jwt_token", jwtToken);
      localStorage.setItem("admin_user_data", JSON.stringify(data));
      onLoginSuccess(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    clearMessages();
    try {
      const data = await signupAdmin(name, phone, email, password, confirmPassword);
      const jwtToken = data.token || data.accessToken;
      localStorage.setItem("admin_jwt_token", jwtToken);
      localStorage.setItem("admin_user_data", JSON.stringify(data));
      onLoginSuccess(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to sign up.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      const msg = await forgotPassword(email);
      setSuccessMsg("If an account exists, a reset link has been sent.");
      setView("reset"); // Go to reset view to enter token
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      await resetPassword(token, password);
      setSuccessMsg("Password reset successfully! Please login.");
      setView("login");
      setPassword("");
      setToken("");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Reset failed.");
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
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight">
            PrintAlfa Desktop
          </h1>
          <p className="text-sm text-[#6B6B6B]">
            {view === "login" && "Sign in to your shop"}
            {view === "signup" && "Create a new shop account"}
            {view === "forgot" && "Reset your password"}
            {view === "reset" && "Enter your reset token"}
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOGIN VIEW */}
        {view === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-neutral-400 pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="input-field input-with-icon"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-neutral-400 pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field input-with-icon"
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <button type="button" onClick={() => setView("signup")} className="text-blue-600 font-semibold hover:underline">
                Create Account
              </button>
              <button type="button" onClick={() => setView("forgot")} className="text-blue-600 font-semibold hover:underline">
                Forgot Password?
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full h-12 rounded-lg bg-black text-white font-bold flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Sign In</span><ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>
        )}

        {/* SIGNUP VIEW */}
        {view === "signup" && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="w-5 h-5 text-neutral-400 pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="input-field input-with-icon" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Phone</label>
              <div className="relative">
                <Phone className="w-5 h-5 text-neutral-400 pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
                <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="1234567890" className="input-field input-with-icon" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-neutral-400 pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" className="input-field input-with-icon" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-neutral-400 pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field input-with-icon" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-neutral-400 pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
                <input type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input-field input-with-icon" />
              </div>
            </div>
            
            <div className="text-sm text-center">
              <button type="button" onClick={() => setView("login")} className="text-blue-600 font-semibold hover:underline">
                Already have an account? Login
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full h-12 rounded-lg bg-black text-white font-bold flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Sign Up</span><ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD VIEW */}
        {view === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-neutral-400 pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="input-field input-with-icon"
                />
              </div>
            </div>
            
            <div className="text-sm text-center flex justify-between">
              <button type="button" onClick={() => setView("login")} className="text-blue-600 font-semibold hover:underline">
                Back to Login
              </button>
              <button type="button" onClick={() => setView("reset")} className="text-blue-600 font-semibold hover:underline">
                Have a token?
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full h-12 rounded-lg bg-black text-white font-bold flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Send Reset Link</span><ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>
        )}

        {/* RESET PASSWORD VIEW */}
        {view === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">Reset Token</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-neutral-400 pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste token here"
                  className="input-field input-with-icon"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">New Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-neutral-400 pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field input-with-icon"
                />
              </div>
            </div>
            
            <div className="text-sm text-center">
              <button type="button" onClick={() => setView("login")} className="text-blue-600 font-semibold hover:underline">
                Back to Login
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full h-12 rounded-lg bg-black text-white font-bold flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Reset Password</span><ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
