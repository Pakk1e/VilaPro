import { useState } from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";

export default function VillaProModal({
    onClose,
    onSuccess,
}) {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { refreshMe } = useAuth();

    async function handleConnect(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const resp = await apiFetch("/api/villapro/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            const data = await resp.json();

            if (!resp.ok) {
                throw new Error(data.error || "VillaPro connection failed");
            }

            await refreshMe();

            // ✅ success
            onSuccess();
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
            setPassword("");
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-xl">
                {/* Header */}
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-black text-slate-900">
                        Connect VillaPro
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Enter your VillaPro password to enable calendar access.
                    </p>
                </div>

                {/* Body */}
                <form onSubmit={handleConnect} className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">
                            VillaPro password
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="mt-1 w-full border rounded-xl px-3 py-2"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="text-sm font-bold text-red-600">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-white
                         bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
                        >
                            {loading ? "Connecting…" : "Connect"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
