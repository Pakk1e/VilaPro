import { useEffect, useMemo, useState } from "react";

import {
    Activity,
    Edit3,
    LoaderCircle,
    Plus,
    Trash2,
} from "lucide-react";

import { useAuth } from "../../../auth/AuthProvider";
import { apiFetch } from "../../../lib/api";
import AutomationRuleEditor from "../components/AutomationRuleEditor";
import AutomationExceptionEditor from "../components/AutomationExceptionEditor";
import CalendarShell from "../layout/CalendarShell";

const DAY_NAMES = [
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
    { value: 0, label: "Sun" },
];

const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];


function parseExceptionDates(value) {
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

function formatDays(days) {
    const selected = parseJsonArray(days);

    return DAY_NAMES
        .filter((day) => selected.includes(day.value))
        .map((day) => day.label)
        .join(" · ");
}

function formatMonths(months) {
    const selected = parseJsonArray(months);

    if (selected.length === 12) {
        return "All months";
    }

    return MONTH_NAMES.filter((_, index) =>
        selected.includes(index + 1)
    ).join(" · ");
}

function RuleCard({
    rule,
    processing,
    onEdit,
    onDelete,
}) {
    return (
        <div className="flex flex-col gap-5 border-b border-slate-200 px-5 py-5 last:border-b-0 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-slate-900">
                        {rule.name || "Unnamed rule"}
                    </h2>

                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600">
                        Active
                    </span>
                </div>

                <div className="mt-2 text-sm text-slate-500">
                    {formatDays(rule.days_of_week)}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                    {formatMonths(rule.months)} · {rule.plate}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={processing}
                    onClick={() => onEdit(rule)}
                    className="flex items-center gap-2 border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
                >
                    <Edit3 size={14} strokeWidth={1.7} />
                    Edit
                </button>

                <button
                    type="button"
                    disabled={processing}
                    onClick={() => onDelete(rule)}
                    className="flex items-center gap-2 border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50"
                >
                    {processing ? (
                        <LoaderCircle
                            size={14}
                            strokeWidth={1.7}
                            className="animate-spin"
                        />
                    ) : (
                        <Trash2
                            size={14}
                            strokeWidth={1.7}
                        />
                    )}

                    {processing ? "Deleting…" : "Delete"}
                </button>
            </div>
        </div>
    );
}

export default function AutomationsPage() {
    const { user } = useAuth();
    const email = user?.email;

    const [activePlate, setActivePlate] = useState("");

    const [rules, setRules] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    const [exceptionEditorOpen, setExceptionEditorOpen] = useState(false);
    const [editingException, setEditingException] = useState(null);
    const [savingException, setSavingException] = useState(false);
    const [deletingExceptionId, setDeletingExceptionId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const [error, setError] = useState(null);

    const [editorOpen, setEditorOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    const loadData = async () => {
        if (!email) return;

        try {
            setLoading(true);
            setError(null);

            const [
                rulesResponse,
                exceptionsResponse,
                plateResponse,
            ] = await Promise.all([
                apiFetch(
                    `/api/bulk/rules?email=${encodeURIComponent(email)}`
                ),
                apiFetch("/api/automation-exceptions"),
                apiFetch("/api/plate"),
            ]);

            if (!rulesResponse.ok) {
                throw new Error(
                    "Failed to load automation rules."
                );
            }

            const rulesData =
                await rulesResponse.json();

            const exceptionsPayload =
                exceptionsResponse.ok
                    ? await exceptionsResponse.json()
                    : { exceptions: [] };

            const exceptionsData = Array.isArray(
                exceptionsPayload.exceptions
            )
                ? exceptionsPayload.exceptions
                : [];

            if (plateResponse.ok) {
                const plateData =
                    await plateResponse.json();

                if (plateData.success) {
                    setActivePlate(
                        plateData.activePlate || ""
                    );
                }
            }

            setRules(
                Array.isArray(rulesData)
                    ? rulesData
                    : []
            );

            setExceptions(
                Array.isArray(exceptionsData)
                    ? exceptionsData
                    : []
            );
        } catch (err) {
            console.error(
                "Automations load error:",
                err
            );

            setError(
                err.message ||
                "Failed to load automations."
            );
        } finally {
            setLoading(false);
        }
    };

    const openNewException = () => {
        setEditingException(null);
        setExceptionEditorOpen(true);
    };

    const openEditException = (exception) => {
        setEditingException(exception);
        setExceptionEditorOpen(true);
    };

    const handleSaveException = async (exceptionData) => {
        setSavingException(true);

        try {
            if (editingException) {
                throw new Error(
                    "Editing exceptions is not enabled yet."
                );
            }

            const url = "/api/automation-exceptions";
            const method = "POST";

            const response = await apiFetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(exceptionData),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.error ||
                    "Failed to save exception."
                );
            }

            setExceptionEditorOpen(false);
            setEditingException(null);

            await loadData();
        } catch (error) {
            console.error(
                "Automation exception save error:",
                error
            );

            alert(
                error.message ||
                "Failed to save exception."
            );
        } finally {
            setSavingException(false);
        }
    };

    const handleDeleteException = async (exception) => {
        setDeletingExceptionId(exception.id);

        try {
            const response = await apiFetch(
                `/api/automation-exceptions/${exception.id}`,
                {
                    method: "DELETE",
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.error ||
                    "Failed to delete exception."
                );
            }

            await loadData();
        } catch (error) {
            console.error(
                "Automation exception delete error:",
                error
            );

            alert(
                error.message ||
                "Failed to delete exception."
            );
        } finally {
            setDeletingExceptionId(null);
        }
    };

    useEffect(() => {
        loadData();
    }, [email]);

    const openNewRule = () => {
        setEditingRule(null);
        setEditorOpen(true);
    };

    const openEditRule = (rule) => {
        setEditingRule(rule);
        setEditorOpen(true);
    };

    const handleDeleteRule = async (rule) => {
        setDeletingId(rule.id);

        try {
            const response = await apiFetch(
                "/api/bulk/delete",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        id: rule.id,
                        email,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.error ||
                    "Failed to delete rule."
                );
            }

            await loadData();
        } catch (err) {
            console.error(
                "Automation delete error:",
                err
            );

            alert(
                err.message ||
                "Failed to delete automation."
            );
        } finally {
            setDeletingId(null);
        }
    };

    const handleSaveRule = async (ruleData) => {
        setSaving(true);

        try {
            const response = await apiFetch(
                "/api/bulk/save",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ...ruleData,
                        email,
                        id: editingRule?.id,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.error ||
                    "Failed to save automation."
                );
            }

            setEditorOpen(false);
            setEditingRule(null);

            await loadData();

            if (result.ruleId) {
                let running = true;

                while (running) {
                    await new Promise((resolve) =>
                        setTimeout(resolve, 700)
                    );

                    const statusResponse =
                        await apiFetch(
                            `/api/bulk/status/${result.ruleId}`
                        );

                    if (!statusResponse.ok) {
                        break;
                    }

                    const status =
                        await statusResponse.json();

                    running = !!status.running;
                }

                await loadData();
            }
        } catch (err) {
            console.error(
                "Automation save error:",
                err
            );

            alert(
                err.message ||
                "Failed to save automation."
            );
        } finally {
            setSaving(false);
        }
    };

    const sortedRules = useMemo(() => {
        return [...rules].sort((a, b) =>
            String(a.name || "").localeCompare(
                String(b.name || "")
            )
        );
    }, [rules]);

    return (
        <CalendarShell>
            <div className="flex h-full min-h-0 flex-col p-5 sm:p-7 lg:p-8">

                {/* HEADER */}
                <div className="flex flex-col gap-5 border-b border-[#dcdeda] pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                            Parking
                        </div>

                        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">
                            Automations
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Automate recurring parking reservations.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openNewRule}
                        className="flex items-center justify-center gap-2 bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
                    >
                        <Plus size={15} strokeWidth={1.8} />
                        New rule
                    </button>
                </div>

                {/* CONTENT */}
                <div className="min-h-0 flex-1 overflow-y-auto pt-6">

                    {loading && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <LoaderCircle
                                size={16}
                                className="animate-spin"
                            />

                            Loading automations…
                        </div>
                    )}

                    {!loading && error && (
                        <div className="border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                            {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            {/* RULES */}
                            <section className="border border-slate-200 bg-white">
                                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Active rules
                                    </div>

                                    <div className="text-xs text-slate-400">
                                        {rules.length}{" "}
                                        {rules.length === 1
                                            ? "rule"
                                            : "rules"}
                                    </div>
                                </div>

                                {sortedRules.length === 0 ? (
                                    <div className="px-6 py-12 text-center">
                                        <div className="text-sm font-medium text-slate-700">
                                            No automation rules
                                        </div>

                                        <div className="mt-2 text-sm text-slate-400">
                                            Create a rule to automate
                                            recurring reservations.
                                        </div>
                                    </div>
                                ) : (
                                    sortedRules.map(
                                        (rule) => (
                                            <RuleCard
                                                key={rule.id}
                                                rule={rule}
                                                processing={
                                                    deletingId ===
                                                    rule.id
                                                }
                                                onEdit={
                                                    openEditRule
                                                }
                                                onDelete={
                                                    handleDeleteRule
                                                }
                                            />
                                        )
                                    )
                                )}
                            </section>

                            {/* EXCEPTIONS */}
                            <section className="mt-8">
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                            Exceptions
                                        </div>

                                        <div className="mt-1 text-xs text-slate-400">
                                            Dates skipped by every automation rule.
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={openNewException}
                                        className="flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        + Add exception
                                    </button>
                                </div>

                                <div className="border border-slate-200 bg-white">
                                    {exceptions.length === 0 ? (
                                        <div className="px-5 py-6 text-sm text-slate-400">
                                            No global exceptions.
                                        </div>
                                    ) : (
                                        exceptions.map((exception) => (
                                            <div
                                                key={exception.id}
                                                className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">
                                                        {exception.name}
                                                    </div>

                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {exception.type === "specific"
                                                            ? `${parseExceptionDates(exception.dates).length} specific dates`
                                                            : exception.type === "range"
                                                                ? `${exception.start_date} → ${exception.end_date}`
                                                                : `${exception.start_date} → ${exception.end_date} · recurring`}
                                                    </div>

                                                    {exception.note && (
                                                        <div className="mt-2 text-xs text-slate-400">
                                                            {exception.note}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditException(
                                                                exception
                                                            )
                                                        }
                                                        className="text-xs font-medium text-slate-600 hover:text-slate-900"
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            deletingExceptionId ===
                                                            exception.id
                                                        }
                                                        onClick={() =>
                                                            handleDeleteException(
                                                                exception
                                                            )
                                                        }
                                                        className="text-xs font-medium text-rose-600 hover:text-rose-700 disabled:cursor-wait disabled:opacity-50"
                                                    >
                                                        {deletingExceptionId ===
                                                            exception.id
                                                            ? "Removing…"
                                                            : "Remove"}
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>
            <AutomationRuleEditor
                isOpen={editorOpen}
                rule={editingRule}
                saving={saving}
                defaultPlate={activePlate}
                exceptions={exceptions}
                onExceptionsChanged={loadData}
                onClose={() => {
                    if (!saving) {
                        setEditorOpen(false);
                        setEditingRule(null);
                    }
                }}
                onSave={handleSaveRule}
            />
            <AutomationExceptionEditor
                isOpen={exceptionEditorOpen}
                exception={editingException}
                saving={savingException}
                onClose={() => {
                    if (!savingException) {
                        setExceptionEditorOpen(false);
                        setEditingException(null);
                    }
                }}
                onSave={handleSaveException}
            />
        </CalendarShell>
    );
}