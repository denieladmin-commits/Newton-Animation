import { describe, expect, it } from 'vitest';
import { BODIES, circularSpeed, escapeSpeed } from '../../physics/bodies';
import { Simulation } from '../simulation';
import { firstSecond, lessonResult } from '../lessons';

function shoot(params: ConstructorParameters<typeof Simulation>[0], seconds: number) {
  const sim = new Simulation(params);
  sim.warp = 2000;
  sim.fire();
  for (let t = 0; t < seconds; t += 0.05 * 2000) sim.tick(0.05);
  return sim;
}
const shots = (sim: Simulation) => [...sim.ghosts, ...(sim.current ? [sim.current] : [])];
const earth = BODIES.earth;

describe('guided lessons', () => {
  it('1: a 4 km/s shot from 400 km lands 1382 km away (not solved); 7,3 km/s reaches 5000 km (solved)', () => {
    const slow = shoot({ bodyId: 'earth', altitude: 400_000, v0: 4000, drag: false }, 3000);
    expect(lessonResult(0, shots(slow))).toBeNull();
    const fast = shoot({ bodyId: 'earth', altitude: 400_000, v0: 7300, drag: false }, 6000);
    const r = lessonResult(0, shots(fast));
    expect(r?.kind).toBe('range');
    expect(r && r.kind === 'range' ? r.km : 0).toBeCloseTo(7384, 0);
  });

  it('2: in the first second at v₁ the ball falls 4,9 m and the surface curves away by the same', () => {
    const f = firstSecond('earth', 8_850);
    expect(f.drop).toBeCloseTo(4.9, 1);
    expect(f.curve).toBeCloseTo(f.drop, 2);
    expect(f.x / 1000).toBeCloseTo(7.9, 1);
  });

  it('3: a circular orbit is recognised after one revolution, with the measured period ≈ Kepler', () => {
    const r0 = earth.radius + 400_000;
    const sim = shoot({ bodyId: 'earth', altitude: 400_000, v0: circularSpeed(earth, r0) + 10, drag: false }, 6000);
    const r = lessonResult(2, shots(sim));
    expect(r?.kind).toBe('circle');
    if (r?.kind === 'circle') expect(Math.abs(r.period - r.kepler) / r.kepler).toBeLessThan(1e-3);
    const ellipse = shoot({ bodyId: 'earth', altitude: 400_000, v0: 8500, drag: false }, 12000);
    expect(lessonResult(2, shots(ellipse))).toBeNull();
  });

  it('4: escape is recognised only for an escaping shot', () => {
    const r0 = earth.radius + 400_000;
    const v2 = escapeSpeed(earth, r0);
    expect(lessonResult(3, shots(shoot({ bodyId: 'earth', altitude: 400_000, v0: 0.98 * v2, drag: false }, 20000)))).toBeNull();
    const esc = shoot({ bodyId: 'earth', altitude: 400_000, v0: 1.05 * v2, drag: false }, 400000);
    expect(lessonResult(3, shots(esc))?.kind).toBe('escape');
  });
});
