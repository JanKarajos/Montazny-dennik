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

export function parseDateAndTime(dateInput: string, timeInput: string): Date {
  return new Date(`${dateInput}T${timeInput}:00`);
}

export function isValidTimeRange(start: Date, end: Date): boolean {
  return end.getTime() > start.getTime();
}
