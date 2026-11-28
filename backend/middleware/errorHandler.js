/** Centralized Express error middleware returning safe JSON messages without stack traces. */
export function errorHandler(err, _req, res, _next) {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ message: "Request payload is too large." });
  }
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON payload." });
  }

  const status = Number.isInteger(err?.status) ? err.status : 500;
  const message = status >= 500 && !err?.status
    ? "Internal server error."
    : (err?.message || "Something went wrong.");

  if (status >= 500) {
    console.error(`[backend] ${status}:`, err?.message || err);
  }
  return res.status(status).json({ message });
}
