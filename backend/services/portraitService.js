const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const ALLOWED_GENDERS = new Set(["male", "female", "other"]);
const DATA_URL_RE = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/i;
const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024; // 2 MB decoded image cap
const REQUEST_TIMEOUT_MS = 45_000;

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Validates and normalizes user profile stats and optional 3D canvas snapshot. */
export function validatePortraitInput(body) {
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Request body must be a JSON object.");
  }

  const gender = String(body.gender || "").toLowerCase();
  if (!ALLOWED_GENDERS.has(gender)) {
    throw new ApiError(400, "gender must be 'male', 'female', or 'other'.");
  }

  const age = Number(body.age);
  if (!Number.isFinite(age) || age < 5 || age > 120) {
    throw new ApiError(400, "age must be a number between 5 and 120.");
  }

  const heightCm = Number(body.heightCm);
  if (!Number.isFinite(heightCm) || heightCm < 50 || heightCm > 250) {
    throw new ApiError(400, "heightCm must be a number between 50 and 250.");
  }

  const weightKg = Number(body.weightKg);
  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 300) {
    throw new ApiError(400, "weightKg must be a number between 20 and 300.");
  }

  let snapshot = null;
  if (body.snapshotBase64 !== undefined && body.snapshotBase64 !== null && body.snapshotBase64 !== "") {
    if (typeof body.snapshotBase64 !== "string") {
      throw new ApiError(400, "snapshotBase64 must be a base64 image data URL.");
    }
    const match = body.snapshotBase64.trim().match(DATA_URL_RE);
    if (!match) {
      throw new ApiError(400, "snapshotBase64 must be a PNG, JPEG, or WebP data URL.");
    }
    const mimeType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
    const base64Data = match[2];
    const byteLength = Buffer.byteLength(base64Data, "base64");
    if (byteLength > MAX_SNAPSHOT_BYTES) {
      throw new ApiError(413, "Reference snapshot exceeds the 2 MB limit.");
    }
    snapshot = { mimeType, data: base64Data };
  }

  return {
    gender,
    age: Math.round(age),
    heightCm: Math.round(heightCm),
    weightKg: Math.round(weightKg),
    snapshot,
  };
}

function buildDescriptor(heightCm, weightKg) {
  const bmi = weightKg / (heightCm / 100) ** 2;
  if (bmi < 18.5) return "lean, slender physique";
  if (bmi < 24.5) return "fit, athletic average physique";
  if (bmi < 29) return "broad, muscular-solid physique";
  return "heavy, full-figured physique";
}

function subjectDescriptor(gender, age) {
  if (age < 13) return gender === "female" ? "young girl" : gender === "male" ? "young boy" : "child";
  if (age < 20) return gender === "female" ? "teenage young woman" : gender === "male" ? "teenage young man" : "teenager";
  if (age < 38) return gender === "female" ? "young adult woman" : gender === "male" ? "young adult man" : "young adult person";
  if (age < 58) return gender === "female" ? "adult woman" : gender === "male" ? "adult man" : "adult person";
  return gender === "female" ? "mature older woman" : gender === "male" ? "mature older man" : "mature older person";
}

/** Builds an ultra-photorealistic DSLR studio portrait prompt grounded in user stats and optional 3D reference. */
export function buildPortraitPrompt({ gender, age, heightCm, weightKg, hasSnapshot }) {
  const subject = subjectDescriptor(gender, age);
  const build = buildDescriptor(heightCm, weightKg);
  const outfit = gender === "female"
    ? "a fitted dark forest-green crew-neck t-shirt and dark blue denim jeans"
    : "a fitted charcoal-black crew-neck t-shirt and dark blue denim jeans";
  const grooming = gender === "male"
    ? "fine natural facial stubble, short dark brown textured hair, "
    : gender === "female"
      ? "natural dark brown hair, subtle natural skin glow, "
      : "short textured dark brown hair, ";

  const referenceClause = hasSnapshot
    ? "Transform the provided 3D character reference image into an ultra-photorealistic DSLR studio photograph while preserving its exact pose, framing, camera angle, hair silhouette, and clothing. "
    : "";

  return (
    `${referenceClause}` +
    `Capture an authentic, high-resolution 85mm DSLR studio portrait of a real ${age}-year-old ${subject} ` +
    `with a ${build} (${heightCm} cm, ${weightKg} kg), wearing ${outfit}. ` +
    `Render genuine human skin texture with natural pores, subtle facial warmth, ${grooming}` +
    `detailed natural eyes with crisp catchlights, realistic individual eyebrow and hair strands, ` +
    `authentic woven fabric creases, soft 3-point photographic studio lighting, and a clean off-white studio background. ` +
    `Zero 3D CGI, plastic, or illustration artifacts.`
  );
}

