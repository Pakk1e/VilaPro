import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function RequireRole({ role, children }) {
  const { roles } = useAuth();

  if (!roles.includes(role)) {
    return <Navigate to="/hub" replace />;
  }

  return children;
}
