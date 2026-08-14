import { useEffect, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { apiFetch } from "../../../lib/api";

const DAYS = [
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
    { value: 0, label: "Sun" },
];

const MONTHS = [
    { value: 1, label: "Jan" },
    { value: 2, label: "Feb" },
    { value: 3, label: "Mar" },
    { value: 4, label: "Apr" },
    { value: 5, label: "May" },
    { value: 6, label: "Jun" },
    { value: 7, label: "Jul" },
    { value: 8, label: "Aug" },
    { value: 9, label: "Sep" },
    { value: 10, label: "Oct" },
    { value: 11, label: "Nov" },
    { value: 12, label: "Dec" },
];

function parseArray(value) {
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

function getInitialState(rule) {
    return {
        name: rule?.name || "",
        days: parseArray(rule?.days_of_week),
        months: parseArray(rule?.months),
        plate: rule?.plate || "",
    };
}

export default function AutomationRuleEditor({
    isOpen,
    rule,
    saving,
    defaultPlate,
    exceptions,
    onExceptionsChanged,
    onClose,
    onSave,
}) {
    const [form, setForm] = useState(
        getInitialState(rule)
    );

    const [validationError, setValidationError] = useState("");
    const [processingException, setProcessingException] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setForm(
                getInitialState(rule)
            );

            setValidationError("");
        }
    }, [isOpen, rule]);

    if (!isOpen) {
        return null;
    }

    const toggleDay = (value) => {
        setForm((current) => ({
            ...current,
            days: current.days.includes(value)
                ? current.days.filter(
                    (day) => day !== value
                )
                : [...current.days, value],
        }));
    };

    const toggleMonth = (value) => {
        setForm((current) => ({
            ...current,
            months: current.months.includes(value)
                ? current.months.filter(
                    (month) => month !== value
                )
                : [...current.months, value],
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        const name = form.name.trim();
        const plate = form.plate.trim().toUpperCase();

        if (!name) {
            setValidationError(
                "Enter a name for this automation."
            );
            return;
        }

        if (form.days.length === 0) {
            setValidationError(
                "Select at least one day."
            );
            return;
        }

        if (form.months.length === 0) {
            setValidationError(
                "Select at least one month."
            );
            return;
        }

        if (!plate) {
            setValidationError(
                "Enter a vehicle plate."
            );
            return;
        }

        setValidationError("");

        onSave({
            name,
            days: form.days,
            months: form.months,
            plate,
        });
    };

    const removeException = async (exception) => {
        setProcessingException(exception.id);

        try {
            const response = await apiFetch(
                `/api/bulk/exceptions/${exception.rule_id}/${exception.date}`,
                {
                    method: "DELETE",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to remove exception.");
            }

            await onExceptionsChanged();
        } catch (error) {
            console.error(
                "Failed to remove automation exception:",
                error
            );

            alert(
                error.message ||
                "Failed to allow this date again."
            );
        } finally {
            setProcessingException(null);
        }
    };

    const selectAllDays = () => {
        setForm((current) => ({
            ...current,
            days: DAYS.map((day) => day.value),
        }));
    };

    const selectWeekdays = () => {
        setForm((current) => ({
            ...current,
            days: [1, 2, 3, 4, 5],
        }));
    };

    const selectAllMonths = () => {
        setForm((current) => ({
            ...current,
            months: MONTHS.map(
                (month) => month.value
            ),
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <button
                type="button"
                onClick={saving ? undefined : onClose}
                className="absolute inset-0 bg-slate-950/25"
                aria-label="Close editor"
            />

            <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border border-slate-200 bg-[#f6f6f4] shadow-2xl">
                {/* HEADER */}
                <div className="flex items-start justify-between border-b border-[#dcdeda] bg-[#f6f6f4] px-5 py-5 sm:px-7">
                    <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                            Parking automation
                        </div>

                        <h2 className="mt-2 text-xl font-semibold tracking-tight">
                            {rule
                                ? "Edit rule"
                                : "New rule"}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Automatically manage recurring parking reservations.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="flex h-8 w-8 items-center justify-center text-slate-400 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
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
                                htmlFor="automation-name"
                                className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400"
                            >
                                Name
                            </label>

                            <input
                                id="automation-name"
                                type="text"
                                value={form.name}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
                                }
                                placeholder="Weekdays"
                                className="mt-2 h-11 w-full border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500"
                                disabled={saving}
                            />
                        </section>

                        {/* DAYS */}
                        <section>
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Days
                                </div>

                                <div className="flex gap-3 text-[11px] text-slate-400">
                                    <button
                                        type="button"
                                        onClick={selectWeekdays}
                                        disabled={saving}
                                        className="hover:text-slate-900"
                                    >
                                        Weekdays
                                    </button>

                                    <button
                                        type="button"
                                        onClick={selectAllDays}
                                        disabled={saving}
                                        className="hover:text-slate-900"
                                    >
                                        All
                                    </button>
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                                {DAYS.map((day) => {
                                    const selected =
                                        form.days.includes(
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
                                            className={`border px-3 py-3 text-sm font-medium transition ${selected
                                                ? "border-blue-600 bg-blue-600 text-white"
                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                                }`}
                                        >
                                            {day.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* MONTHS */}
                        <section>
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Months
                                </div>

                                <button
                                    type="button"
                                    onClick={selectAllMonths}
                                    disabled={saving}
                                    className="text-[11px] text-slate-400 hover:text-slate-900"
                                >
                                    All months
                                </button>
                            </div>

                            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                                {MONTHS.map((month) => {
                                    const selected =
                                        form.months.includes(
                                            month.value
                                        );

                                    return (
                                        <button
                                            key={month.value}
                                            type="button"
                                            disabled={saving}
                                            onClick={() =>
                                                toggleMonth(
                                                    month.value
                                                )
                                            }
                                            className={`border px-3 py-3 text-sm font-medium transition ${selected
                                                ? "border-blue-600 bg-blue-600 text-white"
                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                                }`}
                                        >
                                            {month.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* PLATE */}
                        <section>
                            <label
                                htmlFor="automation-plate"
                                className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400"
                            >
                                Vehicle plate
                            </label>

                            <input
                                id="automation-plate"
                                type="text"
                                value={form.plate}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        plate: event.target.value
                                            .toUpperCase(),
                                    }))
                                }
                                placeholder={
                                    defaultPlate ||
                                    "SE651BJ"
                                }
                                className="mt-2 h-11 w-full border border-slate-200 bg-white px-3 text-sm uppercase tracking-[0.06em] text-slate-900 outline-none transition focus:border-blue-500"
                                disabled={saving}
                            />

                            {!form.plate && defaultPlate && (
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() =>
                                        setForm((current) => ({
                                            ...current,
                                            plate: defaultPlate,
                                        }))
                                    }
                                    className="mt-2 text-[11px] text-blue-600 hover:text-blue-700"
                                >
                                    Use active plate ({defaultPlate})
                                </button>
                            )}
                        </section>

                        {/* EXCLUDED DATES */}
                        {rule && (
                            <section>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                            Excluded dates
                                        </div>

                                        <p className="mt-1 text-xs text-slate-400">
                                            Dates manually skipped by this automation.
                                        </p>
                                    </div>

                                    <div className="text-[11px] text-slate-400">
                                        {
                                            exceptions.filter(
                                                (exception) =>
                                                    exception.rule_id === rule.id
                                            ).length
                                        }{" "}
                                        excluded
                                    </div>
                                </div>

                                <div className="mt-3 border border-slate-200 bg-white">
                                    {exceptions.filter(
                                        (exception) =>
                                            exception.rule_id === rule.id
                                    ).length === 0 ? (
                                        <div className="px-4 py-5 text-sm text-slate-400">
                                            No excluded dates.
                                        </div>
                                    ) : (
                                        exceptions
                                            .filter(
                                                (exception) =>
                                                    exception.rule_id === rule.id
                                            )
                                            .map((exception) => (
                                                <div
                                                    key={exception.id}
                                                    className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 last:border-b-0"
                                                >
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-800">
                                                            {new Date(
                                                                `${exception.date}T00:00:00`
                                                            ).toLocaleDateString(
                                                                "en-US",
                                                                {
                                                                    weekday: "long",
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    year: "numeric",
                                                                }
                                                            )}
                                                        </div>

                                                        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600">
                                                            Excluded
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            processingException ===
                                                            exception.id
                                                        }
                                                        onClick={() =>
                                                            removeException(
                                                                exception
                                                            )
                                                        }
                                                        className="flex shrink-0 items-center gap-2 text-xs font-medium text-blue-600 transition hover:text-blue-700 disabled:cursor-wait disabled:opacity-50"
                                                    >
                                                        {processingException ===
                                                            exception.id ? (
                                                            <>
                                                                <LoaderCircle
                                                                    size={13}
                                                                    className="animate-spin"
                                                                />
                                                                Allowing…
                                                            </>
                                                        ) : (
                                                            "Allow again"
                                                        )}
                                                    </button>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </section>
                        )}

                        {/* VALIDATION */}
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
                            className="px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-900 disabled:opacity-40"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center justify-center gap-2 bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
                        >
                            {saving ? (
                                <>
                                    <LoaderCircle
                                        size={15}
                                        strokeWidth={1.8}
                                        className="animate-spin"
                                    />
                                    Saving rule…
                                </>
                            ) : rule ? (
                                "Save changes"
                            ) : (
                                "Create rule"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}