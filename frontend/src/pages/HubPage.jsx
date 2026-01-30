import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";



import { useState } from "react";

import VillaProModal from "../components/VillaProModal";


function Tile({ title, description, onClick, disabled, status }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`group bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all text-left 
        ${disabled ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-white hover:shadow-xl"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-black text-slate-900 mb-2 group-hover:text-blue-600 transition">
          {title}
        </h2>
        <span
          className={`h-3 w-3 rounded-full
            ${status === "connected" && "bg-green-500"}
            ${status === "pending" && "bg-yellow-400"}
            ${status === "disabled" && "bg-slate-400"}
          `}
        />
      </div>
      <p className="text-sm text-slate-500">
        {description}
      </p>
    </button >
  );
}

export default function HubPage() {
  const navigate = useNavigate();
  const { roles, user, logout, refreshMe, approved, villaProConnected } = useAuth();
  const [showVillaProModal, setShowVillaProModal] = useState(false);


  /* ---------- Calendar tile state ---------- */
  let calendarStatus = "disabled";
  let calendarDescription = "Waiting for approval";

  if (approved) {
    if (villaProConnected) {
      calendarStatus = "connected";
      calendarDescription = "Manage parking reservations.";
    } else {
      calendarStatus = "pending";
      calendarDescription = "Connect your VillaPro account.";
    }
  }



  return (

    <div className="min-h-screen bg-slate-100 p-10">

      {
        showVillaProModal && (
          <VillaProModal
            onClose={() => setShowVillaProModal(false)}
            onSuccess={async () => {
              await refreshMe();   // 👈 THIS IS THE FIX
              setShowVillaProModal(false);
              navigate("/calendar");
            }}
          />
        )
      }
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Automation Hub</h1>
          <p className="text-sm text-slate-500">Welcome, {user.email}</p>
          {!approved && (
            <p className="text-sm text-slate-800 mt-2 font-semibold italic">
              More tools will appear once your account is approved.
            </p>
          )}
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
            status={calendarStatus}
            disabled={!approved}
            description={calendarDescription}
            onClick={() => {
              if (!villaProConnected) {
                setShowVillaProModal(true);
              } else {
                navigate("/calendar");
              }
            }}
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




