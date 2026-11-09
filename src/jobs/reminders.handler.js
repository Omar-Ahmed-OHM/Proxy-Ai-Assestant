import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { processDueReminders } from "./reminders.job.js";

function authorized(req) {
  if (!env.CRON_SECRET) return false;
  const header = req.headers.authorization || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : req.query.key;
  if (typeof provided !== "string") return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(env.CRON_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function runRemindersJob(req, res) {
  if (!authorized(req)) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const stats = await processDueReminders();
  return res.status(200).json({ ok: true, ...stats });
}
