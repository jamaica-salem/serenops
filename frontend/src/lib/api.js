import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// Skip these endpoints in the 401 redirect logic — they are part of the auth probe.
const AUTH_PROBE_PATHS = ["/auth/me", "/auth/login", "/auth/register", "/auth/logout"];

// Global 401 handler — on any auth failure outside the probe, send the user
// to /login. Components can still .catch() their own errors locally.
api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    const status = err?.response?.status;
    const url = err?.config?.url || "";
    const isAuthProbe = AUTH_PROBE_PATHS.some((p) => url.includes(p));
    if (status === 401 && !isAuthProbe && typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        // Use replace so the user can't back-button into the broken state
        window.location.replace("/login");
      }
    }
    return Promise.reject(err);
  }
);

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
