/**
 * Free-tier scheduling logic.
 *
 * Free-tier assistants get an 8-hour active window per day
 * (default 08:00–16:00 in the user's timezone). Outside that
 * window the VM is suspended to save resources.
 */

const DEFAULT_START_HOUR = 8; // 8 AM
const DEFAULT_END_HOUR = 16; // 4 PM
const WINDOW_HOURS = DEFAULT_END_HOUR - DEFAULT_START_HOUR; // 8

export interface ActiveWindow {
  startHour: number;
  endHour: number;
  windowHours: number;
}

/**
 * Return the active window definition for a timezone.
 * Currently every timezone gets the same 8am-4pm window;
 * this is the extension point if per-user customisation is added later.
 */
export function getActiveWindow(_timezone: string): ActiveWindow {
  return {
    startHour: DEFAULT_START_HOUR,
    endHour: DEFAULT_END_HOUR,
    windowHours: WINDOW_HOURS,
  };
}

/** Get the current hour (0-23) in the given IANA timezone. */
function currentHourIn(timezone: string): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: timezone,
  }).formatToParts(now);
  const hourPart = parts.find((p) => p.type === 'hour');
  return parseInt(hourPart?.value ?? '0', 10);
}

/** Get a full Date representing "now" in the given timezone (as local fields). */
function nowInTimezone(timezone: string): { hour: number; date: Date } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: timezone,
  });
  const hour = currentHourIn(timezone);
  return { hour, date: now };
}

/**
 * Is the current time within the 8h active window for this timezone?
 */
export function isWithinActiveWindow(timezone: string): boolean {
  const { startHour, endHour } = getActiveWindow(timezone);
  const hour = currentHourIn(timezone);
  return hour >= startHour && hour < endHour;
}

/**
 * Get the next start time (as a Date) for the active window.
 * If currently before today's window, returns today's start.
 * If currently within or after the window, returns tomorrow's start.
 */
export function getNextStartTime(timezone: string): Date {
  const { startHour } = getActiveWindow(timezone);
  const hour = currentHourIn(timezone);

  // Build a date string in the timezone, then convert
  const now = new Date();
  const tzDate = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  }).format(now); // YYYY-MM-DD

  // Start with today's start time
  const target = new Date(`${tzDate}T${String(startHour).padStart(2, '0')}:00:00`);

  // Approximate: get offset by comparing
  const offsetMs = now.getTime() - new Date(
    new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(now).replace(', ', 'T'),
  ).getTime();

  const result = new Date(target.getTime() + offsetMs);

  // If we're already past the start hour, advance to tomorrow
  if (hour >= startHour) {
    result.setTime(result.getTime() + 24 * 60 * 60 * 1000);
  }

  return result;
}

/**
 * Get the next stop time (as a Date) for the active window.
 * If currently before the end hour, returns today's end.
 * If currently at or after end hour, returns tomorrow's end.
 */
export function getNextStopTime(timezone: string): Date {
  const { endHour } = getActiveWindow(timezone);
  const hour = currentHourIn(timezone);

  const now = new Date();
  const tzDate = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  }).format(now);

  const target = new Date(`${tzDate}T${String(endHour).padStart(2, '0')}:00:00`);

  const offsetMs = now.getTime() - new Date(
    new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(now).replace(', ', 'T'),
  ).getTime();

  const result = new Date(target.getTime() + offsetMs);

  if (hour >= endHour) {
    result.setTime(result.getTime() + 24 * 60 * 60 * 1000);
  }

  return result;
}
