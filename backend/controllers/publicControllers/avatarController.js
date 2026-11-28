import { getEnv } from "../../config/env.js";
import { generatePortrait } from "../../services/portraitService.js";

/** GET /api/avatar/status — reports whether backend AI portrait generation is configured. */
export function getAvatarStatus(_req, res) {
  const { geminiApiKey, sdWebuiUrl } = getEnv();
  const provider = geminiApiKey ? "gemini" : sdWebuiUrl ? "sd-webui" : null;
  res.json({ portraitEnabled: Boolean(provider), provider });
}

/** POST /api/avatar/portrait — converts user profile stats + 3D snapshot into a real studio portrait. */
export async function createPortrait(req, res, next) {
  try {
    const { geminiApiKey, geminiImageModel, sdWebuiUrl } = getEnv();
    const result = await generatePortrait(req.body, {
      apiKey: geminiApiKey,
      model: geminiImageModel,
      sdWebuiUrl,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
