import { describe, expect, it } from 'vitest';
import { CHECKS } from '../checks';

describe('Ellenőrzés page checks', () => {
  it.each(CHECKS.map((c) => [c.id, c] as const))('%s passes (HU and EN)', (_id, c) => {
    const hu = c.run('hu');
    const en = c.run('en');
    expect(hu.pass, `${hu.measured} vs ${hu.expected}`).toBe(true);
    expect(en.pass).toBe(true);
  });
  it('there are 8 checks', () => expect(CHECKS).toHaveLength(8));
});
