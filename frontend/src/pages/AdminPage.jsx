import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { apiFetch } from "../lib/api";


export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedUser, setSelectedUser] = useState(null);

  const [editedRoles, setEditedRoles] = useState([]);
  const [editedStatus, setEditedStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    try {
      const resp = await apiFetch("/api/admin/users");
      if (!resp.ok) throw new Error("Failed to load users");

      const data = await resp.json();
      setUsers(data.users);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function approveUser(email) {
    const resp = await apiFetch(
      `/api/admin/users/${encodeURIComponent(email)}/approve`,
      { method: "PATCH" }
    );

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Approval failed");
    }

    // refresh list
    await loadUsers();
  }

  useEffect(() => {
    loadUsers();
  }, []);





  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <PageHeader title="Admin · User Management" />

      <div className="mt-6 bg-white rounded-2xl shadow overflow-hidden">
        {loading && (
          <div className="p-6 text-slate-500">Loading users…</div>
        )}

        {error && (
          <div className="p-6 text-red-600">{error}</div>
        )}

        {!loading && !error && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Roles</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Calendar</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.map(user => (
                <tr
                  key={user.email}
                  className="border-t border-slate-200 hover:bg-slate-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {user.email}
                      </span>

                      {user.approved ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          Approved
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                          Pending
                        </span>
                      )}
                    </div>
                  </td>


                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      {user.roles.map(role => (
                        <span
                          key={role}
                          className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`font-bold ${user.status === "active"
                        ? "text-green-600"
                        : "text-red-600"
                        }`}
                    >
                      {user.status}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {user.roles.includes("calendar_user") ? "✅ Enabled" : "❌ Disabled"}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setEditedRoles(user.roles);
                        setEditedStatus(user.status);
                      }}

                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-slate-400"
                  >
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* EDIT USER MODAL (UI ONLY) */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-black text-slate-900">
                Edit User
              </h2>
            </div>

            <div className="p-6 space-y-4">

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Email
                </label>
                <div className="mt-1 text-slate-900 font-medium">
                  {selectedUser.email}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Approval
                </label>

                <div className="mt-2 flex items-center justify-between">
                  {selectedUser.approved ? (
                    <span className="text-sm font-bold text-emerald-600">
                      Approved
                    </span>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          await approveUser(selectedUser.email);

                          // update local state
                          setUsers(users =>
                            users.map(u =>
                              u.email === selectedUser.email
                                ? { ...u, approved: true, approvedAt: new Date().toISOString() }
                                : u
                            )
                          );

                          setSelectedUser(u => ({
                            ...u,
                            approved: true,
                            approvedAt: new Date().toISOString(),
                          }));
                        } catch (e) {
                          alert(e.message);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold
                   bg-emerald-600 text-white
                   hover:bg-emerald-500"
                    >
                      Approve user
                    </button>
                  )}
                </div>
              </div>


              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Roles
                </label>

                <div className="mt-2 space-y-2">
                  {["calendar_user"].map(role => (
                    <label
                      key={role}
                      className="flex items-center gap-2 text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={editedRoles.includes(role)}
                        onChange={e => {
                          if (e.target.checked) {
                            setEditedRoles([...editedRoles, role]);
                          } else {
                            setEditedRoles(
                              editedRoles.filter(r => r !== role)
                            );
                          }
                        }}
                      />
                      <span>{role}</span>
                    </label>
                  ))}

                  {/* always enforced */}
                  <input type="hidden" value="user" />
                </div>
              </div>


              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Status
                </label>

                <select
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={editedStatus}
                  onChange={e => setEditedStatus(e.target.value)}
                >
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  setSaving(true);

                  const finalRoles = Array.from(
                    new Set(["user", ...editedRoles])
                  );

                  const resp = await apiFetch(
                    `/api/admin/users/${encodeURIComponent(selectedUser.email)}`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        roles: finalRoles,
                        status: editedStatus,
                      }),
                    }
                  );
                  setSaving(false);

                  if (!resp.ok) {
                    alert("Failed to save user");
                    return;
                  }


                  // update UI state
                  setUsers(users =>
                    users.map(u =>
                      u.email === selectedUser.email
                        ? {
                          ...u,
                          roles: finalRoles,
                          status: editedStatus,
                          calendarAccess: finalRoles.includes("calendar_user")
                        }
                        : u
                    )
                  );

                  setSelectedUser(null);
                }}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
