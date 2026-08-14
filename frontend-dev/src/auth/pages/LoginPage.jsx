import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";

import { useAuth } from "../AuthProvider";
import Brand from "../../shared/components/Brand";

export default function LoginPage() {
    const {
        login,
        loading,
        user,
        initializing,
    } = useAuth();

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!initializing && user) {
            navigate("/hub", { replace: true });
        }
    }, [user, initializing, navigate]);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        const result = await login(email, password);

        if (!result.success) {
            setError(
                result.message ||
                "Authentication failed."
            );
            return;
        }

        navigate("/hub", { replace: true });
    }

    return (
        <div className="min-h-screen bg-[#f6f6f4] text-[#111827]">
            <div className="mx-auto flex min-h-screen max-w-[1440px] items-center justify-center px-5 py-10 sm:px-8 lg:px-10">
                <main className="w-full max-w-md">
                    <div className="mb-10 flex justify-center">
                        <Brand size="xl" showTagline />
                    </div>

                    <div className="border border-[#dcdeda] bg-white p-6 sm:p-8">
                        <div className="border-b border-slate-100 pb-5">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                                Welcome back
                            </div>

                            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                                Sign in
                            </h1>

                            <p className="mt-2 text-sm leading-5 text-slate-500">
                                Sign in to access your Vadovsky Tech applications.
                            </p>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="mt-6 space-y-4"
                        >
                            <div>
                                <label
                                    htmlFor="login-email"
                                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"
                                >
                                    Email
                                </label>

                                <input
                                    id="login-email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    required
                                    className="mt-2 h-11 w-full border border-slate-200 bg-[#fdfdfc] px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="login-password"
                                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"
                                >
                                    Password
                                </label>

                                <input
                                    id="login-password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    required
                                    className="mt-2 h-11 w-full border border-slate-200 bg-[#fdfdfc] px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500"
                                />
                            </div>

                            {error && (
                                <div className="border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex h-11 w-full items-center justify-center gap-2 bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                            >
                                {loading && (
                                    <LoaderCircle
                                        size={15}
                                        className="animate-spin"
                                    />
                                )}

                                {loading
                                    ? "Signing in…"
                                    : "Sign in"}
                            </button>
                        </form>

                        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
                            Don't have an account?{" "}
                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/register")
                                }
                                className="font-medium text-blue-600 transition hover:text-blue-700"
                            >
                                Create account
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}