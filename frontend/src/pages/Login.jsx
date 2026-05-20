import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Sparkles } from "lucide-react";

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
      <div className="hidden md:flex w-1/2 relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-orange-100 p-12 flex-col justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold font-display">S</div>
          <div className="font-display font-bold text-xl">SerenOps</div>
        </div>
        <div className="space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-xs font-medium text-orange-700 border border-orange-100">
            <Sparkles className="w-3.5 h-3.5" /> AI-first project management
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-bold leading-tight text-gray-900">
            Manage and track <br /> your projects.
          </h1>
          <p className="text-gray-600 leading-relaxed">
            A focused alternative to Jira. Crisp dashboards, smart insights, and an AI copilot
            that knows your tasks.
          </p>
        </div>
        <div className="text-xs text-gray-400">© 2026 SerenOps</div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6" data-testid="login-form">
          <div>
            <h2 className="font-display text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-sm text-gray-500 mt-1">Sign in to continue to your dashboard.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Email</label>
              <input
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Password</label>
              <input
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
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
            className="w-full h-10 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-700 transition-colors disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-sm text-gray-500 text-center">
            New here?{" "}
            <Link to="/register" data-testid="login-register-link" className="text-orange-700 font-medium hover:underline">
              Create an account
            </Link>
          </div>

          <div className="text-xs text-gray-400 text-center pt-4 border-t border-gray-100">
            Demo: <span className="font-mono">demo@serenops.app / demo123</span>
            <br />
            Legacy demo also works: <span className="font-mono">demo@panze.app / demo123</span>
          </div>
        </form>
      </div>
    </div>
  );
}
