import dotenv from "dotenv";

dotenv.config({ quiet: true });

function parseTrustProxy(value) {
  if (value === undefined || value === "") return undefined;
  if (value === "true") {
    throw new Error('TRUST_PROXY="true" is unsafe; use a hop count or proxy addresses');
  }
  if (value === "false") return false;
  return /^\d+$/.test(value) ? Number(value) : value;
}

export const env = {
  TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY),
  PORT: Number(process.env.PORT) || 5000,
  MONGODB_URI: process.env.MONGODB_URI ,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.5-flash",
  GEMINI_FALLBACK_MODELS: (process.env.GEMINI_FALLBACK_MODELS || "gemini-3.6-flash,gemini-3.5-flash-lite")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean),
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || "mailto:admin@example.com",
};
