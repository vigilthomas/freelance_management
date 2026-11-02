export interface CurrencyLike {
  code: string;
  decimals: number;
}

export function roundHalfUp(x: number): number {
  return Math.sign(x) * Math.round(Math.abs(x));
}

/** Parses a user-typed amount into integer minor units using string arithmetic (no float error). */
export function toMinor(input: string | number, decimals: number): number | null {
  const raw = typeof input === 'number' ? String(input) : input.replace(/[,\s]/g, '');
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(raw);
  if (!m) return null;
  const [, sign, int, frac = ''] = m;
  const kept = frac.slice(0, decimals).padEnd(decimals, '0');
  let minor = Number(int + kept);
  if (frac.length > decimals && Number(frac[decimals]) >= 5) minor += 1;
  return sign ? -minor : minor;
}

/** Plain decimal string, e.g. 125050 → "1250.50". */
export function fromMinor(minor: number, decimals: number): string {
  const sign = minor < 0 ? '-' : '';
  const digits = String(Math.abs(minor)).padStart(decimals + 1, '0');
  if (decimals === 0) return sign + digits;
  return `${sign}${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
}

/** Applies a basis-point rate: applyBp(10000, 1800) === 1800. */
export function applyBp(minor: number, bp: number): number {
  return roundHalfUp((minor * bp) / 10000);
}

export function formatMoney(minor: number, cur: CurrencyLike, locale?: string): string {
  const value = Number(fromMinor(minor, cur.decimals));
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: cur.code,
      minimumFractionDigits: cur.decimals,
      maximumFractionDigits: cur.decimals,
    }).format(value);
  } catch {
    // Unknown ISO code (user-defined currency master): fall back to plain number + code.
    return `${new Intl.NumberFormat(locale, { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals }).format(value)} ${cur.code}`;
  }
}
