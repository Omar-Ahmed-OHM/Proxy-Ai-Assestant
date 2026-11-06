import { randomUUID } from "node:crypto";
import * as tasksService from "../tasks/tasks.service.js";
import * as remindersService from "../reminders/reminders.service.js";
import * as usersService from "../users/users.service.js";
import { TASK_PRIORITIES, TASK_STATUSES } from "../tasks/task.model.js";
import { REMINDER_STATUSES } from "../reminders/reminder.model.js";
import {
  calendarDayToDate,
  dateToCalendarDay,
  formatInTimezone,
  isRealCalendarDate,
  zonedTimeToUtc,
} from "../../utils/date.js";
import { assertConfigured, generateContent, textFromParts } from "./gemini.client.js";

const MAX_TOOL_ROUNDS = 5;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const FALLBACK_REPLY = "معلش، مقدرتش أرد دلوقتي. جرّب تاني كمان شوية.";

function createError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function firstName(name) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function localNow(timezone, now = new Date()) {
  const local = formatInTimezone(now, timezone);
  const weekday = new Intl.DateTimeFormat("ar-EG", { weekday: "long", timeZone: timezone }).format(now);
  return { day: local.slice(0, 10), time: local.slice(11, 16), hour: Number(local.slice(11, 13)), weekday };
}

function addDays(day, amount) {
  const date = calendarDayToDate(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateToCalendarDay(date);
}

// Date-only due dates are stored as UTC midnight, so they carry no time of day
function isAllDay(date) {
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

function describeDue(dueDate, timezone) {
  if (!dueDate) return { day: null, time: null };
  const date = new Date(dueDate);
  if (isAllDay(date)) return { day: dateToCalendarDay(date), time: null };
  const local = formatInTimezone(date, timezone);
  return { day: local.slice(0, 10), time: local.slice(11, 16) };
}

function toToolTask(task, timezone) {
  const { day, time } = describeDue(task.dueDate, timezone);
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDay: day,
    dueTime: time,
  };
}

function toToolReminder(reminder) {
  return {
    id: reminder.id,
    title: reminder.title,
    description: reminder.description,
    status: reminder.status,
    remindAtLocal: reminder.remindAtLocal.slice(0, 16),
  };
}

function isOpen(task) {
  return task.status !== "completed";
}

function isOverdue(task, timezone, now) {
  if (!isOpen(task) || !task.dueDate) return false;
  const date = new Date(task.dueDate);
  if (isAllDay(date)) return dateToCalendarDay(date) < localNow(timezone, now).day;
  return date.getTime() < now.getTime();
}

function filterTasks(tasks, range, timezone, now) {
  const today = localNow(timezone, now).day;
  const dueOn = (day) => (task) => isOpen(task) && describeDue(task.dueDate, timezone).day === day;

  switch (range) {
    case "today":
      return tasks.filter(dueOn(today));
    case "tomorrow":
      return tasks.filter(dueOn(addDays(today, 1)));
    case "overdue":
      return tasks.filter((task) => isOverdue(task, timezone, now));
    case "pending":
      return tasks.filter(isOpen);
    default:
      return tasks;
  }
}

function resolveDueDate(value, timezone) {
  if (value === null) return null;
  if (DAY_PATTERN.test(value) && isRealCalendarDate(value)) return calendarDayToDate(value);
  if (LOCAL_DATETIME_PATTERN.test(value) && isRealCalendarDate(value)) return zonedTimeToUtc(value, timezone);
  throw createError("dueDate must be YYYY-MM-DD or YYYY-MM-DDTHH:mm", "VALIDATION_ERROR");
}

const functionDeclarations = [
  {
    name: "list_tasks",
    description: "List the user's tasks. Always call this before answering questions about tasks.",
    parameters: {
      type: "object",
      properties: {
        range: { type: "string", enum: ["today", "tomorrow", "overdue", "pending", "all"] },
      },
      required: ["range"],
    },
  },
  {
    name: "create_task",
    description: "Create a task. dueDate is YYYY-MM-DD for an all-day task or YYYY-MM-DDTHH:mm in the user's local time.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        dueDate: { type: "string" },
        priority: { type: "string", enum: TASK_PRIORITIES },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "Update a task by id. Use list_tasks first to find the id.",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        title: { type: "string" },
        dueDate: { type: "string" },
        priority: { type: "string", enum: TASK_PRIORITIES },
        status: { type: "string", enum: TASK_STATUSES },
      },
      required: ["taskId"],
    },
  },
  {
    name: "complete_task",
    description: "Mark a task as completed.",
    parameters: { type: "object", properties: { taskId: { type: "string" } }, required: ["taskId"] },
  },
  {
    name: "delete_task",
    description: "Permanently delete a task. Only call after the user explicitly confirmed the deletion.",
    parameters: { type: "object", properties: { taskId: { type: "string" } }, required: ["taskId"] },
  },
  {
    name: "list_reminders",
    description: "List the user's reminders, optionally filtered by status.",
    parameters: {
      type: "object",
      properties: { status: { type: "string", enum: REMINDER_STATUSES } },
    },
  },
  {
    name: "create_reminder",
    description: "Create a reminder. remindAt is YYYY-MM-DDTHH:mm in the user's local time and must be in the future.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        remindAt: { type: "string" },
        description: { type: "string" },
      },
      required: ["title", "remindAt"],
    },
  },
  {
    name: "complete_reminder",
    description: "Mark a reminder as completed.",
    parameters: { type: "object", properties: { reminderId: { type: "string" } }, required: ["reminderId"] },
  },
  {
    name: "cancel_reminder",
    description: "Cancel a reminder.",
    parameters: { type: "object", properties: { reminderId: { type: "string" } }, required: ["reminderId"] },
  },
];

