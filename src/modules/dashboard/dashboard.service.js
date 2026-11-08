import * as tasksService from "../tasks/tasks.service.js";
import * as remindersService from "../reminders/reminders.service.js";
import * as usersService from "../users/users.service.js";
import { formatInTimezone, todayInTimezone } from "../../utils/date.js";

const WINDOW_DAYS = 7;

function dayKey(date, timezone) {
  return formatInTimezone(new Date(date), timezone).slice(0, 10);
}

function shiftDay(day, offset) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function daysEndingAt(lastDay, count) {
  return Array.from({ length: count }, (_, index) => shiftDay(lastDay, index - (count - 1)));
}

function countByDay(dates, days, timezone) {
  const counts = new Map(days.map((day) => [day, 0]));
  for (const date of dates) {
    const key = dayKey(date, timezone);
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  }
  return days.map((day) => counts.get(day));
}

const sum = (values) => values.reduce((total, value) => total + value, 0);

function trendPercent(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function streakEndingAt(day, activeDays) {
  let streak = 0;
  let cursor = day;
  while (activeDays.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

export async function getSummary(userId, { timezone } = {}) {
  const tz = timezone ?? (await usersService.getUserById(userId)).timezone;
  const [tasks, reminders] = await Promise.all([
    tasksService.getTasks(userId),
    remindersService.getReminders(userId),
  ]);

  const today = todayInTimezone(tz);
  const thisWeek = daysEndingAt(today, WINDOW_DAYS);
  const previousWeek = daysEndingAt(shiftDay(today, -WINDOW_DAYS), WINDOW_DAYS);
  const nextWeek = Array.from({ length: WINDOW_DAYS }, (_, index) => shiftDay(today, index));
  const now = Date.now();

  const createdDates = tasks.map((task) => task.createdAt);
  const totalSeries = thisWeek.map(
    (day) => tasks.filter((task) => dayKey(task.createdAt, tz) <= day).length
  );

  const completedDates = tasks.filter((task) => task.completedAt).map((task) => task.completedAt);
  const completedThisWeek = countByDay(completedDates, thisWeek, tz);
  const completedPreviousWeek = countByDay(completedDates, previousWeek, tz);

  const upcoming = reminders.filter(
    (reminder) => reminder.status === "pending" && new Date(reminder.remindAt).getTime() > now
  );
  const reminderDates = reminders.map((reminder) => reminder.createdAt);

  const activeDays = new Set(completedDates.map((date) => dayKey(date, tz)));
  const streakStart = activeDays.has(today) ? today : shiftDay(today, -1);

  return {
    totalTasks: {
      value: tasks.length,
      trend: trendPercent(
        sum(countByDay(createdDates, thisWeek, tz)),
        sum(countByDay(createdDates, previousWeek, tz))
      ),
      series: totalSeries,
    },
    upcomingReminders: {
      value: upcoming.length,
      trend: trendPercent(
        sum(countByDay(reminderDates, thisWeek, tz)),
        sum(countByDay(reminderDates, previousWeek, tz))
      ),
      series: countByDay(
        upcoming.map((reminder) => reminder.remindAt),
        nextWeek,
        tz
      ),
    },
    tasksThisWeek: {
      value: sum(completedThisWeek),
      trend: trendPercent(sum(completedThisWeek), sum(completedPreviousWeek)),
      series: completedThisWeek,
    },
    dayStreak: {
      value: streakEndingAt(streakStart, activeDays),
      trend: 0,
      series: thisWeek.map((day) => streakEndingAt(day, activeDays)),
    },
  };
}
