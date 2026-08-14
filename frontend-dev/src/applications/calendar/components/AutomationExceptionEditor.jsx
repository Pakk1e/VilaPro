import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, X } from "lucide-react";

const DAYS = [
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
    { value: 0, label: "Sun" },
];

const MODES = [
    {
        value: "range",
        label: "Date range",
        description: "Exclude every day between two dates.",
    },
    {
        value: "specific",
        label: "Specific dates",
        description: "Exclude a list of individual dates.",
    },
    {
        value: "recurring",
        label: "Recurring days",
        description: "Exclude selected weekdays within a date range.",
    },
];

function toDateInputValue(date) {
    if (!date) return "";

    if (typeof date === "string") {
        return date.slice(0, 10);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseJsonArray(value) {
    if (Array.isArray(value)) {
        return value;
    }

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function createEmptyForm() {
    return {
        name: "",
        type: "range",
        start_date: "",
        end_date: "",
        dates: [],
        days_of_week: [],
        note: "",
    };
}

function createFormFromException(exception) {
    if (!exception) {
        return createEmptyForm();
    }

    return {
        name: exception.name || "",
        type: exception.type || "range",
        start_date: exception.start_date || "",
        end_date: exception.end_date || "",
        dates: parseJsonArray(exception.dates),
        days_of_week: parseJsonArray(exception.days_of_week),
        note: exception.note || "",
    };
}

function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseDateKey(value) {
    if (!value) return null;

    const date = new Date(`${value}T00:00:00`);

    return Number.isNaN(date.getTime()) ? null : date;
}

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
    return new Date(
        date.getFullYear(),
        date.getMonth() + amount,
        1
    );
}

function getCalendarDays(monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDay = new Date(year, month, 1);

    // Monday = 0 ... Sunday = 6
    const offset = (firstDay.getDay() + 6) % 7;

    const firstVisibleDay = new Date(
        year,
        month,
        1 - offset
    );

    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(firstVisibleDay);
        date.setDate(firstVisibleDay.getDate() + index);
        return date;
    });
}

