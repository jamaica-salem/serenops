import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import BrandLogo from "../components/BrandLogo";

export default function Register() {
  const { user, register, error } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await register(email, password, name);
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7FAF8] px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-sm border border-[#E5ECE8] space-y-5"
        data-testid="register-form"
      >
        <div className="flex items-center gap-2 mb-2">
          <BrandLogo className="h-9 w-auto select-none" alt="SerenOps" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-[#1D2A25]">Create account</h2>
          <p className="text-sm text-[#667C74] mt-1">Start managing projects in minutes.</p>
        </div>

        <div className="space-y-3">
          <input
            data-testid="register-name"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
          />
          <input
            data-testid="register-email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
          />
          <input
            data-testid="register-password"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full h-10 px-3 rounded-lg border border-[#E5ECE8] text-sm focus:outline-none focus:ring-2 focus:ring-[#5FA38D]/25 focus:border-[#5FA38D]"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-2" data-testid="register-error">
            {error}
          </div>
        )}

        <button
          data-testid="register-submit"
          type="submit"
          disabled={busy}
          className="w-full h-10 rounded-lg bg-[#5FA38D] text-white font-medium hover:bg-[#4E8C79] transition-colors disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create account"}
        </button>

        <div className="text-sm text-[#667C74] text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-[#2f6f5a] font-medium hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