async function generateWithLocalSdWebui(input, { sdWebuiUrl, fetchImpl }) {
  const prompt = buildPortraitPrompt({ ...input, hasSnapshot: Boolean(input.snapshot) });
  const endpoint = input.snapshot ? `${sdWebuiUrl}/sdapi/v1/img2img` : `${sdWebuiUrl}/sdapi/v1/txt2img`;
  const body = {
    prompt,
    negative_prompt: "3d render, cgi, cartoon, plastic skin, smooth airbrushed skin, deformed, blurry",
    steps: 24,
    width: 600,
    height: 800,
    ...(input.snapshot ? { init_images: [input.snapshot.data], denoising_strength: 0.55 } : {}),
  };

  let res;
  try {
    res = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new ApiError(504, "Local image generation timed out.");
    }
    throw new ApiError(502, "Failed to reach local SD WebUI service.");
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload?.images?.[0]) {
    throw new ApiError(502, "Local SD WebUI did not return an image.");
  }
  return {
    imageDataUrl: `data:image/png;base64,${payload.images[0]}`,
    mimeType: "image/png",
    model: "local-sd-webui",
  };
}

/**
 * Generates an ultra-photorealistic portrait via Gemini API or optional local SD WebUI.
 * Accepts optional `fetchImpl` for unit/integration testing.
 */
export async function generatePortrait(rawInput, { apiKey, model, sdWebuiUrl, fetchImpl = fetch } = {}) {
  const input = validatePortraitInput(rawInput);
  if (!apiKey && sdWebuiUrl) {
    return generateWithLocalSdWebui(input, { sdWebuiUrl, fetchImpl });
  }
  if (!apiKey) {
    throw new ApiError(503, "GEMINI_API_KEY is not configured on the backend.");
  }

  const modelId = model || "gemini-2.5-flash-image";
  const parts = [];
  if (input.snapshot) {
    parts.push({
      inlineData: {
        mimeType: input.snapshot.mimeType,
        data: input.snapshot.data,
      },
    });
  }
  parts.push({
    text: buildPortraitPrompt({ ...input, hasSnapshot: Boolean(input.snapshot) }),
  });

  const url = `${GEMINI_ENDPOINT}/${encodeURIComponent(modelId)}:generateContent`;
  let res;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
          imageConfig: { aspectRatio: "3:4" },
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new ApiError(504, "Image generation timed out. Please try again.");
    }
    throw new ApiError(502, "Failed to reach the image generation service.");
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const upstreamMsg = payload?.error?.message || "Image generation failed.";
    if (res.status === 429) throw new ApiError(429, "Rate limit reached. Please wait a moment and try again.");
    if (res.status === 400) throw new ApiError(400, upstreamMsg);
    throw new ApiError(502, "Image generation service returned an error.");
  }

  const responseParts = payload?.candidates?.[0]?.content?.parts || [];
  const imagePart = responseParts.find((p) => p?.inlineData?.data);
  if (!imagePart) {
    throw new ApiError(502, "No image was returned by the model. Please try again.");
  }

  const mimeType = imagePart.inlineData.mimeType || "image/png";
  return {
    imageDataUrl: `data:${mimeType};base64,${imagePart.inlineData.data}`,
    mimeType,
    model: modelId,
  };
}
