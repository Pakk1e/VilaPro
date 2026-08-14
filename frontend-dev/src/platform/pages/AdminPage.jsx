import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  ArrowLeft,
  Trash2,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthProvider";
import { apiFetch } from "../../lib/api";

function formatLastSeen(value) {
  if (!value) return "Never";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ children, tone = "neutral" }) {
  const styles = {
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700",
    red:
      "border-rose-200 bg-rose-50 text-rose-700",
    neutral:
      "border-slate-200 bg-slate-50 text-slate-600",
    blue:
      "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${styles[tone]
        }`}
    >
      {children}
    </span>
  );
}

function RoleBadge({ children, tone = "neutral" }) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-1 text-[10px] font-medium ${tone === "blue"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-slate-50 text-slate-600"
        }`}
    >
      {children}
    </span>
  );
}

export default function AdminPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [selectedUser, setSelectedUser] = useState(null);
  const [editedRoles, setEditedRoles] = useState([]);
  const [editedStatus, setEditedStatus] = useState("active");

  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();

  const loadUsers = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await apiFetch("/api/admin/users");

      if (!response.ok) {
        throw new Error(
          "Failed to load users."
        );
      }

      const data = await response.json();

      setUsers(
        Array.isArray(data.users)
          ? data.users
          : []
      );
    } catch (err) {
      console.error(
        "Admin users load error:",
        err
      );

      setError(
        err.message ||
        "Failed to load users."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const deleteUser = async () => {
    if (!selectedUser) return;

    if (selectedUser.status !== "disabled") {
      return;
    }

    if (selectedUser.email === currentUser?.email) {
      alert("You cannot delete your own account.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedUser.email}?\n\n` +
      "This permanently removes the disabled account " +
      "and its ParkPro data. This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      const response = await apiFetch(
        `/api/admin/users/${encodeURIComponent(
          selectedUser.email
        )}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Failed to delete user."
        );
      }

      setUsers((current) =>
        current.filter(
          (item) =>
            item.email !== selectedUser.email
        )
      );

      closeEditor();
    } catch (err) {
      console.error("Delete user failed:", err);

      alert(
        err.message ||
        "Failed to delete user."
      );
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const pendingCount = users.filter(
    (item) => !item.approved
  ).length;

  const disabledCount = users.filter(
    (item) => item.status === "disabled"
  ).length;

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((item) => {
      if (
        query &&
        !item.email.toLowerCase().includes(query)
      ) {
        return false;
      }

      if (filter === "pending") {
        return !item.approved;
      }

      if (filter === "disabled") {
        return item.status === "disabled";
      }

      return true;
    });
  }, [users, search, filter]);

  const openEditor = (targetUser) => {
    setSelectedUser(targetUser);
    setEditedRoles(
      Array.isArray(targetUser.roles)
        ? targetUser.roles
        : ["user"]
    );
    setEditedStatus(
      targetUser.status || "active"
    );
  };

  const closeEditor = () => {
    if (saving || approving || deleting) return;

    setSelectedUser(null);
    setEditedRoles([]);
    setEditedStatus("active");
  };

  const toggleRole = (role) => {
    setEditedRoles((current) => {
      if (role === "admin" &&
        current.includes("admin") &&
        selectedUser?.email === currentUser?.email
      ) {
        return current;
      }

      if (current.includes(role)) {
        return current.filter(
          (item) => item !== role
        );
      }

      return [...current, role];
    });
  };

  const approveUser = async () => {
    if (!selectedUser) return;

    try {
      setApproving(true);

      const response = await apiFetch(
        `/api/admin/users/${encodeURIComponent(
          selectedUser.email
        )}/approve`,
        {
          method: "PATCH",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          "Failed to approve user."
        );
      }

      setUsers((current) =>
        current.map((item) =>
          item.email === selectedUser.email
            ? {
              ...item,
              approved: true,
            }
            : item
        )
      );

      setSelectedUser((current) =>
        current
          ? {
            ...current,
            approved: true,
          }
          : current
      );
    } catch (err) {
      console.error(
        "Approve user failed:",
        err
      );

      alert(
        err.message ||
        "Failed to approve user."
      );
    } finally {
      setApproving(false);
    }
  };

  const saveUser = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);

      const finalRoles = Array.from(
        new Set([
          "user",
          ...editedRoles,
        ])
      );

      const response = await apiFetch(
        `/api/admin/users/${encodeURIComponent(
          selectedUser.email
        )}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            roles: finalRoles,
            status: editedStatus,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          "Failed to save user."
        );
      }

      setUsers((current) =>
        current.map((item) =>
          item.email === selectedUser.email
            ? {
              ...item,
              roles: finalRoles,
              status: editedStatus,
            }
            : item
        )
      );

      closeEditor();
    } catch (err) {
      console.error(
        "Save user failed:",
        err
      );

      alert(
        err.message ||
        "Failed to save user."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f4] text-[#111827]">
      <main className="mx-auto max-w-[1440px] px-5 pb-12 pt-8 sm:px-8 sm:pt-12 lg:px-10 lg:pt-14">
        {/* HEADER */}
        <div className="border-b border-[#dcdeda] pb-6">
          <button
            type="button"
            onClick={() => navigate("/hub")}
            className="mb-4 text-[11px] font-medium text-slate-400 transition hover:text-slate-900"
          >
            ← Applications Hub
          </button>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
            Administration
          </div>

          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.035em]">
                Users
              </h1>

              <p className="mt-2 max-w-xl text-sm text-slate-500">
                Manage account approval,
                application access and
                account status.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                loadUsers({
                  silent: true,
                })
              }
              disabled={
                loading || refreshing
              }
              className="inline-flex items-center justify-center gap-2 self-start border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
            >
              {refreshing ? (
                <LoaderCircle
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <RefreshCw
                  size={14}
                />
              )}
              Refresh
            </button>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="mt-6 grid grid-cols-1 border border-slate-200 bg-white sm:grid-cols-3">
          <div className="border-b border-slate-200 px-5 py-4 sm:border-b-0 sm:border-r">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Users
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {users.length}
            </div>
          </div>

          <div className="border-b border-slate-200 px-5 py-4 sm:border-b-0 sm:border-r">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Pending approval
            </div>
            <div className="mt-1 text-2xl font-semibold text-amber-600">
              {pendingCount}
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Disabled
            </div>
            <div className="mt-1 text-2xl font-semibold text-rose-600">
              {disabledCount}
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search
              size={15}
              strokeWidth={1.8}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search users..."
              className="h-10 w-full border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ["all", "All"],
              [
                "pending",
                "Pending",
              ],
              [
                "disabled",
                "Disabled",
              ],
            ].map(([value, label]) => {
              const active =
                filter === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setFilter(
                      value
                    )
                  }
                  className={`border px-3 py-2 text-xs font-medium transition ${active
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* USER LIST */}
        <div className="mt-5 border border-slate-200 bg-white">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                />
                Loading users…
              </div>
            </div>
          ) : error ? (
            <div className="border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
              <UserRound
                size={24}
                strokeWidth={1.5}
                className="text-slate-300"
              />
              <div className="mt-3 text-sm font-medium text-slate-600">
                No users found
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Try another search or
                filter.
              </div>
            </div>
          ) : (
            filteredUsers.map(
              (targetUser) => {
                const isSelf =
                  targetUser.email ===
                  currentUser?.email;

                return (
                  <div
                    key={
                      targetUser.email
                    }
                    className="border-b border-slate-100 px-4 py-5 last:border-b-0 sm:px-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {
                              targetUser.email
                            }
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {targetUser.approved ? (
                              <StatusBadge tone="green">
                                Approved
                              </StatusBadge>
                            ) : (
                              <StatusBadge tone="amber">
                                <Clock3
                                  size={
                                    11
                                  }
                                />
                                Pending
                              </StatusBadge>
                            )}

                            {targetUser.status ===
                              "disabled" ? (
                              <StatusBadge tone="red">
                                Disabled
                              </StatusBadge>
                            ) : (
                              <StatusBadge tone="neutral">
                                Active
                              </StatusBadge>
                            )}

                            {isSelf && (
                              <StatusBadge tone="blue">
                                You
                              </StatusBadge>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {targetUser.roles.includes(
                            "calendar_user"
                          ) && (
                              <RoleBadge tone="blue">
                                Calendar
                              </RoleBadge>
                            )}

                          {targetUser.roles.includes(
                            "admin"
                          ) && (
                              <RoleBadge>
                                Administrator
                              </RoleBadge>
                            )}
                        </div>

                        <div className="mt-3 text-[11px] text-slate-400">
                          Last seen ·{" "}
                          {formatLastSeen(
                            targetUser.lastSeen
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openEditor(
                            targetUser
                          )
                        }
                        className="inline-flex items-center justify-center border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        {targetUser.approved
                          ? "Edit user"
                          : "Review user"}
                      </button>
                    </div>
                  </div>
                );
              }
            )
          )}
        </div>
      </main>

      {/* EDITOR */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="Close"
            onClick={
              saving || approving || deleting
                ? undefined
                : closeEditor
            }
            className="absolute inset-0 bg-slate-950/30"
          />

          <div className="relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden border border-slate-200 bg-[#f6f6f4] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#dcdeda] px-5 py-5 sm:px-7">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                  User management
                </div>

                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                  {selectedUser.approved
                    ? "Edit user"
                    : "Review user"}
                </h2>

                <p className="mt-1 break-all text-sm text-slate-500">
                  {
                    selectedUser.email
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                disabled={
                  saving ||
                  approving ||
                  deleting
                }
                className="flex h-8 w-8 items-center justify-center text-slate-400 transition hover:text-slate-900 disabled:opacity-40"
              >
                <X size={17} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
              {/* APPROVAL */}
              <section>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Approval
                </div>

                <div className="mt-3 flex flex-col gap-3 border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-800">
                      {selectedUser.approved
                        ? "Account approved"
                        : "Approval required"}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      {selectedUser.approved
                        ? "This account can use approved applications based on its roles."
                        : "Approve the account before granting normal application access."}
                    </div>
                  </div>

                  {!selectedUser.approved && (
                    <button
                      type="button"
                      onClick={
                        approveUser
                      }
                      disabled={
                        approving ||
                        saving
                      }
                      className="inline-flex items-center justify-center gap-2 bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                    >
                      {approving ? (
                        <LoaderCircle
                          size={14}
                          className="animate-spin"
                        />
                      ) : (
                        <Check
                          size={14}
                        />
                      )}
                      Approve account
                    </button>
                  )}
                </div>
              </section>

              {/* ACCESS */}
              <section className="mt-7">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Access
                </div>

                <div className="mt-3 space-y-2">
                  <label className="flex cursor-pointer items-start gap-3 border border-slate-200 bg-white p-4">
                    <input
                      type="checkbox"
                      checked={editedRoles.includes(
                        "calendar_user"
                      )}
                      onChange={() =>
                        toggleRole(
                          "calendar_user"
                        )
                      }
                      disabled={
                        saving ||
                        approving
                      }
                      className="mt-0.5 h-4 w-4"
                    />

                    <div>
                      <div className="text-sm font-medium text-slate-800">
                        Calendar access
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-400">
                        Allows access to
                        Calendar,
                        Reservations and
                        Automations.
                      </div>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 border border-slate-200 bg-white p-4">
                    <input
                      type="checkbox"
                      checked={editedRoles.includes(
                        "admin"
                      )}
                      onChange={() =>
                        toggleRole(
                          "admin"
                        )
                      }
                      disabled={
                        saving ||
                        approving ||
                        (
                          selectedUser.email ===
                          currentUser?.email &&
                          editedRoles.includes(
                            "admin"
                          )
                        )
                      }
                      className="mt-0.5 h-4 w-4"
                    />

                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        <ShieldCheck
                          size={15}
                          className="text-blue-600"
                        />
                        Administrator
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-400">
                        Allows access to
                        ParkPro
                        administration.
                      </div>

                      {selectedUser.email ===
                        currentUser?.email &&
                        editedRoles.includes(
                          "admin"
                        ) && (
                          <div className="mt-2 text-[11px] text-amber-600">
                            Your own
                            administrator
                            access cannot
                            be removed here.
                          </div>
                        )}
                    </div>
                  </label>
                </div>
              </section>

              {/* STATUS */}
              <section className="mt-7">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Account status
                </div>

                <select
                  value={
                    editedStatus
                  }
                  onChange={(event) =>
                    setEditedStatus(
                      event.target.value
                    )
                  }
                  disabled={
                    saving ||
                    approving
                  }
                  className="mt-3 h-11 w-full border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="active">
                    Active
                  </option>
                  <option value="disabled">
                    Disabled
                  </option>
                </select>
              </section>

              {selectedUser.status === "disabled" &&
                selectedUser.email !== currentUser?.email && (
                  <section className="mt-8 border border-rose-200 bg-rose-50/50 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-600">
                      Danger zone
                    </div>

                    <div className="mt-2 text-sm font-medium text-slate-800">
                      Delete disabled account
                    </div>

                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      Permanently removes this account and its
                      ParkPro data. This cannot be undone.
                    </div>

                    <button
                      type="button"
                      onClick={deleteUser}
                      disabled={
                        saving ||
                        approving ||
                        deleting
                      }
                      className="mt-4 inline-flex items-center gap-2 border border-rose-300 bg-white px-4 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-wait disabled:opacity-50"
                    >
                      {deleting ? (
                        <LoaderCircle
                          size={14}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={14} />
                      )}

                      {deleting
                        ? "Deleting…"
                        : "Delete user"}
                    </button>
                  </section>
                )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#dcdeda] bg-[#f6f6f4] px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={closeEditor}
                disabled={
                  saving ||
                  approving
                }
                className="px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-900 disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveUser}
                disabled={
                  saving ||
                  approving
                }
                className="inline-flex items-center justify-center gap-2 bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {saving && (
                  <LoaderCircle
                    size={15}
                    className="animate-spin"
                  />
                )}
                {saving
                  ? "Saving…"
                  : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}