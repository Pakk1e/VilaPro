import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function RequireAuth({ children }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return null; // or spinner
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}
