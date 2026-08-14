import { ChevronLeft, ChevronRight } from "lucide-react";

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getMonthDays(viewedDate) {
    const year = viewedDate.getFullYear();
    const month = viewedDate.getMonth();

    const firstDay = new Date(year, month, 1);

    // Monday = 0, Sunday = 6
    const mondayOffset = (firstDay.getDay() + 6) % 7;

    const firstVisibleDay = new Date(
        year,
        month,
        1 - mondayOffset
    );

    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(firstVisibleDay);
        date.setDate(firstVisibleDay.getDate() + index);
        return date;
    });
}

const stateMeta = {
    free: {
        label: "Available",
        dot: "bg-emerald-500",
        text: "text-emerald-700",
        bg: "bg-emerald-50/50",
    },

    full: {
        label: "Full",
        dot: "bg-rose-500",
        text: "text-rose-700",
        bg: "bg-rose-50/40",
    },

    mine: {
        label: "Reserved",
        dot: "bg-blue-500",
        text: "text-blue-700",
        bg: "bg-blue-50/45",
    },

    sniping: {
        label: "Sniping",
        dot: "bg-orange-500",
        text: "text-orange-700",
        bg: "bg-orange-50/45",
    },

    unavailable: {
        label: "Unavailable",
        dot: null,
        text: "text-slate-400",
        bg: "bg-slate-50/60",
    },

    past: {
        label: "",
        dot: null,
        text: "text-slate-300",
        bg: "bg-slate-50/70",
    },
};

function DayCell({
    date,
    muted,
    state,
    selected,
    disabled,
    onClick,
}) {
    const meta = state ? stateMeta[state] : null;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={[
                "relative min-h-0 border-r border-b border-slate-200 p-1.5 sm:p-2.5 text-left transition-colors",

                disabled
                    ? "cursor-default"
                    : "cursor-pointer hover:bg-slate-50",

                muted
                    ? "bg-slate-50/70 text-slate-300"
                    : "bg-white text-slate-900",

                state && !muted ? meta?.bg : "",

                selected && !disabled
                    ? "z-10 outline outline-2 outline-inset outline-slate-900"
                    : "",
            ].join(" ")}
        >
            <div className="flex items-start justify-between">
                <span
                    className={
                        muted || disabled
                            ? "text-[11px] font-semibold sm:text-sm text-slate-300"
                            : "text-[11px] font-semibold sm:text-sm text-slate-800"
                    }
                >
                    {date.getDate()}
                </span>

                {meta?.dot && !muted && !disabled && (
                    <span
                        className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${meta.dot}`}
                    />
                )}
            </div>

            {meta?.label && !muted && (
                <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3">
                    <div
                        className={`hidden sm:block text-[10px] font-medium uppercase tracking-[0.08em] ${meta.text}`}
                    >
                        {meta.label}
                    </div>
                </div>
            )}
        </button>
    );
}

export default function CalendarGrid({
    viewedDate,
    selectedDate,
    availability,
    snipingDates,
    onSelectDate,
    onPreviousMonth,
    onNextMonth,
}) {
    const days = getMonthDays(viewedDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 14-day booking window INCLUDING today.
    // Example: Aug 13 -> last selectable date is Aug 26.
    const maxBookableDate = new Date(today);
    maxBookableDate.setDate(today.getDate() + 13);

    const reservedByDay = new Map(
        availability.reserved.map((reservation) => [
            reservation.day,
            reservation,
        ])
    );

    const currentMonth = viewedDate.getMonth();
    const currentYear = viewedDate.getFullYear();

    function getAvailabilityState(date) {
        const isCurrentMonth =
            date.getMonth() === currentMonth &&
            date.getFullYear() === currentYear;

        if (!isCurrentMonth) {
            return null;
        }

        const day = date.getDate();
        const dateKey = getDateKey(date);

        if (snipingDates.includes(dateKey)) {
            return "sniping";
        }

        if (reservedByDay.has(day)) {
            return "mine";
        }

        if (availability.full.includes(day)) {
            return "full";
        }

        if (availability.free.includes(day)) {
            return "free";
        }

        return null;
    }

    return (
        <section className="flex min-h-0 flex-col border border-slate-200 bg-white">
            {/* =========================================================
                MONTH HEADER
            ========================================================= */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
                <button
                    type="button"
                    onClick={onPreviousMonth}
                    className="flex h-8 w-8 items-center justify-center text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Previous month"
                >
                    <ChevronLeft
                        size={17}
                        strokeWidth={1.7}
                    />
                </button>

                <div className="text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600">
                        Parking
                    </div>

                    <div className="mt-1 text-xl font-semibold tracking-tight">
                        {viewedDate.toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                        })}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onNextMonth}
                    className="flex h-8 w-8 items-center justify-center text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Next month"
                >
                    <ChevronRight
                        size={17}
                        strokeWidth={1.7}
                    />
                </button>
            </div>

            {/* =========================================================
                WEEKDAYS
            ========================================================= */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {[
                    "Mon",
                    "Tue",
                    "Wed",
                    "Thu",
                    "Fri",
                    "Sat",
                    "Sun",
                ].map((day) => (
                    <div
                        key={day}
                        className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* =========================================================
                CALENDAR DAYS
            ========================================================= */}
            <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
                {days.map((date) => {
                    const isCurrentMonth =
                        date.getMonth() === currentMonth &&
                        date.getFullYear() === currentYear;

                    const isPast = date < today;

                    const isOutsideBookingWindow =
                        date > maxBookableDate;

                    const availabilityState =
                        getAvailabilityState(date);

                    const selected =
                        isCurrentMonth &&
                        selectedDate.toDateString() ===
                        date.toDateString();

                    let displayState = availabilityState;

                    if (!isCurrentMonth) {
                        displayState = null;
                    } else if (isPast) {
                        displayState = "past";
                    } else if (availabilityState === "sniping") {
                        displayState = "sniping";
                    } else if (isOutsideBookingWindow) {
                        displayState = "unavailable";
                    }

                    const disabled =
                        !isCurrentMonth ||
                        isPast;

                    return (
                        <DayCell
                            key={getDateKey(date)}
                            date={date}
                            muted={!isCurrentMonth}
                            state={displayState}
                            selected={selected}
                            disabled={disabled}
                            onClick={() => {
                                if (!disabled) {
                                    onSelectDate(date);
                                }
                            }}
                        />
                    );
                })}
            </div>

            {/* =========================================================
                LEGEND
            ========================================================= */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-200 px-5 py-3 sm:px-6">
                {[
                    ["bg-emerald-500", "Available"],
                    ["bg-rose-500", "Full"],
                    ["bg-blue-500", "Your reservation"],
                    ["bg-orange-500", "Sniping"],
                ].map(([dot, label]) => (
                    <span
                        key={label}
                        className="inline-flex items-center gap-1.5 text-[9px] sm:gap-2 sm:text-[10px] text-slate-500"
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${dot}`}
                        />

                        {label}
                    </span>
                ))}
            </div>
        </section>
    );
}