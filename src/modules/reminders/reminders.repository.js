import { Reminder } from "./reminder.model.js";

export async function createReminder(reminderData) {
  return await Reminder.create(reminderData);
}

export async function findRemindersByUser(userId, filter = {}) {
  return await Reminder.find({ ...filter, userId }).sort({ remindAt: 1 });
}

export async function findReminderByIdAndUser(reminderId, userId) {
  return await Reminder.findOne({ _id: reminderId, userId });
}

export async function updateReminder(reminderId, userId, updateData) {
  return await Reminder.findOneAndUpdate({ _id: reminderId, userId }, updateData, {
    returnDocument: "after",
    runValidators: true,
  });
}

export async function deleteReminder(reminderId, userId) {
  return await Reminder.findOneAndDelete({ _id: reminderId, userId });
}

export async function findDueReminders(now = new Date(), limit = 100) {
  return await Reminder.find({
    status: "pending",
    notifiedAt: null,
    remindAt: { $lte: now },
  })
    .sort({ remindAt: 1 })
    .limit(limit);
}
