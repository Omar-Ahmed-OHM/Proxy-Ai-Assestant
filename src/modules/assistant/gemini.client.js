import { env } from "../../config/env.js";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 20_000;
// Statuses where another model may still answer (unavailable model, rate limit, overload)
const RETRYABLE_STATUSES = new Set([404, 429, 500, 503]);

function createError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function assertConfigured() {
  if (!env.GEMINI_API_KEY) {
    throw createError("The assistant is not configured", "ASSISTANT_NOT_CONFIGURED");
  }
}

function modelChain() {
  return [...new Set([env.GEMINI_MODEL, ...env.GEMINI_FALLBACK_MODELS].filter(Boolean))];
}

export async function generateContent(body) {
  assertConfigured();

  const models = modelChain();

  for (let index = 0; index < models.length; index++) {
    try {
      return await requestModel(models[index], body);
    } catch (error) {
      const isLast = index === models.length - 1;
      if (isLast || !RETRYABLE_STATUSES.has(error.status)) throw error;
      console.warn(`Gemini model ${models[index]} failed (${error.status}), trying ${models[index + 1]}`);
    }
  }
}

async function requestModel(model, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_URL}/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(`Gemini request failed (${model}, ${response.status}): ${text.slice(0, 500)}`);
      const error = createError("The assistant is unavailable right now", "ASSISTANT_UNAVAILABLE");
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts;

    if (!Array.isArray(parts)) {
      throw createError("The assistant returned an empty response", "ASSISTANT_UNAVAILABLE");
    }

    return parts;
  } catch (error) {
    if (error.code) throw error;
    console.error("Gemini request error:", error.message);
    throw createError("The assistant is unavailable right now", "ASSISTANT_UNAVAILABLE");
  } finally {
    clearTimeout(timer);
  }
}

export function textFromParts(parts) {
  return parts
    .filter((part) => typeof part.text === "string" && !part.thought)
    .map((part) => part.text)
    .join("")
    .trim();
}
