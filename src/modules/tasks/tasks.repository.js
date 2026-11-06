import { Task } from "./task.model.js";


export async function createTask(taskData) {
  return await Task.create(taskData);
}

export async function findTasksByUser(userId) {
  return await Task.find({ userId }).sort({ createdAt: -1 });
}

export async function findTaskByIdAndUser(taskId, userId) {
  return await Task.findOne({ _id: taskId, userId });
}

export async function findTasksByIdsAndUser(taskIds, userId) {
  return await Task.find({ _id: { $in: taskIds }, userId });
}

export async function updateTask(taskId, userId, updateData) {
  return await Task.findOneAndUpdate({ _id: taskId, userId }, updateData, {
    returnDocument: "after",
    runValidators: true,
  });
}

export async function deleteTask(taskId, userId) {
  return await Task.findOneAndDelete({ _id: taskId, userId });
}
