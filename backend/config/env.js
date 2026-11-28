/** Centralized runtime configuration read from environment variables. */
export function getEnv() {
  const portNum = Number(process.env.PORT);
  return {
    port: Number.isInteger(portNum) && portNum > 0 ? portNum : 3000,
    corsOrigin: (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    geminiApiKey: (process.env.GEMINI_API_KEY || "").trim(),
    geminiImageModel: (process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image").trim(),
    sdWebuiUrl: (process.env.SD_WEBUI_URL || "").trim().replace(/\/+$/, ""),
  };
}
