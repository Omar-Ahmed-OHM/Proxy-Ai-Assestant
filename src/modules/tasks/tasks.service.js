import * as tasksRepository from "./tasks.repository.js";

const UPDATABLE_FIELDS = ["title", "description", "status", "priority", "dueDate"];

function createError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function toPublicTask(task) {
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ?? null,
    completedAt: task.completedAt ?? null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

async function findOwnedTask(taskId, userId) {
  const task = await tasksRepository.findTaskByIdAndUser(taskId, userId);

  if (!task) {
    throw createError("Task not found", "TASK_NOT_FOUND");
  }

  return task;
}

export async function createTask(userId, taskData) {
  const { title, description, priority, dueDate } = taskData;

  const task = await tasksRepository.createTask({
    userId,
    title,
    description,
    priority,
    dueDate,
  });

  return toPublicTask(task);
}

export async function getTasks(userId) {
  const tasks = await tasksRepository.findTasksByUser(userId);
  return tasks.map(toPublicTask);
}

export async function getTaskById(taskId, userId) {
  const task = await findOwnedTask(taskId, userId);
  return toPublicTask(task);
}

export async function updateTask(taskId, userId, updateData) {
  const updates = {};

  for (const field of UPDATABLE_FIELDS) {
    if (updateData[field] !== undefined) {
      updates[field] = updateData[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw createError("No valid fields to update", "NO_UPDATE_FIELDS");
  }

  if (updates.status !== undefined) {
    const current = await findOwnedTask(taskId, userId);

    if (updates.status === "completed" && current.status !== "completed") {
      updates.completedAt = new Date();
    } else if (updates.status !== "completed") {
      updates.completedAt = null;
    }
  }

  const task = await tasksRepository.updateTask(taskId, userId, updates);

  if (!task) {
    throw createError("Task not found", "TASK_NOT_FOUND");
  }

  return toPublicTask(task);
}

export async function completeTask(taskId, userId) {
  const task = await findOwnedTask(taskId, userId);

  if (task.status === "completed") {
    return toPublicTask(task);
  }

  const updated = await tasksRepository.updateTask(taskId, userId, {
    status: "completed",
    completedAt: new Date(),
  });

  return toPublicTask(updated);
}

// Throws TASK_NOT_FOUND if any id is missing or owned by someone else (without saying which case)
export async function assertTasksBelongToUser(taskIds, userId) {
  const uniqueIds = [...new Set(taskIds.map(String))];
  const tasks = await tasksRepository.findTasksByIdsAndUser(uniqueIds, userId);

  if (tasks.length !== uniqueIds.length) {
    const found = new Set(tasks.map((task) => task._id.toString()));
    const error = createError("Task not found", "TASK_NOT_FOUND");
    error.details = uniqueIds
      .filter((id) => !found.has(id))
      .map((id) => ({ path: "taskId", message: `Task ${id} not found` }));
    throw error;
  }
}

// Map of id -> public task; ids the user doesn't own (or deleted tasks) are simply absent
export async function getTasksByIds(taskIds, userId) {
  const tasks = await tasksRepository.findTasksByIdsAndUser(taskIds, userId);
  return new Map(tasks.map((task) => [task._id.toString(), toPublicTask(task)]));
}

export async function deleteTask(taskId, userId) {
  const task = await tasksRepository.deleteTask(taskId, userId);

  if (!task) {
    throw createError("Task not found", "TASK_NOT_FOUND");
  }
}
