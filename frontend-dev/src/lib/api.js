export const API_BASE =
  import.meta.env.PROD
    ? "https://api.vadovsky-tech.com"
    : "";

export async function apiFetch(path, options = {}) {
  const resp = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
  });

  if (resp.status === 403) {
    try {
      const data = await resp.clone().json();
      if (data?.error === "Account disabled") {
        localStorage.removeItem("parkpro_email");
        window.location.href = "/login";
        return Promise.reject(new Error("Account disabled"));
      }
    } catch {
      // ignore JSON parse issues
    }
  }

  return resp;
}

