import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="h-screen flex items-center justify-center text-muted-foreground" data-testid="auth-loading">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }
  if (user === false) return <Navigate to="/login" replace />;
  return children;
}