async function runTool(name, args, { userId, timezone, actions }) {
  const now = new Date();

  switch (name) {
    case "list_tasks": {
      const tasks = await tasksService.getTasks(userId);
      return { tasks: filterTasks(tasks, args.range, timezone, now).map((task) => toToolTask(task, timezone)) };
    }
    case "create_task": {
      const task = await tasksService.createTask(userId, {
        title: String(args.title ?? "").trim().slice(0, 150),
        description: args.description ? String(args.description).slice(0, 2000) : undefined,
        priority: TASK_PRIORITIES.includes(args.priority) ? args.priority : undefined,
        dueDate: args.dueDate ? resolveDueDate(args.dueDate, timezone) : undefined,
      });
      actions.push({ type: "task.created", id: task.id });
      return { task: toToolTask(task, timezone) };
    }
    case "update_task": {
      const updates = {};
      if (args.title) updates.title = String(args.title).trim().slice(0, 150);
      if (args.dueDate !== undefined) updates.dueDate = resolveDueDate(args.dueDate, timezone);
      if (TASK_PRIORITIES.includes(args.priority)) updates.priority = args.priority;
      if (TASK_STATUSES.includes(args.status)) updates.status = args.status;
      const task = await tasksService.updateTask(args.taskId, userId, updates);
      actions.push({ type: task.status === "completed" ? "task.completed" : "task.updated", id: task.id });
      return { task: toToolTask(task, timezone) };
    }
    case "complete_task": {
      const task = await tasksService.completeTask(args.taskId, userId);
      actions.push({ type: "task.completed", id: task.id });
      return { task: toToolTask(task, timezone) };
    }
    case "delete_task": {
      await tasksService.deleteTask(args.taskId, userId);
      actions.push({ type: "task.deleted", id: String(args.taskId) });
      return { deleted: true };
    }
    case "list_reminders": {
      const status = REMINDER_STATUSES.includes(args.status) ? args.status : undefined;
      const reminders = await remindersService.getReminders(userId, { status });
      return { reminders: reminders.map(toToolReminder) };
    }
    case "create_reminder": {
      const remindAt = String(args.remindAt ?? "");
      if (!LOCAL_DATETIME_PATTERN.test(remindAt) || !isRealCalendarDate(remindAt)) {
        throw createError("remindAt must be YYYY-MM-DDTHH:mm", "VALIDATION_ERROR");
      }
      const reminder = await remindersService.createReminder(userId, {
        title: String(args.title ?? "").trim().slice(0, 150),
        description: args.description ? String(args.description).slice(0, 2000) : undefined,
        remindAt,
        timezone,
      });
      actions.push({ type: "reminder.created", id: reminder.id });
      return { reminder: toToolReminder(reminder) };
    }
    case "complete_reminder": {
      const reminder = await remindersService.completeReminder(args.reminderId, userId);
      actions.push({ type: "reminder.completed", id: reminder.id });
      return { reminder: toToolReminder(reminder) };
    }
    case "cancel_reminder": {
      const reminder = await remindersService.cancelReminder(args.reminderId, userId);
      actions.push({ type: "reminder.cancelled", id: reminder.id });
      return { reminder: toToolReminder(reminder) };
    }
    default:
      throw createError(`Unknown tool ${name}`, "VALIDATION_ERROR");
  }
}

function buildSystemInstruction(user, timezone) {
  const now = localNow(timezone);
  return [
    `You are "Proxy", a warm, friendly personal productivity assistant for ${firstName(user.name)}.`,
    "Speak Egyptian colloquial Arabic. If the user writes in English, reply in English.",
    `Address the user by first name (${firstName(user.name)}) naturally, not in every sentence.`,
    "Your replies are read aloud by text-to-speech: keep them short and conversational, no markdown, no emoji, no bullet points or symbols, no lists with dashes.",
    'Say times naturally, for example "الساعة 6 ونص بالليل" or "الساعة 9 الصبح".',
    `Current local date: ${now.day} (${now.weekday}), time: ${now.time}, timezone: ${timezone}.`,
    "Never invent tasks or reminders. Always use the tools to read or change data.",
    "Before deleting anything, ask the user to confirm and only call delete_task after a clear yes.",
    "If a tool returns an error, explain the problem simply and suggest what to do.",
  ].join("\n");
}

