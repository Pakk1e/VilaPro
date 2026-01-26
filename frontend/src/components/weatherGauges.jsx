import React from "react";

/* ---------- UV GAUGE ---------- */
export function UVGauge({ value }) {
  const clamped = Math.min(value ?? 0, 11);
  const angle = (clamped / 11) * 180;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="60" viewBox="0 0 120 60">
        <path
          d="M10 50 A50 50 0 0 1 110 50"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="10"
        />
        <path
          d="M10 50 A50 50 0 0 1 110 50"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="10"
          strokeDasharray={`${(angle / 180) * 157} 157`}
        />
      </svg>
      <div className="text-2xl font-bold">{value ?? "—"}</div>
    </div>
  );
}

/* ---------- HUMIDITY BAR ---------- */
export function HumidityBar({ value }) {
  return (
    <div>
      <div className="text-2xl font-bold mb-2">{value ?? "—"}%</div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500"
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- AIR QUALITY ---------- */
export function AQIBadge({ value }) {
  let color = "bg-green-500";
  let label = "Good";

  if (value > 50) { color = "bg-yellow-400"; label = "Moderate"; }
  if (value > 100) { color = "bg-orange-500"; label = "Unhealthy"; }
  if (value > 150) { color = "bg-red-500"; label = "Very Unhealthy"; }

  return (
    <div className="flex items-center gap-3">
      <div className={`w-4 h-4 rounded-full ${color}`} />
      <div>
        <div className="text-2xl font-bold">{value ?? "—"}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </div>
  );
}
