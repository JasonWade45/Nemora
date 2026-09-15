import { format, parseISO, isToday, isTomorrow, isPast, isFuture, startOfDay, endOfDay, differenceInMinutes, differenceInHours } from 'date-fns';

export function formatDate(date: Date | string, pattern = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern);
}

export function formatTime(date: Date | string, pattern = 'HH:mm'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy HH:mm');
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  
  if (isToday(d)) {
    return `Today at ${formatTime(d)}`;
  }
  
  if (isTomorrow(d)) {
    return `Tomorrow at ${formatTime(d)}`;
  }
  
  if (isPast(d)) {
    const hours = differenceInHours(now, d);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
  
  if (isFuture(d)) {
    const hours = differenceInHours(d, now);
    if (hours < 24) {
      return `In ${hours}h`;
    }
    const days = Math.floor(hours / 24);
    return `In ${days}d`;
  }
  
  return formatDateTime(d);
}

export function getVisitDuration(startTime: Date | string, endTime?: Date | string): number {
  const start = typeof startTime === 'string' ? parseISO(startTime) : startTime;
  const end = endTime ? (typeof endTime === 'string' ? parseISO(endTime) : endTime) : new Date();
  return differenceInMinutes(end, start);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function isWithinWorkingHours(
  workingHours: { start: string; end: string },
  date = new Date()
): boolean {
  const now = format(date, 'HH:mm');
  return now >= workingHours.start && now <= workingHours.end;
}

export function getDayOfWeek(date: Date | string): number {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return d.getDay(); // 0 = Sunday, 6 = Saturday
}

export function isWorkingDay(workingDays: number[], date: Date | string): boolean {
  const day = getDayOfWeek(date);
  return workingDays.includes(day);
}

export function getStartOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return startOfDay(d);
}

export function getEndOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return endOfDay(d);
}