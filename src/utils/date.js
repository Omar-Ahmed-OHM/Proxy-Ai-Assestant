const formatters = new Map();

function getFormatter(timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(
      timeZone,
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }

  return formatters.get(timeZone);
}

function getZonedParts(date, timeZone) {
  const parts = {};

  for (const { type, value } of getFormatter(timeZone).formatToParts(date)) {
    parts[type] = value;
  }

  return parts;
}

// Offset of timeZone from UTC at the given instant, in ms (Cairo summer = +3h)
function getOffsetMs(date, timeZone) {
  const p = getZonedParts(date, timeZone);
  const wallClockAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);

  return wallClockAsUtc - (date.getTime() - date.getUTCMilliseconds());
}

export function isValidTimezone(timeZone) {
  try {
    getFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function hasExplicitOffset(isoString) {
  return /(Z|[+-]\d{2}:?\d{2})$/i.test(isoString);
}

// Rejects calendar-impossible dates like 2026-02-31 that pass a format regex
export function isRealCalendarDate(isoString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoString);
  if (!match) return false;

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// "2026-11-05T09:00" in "Africa/Cairo" -> the UTC instant of 09:00 Cairo time.
// Non-existent local times (DST spring-forward gap) are shifted forward;
// ambiguous ones (fall-back overlap) resolve to the later occurrence.
export function zonedTimeToUtc(localIso, timeZone) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(localIso);

  if (!match) {
    throw new Error(`Invalid local datetime: ${localIso}`);
  }

  const [, year, month, day, hour, minute, second = "0", ms = "0"] = match;
  const wallClockAsUtc = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    ms.padEnd(3, "0")
  );

  const DAY_MS = 24 * 60 * 60 * 1000;
  const offsetBefore = getOffsetMs(new Date(wallClockAsUtc - DAY_MS), timeZone);
  const offsetAfter = getOffsetMs(new Date(wallClockAsUtc + DAY_MS), timeZone);

  // Later candidate first so an ambiguous time picks the later occurrence
  const candidates = [wallClockAsUtc - offsetAfter, wallClockAsUtc - offsetBefore].sort(
    (a, b) => b - a
  );
  const exact = candidates.find(
    (instant) => getOffsetMs(new Date(instant), timeZone) === wallClockAsUtc - instant
  );

  // No match means the time falls in a DST gap: applying the pre-gap offset moves it forward
  return new Date(exact ?? wallClockAsUtc - offsetBefore);
}

// UTC instant -> "2026-11-05T09:00:00" as seen in timeZone
export function formatInTimezone(date, timeZone) {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}

// Calendar days ("2026-11-02") are stored as UTC midnight of that day: a timezone-free key
export function calendarDayToDate(day) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date));
}

export function dateToCalendarDay(date) {
  return date.toISOString().slice(0, 10);
}

export function todayInTimezone(timeZone, now = new Date()) {
  return formatInTimezone(now, timeZone).slice(0, 10);
}
