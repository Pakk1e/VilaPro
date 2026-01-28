import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true); // 👈 REQUIRED

  // 🔁 SESSION REHYDRATION (THIS WAS MISSING / NOT FIRING)
  useEffect(() => {
    async function restoreSession() {
      try {
        console.log("🔁 Calling /api/me");

        const resp = await apiFetch("/api/me");

        if (!resp.ok) {
          console.log("❌ /api/me not authenticated");
          return;
        }

        const data = await resp.json();
        console.log("✅ /api/me response:", data);

        if (data.authenticated) {
          setUser({ email: data.email });
          setRoles(data.roles || []);
        }
      } catch (e) {
        console.error("❌ /api/me failed", e);
      } finally {
        setInitializing(false); // 👈 THIS IS CRITICAL
      }
    }

    restoreSession();
  }, []);

  async function login(email, password) {
    setLoading(true);
    try {
      const resp = await apiFetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });


      if (!resp.ok) {
        const data = await resp.json();

        if (data.message?.includes("disabled")) {
          return {
            success: false,
            message: "Your account has been disabled."
          };
        }

        throw new Error("Login failed");
      }

      setUser({ email });
      setRoles(
        email === "jakub.vadovsky@jci.com"
          ? ["user", "calendar_user", "admin"]
          : ["user", "calendar_user"]
      );

      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await apiFetch("/api/logout", { method: "POST" });

    setUser(null);
    setRoles([]);
  }

  return (
    <AuthContext.Provider
      value={{ user, roles, loading, initializing, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
