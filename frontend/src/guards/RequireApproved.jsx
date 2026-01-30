import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function RequireApproved({ children }) {
    const { approved, initializing } = useAuth();

    if (initializing) return null;
    if (!approved) return <Navigate to="/hub" replace />;

    return children;
}
