import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Sparkles } from "lucide-react";
import BrandLogo from "../components/BrandLogo";

export default function Login() {
  const { user, login, error } = useAuth();
  const [email, setEmail] = useState("demo@serenops.app");
  const [password, setPassword] = useState("demo123");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await login(email, password);
    setBusy(false);
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left brand panel */}
      <div className="hidden md:flex w-1/2 relative overflow-hidden bg-gradient-to-b from-[#0F2B24] to-[#123C31] p-12 flex-col justify-between text-[#f3f7f5]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(123,196,164,0.22),transparent_40%),radial-gradient(circle_at_10%_82%,rgba(95,163,141,0.18),transparent_35%)]" />

        <div className="relative flex items-center">
          <BrandLogo className="h-14 w-auto select-none" alt="SerenOps" />
        </div>

        <div className="relative space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-xs font-medium text-white border border-white/20">
            <Sparkles className="w-3.5 h-3.5" /> Client operations OS
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-bold leading-tight text-white">
            Complex operations,<br />handled calmly.
          </h1>
          <p className="text-[#d5e2dc] leading-relaxed">
            Manage clients, projects, invoices, contracts, payments, and tasks in one organized workspace.
          </p>
        </div>

        <div className="relative text-xs text-[#c8d7d1]">© 2026 SerenOps</div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#F7FAF8]">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6 bg-white border border-[#E5ECE8] rounded-2xl p-7 shadow-sm" data-testid="login-form">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#1C4B3E] dark:text-[#d7e6b6]">Welcome back</h2>
            <p className="text-sm text-[#667C74] mt-1">Sign in to continue to your dashboard.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[#667C74]">Email</label>
              <input
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm text-[#1D2A25] focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#667C74]">Password</label>
              <input
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm text-[#1D2A25] focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-2" data-testid="login-error">
              {error}
            </div>
          )}

          <button
            data-testid="login-submit"
            type="submit"
            disabled={busy}
            className="w-full h-10 rounded-lg bg-[#5FA38D] text-white font-medium hover:bg-[#4E8C79] transition-colors disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-sm text-[#667C74] text-center">
            New here?{" "}
            <Link to="/register" data-testid="login-register-link" className="text-[#2f6f5a] font-medium hover:underline">
              Create an account
            </Link>
          </div>

          <div className="text-xs text-[#8EA39B] text-center pt-4 border-t border-[#E5ECE8]">
            Demo: <span className="font-mono">demo@serenops.app / demo123</span>
            <br />
            Legacy demo also works: <span className="font-mono">demo@panze.app / demo123</span>
          </div>
        </form>
      </div>
    </div>
  );
}
