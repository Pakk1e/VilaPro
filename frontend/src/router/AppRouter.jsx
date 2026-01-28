import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "../guards/RequireAuth";
import RequireRole from "../guards/RequireRole";

import LoginPage from "../pages/LoginPage";
import HubPage from "../pages/HubPage";
import CalendarPage from "../pages/CalendarPage";
import WeatherPage from "../pages/WeatherPage";
import AdminPage from "../pages/AdminPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/hub"
          element={
            <RequireAuth>
              <HubPage />
            </RequireAuth>
          }
        />

        <Route
          path="/calendar"
          element={
            <RequireAuth>
              <CalendarPage />
            </RequireAuth>
          }
        />

        <Route
          path="/weather"
          element={
            <RequireAuth>
              <WeatherPage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireRole role="admin">
                <AdminPage />
              </RequireRole>
            </RequireAuth>
          }
        />

        {/* Default */}
        <Route path="*" element={<Navigate to="/hub" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
