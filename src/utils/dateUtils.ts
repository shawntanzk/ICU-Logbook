import dayjs from 'dayjs';

export function todayISO(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function nowISO(): string {
  return dayjs().toISOString();
}

export function formatDisplay(dateStr: string): string {
  return dayjs(dateStr).format('D MMM YYYY');
}

export function formatDateTime(isoStr: string): string {
  return dayjs(isoStr).format('D MMM YYYY, HH:mm');
}

export function startOfMonthISO(): string {
  return dayjs().startOf('month').toISOString();
}

export function isValidDateString(s: string): boolean {
  return dayjs(s, 'YYYY-MM-DD', true).isValid();
}
