import * as remindersService from "./reminders.service.js";

export async function createReminder(req, res) {
  const reminder = await remindersService.createReminder(req.user.id, req.body);

  res.status(201).json({ reminder });
}

export async function getReminders(req, res) {
  const reminders = await remindersService.getReminders(req.user.id, req.query);

  res.status(200).json({ reminders });
}

export async function getReminder(req, res) {
  const reminder = await remindersService.getReminderById(req.params.id, req.user.id);

  res.status(200).json({ reminder });
}

export async function updateReminder(req, res) {
  const reminder = await remindersService.updateReminder(
    req.params.id,
    req.user.id,
    req.body
  );

  res.status(200).json({ reminder });
}

export async function completeReminder(req, res) {
  const reminder = await remindersService.completeReminder(req.params.id, req.user.id);

  res.status(200).json({ reminder });
}

export async function cancelReminder(req, res) {
  const reminder = await remindersService.cancelReminder(req.params.id, req.user.id);

  res.status(200).json({ reminder });
}

export async function deleteReminder(req, res) {
  await remindersService.deleteReminder(req.params.id, req.user.id);

  res.status(204).end();
}
