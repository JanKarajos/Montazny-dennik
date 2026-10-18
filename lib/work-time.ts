const APP_TIME_ZONE = "Europe/Bratislava";

export type WorkInterval = {
  startTime: string;
  endTime: string;
};

export type DailyWorkTime = {
  dayKey: string;
  workedMinutes: number;
  loggedMinutes: number;
};

export type WorkTimeSummary = {
  days: DailyWorkTime[];
  workedMinutes: number;
  loggedMinutes: number;
};

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: APP_TIME_ZONE,
});

export function getDayKey(dateInput: string): string {
  return dayKeyFormatter.format(new Date(dateInput));
}

// Odpracovaný čas za deň je zjednotenie časových intervalov všetkých záznamov
// v daný deň, takže prekrývajúce sa záznamy sa započítajú iba raz.
export function summarizeWorkTime(logs: WorkInterval[]): WorkTimeSummary {
  const byDay = new Map<string, { start: number; end: number }[]>();

  for (const log of logs) {
    const start = new Date(log.startTime).getTime();
    const end = new Date(log.endTime).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      continue;
    }

    const key = getDayKey(log.startTime);
    const intervals = byDay.get(key) ?? [];
    intervals.push({ start, end });
    byDay.set(key, intervals);
  }

  const days: DailyWorkTime[] = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, intervals]) => {
      const sorted = [...intervals].sort((a, b) => a.start - b.start);
      let workedMs = 0;
      let loggedMs = 0;
      let currentStart = sorted[0].start;
      let currentEnd = sorted[0].end;

      for (const interval of sorted) {
        loggedMs += interval.end - interval.start;

        if (interval.start <= currentEnd) {
          currentEnd = Math.max(currentEnd, interval.end);
        } else {
          workedMs += currentEnd - currentStart;
          currentStart = interval.start;
          currentEnd = interval.end;
        }
      }
      workedMs += currentEnd - currentStart;

      return {
        dayKey,
        workedMinutes: Math.round(workedMs / 60000),
        loggedMinutes: Math.round(loggedMs / 60000),
      };
    });

  return {
    days,
    workedMinutes: days.reduce((sum, day) => sum + day.workedMinutes, 0),
    loggedMinutes: days.reduce((sum, day) => sum + day.loggedMinutes, 0),
  };
}

export function formatHoursDecimal(minutes: number): string {
  return (minutes / 60).toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
