export function minutesToDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h > 0 && m > 0) {
    return `${h}h ${m}m`;
  }
  if (h > 0) {
    return `${h} hod`;
  }
  return `${m} min`;
}

const APP_TIME_ZONE = "Europe/Bratislava";

function getTimeZoneOffsetMinutes(instant: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(instant);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const second = Number(parts.find((part) => part.type === "second")?.value);

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return (asUtc - instant.getTime()) / 60000;
}

function parseDateParts(dateInput: string): { year: number; month: number; day: number } {
  const [yearString, monthString, dayString] = dateInput.split("-");
  return {
    year: Number(yearString),
    month: Number(monthString),
    day: Number(dayString),
  };
}

function parseTimeParts(timeInput: string): { hour: number; minute: number } {
  const [hourString, minuteString] = timeInput.split(":");
  return {
    hour: Number(hourString),
    minute: Number(minuteString),
  };
}

function zonedDateTimeToUtcInstant(
  dateInput: string,
  timeInput: string,
  timeZone = APP_TIME_ZONE,
): Date {
  const { year, month, day } = parseDateParts(dateInput);
  const { hour, minute } = parseTimeParts(timeInput);

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstOffset = getTimeZoneOffsetMinutes(new Date(utcGuess), timeZone);
  let resolvedTimestamp = utcGuess - firstOffset * 60000;

  const secondOffset = getTimeZoneOffsetMinutes(new Date(resolvedTimestamp), timeZone);
  if (secondOffset !== firstOffset) {
    resolvedTimestamp = utcGuess - secondOffset * 60000;
  }

  return new Date(resolvedTimestamp);
}

export function parseDateAndTime(dateInput: string, timeInput: string): Date {
  return zonedDateTimeToUtcInstant(dateInput, timeInput);
}

export function parseDateOnly(dateInput: string): Date {
  return zonedDateTimeToUtcInstant(dateInput, "00:00");
}

export function isValidTimeRange(start: Date, end: Date): boolean {
  return end.getTime() > start.getTime();
}
