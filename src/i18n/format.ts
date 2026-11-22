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

const SUPERSCRIPT: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

/** Split a number into mantissa and power of ten, e.g. 2.94e8 → [2.94, 8]. */
export function sciParts(value: number, digits: number): [number, number] {
  if (value === 0 || !Number.isFinite(value)) return [value, 0];
  let exp = Math.floor(Math.log10(Math.abs(value)));
  let mant = value / 10 ** exp;
  // rounding can push 9.996 → 10.00
  if (Math.abs(Number(mant.toFixed(digits))) >= 10) {
    exp += 1;
    mant = value / 10 ** exp;
  }
  return [mant, exp];
}

/** Scientific notation as plain text: "−2,95·10⁸" (HU) / "−2.95·10⁸" (EN). */
export function fmtSci(value: number, lang: Lang, digits = 2): string {
  const [m, e] = sciParts(value, digits);
  const mant = fmt(m, lang, digits, digits).replace('-', '−');
  if (e === 0) return mant;
  return `${mant}·10${String(e).split('').map((c) => SUPERSCRIPT[c] ?? c).join('')}`;
}

/** Number as TeX, with the HU decimal comma protected: 3{,}986 \cdot 10^{14}. */
export function texNum(value: number, lang: Lang, digits = 3, sci = true): string {
  const dec = lang === 'hu' ? '{,}' : '.';
  const plain = (v: number, d: number) => {
    const s = Math.abs(v).toFixed(d).replace('.', dec);
    return (v < 0 ? '-' : '') + s;
  };
  if (!sci) return plain(value, digits);
  const [m, e] = sciParts(value, digits);
  if (e === 0) return plain(m, digits);
  return `${plain(m, digits)} \\cdot 10^{${e}}`;
}
