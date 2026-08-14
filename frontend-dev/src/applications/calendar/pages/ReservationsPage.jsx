import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../auth/AuthProvider";
import CalendarShell from "../layout/CalendarShell";

const RESERVATIONS_CACHE_KEY = "parkpro_reservations_cache_v1";

function formatDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);

    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

export default function ReservationsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const email = user?.email;

    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        function readCachedReservations() {
            try {
                const cached = sessionStorage.getItem(
                    RESERVATIONS_CACHE_KEY
                );

                if (!cached) {
                    return null;
                }

                const parsed = JSON.parse(cached);

                if (!Array.isArray(parsed.reservations)) {
                    return null;
                }

                return parsed;
            } catch {
                return null;
            }
        }

        function writeCachedReservations(data) {
            try {
                sessionStorage.setItem(
                    RESERVATIONS_CACHE_KEY,
                    JSON.stringify({
                        reservations: data,
                        timestamp: Date.now(),
                    })
                );
            } catch {
                // Cache is only an optimization.
            }
        }

        async function loadReservations({
            silent = false,
        } = {}) {
            if (!email) {
                if (!cancelled) {
                    setLoading(false);
                }
                return;
            }

            try {
                if (!silent && !cancelled) {
                    setLoading(true);
                }

                if (!cancelled) {
                    setError(null);
                }

                const reservationResponse =
                    await apiFetch("/api/reservations");

                if (!reservationResponse.ok) {
                    throw new Error(
                        "Failed to load reservations."
                    );
                }

                const reservationData =
                    await reservationResponse.json();

                const baseReservations = Array.isArray(
                    reservationData.reservations
                )
                    ? reservationData.reservations
                    : [];

                if (baseReservations.length === 0) {
                    if (!cancelled) {
                        setReservations([]);
                    }

                    writeCachedReservations([]);
                    return;
                }

                /*
                 * Group reservations by month so we only request
                 * each availability month once.
                 */
                const monthGroups = new Map();

                for (const reservation of baseReservations) {
                    const date = new Date(
                        `${reservation.date}T00:00:00`
                    );

                    const year = date.getFullYear();
                    const month = date.getMonth() + 1;
                    const key = `${year}-${month}`;

                    if (!monthGroups.has(key)) {
                        monthGroups.set(key, {
                            year,
                            month,
                        });
                    }
                }

                const availabilityByMonth = new Map();

                await Promise.all(
                    Array.from(
                        monthGroups.entries()
                    ).map(
                        async ([key, { year, month }]) => {
                            try {
                                const response =
                                    await apiFetch(
                                        `/api/availability?month=${month}&year=${year}&email=${encodeURIComponent(
                                            email
                                        )}`
                                    );

                                if (!response.ok) {
                                    return;
                                }

                                const data =
                                    await response.json();

                                availabilityByMonth.set(
                                    key,
                                    {
                                        reserved:
                                            Array.isArray(
                                                data.reserved
                                            )
                                                ? data.reserved
                                                : [],
                                    }
                                );
                            } catch (err) {
                                console.error(
                                    `Failed to load availability for ${key}:`,
                                    err
                                );
                            }
                        }
                    )
                );

                const enrichedReservations =
                    baseReservations.map(
                        (reservation) => {
                            const date = new Date(
                                `${reservation.date}T00:00:00`
                            );

                            const year =
                                date.getFullYear();

                            const month =
                                date.getMonth() + 1;

                            const day =
                                date.getDate();

                            const key =
                                `${year}-${month}`;

                            const monthlyAvailability =
                                availabilityByMonth.get(
                                    key
                                );

                            const matchingReservation =
                                monthlyAvailability?.reserved?.find(
                                    (item) =>
                                        item.day === day
                                );

                            return {
                                ...reservation,
                                spot:
                                    matchingReservation?.lot ||
                                    null,
                            };
                        }
                    );

                if (cancelled) {
                    return;
                }

                setReservations(
                    enrichedReservations
                );

                writeCachedReservations(
                    enrichedReservations
                );
            } catch (err) {
                console.error(
                    "Reservations load error:",
                    err
                );

                /*
                 * A background refresh failure should NOT
                 * destroy already-visible cached data.
                 */
                if (!silent && !cancelled) {
                    setError(
                        err.message ||
                        "Failed to load reservations."
                    );
                }
            } finally {
                if (!silent && !cancelled) {
                    setLoading(false);
                }
            }
        }

        const cached = readCachedReservations();

        if (cached) {
            /*
             * Show cached reservations immediately.
             */
            setReservations(cached.reservations);
            setLoading(false);

            /*
             * Refresh silently in the background.
             */
            loadReservations({
                silent: true,
            });
        } else {
            /*
             * First visit: normal loading state.
             */
            loadReservations({
                silent: false,
            });
        }

        return () => {
            cancelled = true;
        };
    }, [email]);

    return (
        <CalendarShell>
            <div className="flex h-full min-h-0 flex-col p-5 sm:p-7 lg:p-8">

                {/* HEADER */}
                <div className="border-b border-[#dcdeda] pb-6">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                        Parking
                    </div>

                    <div className="mt-2">
                        <h1 className="text-3xl font-semibold tracking-[-0.035em]">
                            Reservations
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Your active parking reservations.
                        </p>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="min-h-0 flex-1 overflow-y-auto pt-6">

                    {loading && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <LoaderCircle
                                size={16}
                                className="animate-spin"
                            />
                            Loading reservations…
                        </div>
                    )}

                    {!loading && error && (
                        <div className="border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                            {error}
                        </div>
                    )}

                    {!loading && !error && reservations.length === 0 && (
                        <div className="border border-slate-200 bg-white px-6 py-10 text-center">
                            <div className="text-sm font-medium text-slate-700">
                                No active reservations
                            </div>

                            <div className="mt-2 text-sm text-slate-400">
                                Your active parking reservations will appear here.
                            </div>
                        </div>
                    )}

                    {!loading && !error && reservations.length > 0 && (
                        <div className="border border-slate-200 bg-white">
                            <div className="border-b border-slate-200 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Active reservations
                            </div>

                            <div>
                                {reservations.map((reservation) => (
                                    <div
                                        key={reservation.id}
                                        className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">
                                                {formatDate(reservation.date)}
                                            </div>

                                            <div className="mt-1 text-sm text-slate-500">
                                                {reservation.spot
                                                    ? `Spot ${reservation.spot} · `
                                                    : ""}
                                                {reservation.plate_number}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600">
                                                Active
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigate(`/calendar?date=${reservation.date}`);
                                                }}
                                                className="flex items-center gap-2 text-sm font-medium text-slate-700 transition hover:text-blue-600"
                                            >
                                                Open in calendar
                                                <ArrowRight
                                                    size={15}
                                                    strokeWidth={1.7}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </CalendarShell>
    );
}