import * as dailyPlanRepository from "./daily-plan.repository.js";
import * as tasksService from "../tasks/tasks.service.js";
import * as usersService from "../users/users.service.js";
import { MAX_TASKS_PER_PLAN } from "./daily-plan.model.js";
import {
  calendarDayToDate,
  dateToCalendarDay,
  todayInTimezone,
} from "../../utils/date.js";

const MAX_WRITE_ATTEMPTS = 3;

function createError(message, code, details) {
  const error = new Error(message);
  error.code = code;
  if (details) error.details = details;
  return error;
}

function alreadyExistsError(day) {
  return createError(
    `A daily plan already exists for ${day}`,
    "DAILY_PLAN_ALREADY_EXISTS"
  );
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

function toPlanTasks(items) {
  return items.map((item, index) => ({
    taskId: item.taskId,
    order: index + 1,
    ...(item.note !== undefined && item.note !== null && { note: item.note }),
  }));
}

function currentItems(plan) {
  return [...plan.tasks]
    .sort((a, b) => a.order - b.order)
    .map((item) => ({ taskId: item.taskId.toString(), note: item.note }));
}

async function toPublicPlans(plans, userId) {
  const taskIds = [
    ...new Set(plans.flatMap((plan) => plan.tasks.map((t) => t.taskId.toString()))),
  ];
  const tasksById = taskIds.length
    ? await tasksService.getTasksByIds(taskIds, userId)
    : new Map();

  return plans.map((plan) => ({
    id: plan._id.toString(),
    date: dateToCalendarDay(plan.date),
    status: plan.status,
    tasks: [...plan.tasks]
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        taskId: item.taskId.toString(),
        order: item.order,
        note: item.note ?? null,
        task: tasksById.get(item.taskId.toString()) ?? null,
      })),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  }));
}

async function toPublicPlan(plan, userId) {
  const [publicPlan] = await toPublicPlans([plan], userId);
  return publicPlan;
}

// No date given -> "today" as a calendar day in the user's timezone
async function resolvePlanDay(userId, day) {
  if (day) return day;

  const user = await usersService.getUserById(userId);
  return todayInTimezone(user.timezone);
}

async function findOwnedPlan(planId, userId) {
  const plan = await dailyPlanRepository.findDailyPlanByIdAndUser(planId, userId);

  if (!plan) {
    throw createError("Daily plan not found", "DAILY_PLAN_NOT_FOUND");
  }

  return plan;
}

function assertPlanActive(plan) {
  if (plan.status === "completed") {
    throw createError("A completed daily plan cannot be modified", "DAILY_PLAN_COMPLETED");
  }
}

async function modifyPlan(planId, userId, buildUpdate) {
  for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt++) {
    const plan = await findOwnedPlan(planId, userId);
    assertPlanActive(plan);

    const update = buildUpdate(plan);
    let updated;

    try {
      updated = await dailyPlanRepository.updateDailyPlan(planId, userId, update, plan.__v);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw alreadyExistsError(dateToCalendarDay(update.date));
      }
      throw error;
    }

    if (updated) {
      return await toPublicPlan(updated, userId);
    }
  }

  throw createError(
    "The daily plan was modified by another request, please retry",
    "CONCURRENT_UPDATE"
  );
}

export async function createDailyPlan(userId, planData) {
  const day = await resolvePlanDay(userId, planData.date);
  const date = calendarDayToDate(day);
  const items = planData.tasks ?? [];

  if (items.length > 0) {
    await tasksService.assertTasksBelongToUser(
      items.map((item) => item.taskId),
      userId
    );
  }

  const existing = await dailyPlanRepository.findDailyPlanByUserAndDate(userId, date);

  if (existing) {
    throw alreadyExistsError(day);
  }

  try {
    const plan = await dailyPlanRepository.createDailyPlan({
      userId,
      date,
      tasks: toPlanTasks(items),
    });

    return await toPublicPlan(plan, userId);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw alreadyExistsError(day);
    }
    throw error;
  }
}

