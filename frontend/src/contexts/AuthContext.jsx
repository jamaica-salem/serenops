import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "../lib/api";

const AuthContext = createContext(null);
const AUTH_BYPASS = process.env.REACT_APP_BYPASS_AUTH === "true";
const DEV_GUEST_USER = {
  id: "dev-guest",
  email: "guest@local.dev",
  name: "Guest Viewer",
  role: "admin",
  avatar_url: null,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(AUTH_BYPASS ? DEV_GUEST_USER : null); // null=loading, false=anon, obj=user
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (AUTH_BYPASS) {
      setUser(DEV_GUEST_USER);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    if (AUTH_BYPASS) {
      setError("");
      setUser(DEV_GUEST_USER);
      return true;
    }
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      return true;
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
      return false;
    }
  };

  const register = async (email, password, name) => {
    if (AUTH_BYPASS) {
      setError("");
      setUser(DEV_GUEST_USER);
      return true;
    }
    setError("");
    try {
      const { data } = await api.post("/auth/register", { email, password, name });
      setUser(data);
      return true;
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
      return false;
    }
  };

  const logout = async () => {
    if (AUTH_BYPASS) {
      setUser(DEV_GUEST_USER);
      return;
    }
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, error, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
