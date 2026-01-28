export const API_BASE =
  import.meta.env.PROD
    ? "https://api.vadovsky-tech.com"
    : "";

export function apiFetch(path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
  });
}
