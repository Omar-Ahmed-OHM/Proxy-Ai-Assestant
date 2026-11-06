import * as tasksService from "./tasks.service.js";

export async function createTask(req, res) {
  const task = await tasksService.createTask(req.user.id, req.body);

  res.status(201).json({ task });
}

export async function getTasks(req, res) {
  const tasks = await tasksService.getTasks(req.user.id);

  res.status(200).json({ tasks });
}

export async function getTask(req, res) {
  const task = await tasksService.getTaskById(req.params.id, req.user.id);

  res.status(200).json({ task });
}

export async function updateTask(req, res) {
  const task = await tasksService.updateTask(req.params.id, req.user.id, req.body);

  res.status(200).json({ task });
}

export async function completeTask(req, res) {
  const task = await tasksService.completeTask(req.params.id, req.user.id);

  res.status(200).json({ task });
}

export async function deleteTask(req, res) {
  await tasksService.deleteTask(req.params.id, req.user.id);

  res.status(204).end();
}