function BookingCalendar({
    mode,
    startDate,
    endDate,
    specificDates,
    onRangeStart,
    onRangeEnd,
    onToggleSpecificDate,
    disabled,
}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const initialCalendarDate =
        parseDateKey(startDate) ||
        parseDateKey(specificDates?.[0]) ||
        today;

    const [visibleMonth, setVisibleMonth] = useState(
        startOfMonth(initialCalendarDate)
    );

    useEffect(() => {
        const preferredDate =
            parseDateKey(startDate) ||
            parseDateKey(specificDates?.[0]);

        if (preferredDate) {
            setVisibleMonth(startOfMonth(preferredDate));
        }
    }, [startDate, specificDates]);

    const days = getCalendarDays(visibleMonth);

    const start = parseDateKey(startDate);
    const end = parseDateKey(endDate);

    const specificSet = new Set(
        specificDates || []
    );

    const handleDateClick = (date) => {
        if (date < today || disabled) {
            return;
        }

        const key = dateKey(date);

        if (mode === "specific") {
            onToggleSpecificDate(key);
            return;
        }

        if (!startDate || (startDate && endDate)) {
            onRangeStart(key);
            onRangeEnd("");
            return;
        }

        if (key < startDate) {
            onRangeStart(key);
            onRangeEnd("");
            return;
        }

        onRangeEnd(key);
    };

    return (
        <div className="mt-3 border border-slate-200 bg-white">
            {/* CALENDAR HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                        setVisibleMonth(
                            (current) =>
                                addMonths(current, -1)
                        )
                    }
                    className="flex h-8 w-8 items-center justify-center text-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"
                    aria-label="Previous month"
                >
                    ‹
                </button>

                <div className="text-sm font-semibold text-slate-800">
                    {visibleMonth.toLocaleDateString(
                        "en-US",
                        {
                            month: "long",
                            year: "numeric",
                        }
                    )}
                </div>

                <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                        setVisibleMonth(
                            (current) =>
                                addMonths(current, 1)
                        )
                    }
                    className="flex h-8 w-8 items-center justify-center text-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"
                    aria-label="Next month"
                >
                    ›
                </button>
            </div>

            {/* WEEKDAYS */}
            <div className="grid grid-cols-7 border-b border-slate-200">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (label) => (
                        <div
                            key={label}
                            className="py-2 text-center text-[9px] font-semibold uppercase tracking-wide text-slate-400"
                        >
                            {label}
                        </div>
                    )
                )}
            </div>

            {/* DAYS */}
            <div className="grid grid-cols-7">
                {days.map((date) => {
                    const key = dateKey(date);

                    const inCurrentMonth =
                        date.getMonth() ===
                        visibleMonth.getMonth() &&
                        date.getFullYear() ===
                        visibleMonth.getFullYear();

                    const isPast = date < today;
                    const isToday =
                        date.getTime() === today.getTime();

                    const isSpecific =
                        mode === "specific" &&
                        specificSet.has(key);

                    const isStart =
                        startDate === key;

                    const isEnd =
                        endDate === key;

                    const isInRange =
                        (mode === "range" ||
                            mode === "recurring") &&
                        start &&
                        end &&
                        date >= start &&
                        date <= end;

                    const isRangeMiddle =
                        isInRange &&
                        !isStart &&
                        !isEnd;

                    return (
                        <button
                            key={key}
                            type="button"
                            disabled={
                                disabled ||
                                isPast
                            }
                            onClick={() =>
                                handleDateClick(date)
                            }
                            className={[
                                "relative min-h-[52px] border-r border-b border-slate-200 p-1 transition",
                                "flex items-center justify-center",
                                !inCurrentMonth
                                    ? "text-slate-300"
                                    : "",
                                isPast
                                    ? "cursor-default bg-slate-50 text-slate-300"
                                    : "hover:bg-slate-50",
                                isToday &&
                                    !isSpecific &&
                                    !isStart &&
                                    !isEnd
                                    ? "font-bold"
                                    : "",
                                isSpecific
                                    ? "bg-amber-500 text-white"
                                    : "",
                                isRangeMiddle
                                    ? "bg-amber-50 text-amber-900"
                                    : "",
                                isStart || isEnd
                                    ? "bg-amber-500 text-white"
                                    : "",
                            ].join(" ")}
                        >
                            <span className="text-sm font-medium">
                                {date.getDate()}
                            </span>

                            {isToday &&
                                !isSpecific &&
                                !isStart &&
                                !isEnd && (
                                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-500" />
                                )}
                        </button>
                    );
                })}
            </div>

            {/* RANGE SUMMARY */}
            {(mode === "range" ||
                mode === "recurring") && (
                    <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                        {!startDate && (
                            <span>
                                Select a start date.
                            </span>
                        )}

                        {startDate && !endDate && (
                            <span>
                                Start:{" "}
                                <strong className="text-slate-800">
                                    {new Date(
                                        `${startDate}T00:00:00`
                                    ).toLocaleDateString(
                                        "en-US",
                                        {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        }
                                    )}
                                </strong>
                                {" — "}select an end date.
                            </span>
                        )}

                        {startDate && endDate && (
                            <span>
                                {new Date(
                                    `${startDate}T00:00:00`
                                ).toLocaleDateString(
                                    "en-US",
                                    {
                                        month: "short",
                                        day: "numeric",
                                    }
                                )}
                                {" → "}
                                {new Date(
                                    `${endDate}T00:00:00`
                                ).toLocaleDateString(
                                    "en-US",
                                    {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    }
                                )}
                            </span>
                        )}
                    </div>
                )}

            {mode === "specific" && (
                <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                    Click dates to add or remove them.
                </div>
            )}
        </div>
    );
}

