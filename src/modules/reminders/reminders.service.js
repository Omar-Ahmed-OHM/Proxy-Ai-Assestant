import * as remindersRepository from "./reminders.repository.js";
import * as usersService from "../users/users.service.js";
import { zonedTimeToUtc, hasExplicitOffset, formatInTimezone } from "../../utils/date.js";

function createError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function toPublicReminder(reminder) {
  return {
    id: reminder._id.toString(),
    title: reminder.title,
    description: reminder.description ?? null,
    remindAt: reminder.remindAt,
    remindAtLocal: formatInTimezone(reminder.remindAt, reminder.timezone),
    timezone: reminder.timezone,
    status: reminder.status,
    completedAt: reminder.completedAt ?? null,
    createdAt: reminder.createdAt,
    updatedAt: reminder.updatedAt,
  };
}

function resolveRemindAt(remindAt, timezone) {
  return hasExplicitOffset(remindAt)
    ? new Date(remindAt)
    : zonedTimeToUtc(remindAt, timezone);
}

function assertInFuture(date) {
  if (date.getTime() <= Date.now()) {
    throw createError("remindAt must be in the future", "REMINDER_IN_PAST");
  }
}

async function findOwnedReminder(reminderId, userId) {
  const reminder = await remindersRepository.findReminderByIdAndUser(reminderId, userId);

  if (!reminder) {
    throw createError("Reminder not found", "REMINDER_NOT_FOUND");
  }

  return reminder;
}

export async function createReminder(userId, reminderData) {
  const { title, description } = reminderData;
  const timezone = reminderData.timezone ?? (await usersService.getUserById(userId)).timezone;
  const remindAt = resolveRemindAt(reminderData.remindAt, timezone);

  assertInFuture(remindAt);

  const reminder = await remindersRepository.createReminder({
    userId,
    title,
    description,
    remindAt,
    timezone,
  });

  return toPublicReminder(reminder);
}

export async function getReminders(userId, { status } = {}) {
  const filter = status ? { status } : {};
  const reminders = await remindersRepository.findRemindersByUser(userId, filter);

  return reminders.map(toPublicReminder);
}

export async function getReminderById(reminderId, userId) {
  const reminder = await findOwnedReminder(reminderId, userId);
  return toPublicReminder(reminder);
}

export async function updateReminder(reminderId, userId, updateData) {
  const reminder = await findOwnedReminder(reminderId, userId);

  if (reminder.status !== "pending") {
    throw createError(
      `Cannot edit a ${reminder.status} reminder`,
      "REMINDER_NOT_EDITABLE"
    );
  }

  const updates = {};

  if (updateData.title !== undefined) updates.title = updateData.title;
  if (updateData.description !== undefined) updates.description = updateData.description;
  if (updateData.timezone !== undefined) updates.timezone = updateData.timezone;

  if (updateData.remindAt !== undefined) {
    const remindAt = resolveRemindAt(
      updateData.remindAt,
      updates.timezone ?? reminder.timezone
    );

    assertInFuture(remindAt);
    updates.remindAt = remindAt;
    updates.notifiedAt = null;
  }

  if (Object.keys(updates).length === 0) {
    throw createError("No valid fields to update", "NO_UPDATE_FIELDS");
  }

  const updated = await remindersRepository.updateReminder(reminderId, userId, updates);

  if (!updated) {
    throw createError("Reminder not found", "REMINDER_NOT_FOUND");
  }

  return toPublicReminder(updated);
}

async function transitionStatus(reminderId, userId, targetStatus, extraUpdates = {}) {
  const reminder = await findOwnedReminder(reminderId, userId);

  if (reminder.status === targetStatus) {
    return toPublicReminder(reminder);
  }

  if (reminder.status !== "pending") {
    throw createError(
      `Cannot change a ${reminder.status} reminder to ${targetStatus}`,
      "INVALID_STATUS_TRANSITION"
    );
  }

  const updated = await remindersRepository.updateReminder(reminderId, userId, {
    status: targetStatus,
    ...extraUpdates,
  });

  return toPublicReminder(updated);
}

export async function completeReminder(reminderId, userId) {
  return await transitionStatus(reminderId, userId, "completed", {
    completedAt: new Date(),
  });
}

export async function cancelReminder(reminderId, userId) {
  return await transitionStatus(reminderId, userId, "cancelled");
}

export async function deleteReminder(reminderId, userId) {
  const reminder = await remindersRepository.deleteReminder(reminderId, userId);

  if (!reminder) {
    throw createError("Reminder not found", "REMINDER_NOT_FOUND");
  }
}
