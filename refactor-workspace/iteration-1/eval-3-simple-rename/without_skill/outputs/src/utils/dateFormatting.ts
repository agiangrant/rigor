export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').split('.')[0];
}

export function parseDate(str: string): Date {
  return new Date(str);
}
