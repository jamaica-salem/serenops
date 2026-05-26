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
      <div className="hidden md:flex w-1/2 relative overflow-hidden bg-gradient-to-b from-primary to-primary/80 p-12 flex-col justify-between text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(123,196,164,0.22),transparent_40%),radial-gradient(circle_at_10%_82%,rgba(95,163,141,0.18),transparent_35%)]" />

        <div className="relative flex items-center">
          <BrandLogo className="h-14 w-auto select-none" alt="SerenOps" />
        </div>

        <div className="relative space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-card/10 rounded-full text-xs font-medium text-white border border-white/20">
            <Sparkles className="w-3.5 h-3.5" /> Client operations OS
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-bold leading-tight text-white">
            Complex operations,<br />handled calmly.
          </h1>
          <p className="text-primary-foreground/80 leading-relaxed">
            Manage clients, projects, invoices, contracts, payments, and tasks in one organized workspace.
          </p>
        </div>

        <div className="relative text-xs text-primary-foreground/70">© 2026 SerenOps</div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-muted/40">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6 bg-card border border-border rounded-2xl p-7 shadow-sm" data-testid="login-form">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to continue to your dashboard.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full h-10 px-3 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full h-10 px-3 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-ring"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-2" data-testid="login-error">
              {error}
            </div>
          )}

          <button
            data-testid="login-submit"
            type="submit"
            disabled={busy}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-sm text-muted-foreground text-center">
            New here?{" "}
            <Link to="/register" data-testid="login-register-link" className="text-primary font-medium hover:underline">
              Create an account
            </Link>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
            Demo: <span className="font-mono">demo@serenops.app / demo123</span>
            <br />
            Legacy demo also works: <span className="font-mono">demo@panze.app / demo123</span>
          </div>
        </form>
      </div>
    </div>
  );
}
