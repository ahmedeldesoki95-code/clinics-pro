import { format, parseISO } from 'date-fns';

export function fmtDateTime(value) {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'EEE d MMM, hh:mm a');
}

export function fmtDate(value) {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'EEE d MMM');
}

export function fmtTime(value) {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'hh:mm a');
}

export function fmtCurrency(value, currency = 'EGP') {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
}