export default function AutomationExceptionEditor({
    isOpen,
    exception,
    saving,
    onClose,
    onSave,
}) {
    const [form, setForm] = useState(createEmptyForm());
    const [validationError, setValidationError] = useState("");

    useEffect(() => {
        if (!isOpen) return;

        setForm(createFormFromException(exception));
        setValidationError("");
    }, [isOpen, exception]);

    const availableSpecificDates = useMemo(() => {
        return [...new Set(form.dates)].sort();
    }, [form.dates]);

    if (!isOpen) {
        return null;
    }

    const updateField = (field, value) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const toggleDay = (value) => {
        setForm((current) => ({
            ...current,
            days_of_week: current.days_of_week.includes(value)
                ? current.days_of_week.filter(
                    (day) => day !== value
                )
                : [...current.days_of_week, value],
        }));
    };

    const addSpecificDate = (value) => {
        if (!value) return;

        setForm((current) => ({
            ...current,
            dates: current.dates.includes(value)
                ? current.dates
                : [...current.dates, value],
        }));
    };

    const removeSpecificDate = (value) => {
        setForm((current) => ({
            ...current,
            dates: current.dates.filter(
                (date) => date !== value
            ),
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        const name = form.name.trim();

        if (!name) {
            setValidationError(
                "Enter a name for this exception."
            );
            return;
        }

        if (form.type === "range") {
            if (!form.start_date || !form.end_date) {
                setValidationError(
                    "Select both a start date and an end date."
                );
                return;
            }

            if (form.start_date > form.end_date) {
                setValidationError(
                    "The end date must be on or after the start date."
                );
                return;
            }
        }

        if (form.type === "specific") {
            if (form.dates.length === 0) {
                setValidationError(
                    "Add at least one date."
                );
                return;
            }
        }

        if (form.type === "recurring") {
            if (
                !form.start_date ||
                !form.end_date
            ) {
                setValidationError(
                    "Select both a start date and an end date."
                );
                return;
            }

            if (form.start_date > form.end_date) {
                setValidationError(
                    "The end date must be on or after the start date."
                );
                return;
            }

            if (form.days_of_week.length === 0) {
                setValidationError(
                    "Select at least one weekday."
                );
                return;
            }
        }

        setValidationError("");

        onSave({
            name,
            type: form.type,
            start_date:
                form.type === "specific"
                    ? null
                    : form.start_date || null,
            end_date:
                form.type === "specific"
                    ? null
                    : form.end_date || null,
            dates:
                form.type === "specific"
                    ? availableSpecificDates
                    : null,
            days_of_week:
                form.type === "recurring"
                    ? form.days_of_week
                    : null,
            note: form.note.trim(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <button
                type="button"
                onClick={saving ? undefined : onClose}
                className="absolute inset-0 bg-slate-950/25"
                aria-label="Close exception editor"
            />

            <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border border-slate-200 bg-[#f6f6f4] shadow-2xl">
                {/* HEADER */}
                <div className="flex items-start justify-between border-b border-[#dcdeda] px-5 py-5 sm:px-7">
                    <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600">
                            Global exception
                        </div>

                        <h2 className="mt-2 text-xl font-semibold tracking-tight">
                            {exception
                                ? "Edit exception"
                                : "Add exception"}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            This date exclusion applies to all automation rules.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="flex h-8 w-8 items-center justify-center text-slate-400 transition hover:text-slate-900 disabled:opacity-40"
                        aria-label="Close"
                    >
                        <X size={17} strokeWidth={1.7} />
                    </button>
                </div>

                {/* FORM */}
                <form
                    onSubmit={handleSubmit}
                    className="min-h-0 flex-1 overflow-y-auto"
                >
                    <div className="space-y-8 px-5 py-6 sm:px-7">
                        {/* NAME */}
                        <section>
                            <label
                                htmlFor="exception-name"
                                className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400"
                            >
                                Name
                            </label>

                            <input
                                id="exception-name"
                                type="text"
                                value={form.name}
                                onChange={(event) =>
                                    updateField(
                                        "name",
                                        event.target.value
                                    )
                                }
                                placeholder="Family trip"
                                disabled={saving}
                                className="mt-2 h-11 w-full border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500"
                            />
                        </section>

                        {/* MODE */}
                        <section>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Exclusion type
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                {MODES.map((mode) => {
                                    const active =
                                        form.type === mode.value;

                                    return (
                                        <button
                                            key={mode.value}
                                            type="button"
                                            disabled={saving}
                                            onClick={() =>
                                                updateField(
                                                    "type",
                                                    mode.value
                                                )
                                            }
                                            className={`border px-4 py-3 text-left transition ${active
                                                ? "border-amber-500 bg-amber-50"
                                                : "border-slate-200 bg-white hover:bg-slate-50"
                                                }`}
                                        >
                                            <div
                                                className={`text-sm font-medium ${active
                                                    ? "text-amber-800"
                                                    : "text-slate-700"
                                                    }`}
                                            >
                                                {mode.label}
                                            </div>

                                            <div className="mt-1 text-[11px] leading-5 text-slate-400">
                                                {mode.description}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* DATE RANGE CALENDAR */}
                        {(form.type === "range" ||
                            form.type === "recurring") && (
                                <section>
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        {form.type === "recurring"
                                            ? "Active period"
                                            : "Date range"}
                                    </div>

                                    <BookingCalendar
                                        mode={form.type}
                                        startDate={form.start_date}
                                        endDate={form.end_date}
                                        specificDates={form.dates}
                                        onRangeStart={(value) =>
                                            updateField(
                                                "start_date",
                                                value
                                            )
                                        }
                                        onRangeEnd={(value) =>
                                            updateField(
                                                "end_date",
                                                value
                                            )
                                        }
                                        disabled={saving}
                                    />
                                </section>
                            )}

                        {/* RECURRING DAYS */}
                        {form.type === "recurring" && (
                            <section>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Days to exclude
                                </div>

                                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                                    {DAYS.map((day) => {
                                        const active =
                                            form.days_of_week.includes(
                                                day.value
                                            );

                                        return (
                                            <button
                                                key={day.value}
                                                type="button"
                                                disabled={saving}
                                                onClick={() =>
                                                    toggleDay(
                                                        day.value
                                                    )
                                                }
                                                className={`border px-3 py-3 text-sm font-medium transition ${active
                                                    ? "border-amber-500 bg-amber-500 text-white"
                                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                                    }`}
                                            >
                                                {day.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* SPECIFIC DATES */}
                        {form.type === "specific" && (
                            <section>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Specific dates
                                </div>

                                <BookingCalendar
                                    mode="specific"
                                    startDate=""
                                    endDate=""
                                    specificDates={availableSpecificDates}
                                    onToggleSpecificDate={(value) => {
                                        if (
                                            availableSpecificDates.includes(
                                                value
                                            )
                                        ) {
                                            removeSpecificDate(value);
                                        } else {
                                            addSpecificDate(value);
                                        }
                                    }}
                                    onRangeStart={() => { }}
                                    onRangeEnd={() => { }}
                                    disabled={saving}
                                />

                                {availableSpecificDates.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {availableSpecificDates.map(
                                            (date) => (
                                                <button
                                                    key={date}
                                                    type="button"
                                                    disabled={saving}
                                                    onClick={() =>
                                                        removeSpecificDate(
                                                            date
                                                        )
                                                    }
                                                    className="inline-flex items-center gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                                                >
                                                    {new Date(
                                                        `${date}T00:00:00`
                                                    ).toLocaleDateString(
                                                        "en-US",
                                                        {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        }
                                                    )}
                                                    <span className="text-amber-500">
                                                        ×
                                                    </span>
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}
                            </section>
                        )}


                        {/* NOTE */}
                        <section>
                            <label
                                htmlFor="exception-note"
                                className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400"
                            >
                                Note
                            </label>

                            <textarea
                                id="exception-note"
                                value={form.note}
                                onChange={(event) =>
                                    updateField(
                                        "note",
                                        event.target.value
                                    )
                                }
                                placeholder="Family holiday"
                                rows={3}
                                disabled={saving}
                                className="mt-2 w-full resize-none border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                            />
                        </section>

                        {/* INFO */}
                        <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                            This exclusion is global. Every automation rule will skip matching dates.
                        </div>

                        {validationError && (
                            <div className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {validationError}
                            </div>
                        )}
                    </div>

                    {/* FOOTER */}
                    <div className="flex flex-col-reverse gap-2 border-t border-[#dcdeda] bg-[#f6f6f4] px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 disabled:opacity-40"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center justify-center gap-2 bg-amber-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-wait disabled:opacity-70"
                        >
                            {saving ? (
                                <>
                                    <LoaderCircle
                                        size={15}
                                        className="animate-spin"
                                    />
                                    Saving exception…
                                </>
                            ) : exception ? (
                                "Save changes"
                            ) : (
                                "Add exception"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}