// Removes formatting the model sometimes adds despite instructions, so speech stays clean
function cleanReply(text) {
  return text
    .replace(/\*\*?|__|`|#+\s/g, "")
    .replace(/^\s*[-•*]\s+/gm, "")
    .trim();
}

function toAssistantMessage(content) {
  return {
    id: randomUUID(),
    role: "assistant",
    content,
    timestamp: new Date().toISOString(),
  };
}

async function resolveContext(userId, timezoneParam) {
  const user = await usersService.getUserById(userId);
  return { user, timezone: timezoneParam || user.timezone };
}

export async function sendMessage(userId, { content, history = [], timezone: timezoneParam }) {
  assertConfigured();

  const { user, timezone } = await resolveContext(userId, timezoneParam);
  const actions = [];
  const contents = [
    ...history.map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    })),
    { role: "user", parts: [{ text: content }] },
  ];
  const request = {
    systemInstruction: { parts: [{ text: buildSystemInstruction(user, timezone) }] },
    tools: [{ functionDeclarations }],
    generationConfig: { temperature: 0.6 },
  };

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const parts = await generateContent({ ...request, contents });
    const calls = parts.filter((part) => part.functionCall);

    if (calls.length === 0) {
      const reply = cleanReply(textFromParts(parts)) || FALLBACK_REPLY;
      return { message: toAssistantMessage(reply), actions };
    }

    contents.push({ role: "model", parts });

    const responses = [];
    for (const { functionCall } of calls) {
      let result;
      try {
        result = await runTool(functionCall.name, functionCall.args ?? {}, { userId, timezone, actions });
      } catch (error) {
        result = { error: { code: error.code ?? "ERROR", message: error.message } };
      }
      responses.push({ functionResponse: { name: functionCall.name, response: result } });
    }

    contents.push({ role: "user", parts: responses });
  }

  return { message: toAssistantMessage(FALLBACK_REPLY), actions };
}

function greetingFor(hour) {
  return hour >= 5 && hour < 12 ? "صباح الخير" : "مساء الخير";
}

export async function getBriefing(userId, { timezone: timezoneParam } = {}) {
  assertConfigured();

  const { user, timezone } = await resolveContext(userId, timezoneParam);
  const now = new Date();
  const local = localNow(timezone, now);
  const [tasks, reminders] = await Promise.all([
    tasksService.getTasks(userId),
    remindersService.getReminders(userId, { status: "pending" }),
  ]);

  const todayTasks = filterTasks(tasks, "today", timezone, now);
  const overdueTasks = filterTasks(tasks, "overdue", timezone, now);
  const todayReminders = reminders.filter((reminder) => reminder.remindAtLocal.slice(0, 10) === local.day);

  const upcoming = [
    ...todayTasks
      .filter((task) => task.dueDate && !isAllDay(new Date(task.dueDate)))
      .map((task) => ({ title: task.title, at: new Date(task.dueDate) })),
    ...todayReminders.map((reminder) => ({ title: reminder.title, at: new Date(reminder.remindAt) })),
  ]
    .filter((item) => item.at.getTime() > now.getTime())
    .sort((a, b) => a.at - b.at);

  const nextItem = upcoming[0] ? { title: upcoming[0].title, at: upcoming[0].at.toISOString() } : null;
  const stats = {
    tasksToday: todayTasks.length,
    overdue: overdueTasks.length,
    remindersToday: todayReminders.length,
    nextItem,
  };

  const data = {
    greeting: `${greetingFor(local.hour)} يا ${firstName(user.name)}`,
    todayTasks: todayTasks.map((task) => toToolTask(task, timezone)),
    overdueTasks: overdueTasks.map((task) => toToolTask(task, timezone)),
    todayReminders: todayReminders.map(toToolReminder),
    nextItem: nextItem ? { title: nextItem.title, localTime: formatInTimezone(upcoming[0].at, timezone).slice(11, 16) } : null,
  };

  const parts = await generateContent({
    systemInstruction: { parts: [{ text: buildSystemInstruction(user, timezone) }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "Give me a short spoken briefing for my day, 2 to 4 sentences.",
              `Start with exactly this greeting: "${data.greeting}".`,
              "Summarize today's tasks and reminders, mention overdue tasks if any, and say when the next item is.",
              "If the day is empty, say so warmly and suggest planning something.",
              `Data: ${JSON.stringify(data)}`,
            ].join("\n"),
          },
        ],
      },
    ],
    generationConfig: { temperature: 0.7 },
  });

  const reply = cleanReply(textFromParts(parts)) || `${data.greeting}. ${FALLBACK_REPLY}`;
  return { message: toAssistantMessage(reply), stats };
}
