import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../app.js";
import {
  ApiError,
  buildPortraitPrompt,
  generatePortrait,
  validatePortraitInput,
} from "../services/portraitService.js";

const SAMPLE_PNG_B64 = Buffer.from("fake-png-bytes").toString("base64");
const SAMPLE_DATA_URL = `data:image/png;base64,${SAMPLE_PNG_B64}`;

test("validatePortraitInput normalizes valid profile and snapshot", () => {
  const res = validatePortraitInput({
    gender: "male",
    age: "25",
    heightCm: 176.4,
    weightKg: 72.2,
    snapshotBase64: SAMPLE_DATA_URL,
  });
  assert.equal(res.gender, "male");
  assert.equal(res.age, 25);
  assert.equal(res.heightCm, 176);
  assert.equal(res.weightKg, 72);
  assert.deepEqual(res.snapshot, { mimeType: "image/png", data: SAMPLE_PNG_B64 });
});

test("validatePortraitInput rejects invalid gender, ranges, and snapshot formats", () => {
  assert.throws(() => validatePortraitInput({ gender: "robot", age: 25, heightCm: 175, weightKg: 70 }), ApiError);
  assert.throws(() => validatePortraitInput({ gender: "male", age: 3, heightCm: 175, weightKg: 70 }), ApiError);
  assert.throws(() => validatePortraitInput({ gender: "female", age: 25, heightCm: 30, weightKg: 70 }), ApiError);
  assert.throws(() => validatePortraitInput({ gender: "female", age: 25, heightCm: 170, weightKg: 10 }), ApiError);
  assert.throws(
    () => validatePortraitInput({ gender: "male", age: 25, heightCm: 175, weightKg: 70, snapshotBase64: "https://evil.com/x.png" }),
    ApiError
  );

  const oversized = `data:image/jpeg;base64,${Buffer.alloc(2 * 1024 * 1024 + 10).toString("base64")}`;
  assert.throws(
    () => validatePortraitInput({ gender: "male", age: 25, heightCm: 175, weightKg: 70, snapshotBase64: oversized }),
    (err) => err instanceof ApiError && err.status === 413
  );
});

test("buildPortraitPrompt includes stats, build descriptor, and optional reference instruction", () => {
  const withRef = buildPortraitPrompt({ gender: "male", age: 25, heightCm: 176, weightKg: 72, hasSnapshot: true });
  assert.match(withRef, /25-year-old young adult man/);
  assert.match(withRef, /fit, athletic average physique/);
  assert.match(withRef, /Transform the provided 3D character reference image/);

  const noRefHeavy = buildPortraitPrompt({ gender: "female", age: 30, heightCm: 164, weightKg: 90, hasSnapshot: false });
  assert.match(noRefHeavy, /30-year-old young adult woman/);
  assert.match(noRefHeavy, /heavy, full-figured physique/);
  assert.doesNotMatch(noRefHeavy, /Transform the provided 3D character reference image/);
});

test("generatePortrait rejects when API key is missing and handles Gemini API response", async () => {
  await assert.rejects(
    () => generatePortrait({ gender: "male", age: 25, heightCm: 176, weightKg: 72 }, { apiKey: "" }),
    (err) => err instanceof ApiError && err.status === 503
  );

  let capturedUrl = "";
  let capturedInit = null;
  const mockOutB64 = Buffer.from("photorealistic-jpeg").toString("base64");
  const mockFetch = async (url, init) => {
    capturedUrl = url;
    capturedInit = init;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [
              { text: "Generated studio portrait." },
              { inlineData: { mimeType: "image/jpeg", data: mockOutB64 } },
            ],
          },
        }],
      }),
    };
  };

  const out = await generatePortrait(
    { gender: "male", age: 25, heightCm: 176, weightKg: 72, snapshotBase64: SAMPLE_DATA_URL },
    { apiKey: "test-key", model: "gemini-2.5-flash-image", fetchImpl: mockFetch }
  );

  assert.equal(capturedUrl, "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent");
  assert.equal(capturedInit.headers["x-goog-api-key"], "test-key");
  const parsedBody = JSON.parse(capturedInit.body);
  assert.equal(parsedBody.contents[0].parts.length, 2);
  assert.equal(parsedBody.contents[0].parts[0].inlineData.data, SAMPLE_PNG_B64);
  assert.deepEqual(parsedBody.generationConfig.responseModalities, ["IMAGE", "TEXT"]);
  assert.equal(out.imageDataUrl, `data:image/jpeg;base64,${mockOutB64}`);
  assert.equal(out.mimeType, "image/jpeg");
});

test("generatePortrait surfaces rate limits and empty model responses safely", async () => {
  await assert.rejects(
    () => generatePortrait(
      { gender: "male", age: 25, heightCm: 176, weightKg: 72 },
      { apiKey: "test-key", fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({}) }) }
    ),
    (err) => err instanceof ApiError && err.status === 429
  );

  await assert.rejects(
    () => generatePortrait(
      { gender: "male", age: 25, heightCm: 176, weightKg: 72 },
      { apiKey: "test-key", fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ candidates: [] }) }) }
    ),
    (err) => err instanceof ApiError && err.status === 502
  );
});

test("generatePortrait uses local SD WebUI when apiKey is empty and sdWebuiUrl is set", async () => {
  let calledUrl = "";
  const mockB64 = Buffer.from("local-sd-png").toString("base64");
  const out = await generatePortrait(
    { gender: "male", age: 25, heightCm: 176, weightKg: 72, snapshotBase64: SAMPLE_DATA_URL },
    {
      apiKey: "",
      sdWebuiUrl: "http://127.0.0.1:7860",
      fetchImpl: async (url) => {
        calledUrl = url;
        return { ok: true, status: 200, json: async () => ({ images: [mockB64] }) };
      },
    }
  );
  assert.equal(calledUrl, "http://127.0.0.1:7860/sdapi/v1/img2img");
  assert.equal(out.model, "local-sd-webui");
  assert.equal(out.imageDataUrl, `data:image/png;base64,${mockB64}`);
});

test("Express app health, avatar status, and /api/avatar/portrait validation & 503 handling", async () => {
  const prevKey = process.env.GEMINI_API_KEY;
  const prevSd = process.env.SD_WEBUI_URL;
  delete process.env.GEMINI_API_KEY;
  delete process.env.SD_WEBUI_URL;

  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true, service: "dailypilot-backend" });

    const status = await fetch(`${base}/api/avatar/status`);
    assert.equal(status.status, 200);
    assert.deepEqual(await status.json(), { portraitEnabled: false, provider: null });

    const bad = await fetch(`${base}/api/avatar/portrait`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gender: "invalid" }),
    });
    assert.equal(bad.status, 400);

    const noKey = await fetch(`${base}/api/avatar/portrait`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gender: "male", age: 25, heightCm: 176, weightKg: 72 }),
    });
    assert.equal(noKey.status, 503);
    assert.match((await noKey.json()).message, /GEMINI_API_KEY/);

    const badJson = await fetch(`${base}/api/avatar/portrait`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    assert.equal(badJson.status, 400);
  } finally {
    if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
    if (prevSd !== undefined) process.env.SD_WEBUI_URL = prevSd;
    await new Promise((resolve) => server.close(resolve));
  }
});
