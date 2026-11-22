export type Lang = 'hu' | 'en';

const LOCALE: Record<Lang, string> = { hu: 'hu-HU', en: 'en-GB' };

/** Locale-aware number: HU → "7,91" and "6 371"; EN → "7.91" and "6,371". */
export function fmt(value: number, lang: Lang, digits = 2, minDigits = digits): string {
  if (!Number.isFinite(value)) return '∞';
  return value.toLocaleString(LOCALE[lang], {
    maximumFractionDigits: digits,
    minimumFractionDigits: minDigits,
  });
}

/** Elapsed time, e.g. "1 h 32 min 05 s" / "1 óra 32 perc 05 mp". */
export function fmtDuration(seconds: number, lang: Lang): string {
  const u = lang === 'hu' ? { h: 'óra', m: 'perc', s: 'mp' } : { h: 'h', m: 'min', s: 's' };
  if (seconds < 60) return `${fmt(seconds, lang, 1, 1)} ${u.s}`;
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${fmt(h, lang, 0)} ${u.h} ${String(m).padStart(2, '0')} ${u.m} ${ss} ${u.s}`;
  return `${m} ${u.m} ${ss} ${u.s}`;
}

/** Distance in m, switching to km above 10 km. */
export function fmtDistance(meters: number, lang: Lang): string {
  const a = Math.abs(meters);
  if (a < 10) return `${fmt(meters, lang, 2)} m`;
  if (a < 10_000) return `${fmt(meters, lang, 0)} m`;
  if (a < 1_000_000) return `${fmt(meters / 1000, lang, 1, 1)} km`;
  return `${fmt(meters / 1000, lang, 0)} km`;
}
