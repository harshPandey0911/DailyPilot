// Auth API client. Endpoints are assumptions until the backend auth routes exist:
//   POST {VITE_API_URL}/api/auth/login   { email, password }
//   POST {VITE_API_URL}/api/auth/signup  { name, email, phone, password }
const BASE = import.meta.env.VITE_API_URL ?? "";

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach the server. Please try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong. Please try again.");
  return data;
}

export const login = (credentials) => post("/api/auth/login", credentials);
export const signup = (details) => post("/api/auth/signup", details);

// Admin-configured "measure your height" app link. Falls back to VITE_HEIGHT_APP_URL.
// Backend (assumed): GET /api/settings/height-helper → { url }
export async function getHeightHelperUrl() {
  let url = import.meta.env.VITE_HEIGHT_APP_URL || null;
  try {
    const res = await fetch(`${BASE}/api/settings/height-helper`);
    if (res.ok) url = (await res.json()).url || url;
  } catch { /* use fallback */ }
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : null; // never render javascript: links
  } catch {
    return null;
  }
}
