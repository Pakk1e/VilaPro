import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../auth/AuthProvider";
import { apiFetch } from "../../../lib/api";

import CalendarShell from "../layout/CalendarShell";
import CalendarGrid from "../components/CalendarGrid";
import useCalendarData from "../hooks/useCalendarData";
import ParkingMapModal from "../components/ParkingMapModal";

import { LoaderCircle } from "lucide-react";

const RESERVATIONS_CACHE_KEY = "parkpro_reservations_cache_v1";

function updateReservationsCacheAfterAction({
    email,
    date,
    action,
    plate,
}) {
    if (!email) return;

    try {
        const cached = sessionStorage.getItem(
            RESERVATIONS_CACHE_KEY
        );

        // Do not create a partial cache if one does not exist yet.
        if (!cached) return;

        const parsed = JSON.parse(cached);

        if (!Array.isArray(parsed.reservations)) {
            return;
        }

        let reservations = [...parsed.reservations];

        if (action === "ADD") {
            const existingIndex = reservations.findIndex(
                (reservation) => reservation.date === date
            );

            const updatedReservation = {
                id:
                    existingIndex >= 0
                        ? reservations[existingIndex].id
                        : `pending-${date}`,
                date,
                plate_number: plate,
                status: "active",
                spot:
                    existingIndex >= 0
                        ? reservations[existingIndex].spot || null
                        : null,
            };

            if (existingIndex >= 0) {
                reservations[existingIndex] = {
                    ...reservations[existingIndex],
                    ...updatedReservation,
                };
            } else {
                reservations.push(updatedReservation);
            }
        }

        if (action === "DEL") {
            reservations = reservations.filter(
                (reservation) =>
                    reservation.date !== date
            );
        }

        sessionStorage.setItem(
            RESERVATIONS_CACHE_KEY,
            JSON.stringify({
                reservations,
                timestamp: Date.now(),
            })
        );
    } catch (error) {
        // Cache is only an optimization.
        console.warn(
            "Failed to update reservations cache:",
            error
        );
    }
}

const dayData = {
    8: {
        weekday: "Saturday",
        status: "Available",
        description: "Parking is currently available.",
        type: "available",
    },
    13: {
        weekday: "Thursday",
        status: "Full",
        description: "No parking is currently available.",
        type: "full",
    },
    15: {
        weekday: "Saturday",
        status: "Reserved",
        description: "You have a reservation for this date.",
        type: "reserved",
        spot: "80",
        plate: "SE651BJ",
    },
    16: {
        weekday: "Sunday",
        status: "Reserved",
        description: "You have a reservation for this date.",
        type: "reserved",
        spot: "85",
        plate: "SE651BJ",
    },
    22: {
        weekday: "Saturday",
        status: "Sniping active",
        description: "ParkPro is monitoring this date for availability.",
        type: "sniping",
    },
};

