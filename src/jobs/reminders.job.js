import cron from "node-cron";
import { connectDB } from "../config/db.js";
import { Reminder } from "../modules/reminders/reminder.model.js";
import { findDueReminders } from "../modules/reminders/reminders.repository.js";
import { pushEnabled, sendPushToUser } from "../modules/push/push.service.js";

const STALE_AFTER_MS = 60 * 60 * 1000;

let running = false;

async function claimReminder(reminder, now) {
  return await Reminder.findOneAndUpdate(
    { _id: reminder._id, status: "pending", notifiedAt: null },
    { notifiedAt: now },
    { returnDocument: "after" }
  );
}

async function notify(reminder) {
  await sendPushToUser(reminder.userId, {
    title: `⏰ ${reminder.title}`,
    body: reminder.description || "ده ميعاد التذكير بتاعك.",
    url: "/reminders",
    tag: `reminder-${reminder._id}`,
  });
}

export async function processDueReminders() {
  if (running) return;
  running = true;

  try {
    await connectDB();
    const now = new Date();
    const due = await findDueReminders(now);

    for (const reminder of due) {
      const claimed = await claimReminder(reminder, now);
      if (!claimed) continue;
      if (now - claimed.remindAt > STALE_AFTER_MS) continue;

      try {
        await notify(claimed);
      } catch (error) {
        console.error(`Failed to send reminder ${claimed._id}:`, error.message);
      }
    }
  } catch (error) {
    console.error("Reminders job failed:", error.message);
  } finally {
    running = false;
  }
}

export function startRemindersJob() {
  if (!pushEnabled) return null;
  return cron.schedule("* * * * *", processDueReminders);
}
