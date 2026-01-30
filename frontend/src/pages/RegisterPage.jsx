import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { apiFetch } from "../lib/api";

export default function RegisterPage() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const resp = await apiFetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await resp.json();

            if (!resp.ok) {
                throw new Error(data.error || "Registration failed");
            }

            // ✅ auto-logged in, but pending
            if (data.status === "pending") {
                navigate("/hub");
                return;
            }

            // fallback (should not normally happen)
            navigate("/");
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-100 p-6">
            <PageHeader title="Create account" />

            <form
                onSubmit={handleSubmit}
                className="mt-6 max-w-md mx-auto bg-white rounded-2xl p-6 shadow space-y-4"
            >
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">
                        Email
                    </label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="mt-1 w-full border rounded-xl px-3 py-2"
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">
                        Password
                    </label>
                    <input
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="mt-1 w-full border rounded-xl px-3 py-2"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                        Minimum 8 characters
                    </p>
                </div>

                {error && (
                    <div className="text-sm font-bold text-red-600">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2 rounded-xl text-sm font-bold text-white
                     bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
                >
                    {loading ? "Creating account…" : "Create account"}
                </button>
            </form>
        </div>
    );
}
