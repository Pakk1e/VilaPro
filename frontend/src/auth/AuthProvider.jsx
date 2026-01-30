import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true); // 👈 REQUIRED
  const [approved, setApproved] = useState(false);
  const [villaProConnected, setVillaProConnected] = useState(false);


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
          setUser({ email: data.email, approved: data.approved, villaProConnected: data.villaProConnected });
          setRoles(data.roles || []);
          setApproved(!!data.approved);
          setVillaProConnected(!!data.villaProConnected);
          console.log("✅ User session restored");
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

      const meResp = await apiFetch("/api/me");
      const me = await meResp.json();

      if (!meResp.ok) {
        throw new Error("Failed to fetch user data");
      }

      if (me.authenticated) {
        setUser({ email: me.email, approved: me.approved, villaProConnected: me.villaProConnected });
        setRoles(me.roles || []);
        setApproved(!!me.approved);
        setVillaProConnected(!!me.villaProConnected);
      }



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

  async function refreshMe() {
    const resp = await apiFetch("/api/me");
    if (!resp.ok) return;

    const data = await resp.json();

    if (data.authenticated) {
      setUser({
        email: data.email,
        approved: data.approved,
        villaProConnected: data.villaProConnected
      });
      setRoles(data.roles || []);
      setApproved(!!data.approved);
      setVillaProConnected(!!data.villaProConnected);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        approved,
        villaProConnected,
        loading,
        initializing,
        login,
        logout,
        refreshMe
      }}
    >

      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