function SelectedDay({
    selectedDate,
    availability,
    snipingDates,
    activePlate,
    processingAction,
    onReserve,
    onRemoveReservation,
    onStartSniper,
    onStopSniper,
    onViewMap,
}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDay = selectedDate.getDate();

    const dateKey = [
        selectedDate.getFullYear(),
        String(selectedDate.getMonth() + 1).padStart(2, "0"),
        String(selectedDay).padStart(2, "0"),
    ].join("-");

    const reservation = availability.reserved.find(
        (item) => item.day === selectedDay
    );

    const isPast = selectedDate < today;

    const maxBookableDate = new Date(today);
    maxBookableDate.setDate(today.getDate() + 13);

    const isOutsideBookingWindow =
        selectedDate > maxBookableDate;

    const isSniping = snipingDates.includes(dateKey);
    const isFull = availability.full.includes(selectedDay);
    const isFree = availability.free.includes(selectedDay);

    let status = "Unavailable";
    let statusType = "unavailable";

    if (isPast) {
        status = "Past";
        statusType = "past";
    } else if (reservation) {
        status = "Reserved";
        statusType = "reserved";
    } else if (isSniping) {
        status = "Sniping active";
        statusType = "sniping";
    } else if (isFull) {
        status = "Full";
        statusType = "full";
    } else if (isFree) {
        status = "Available";
        statusType = "available";
    } else if (isOutsideBookingWindow) {
        status = "Unavailable";
        statusType = "unavailable";
    }

    const statusColor = {
        available: "bg-emerald-500",
        full: "bg-rose-500",
        reserved: "bg-blue-500",
        sniping: "bg-orange-500",
        unavailable: "bg-slate-400",
        past: "bg-slate-300",
    };

    return (
        <aside className="min-h-0 overflow-y-auto border border-slate-200 bg-white">

            {/* HEADER */}
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                    Selected date
                </div>

                <div className="mt-2 text-xl font-semibold tracking-tight">
                    {selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                    })}
                </div>
            </div>

            {/* CONTENT */}
            <div className="p-5 sm:p-6">

                {/* STATUS */}
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Status
                </div>

                <div className="mt-3 flex items-center gap-2">
                    <span
                        className={`h-2 w-2 rounded-full ${statusColor[statusType]}`}
                    />

                    <span className="text-sm font-semibold text-slate-900">
                        {status}
                    </span>
                </div>

                {/* RESERVATION */}
                {reservation && (
                    <div className="mt-6 border-t border-slate-200 pt-5">

                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Your reservation
                        </div>

                        <div className="mt-3 text-lg font-semibold">
                            Spot {reservation.lot || "—"}
                        </div>

                        <div className="mt-1 text-sm text-slate-500">
                            {reservation.plate || activePlate || "—"}
                        </div>
                    </div>
                )}

                {/* SNIPER */}
                {isSniping && (
                    <div className="mt-6 border-t border-slate-200 pt-5">

                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-600">
                            Live monitor
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            ParkPro is monitoring this date for
                            parking availability.
                        </p>
                    </div>
                )}

                {/* OUTSIDE WINDOW */}
                {statusType === "unavailable" && (
                    <div className="mt-6 border-t border-slate-200 pt-5">
                        <p className="text-sm leading-6 text-slate-500">
                            This date is outside the current direct
                            booking window. You can still monitor it
                            with a sniper.
                        </p>
                    </div>
                )}

                {/* ACTIONS */}
                <div className="mt-7 border-t border-slate-200 pt-5">

                    {/* RESERVED */}
                    {statusType === "reserved" && (
                        <>
                            <button
                                type="button"
                                onClick={() => onViewMap()}
                                className="w-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                View parking map
                            </button>

                            <button
                                type="button"
                                disabled={processingAction !== null}
                                onClick={() => onRemoveReservation(selectedDate)}
                                className="mt-2 flex w-full items-center justify-center gap-2 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-70"
                            >
                                {processingAction === "remove" ? (
                                    <>
                                        <LoaderCircle
                                            size={15}
                                            strokeWidth={1.8}
                                            className="animate-spin"
                                        />
                                        <span>Removing…</span>
                                    </>
                                ) : (
                                    "Remove reservation"
                                )}
                            </button>
                        </>
                    )}

                    {/* AVAILABLE */}
                    {statusType === "available" && (
                        <button
                            type="button"
                            disabled={processingAction !== null}
                            onClick={() => onReserve(selectedDate)}
                            className="flex w-full items-center justify-center gap-2 bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
                        >
                            {processingAction === "reserve" ? (
                                <>
                                    <LoaderCircle
                                        size={15}
                                        strokeWidth={1.8}
                                        className="animate-spin"
                                    />
                                    <span>Reserving…</span>
                                </>
                            ) : (
                                "Reserve parking"
                            )}
                        </button>
                    )}

                    {/* FULL */}
                    {statusType === "full" && (
                        <button
                            type="button"
                            disabled={processingAction !== null}
                            onClick={() => onStartSniper(selectedDate)}
                            className="flex w-full items-center justify-center gap-2 bg-orange-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-orange-600 disabled:cursor-wait disabled:opacity-70"
                        >
                            {processingAction === "start-sniper" ? (
                                <>
                                    <LoaderCircle
                                        size={15}
                                        strokeWidth={1.8}
                                        className="animate-spin"
                                    />
                                    <span>Starting sniper…</span>
                                </>
                            ) : (
                                "Start sniper"
                            )}
                        </button>
                    )}

                    {/* UNAVAILABLE FUTURE */}
                    {statusType === "unavailable" && (
                        <button
                            type="button"
                            disabled={processingAction !== null}
                            onClick={() => onStartSniper(selectedDate)}
                            className="flex w-full items-center justify-center gap-2 bg-orange-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-orange-600 disabled:cursor-wait disabled:opacity-70"
                        >
                            {processingAction === "start-sniper" ? (
                                <>
                                    <LoaderCircle
                                        size={15}
                                        strokeWidth={1.8}
                                        className="animate-spin"
                                    />
                                    <span>Starting sniper…</span>
                                </>
                            ) : (
                                "Start sniper"
                            )}
                        </button>
                    )}

                    {/* ACTIVE SNIPER */}
                    {statusType === "sniping" && (
                        <button
                            type="button"
                            disabled={processingAction !== null}
                            onClick={() => onStopSniper(selectedDate)}
                            className="flex w-full items-center justify-center gap-2 border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
                        >
                            {processingAction === "stop-sniper" ? (
                                <>
                                    <LoaderCircle
                                        size={15}
                                        strokeWidth={1.8}
                                        className="animate-spin"
                                    />
                                    <span>Stopping sniper…</span>
                                </>
                            ) : (
                                "Stop sniper"
                            )}
                        </button>
                    )}

                    {/* PAST */}
                    {statusType === "past" && (
                        <div className="text-sm text-slate-400">
                            This date has already passed.
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}

export default function CalendarShellPage() {
    const { user } = useAuth();
    const [processingActions, setProcessingActions] = useState({});
    const [isMapOpen, setIsMapOpen] = useState(false);
    const email = user?.email;

    const [searchParams] = useSearchParams();

    const queryDate = searchParams.get("date");

    const setDateProcessing = (date, action) => {
        const key = dateToString(date);

        setProcessingActions((current) => {
            const next = { ...current };

            if (action) {
                next[key] = action;
            } else {
                delete next[key];
            }

            return next;
        });
    };

    const initialDate = (() => {
        if (!queryDate) {
            return new Date();
        }

        const parsed = new Date(`${queryDate}T00:00:00`);

        return Number.isNaN(parsed.getTime())
            ? new Date()
            : parsed;
    })();

    const [viewedDate, setViewedDate] = useState(
        new Date(
            initialDate.getFullYear(),
            initialDate.getMonth(),
            1
        )
    );

    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [plateEditorOpen, setPlateEditorOpen] = useState(false);
    const [plateDraft, setPlateDraft] = useState("");
    const [plateSaving, setPlateSaving] = useState(false);
    const [plateError, setPlateError] = useState("");




    const {
        availability,
        snipingDates,
        activePlate,
        loading,
        lastSyncedAt,
        error,
        refresh,
        refreshSnipers,
    } = useCalendarData(email, viewedDate);

    useEffect(() => {
        setPlateDraft(activePlate || "");
    }, [activePlate]);

    const selectedReservation = availability.reserved.find(
        (item) => item.day === selectedDate.getDate()
    );

    const goToPreviousMonth = () => {
        setViewedDate(
            (current) =>
                new Date(current.getFullYear(), current.getMonth() - 1, 1)
        );
    };

    const goToNextMonth = () => {
        setViewedDate(
            (current) =>
                new Date(current.getFullYear(), current.getMonth() + 1, 1)
        );
    };

    const saveActivePlate = async () => {
        const plate = plateDraft.trim().toUpperCase();

        if (!plate) {
            setPlateError("Enter a plate number.");
            return;
        }

        setPlateSaving(true);
        setPlateError("");

        try {
            const response = await apiFetch("/api/plate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ plate }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.error || "Failed to save active plate."
                );
            }

            setPlateDraft(result.activePlate);
            setPlateEditorOpen(false);

            // Refresh calendar data so the hook gets the new active plate.
            await refresh();
        } catch (error) {
            console.error("Failed to save active plate:", error);
            setPlateError(
                error.message || "Failed to save active plate."
            );
        } finally {
            setPlateSaving(false);
        }
    };

    const dateToString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const reserveDate = async (date) => {
        setDateProcessing(date, "reserve");
        await new Promise((resolve) => requestAnimationFrame(resolve));
        try {
            const response = await apiFetch("/api/reservations/instant", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    date: dateToString(date),
                    plate: activePlate,
                    command: "ADD",
                }),
            });

            const result = await response.json();

            if (!response.ok || (!result.status && !result.success)) {
                throw new Error(
                    result.message || "Reservation was rejected."
                );
            }

            updateReservationsCacheAfterAction({
                email,
                date: dateToString(date),
                action: "ADD",
                plate: activePlate,
            });

            await refresh();

        } catch (error) {
            console.error("Reserve failed:", error);
            alert(error.message || "Failed to create reservation.");
        } finally {
            setDateProcessing(date, null);
        }
    };

    const removeReservation = async (date) => {
        setDateProcessing(date, "remove");
        await new Promise((resolve) => requestAnimationFrame(resolve));

        try {
            const response = await apiFetch("/api/reservations/instant", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    date: dateToString(date),
                    plate: activePlate,
                    command: "DEL",
                }),
            });

            const result = await response.json();

            if (!response.ok || (!result.status && !result.success)) {
                throw new Error(
                    result.message || "Reservation removal was rejected."
                );
            }

            updateReservationsCacheAfterAction({
                email,
                date: dateToString(date),
                action: "DEL",
                plate: activePlate,
            });

            await refresh();

        } catch (error) {
            console.error("Remove reservation failed:", error);
            alert(error.message || "Failed to remove reservation.");
        } finally {
            setDateProcessing(date, null);
        }
    };

    const startSniper = async (date) => {
        setDateProcessing(date, "start-sniper");
        await new Promise((resolve) => requestAnimationFrame(resolve));

        try {
            const response = await apiFetch("/api/sniper/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    date: dateToString(date),
                    plate: activePlate,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Failed to start sniper."
                );
            }

            await refreshSnipers();
        } catch (error) {
            console.error("Start sniper failed:", error);
            alert(error.message || "Failed to start sniper.");
        } finally {
            setDateProcessing(date, null);
        }
    };

    const stopSniper = async (date) => {
        setDateProcessing(date, "stop-sniper");
        await new Promise((resolve) => requestAnimationFrame(resolve));

        try {
            const response = await apiFetch("/api/sniper/stop", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    date: dateToString(date),
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Failed to stop sniper."
                );
            }

            await refreshSnipers();
        } catch (error) {
            console.error("Stop sniper failed:", error);
            alert(error.message || "Failed to stop sniper.");
        } finally {
            setDateProcessing(date, null);
        }
    };

    return (
        <CalendarShell>
            <div className="flex h-full min-h-0 flex-col p-5 sm:p-7 lg:p-8">
                <div className="border-b border-[#dcdeda] pb-6">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                        Parking
                    </div>

                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-[-0.035em]">
                                Calendar
                            </h1>

                            <p className="mt-2 text-sm text-slate-500">
                                Manage parking availability and reservations.
                            </p>
                        </div>

                        <div className="relative self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => {
                                    setPlateDraft(activePlate || "");
                                    setPlateError("");
                                    setPlateEditorOpen((open) => !open);
                                }}
                                className="text-[11px] text-slate-400 transition hover:text-slate-900"
                            >
                                Active plate ·{" "}
                                <span className="font-semibold text-slate-600">
                                    {activePlate || "Set plate"}
                                </span>
                            </button>

                            {plateEditorOpen && (
                                <div className="absolute right-0 top-full z-40 mt-2 w-72 border border-slate-200 bg-white p-4 shadow-xl">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                        Active plate
                                    </div>

                                    <input
                                        type="text"
                                        value={plateDraft}
                                        onChange={(event) =>
                                            setPlateDraft(
                                                event.target.value
                                                    .toUpperCase()
                                                    .replace(/\s/g, "")
                                            )
                                        }
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                saveActivePlate();
                                            }

                                            if (event.key === "Escape") {
                                                setPlateEditorOpen(false);
                                                setPlateError("");
                                            }
                                        }}
                                        autoFocus
                                        className="mt-3 h-10 w-full border border-slate-300 px-3 text-sm font-semibold uppercase tracking-wide outline-none transition focus:border-blue-500"
                                        placeholder="SE651BJ"
                                        disabled={plateSaving}
                                    />

                                    {plateError && (
                                        <div className="mt-2 text-xs text-rose-600">
                                            {plateError}
                                        </div>
                                    )}

                                    <div className="mt-3 flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPlateEditorOpen(false);
                                                setPlateError("");
                                            }}
                                            disabled={plateSaving}
                                            className="px-3 py-2 text-xs font-medium text-slate-500 transition hover:text-slate-900 disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="button"
                                            onClick={saveActivePlate}
                                            disabled={plateSaving}
                                            className="bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                                        >
                                            {plateSaving ? "Saving…" : "Save"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span className="inline-flex items-center gap-2">
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${loading ? "bg-blue-500 animate-pulse" : "bg-emerald-500"
                                        }`}
                                />
                                {loading ? "Syncing" : "Connected"}
                            </span>

                            <button
                                type="button"
                                onClick={refresh}
                                className="hover:text-slate-900"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid min-h-0 flex-1 gap-5 overflow-y-auto xl:grid-cols-[minmax(0,1fr)_320px] xl:overflow-hidden">
                    <CalendarGrid
                        viewedDate={viewedDate}
                        selectedDate={selectedDate}
                        availability={availability}
                        snipingDates={snipingDates}
                        onSelectDate={setSelectedDate}
                        onPreviousMonth={goToPreviousMonth}
                        onNextMonth={goToNextMonth}
                    />

                    <SelectedDay
                        selectedDate={selectedDate}
                        availability={availability}
                        snipingDates={snipingDates}
                        activePlate={activePlate}
                        processingAction={processingActions[dateToString(selectedDate)] || null}
                        onViewMap={() => setIsMapOpen(true)}
                        onReserve={reserveDate}
                        onRemoveReservation={removeReservation}
                        onStartSniper={startSniper}
                        onStopSniper={stopSniper}
                    />
                </div>
            </div>
            {isMapOpen && (
                <ParkingMapModal
                    isOpen={isMapOpen}
                    onClose={() => setIsMapOpen(false)}
                    spotName={selectedReservation?.lot || ""}
                    dateLabel={selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                    })}
                />
            )}
        </CalendarShell>
    );
}