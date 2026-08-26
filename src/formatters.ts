const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function formatMoney(cents?: number | null) {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return 'Missing';
  return currencyFormatter.format(cents / 100);
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'Missing';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return dateTimeFormatter.format(date);
}

export function formatDate(value?: string | null) {
  if (!value) return 'Missing';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return dateFormatter.format(date);
}

export function labelize(value?: string | null) {
  if (!value) return 'Missing';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Missing';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'Missing';
  if (typeof value === 'string') return value;
  return String(value);
}
