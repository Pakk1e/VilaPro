import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const { user, initializing } = useAuth();

  useEffect(() => {
    if (!initializing && user) {
      navigate("/hub", { replace: true });
    }
  }, [user, initializing]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.message || "Authentication failed");
      return;
    }

    navigate("/hub", { replace: true });
  }

  return (
    <div className="login-bg">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-md"
      >
        <h2 className="text-3xl font-black text-center mb-2 tracking-tighter text-slate-900">
          Automation Hub
        </h2>

        <p className="text-center text-slate-400 text-xs font-bold uppercase mb-8 tracking-widest">
          Automation & Workplace Tools
        </p>

        {error && (
          <p className="text-red-600 text-sm text-center mt-4">
            {error}
          </p>
        )}

        <input
          className="w-full p-5 mb-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full p-5 mb-8 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-60"
        >
          {loading ? "Authenticating..." : "Sign In"}
        </button>
        <p className="text-center text-sm text-slate-500 mt-6">
          Don’t have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="font-bold text-blue-600 hover:underline"
          >
            Create account
          </button>
        </p>
      </form>


    </div>

  );
}
