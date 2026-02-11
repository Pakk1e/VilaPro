import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "../guards/RequireAuth";
import RequireRole from "../guards/RequireRole";

import LoginPage from "../pages/LoginPage";
import HubPage from "../pages/HubPage";
import CalendarPage from "../pages/CalendarPage";
import WeatherPage from "../pages/WeatherPage";
import AdminPage from "../pages/AdminPage";
import RegisterPage from "../pages/RegisterPage";
import RequireApproved from "../guards/RequireApproved";
import WeatherMapPage from "../pages/WeatherMapPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

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
            <RequireRole role="calendar_user">
              <RequireApproved>
                <RequireAuth>
                  <CalendarPage />
                </RequireAuth>
              </RequireApproved>
            </RequireRole>

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
          path="/weather/map"
          element={
            <RequireAuth>
              <WeatherMapPage />
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
