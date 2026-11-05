import { addDays, format, parseISO } from 'date-fns';
import { LeitnerBox } from '../types';
import { LEITNER_INTERVALS_DAYS } from '../constants/theme';

export * from './media';
export * from './notifications';
export * from './speech';
export * from './exportImport';
export * from './alert';

/**
 * Calculates the next review date for a card based on Leitner box
 */
export function calculateNextReviewDate(box: LeitnerBox, fromDate: Date = new Date()): string {
  const daysToAdd = LEITNER_INTERVALS_DAYS[box] ?? 1;
  const nextDate = addDays(fromDate, daysToAdd);
  return nextDate.toISOString();
}

/**
 * Formats an ISO date into a human readable string
 */
export function formatStudyDate(isoString: string): string {
  try {
    return format(parseISO(isoString), 'MMM d, yyyy');
  } catch {
    return isoString;
  }
}

/**
 * Capitalizes the first letter
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
