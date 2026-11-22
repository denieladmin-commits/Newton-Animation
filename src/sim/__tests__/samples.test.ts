import { describe, expect, it } from 'vitest';
import { CAPACITY, SampleBuffer } from '../samples';
import { fmtSci, texNum } from '../../i18n/format';

const s = (t: number) => ({ t, h: t, v: 0, ek: 0, ep: 0, loss: 0 });

describe('sample buffer', () => {
  it('keeps samples at least one interval apart', () => {
    const b = new SampleBuffer(1);
    for (let t = 0; t < 10; t += 0.25) b.offer(s(t));
    expect(b.length).toBe(10);
  });

  it('never exceeds capacity: thins out and doubles the interval, keeping the start', () => {
    const b = new SampleBuffer(1);
    for (let t = 0; t < 10 * CAPACITY; t += 1) b.offer(s(t));
    expect(b.length).toBeLessThanOrEqual(CAPACITY);
    expect(b.interval).toBeGreaterThan(1);
    expect(b.data.t[0]).toBe(0);
    // evenly spaced after thinning
    const d1 = b.data.t[1]! - b.data.t[0]!;
    const d2 = b.data.t[b.length - 1]! - b.data.t[b.length - 2]!;
    expect(d2).toBeGreaterThanOrEqual(d1);
  });
});

describe('number formatting', () => {
  it('scientific notation with the Hungarian decimal comma', () => {
    expect(fmtSci(-2.9434e8, 'hu')).toBe('−2,94·10⁸');
    expect(fmtSci(-2.9434e8, 'en')).toBe('−2.94·10⁸');
    expect(fmtSci(6.6743e-11, 'hu', 3)).toBe('6,674·10⁻¹¹');
    expect(fmtSci(9.9996e7, 'hu')).toBe('1,00·10⁸');
  });
  it('TeX numbers protect the comma so KaTeX does not add a space', () => {
    expect(texNum(3.986004e14, 'hu')).toBe('3{,}986 \\cdot 10^{14}');
    expect(texNum(7.67, 'en', 2, false)).toBe('7.67');
  });
});
