import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

function Tile({ title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all text-left"
    >
      <h2 className="text-lg font-black text-slate-900 mb-2 group-hover:text-blue-600 transition">
        {title}
      </h2>
      <p className="text-sm text-slate-500">
        {description}
      </p>
    </button>
  );
}

export default function HubPage() {
  const navigate = useNavigate();
  const { roles, user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100 p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Automation Hub
          </h1>
          <p className="text-sm text-slate-500">
            Welcome, {user.email}
          </p>
        </div>

        <button
          onClick={logout}
          className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-bold text-xs hover:bg-red-600 hover:text-white transition"
        >
          LOGOUT
        </button>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        {roles.includes("calendar_user") && (
          <Tile
            title="Calendar"
            description="Manage parking reservations, snipers, and availability."
            onClick={() => navigate("/calendar")}
          />
        )}

        {/* Weather (placeholder for now) */}
        <Tile
          title="Weather"
          description="Weather forecasts and conditions (coming soon)."
          onClick={() => navigate("/weather")}
        />

        {/* Admin */}
        {roles.includes("admin") && (
          <Tile
            title="Admin"
            description="User management, roles, and system configuration."
            onClick={() => navigate("/admin")}
          />
        )}

        <Tile
          title="New Widget"
          description="Does something cool."
          onClick={() => navigate("/new-widget")}
        />
      </div>
    </div>
  );
}
