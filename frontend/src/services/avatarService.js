const BASE = import.meta.env.VITE_API_URL ?? "";

/** Checks whether backend AI portrait generation is enabled (Gemini key or local SD WebUI). */
export async function getPortraitStatus({ signal } = {}) {
  try {
    const res = await fetch(`${BASE}/api/avatar/status`, { signal });
    if (!res.ok) return { portraitEnabled: false, provider: null };
    return await res.json();
  } catch {
    return { portraitEnabled: false, provider: null };
  }
}

/** Calls the backend portrait endpoint to turn the 3D avatar snapshot + stats into a studio photo. */
export async function generateRealisticPortrait({ gender, age, heightCm, weightKg, snapshotBase64 }, { signal } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api/avatar/portrait`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gender, age, heightCm, weightKg, snapshotBase64 }),
      signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new Error("Could not reach the backend server. Start the backend on port 3000 and try again.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Could not generate the photorealistic portrait.");
  }
  if (!data.imageDataUrl) {
    throw new Error("The server did not return a portrait image.");
  }
  return data;
}
