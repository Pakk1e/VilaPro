import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function PageHeader({ title }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/hub")}
          className="text-sm font-bold text-slate-500 hover:text-slate-900 transition"
        >
          ← Back to Hub
        </button>

        <h1 className="text-xl font-black text-slate-900">
          {title}
        </h1>
      </div>

      <button
        onClick={logout}
        className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-bold text-xs hover:bg-red-600 hover:text-white transition"
      >
        LOGOUT
      </button>
    </div>
  );
}
