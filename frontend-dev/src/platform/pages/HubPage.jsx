import { ArrowUpRight, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import Brand from "../../shared/components/Brand";

export default function HubPageNew() {
    const navigate = useNavigate();
    const { user, roles, logout, approved, villaProConnected } = useAuth();

    const canUseCalendar =
        approved &&
        roles.includes("calendar_user") &&
        villaProConnected;

    const canUseAdmin =
        approved &&
        roles.includes("admin");

    return (
        <div className="min-h-screen bg-[#f6f6f4] text-[#111827]">
            <header className="border-b border-[#dcdeda] bg-[#f6f6f4]">
                <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 sm:px-8 lg:px-10">
                    <div>
                        <Brand size="md" />

                        <div className="mt-1 text-[11px] text-[#7b818a]">
                            Application Platform
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden text-right sm:block">
                            <div className="text-[13px] font-medium text-[#1f2937]">
                                {user?.email}
                            </div>

                            <div className="mt-0.5 text-[11px] text-[#858b93]">
                                {approved ? "Approved account" : "Pending approval"}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={logout}
                            className="flex h-9 w-9 items-center justify-center border border-[#d7dad6] bg-[#f6f6f4] text-[#737983] transition hover:border-[#bfc4bd] hover:text-[#111827]"
                            title="Log out"
                            aria-label="Log out"
                        >
                            <LogOut size={15} strokeWidth={1.7} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[1440px] px-6 pb-12 pt-10 sm:px-8 sm:pt-14 lg:px-10 lg:pt-16">
                <div className="grid gap-8 lg:grid-cols-[120px_minmax(0,1fr)] lg:gap-10">
                    <div className="pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9aa0a7]">
                        Applications
                    </div>

                    <div className="max-w-4xl">
                        <h1 className="text-[38px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[48px]">
                            Vadovsky Tech applications.
                        </h1>

                        <p className="mt-5 max-w-2xl text-[14px] leading-6 text-[#68707a]">
                            Focused tools for the work you actually need to do. Open an
                            application to enter its own workspace.
                        </p>
                    </div>
                </div>

                <section className="mt-12 lg:ml-[160px]">
                    <div className="divide-y divide-[#dcdeda] border-y border-[#dcdeda]">
                        <button
                            type="button"
                            disabled={!canUseCalendar}
                            onClick={() => navigate("/calendar")}
                            className={`group grid w-full gap-6 py-7 text-left transition sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center ${canUseCalendar
                                ? "hover:bg-white/70"
                                : "cursor-not-allowed opacity-50"
                                }`}
                        >
                            <div className="font-mono text-[12px] text-[#9aa0a7]">
                                01
                            </div>

                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                                    Parking
                                </div>

                                <div className="mt-1 text-[25px] font-semibold tracking-[-0.03em]">
                                    Calendar
                                </div>

                                <div className="mt-2 max-w-xl text-[13px] leading-5 text-[#737983]">
                                    Availability, reservations, automatic booking rules and the
                                    parking map.
                                </div>

                                <div className="mt-4 text-[11px] text-[#9aa0a7]">
                                    {canUseCalendar
                                        ? "Available"
                                        : !approved
                                            ? "Waiting for account approval"
                                            : !villaProConnected
                                                ? "Connect VillaPro to continue"
                                                : "Calendar access unavailable"}
                                </div>
                            </div>

                            <ArrowUpRight
                                size={22}
                                strokeWidth={1.5}
                                className="hidden text-[#9ba1a8] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#111827] sm:block"
                            />
                        </button>


                        <button
                            type="button"
                            onClick={() => navigate("/worlds")}
                            className="group grid w-full gap-6 py-7 text-left transition hover:bg-white/70 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center"
                        >
                            <div className="font-mono text-[12px] text-[#9aa0a7]">
                                02
                            </div>

                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-600">
                                    Science
                                </div>

                                <div className="mt-1 text-[25px] font-semibold tracking-[-0.03em]">
                                    Worlds
                                </div>

                                <div className="mt-2 max-w-xl text-[13px] leading-5 text-[#737983]">
                                    Build, model and simulate systems across physical domains.
                                </div>

                                <div className="mt-4 text-[11px] text-[#9aa0a7]">
                                    Available
                                </div>
                            </div>

                            <ArrowUpRight
                                size={22}
                                strokeWidth={1.5}
                                className="hidden text-[#9ba1a8] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#111827] sm:block"
                            />
                        </button>



                        <div className="grid gap-6 py-7 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center">
                            <div className="font-mono text-[12px] text-[#c0c4c8]">
                                03
                            </div>

                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a4a9af]">
                                    Future
                                </div>

                                <div className="mt-1 text-[22px] font-semibold tracking-[-0.025em] text-[#9da2a8]">
                                    Next application
                                </div>

                                <div className="mt-2 max-w-xl text-[13px] leading-5 text-[#a2a7ad]">
                                    A new focused workspace can be added here later without
                                    changing the Hub.
                                </div>
                            </div>

                            <div className="text-[11px] text-[#a4a9af]">
                                Coming later
                            </div>
                        </div>

                        {canUseAdmin && (
                            <button
                                type="button"
                                onClick={() => navigate("/admin")}
                                className="group grid w-full gap-6 py-7 text-left transition hover:bg-white/70 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center"
                            >
                                <div className="font-mono text-[12px] text-[#9aa0a7]">
                                    Admin
                                </div>

                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                                        Platform
                                    </div>

                                    <div className="mt-1 text-[25px] font-semibold tracking-[-0.03em]">
                                        Administration
                                    </div>

                                    <div className="mt-2 max-w-xl text-[13px] leading-5 text-[#737983]">
                                        Manage user approval, application access and account status.
                                    </div>

                                    <div className="mt-4 text-[11px] text-[#9aa0a7]">
                                        Available
                                    </div>
                                </div>

                                <ArrowUpRight
                                    size={22}
                                    strokeWidth={1.5}
                                    className="hidden text-[#9ba1a8] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#111827] sm:block"
                                />
                            </button>
                        )}
                    </div>
                </section>

                <footer className="mt-10 flex flex-col gap-3 text-[11px] text-[#8a9097] sm:flex-row sm:items-center sm:justify-between lg:ml-[160px]">
                    <span>Vadovsky Tech</span>

                    <span className="inline-flex items-center gap-2">
                        <span className="h-1.5 w-1.5 bg-emerald-500" />
                        System operational
                    </span>
                </footer>
            </main>
        </div>
    );
}