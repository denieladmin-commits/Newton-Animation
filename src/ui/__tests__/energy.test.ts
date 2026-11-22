import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { BODIES, escapeSpeed } from '../../physics/bodies';
import { advanceFlight, createFlight } from '../../physics/orbitalPhysics';
import { energies } from '../../sim/simulation';
import { energyScale } from '../EnergyBars';

describe('energy bars', () => {
  it('the fixed scale is never exceeded during a flight (any planet, height, speed, drag)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(BODIES.earth, BODIES.moon, BODIES.mars),
        fc.double({ min: 1_000, max: 1_000_000, noNaN: true }),
        fc.double({ min: 0, max: 1.3, noNaN: true }),
        fc.boolean(),
        (body, h, frac, drag) => {
          const r0 = body.radius + h;
          const v0 = frac * escapeSpeed(body, r0);
          const S = energyScale(body, r0, v0);
          const f = createFlight({ body, altitude: h, v0, drag });
          let ok = true;
          advanceFlight(f, 20_000, (s) => {
            const e = energies(s, body);
            if (Math.abs(e.ek) > S || Math.abs(e.ep) > S || Math.abs(e.e) > S) ok = false;
          });
          return ok;
        },
      ),
      { numRuns: 60 },
    );
  });

  it('energies in joules for a 10 kg ball on a circular orbit at 400 km: E_k = 2,94·10⁸, E_p = −5,89·10⁸, E = −E_k', () => {
    const earth = BODIES.earth;
    const r = earth.radius + 400_000;
    const v = Math.sqrt(earth.GM / r);
    const e = energies({ t: 0, x: 0, y: r, vx: v, vy: 0, w: 0 }, earth);
    expect(e.ek / 1e8).toBeCloseTo(2.94, 2);
    expect(e.ep / 1e8).toBeCloseTo(-5.89, 2);
    expect(e.e).toBeCloseTo(-e.ek, 0);
  });
});
