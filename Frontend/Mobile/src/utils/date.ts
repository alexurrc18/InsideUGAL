import { settingsStore } from '@/utils/settings-store';

const MONTH_RO: Record<string, number> = {
  'ianuarie': 0, 'februarie': 1, 'martie': 2, 'aprilie': 3, 'mai': 4, 'iunie': 5,
  'iulie': 6, 'august': 7, 'septembrie': 8, 'octombrie': 9, 'noiembrie': 10, 'decembrie': 11,
};

function parseAnyDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr) || dateStr.includes('T')) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  // Works for English Intl output like "June 16, 2026" or "16 June 2026"
  const native = new Date(dateStr);
  if (!isNaN(native.getTime())) return native;

  // Romanian fallback: "16 iunie 2026"
  const parts = dateStr.replace(',', '').trim().split(/\s+/);
  if (parts.length >= 2) {
    const day = parseInt(parts[0]);
    const monthIdx = MONTH_RO[parts[1].toLowerCase()];
    const year = parseInt(parts[2] || String(new Date().getFullYear()));
    if (!isNaN(day) && monthIdx !== undefined && !isNaN(year)) {
      return new Date(year, monthIdx, day);
    }
  }

  return null;
}

export const isoToRomanianDateStr = (isoStr?: string, lang?: string): string => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return new Intl.DateTimeFormat(lang ?? settingsStore.getLang(), {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(d);
  } catch {
    return isoStr;
  }
};

export const getFormattedDate = (dateStr?: string, lang?: string): string => {
  if (!dateStr) return '';
  const d = parseAnyDate(dateStr);
  if (!d || isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat(lang ?? settingsStore.getLang(), {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  }).format(d);
};

export const getReadingTime = (text?: string, formatter?: (minutes: number) => string): string => {
  const words = (text ?? '').split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  if (formatter) return formatter(minutes);
  return `${minutes} min`;
};

export const parseRomanianDate = (dateStr?: string, timeStr?: string): Date => {
  if (!dateStr || dateStr.toLowerCase().includes('necunoscut')) return new Date(0);
  const d = parseAnyDate(dateStr);
  if (!d) return new Date(0);
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    d.setHours(h || 0, m || 0);
  }
  return d;
};

export const getTodayRomanianDate = (lang?: string): string => {
  return new Intl.DateTimeFormat(lang ?? settingsStore.getLang(), {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());
};