export async function getDailyPlans(userId, { date, from, to } = {}) {
  const filters = date
    ? { from: calendarDayToDate(date), to: calendarDayToDate(date) }
    : {
        from: from ? calendarDayToDate(from) : undefined,
        to: to ? calendarDayToDate(to) : undefined,
      };

  const plans = await dailyPlanRepository.findDailyPlansByUser(userId, filters);
  return await toPublicPlans(plans, userId);
}

export async function getDailyPlanById(planId, userId) {
  const plan = await findOwnedPlan(planId, userId);
  return await toPublicPlan(plan, userId);
}

export async function updateDailyPlan(planId, userId, updateData) {
  const updates = {};

  if (updateData.date !== undefined) {
    updates.date = calendarDayToDate(updateData.date);
  }

  if (updateData.tasks !== undefined) {
    if (updateData.tasks.length > 0) {
      await tasksService.assertTasksBelongToUser(
        updateData.tasks.map((item) => item.taskId),
        userId
      );
    }
    updates.tasks = toPlanTasks(updateData.tasks);
  }

  if (Object.keys(updates).length === 0) {
    throw createError("No valid fields to update", "NO_UPDATE_FIELDS");
  }

  return await modifyPlan(planId, userId, () => updates);
}

export async function addTaskToPlan(planId, userId, { taskId, note }) {
  await tasksService.assertTasksBelongToUser([taskId], userId);

  return await modifyPlan(planId, userId, (plan) => {
    const items = currentItems(plan);

    if (items.some((item) => item.taskId === taskId)) {
      throw createError("Task is already in this plan", "TASK_ALREADY_IN_PLAN");
    }

    if (items.length >= MAX_TASKS_PER_PLAN) {
      throw createError(
        `A plan can hold at most ${MAX_TASKS_PER_PLAN} tasks`,
        "DAILY_PLAN_FULL"
      );
    }

    return { tasks: toPlanTasks([...items, { taskId, note }]) };
  });
}

export async function removeTaskFromPlan(planId, userId, taskId) {
  return await modifyPlan(planId, userId, (plan) => {
    const items = currentItems(plan);

    if (!items.some((item) => item.taskId === taskId)) {
      throw createError("Task is not in this plan", "TASK_NOT_IN_PLAN");
    }

    return { tasks: toPlanTasks(items.filter((item) => item.taskId !== taskId)) };
  });
}

export async function reorderPlanTasks(planId, userId, orderedTaskIds) {
  return await modifyPlan(planId, userId, (plan) => {
    const items = currentItems(plan);
    const itemsById = new Map(items.map((item) => [item.taskId, item]));
    const requested = new Set(orderedTaskIds);

    const duplicates = requested.size !== orderedTaskIds.length;
    const missing = items.filter((item) => !requested.has(item.taskId)).map((i) => i.taskId);
    const extra = orderedTaskIds.filter((id) => !itemsById.has(id));

    if (duplicates || missing.length > 0 || extra.length > 0) {
      throw createError(
        "taskIds must contain every task in the plan exactly once",
        "INVALID_TASK_ORDER",
        [
          ...(duplicates ? [{ path: "taskIds", message: "Duplicate task ids" }] : []),
          ...missing.map((id) => ({ path: "taskIds", message: `Missing task ${id}` })),
          ...extra.map((id) => ({ path: "taskIds", message: `Task ${id} is not in this plan` })),
        ]
      );
    }

    return { tasks: toPlanTasks(orderedTaskIds.map((id) => itemsById.get(id))) };
  });
}

export async function completeDailyPlan(planId, userId) {
  const plan = await findOwnedPlan(planId, userId);

  if (plan.status === "completed") {
    return await toPublicPlan(plan, userId);
  }

  const updated = await dailyPlanRepository.updateDailyPlan(planId, userId, {
    status: "completed",
  });

  if (!updated) {
    throw createError("Daily plan not found", "DAILY_PLAN_NOT_FOUND");
  }

  return await toPublicPlan(updated, userId);
}

export async function deleteDailyPlan(planId, userId) {
  const plan = await dailyPlanRepository.deleteDailyPlan(planId, userId);

  if (!plan) {
    throw createError("Daily plan not found", "DAILY_PLAN_NOT_FOUND");
  }
}
