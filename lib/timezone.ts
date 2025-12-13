/**
 * Utility functions for handling Chicago timezone (America/Chicago) consistently across the application.
 * All business operations should use Chicago time regardless of server or client location.
 */

const CHICAGO_TIMEZONE = "America/Chicago";

/**
 * Get the current date in Chicago timezone formatted as YYYY-MM-DD
 */
export function getChicagoDate(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

/**
 * Get the current time in Chicago timezone formatted as HH:MM:SS
 */
export function getChicagoTime(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  const second = parts.find(p => p.type === 'second')?.value;

  return `${hour}:${minute}:${second}`;
}

/**
 * Get both date and time in Chicago timezone
 */
export function getChicagoDateTime(date: Date = new Date()): { date: string; time: string } {
  return {
    date: getChicagoDate(date),
    time: getChicagoTime(date)
  };
}

/**
 * Get a formatted datetime string in Chicago timezone (YYYY-MM-DD HH:MM:SS)
 */
export function getChicagoDateTimeString(date: Date = new Date()): string {
  const { date: dateStr, time } = getChicagoDateTime(date);
  return `${dateStr} ${time}`;
}

/**
 * Get a date N days ago in Chicago timezone formatted as YYYY-MM-DD
 */
export function getChicagoDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return getChicagoDate(date);
}

/**
 * Format a date for display in Chicago timezone
 */
export function formatChicagoDateTime(date: Date, includeTime: boolean = true): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: CHICAGO_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }

  return new Intl.DateTimeFormat("en-US", options).format(date);
}
