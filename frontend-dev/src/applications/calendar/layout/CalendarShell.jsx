import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    ArrowLeft,
    CalendarDays,
    Car,
    Workflow,
    LogOut,
    Menu,
    X,
} from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";

const navItems = [
    { label: "Calendar", path: "/calendar", icon: CalendarDays },
    { label: "Reservations", path: "/calendar/reservations", icon: Car },
    { label: "Automations", path: "/calendar/automations", icon: Workflow },
];

export default function CalendarShell({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    const currentPath = location.pathname;

    const isActive = (path) => {
        if (path === "/calendar") {
            return currentPath === "/calendar";
        }

        return currentPath.startsWith(path);
    };

    const handleNavigation = (path) => {
        navigate(path);
        setIsMobileNavOpen(false);
    };

    return (
        <div className="h-screen overflow-hidden bg-[#f6f6f4] text-slate-900">
            {/* =========================================================
                HEADER
            ========================================================= */}
            <header className="h-16 border-b border-[#dcdeda] bg-[#f6f6f4]">
                <div className="flex h-full items-center justify-between px-5 sm:px-7">

                    {/* LEFT SIDE */}
                    <div className="flex items-center gap-4">

                        <button
                            type="button"
                            onClick={() => navigate("/hub")}
                            className="flex items-center gap-2 text-xs font-medium text-slate-500 transition hover:text-slate-900"
                        >
                            <ArrowLeft size={15} strokeWidth={1.7} />

                            <span className="hidden sm:inline">
                                Applications Hub
                            </span>
                        </button>

                        <div className="h-5 w-px bg-slate-200" />

                        <div>
                            <div className="text-[13px] font-semibold tracking-tight">
                                PARK<span className="text-blue-600">PRO</span>
                            </div>

                            <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400">
                                Parking / Calendar
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE */}
                    <div className="flex items-center gap-3">

                        <div className="hidden text-right sm:block">
                            <div className="text-xs font-medium text-slate-700">
                                {user?.email}
                            </div>
                        </div>

                        {/* MOBILE MENU BUTTON */}
                        <button
                            type="button"
                            onClick={() => setIsMobileNavOpen(true)}
                            className="flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900 lg:hidden"
                            title="Open navigation"
                            aria-label="Open navigation"
                        >
                            <Menu size={16} strokeWidth={1.7} />
                        </button>

                        {/* LOGOUT */}
                        <button
                            type="button"
                            onClick={logout}
                            className="flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                            title="Log out"
                            aria-label="Log out"
                        >
                            <LogOut size={14} strokeWidth={1.7} />
                        </button>
                    </div>
                </div>
            </header>

            {/* =========================================================
                MOBILE NAVIGATION DRAWER
            ========================================================= */}
            {isMobileNavOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">

                    {/* BACKDROP */}
                    <button
                        type="button"
                        onClick={() => setIsMobileNavOpen(false)}
                        className="absolute inset-0 bg-slate-950/20"
                        aria-label="Close navigation"
                    />

                    {/* DRAWER */}
                    <aside className="absolute left-0 top-0 flex h-full w-[280px] flex-col border-r border-[#dcdeda] bg-[#f6f6f4] shadow-xl">

                        {/* DRAWER HEADER */}
                        <div className="flex items-center justify-between border-b border-[#dcdeda] px-5 py-4">

                            <div>
                                <div className="text-[13px] font-semibold tracking-tight">
                                    PARK<span className="text-blue-600">PRO</span>
                                </div>

                                <div className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-slate-400">
                                    Parking
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsMobileNavOpen(false)}
                                className="flex h-8 w-8 items-center justify-center text-slate-500 transition hover:text-slate-900"
                                title="Close navigation"
                                aria-label="Close navigation"
                            >
                                <X size={17} strokeWidth={1.7} />
                            </button>
                        </div>

                        {/* NAVIGATION */}
                        <nav className="px-4 py-6">
                            <div className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Parking
                            </div>

                            <div className="space-y-1">
                                {navItems.map(({ label, path, icon: Icon }) => (
                                    <button
                                        key={path}
                                        type="button"
                                        onClick={() => handleNavigation(path)}
                                        className={`flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left text-sm transition ${isActive(path)
                                            ? "border-blue-600 bg-white text-slate-900"
                                            : "border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-900"
                                            }`}
                                    >
                                        <Icon
                                            size={16}
                                            strokeWidth={1.7}
                                        />

                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>
                        </nav>

                        {/* SYSTEM */}
                        <div className="mt-auto border-t border-[#dcdeda] px-5 py-5">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                                System
                            </div>

                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                                <span className="h-1.5 w-1.5 bg-emerald-500" />
                                Connected
                            </div>
                        </div>
                    </aside>
                </div>
            )}

            {/* =========================================================
                MAIN APPLICATION AREA
            ========================================================= */}
            <div className="flex h-[calc(100vh-4rem)] min-h-0">

                {/* DESKTOP SIDEBAR */}
                <aside className="hidden w-[220px] shrink-0 border-r border-[#dcdeda] bg-[#f6f6f4] lg:flex lg:flex-col">

                    <div className="px-5 pt-8">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Parking
                        </div>

                        <nav className="mt-5 space-y-1">
                            {navItems.map(({ label, path, icon: Icon }) => (
                                <button
                                    key={path}
                                    type="button"
                                    onClick={() => navigate(path)}
                                    className={`flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left text-sm transition ${isActive(path)
                                        ? "border-blue-600 bg-white text-slate-900"
                                        : "border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-900"
                                        }`}
                                >
                                    <Icon
                                        size={16}
                                        strokeWidth={1.7}
                                    />

                                    <span>{label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="mt-auto border-t border-[#dcdeda] px-5 py-5">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                            System
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                            <span className="h-1.5 w-1.5 bg-emerald-500" />
                            Connected
                        </div>
                    </div>
                </aside>

                {/* PAGE CONTENT */}
                <main className="min-w-0 min-h-0 flex-1 overflow-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}