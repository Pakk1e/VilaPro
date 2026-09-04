import React, { lazy, Suspense } from "react";
import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import RequireAuth from "../guards/RequireAuth";
import RequireRole from "../guards/RequireRole";
import RequireApproved from "../guards/RequireApproved";

import LoginPage from "../auth/pages/LoginPage";
import RegisterPage from "../auth/pages/RegisterPage";

const HubPage = lazy(() => import("../platform/pages/HubPage"));
const CalendarShellPage = lazy(() => import("../applications/calendar/pages/CalendarShellPage"));
const ReservationsPage = lazy(() => import("../applications/calendar/pages/ReservationsPage"));
const AutomationsPage = lazy(() => import("../applications/calendar/pages/AutomationsPage"));
const AdminPage = lazy(() => import("../platform/pages/AdminPage"));
const WorldsShellPage = lazy(() => import("../applications/worlds/pages/WorldsShellPage"));

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Suspense
                fallback={
                    <div className="min-h-screen bg-[#f6f6f4] flex items-center justify-center text-sm text-slate-400">
                        Loading…
                    </div>
                }
            >
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
                        path="/admin"
                        element={
                            <RequireAuth>
                                <RequireApproved>
                                    <RequireRole role="admin">
                                        <AdminPage />
                                    </RequireRole>
                                </RequireApproved>
                            </RequireAuth>
                        }
                    />

                    <Route
                        path="/calendar"
                        element={
                            <RequireAuth>
                                <RequireApproved>
                                    <RequireRole role="calendar_user">
                                        <CalendarShellPage />
                                    </RequireRole>
                                </RequireApproved>
                            </RequireAuth>
                        }
                    />

                    <Route
                        path="/calendar/reservations"
                        element={
                            <RequireAuth>
                                <RequireApproved>
                                    <RequireRole role="calendar_user">
                                        <ReservationsPage />
                                    </RequireRole>
                                </RequireApproved>
                            </RequireAuth>
                        }
                    />

                    <Route
                        path="/calendar/automations"
                        element={
                            <RequireAuth>
                                <RequireApproved>
                                    <RequireRole role="calendar_user">
                                        <AutomationsPage />
                                    </RequireRole>
                                </RequireApproved>
                            </RequireAuth>
                        }
                    />

                    <Route
                        path="/worlds"
                        element={
                            <RequireAuth>
                                <RequireApproved>
                                    <WorldsShellPage />
                                </RequireApproved>
                            </RequireAuth>
                        }
                    />

                    <Route
                        path="*"
                        element={<Navigate to="/hub" replace />}
                    />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}