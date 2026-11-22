import { describe, expect, it } from 'vitest';
import { Camera, MAX_SCALE } from '../camera';
import { hermite } from '../../sim/trail';
import { createFlight, advanceFlight } from '../../physics/orbitalPhysics';
import { BODIES, circularSpeed } from '../../physics/bodies';
import { propagate } from '../../physics/kepler';

describe('camera', () => {
  it('world → screen → world round-trips, even at Earth-sized coordinates and max zoom', () => {
    const c = new Camera();
    c.setViewport(800, 600);
    c.cx = 0;
    c.cy = 6_379_850;
    c.scale = MAX_SCALE;
    const p = { x: 3.2, y: 6_379_845.1 };
    const w = c.toWorld(c.toScreenX(p.x), c.toScreenY(p.y));
    expect(Math.abs(w.x - p.x)).toBeLessThan(1e-6);
    expect(Math.abs(w.y - p.y)).toBeLessThan(1e-6);
  });

  it('zooming keeps the point under the cursor fixed', () => {
    const c = new Camera();
    c.setViewport(800, 600);
    c.scale = 1e-4;
    const before = c.toWorld(100, 450);
    c.zoomAt(100, 450, 3.7);
    const after = c.toWorld(100, 450);
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(1e-6);
  });

  it('zoom is clamped between the escape region and 20 px/m', () => {
    const c = new Camera();
    c.setViewport(1000, 1000);
    c.setExtent(30 * 6_371_000);
    c.zoomAt(0, 0, 1e-12);
    expect(c.scale).toBeCloseTo(1000 / (2.2 * 30 * 6_371_000), 15);
    c.zoomAt(0, 0, 1e30);
    expect(c.scale).toBe(MAX_SCALE);
  });
});

describe('trail interpolation', () => {
  it('Hermite infill between 1.7 s steps stays within 1 cm of the exact orbit', () => {
    const earth = BODIES.earth;
    const r0 = earth.radius + 400_000;
    const f = createFlight({ body: earth, altitude: 400_000, v0: 1.1 * circularSpeed(earth, r0), drag: false });
    let prev = f.state;
    let worst = 0;
    advanceFlight(f, 3000, (s) => {
      const h = s.t - prev.t;
      for (const u of [0.25, 0.5, 0.75]) {
        const p = hermite(prev, s, h, u);
        const exact = propagate(f.launch, earth.GM, prev.t + u * h);
        worst = Math.max(worst, Math.hypot(p.x - exact.x, p.y - exact.y));
      }
      prev = s;
    });
    expect(worst).toBeLessThan(0.01);
  });
});
