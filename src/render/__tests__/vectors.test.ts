import { describe, expect, it } from 'vitest';
import { BODIES, circularSpeed } from '../../physics/bodies';
import { advanceFlight, createFlight } from '../../physics/orbitalPhysics';
import { F_REF_PX, V_REF_PX, vectorLayout } from '../vectors';

const earth = BODIES.earth;
const r0 = earth.radius + 400_000;
const v1 = circularSpeed(earth, r0);

describe('vector overlay geometry (M5)', () => {
  it('at launch: v⃗ points right, F⃗ points straight down to the centre, and they are perpendicular', () => {
    const f = createFlight({ body: earth, altitude: 400_000, v0: v1, drag: false });
    const L = vectorLayout(f.launch, earth, r0);
    expect(L.v.x).toBeCloseTo(1, 12);
    expect(L.v.y).toBeCloseTo(0, 12);
    expect(L.f.x).toBeCloseTo(0, 12);
    expect(L.f.y).toBeCloseTo(1, 12); // screen y points down
    expect(L.perpendicular).toBe(true);
    expect(L.vLen).toBeCloseTo(V_REF_PX, 9);
    expect(L.fLen).toBeCloseTo(F_REF_PX, 9);
  });

  it('arrow lengths are proportional: half the speed → half as long; F ∝ 1/r²', () => {
    const half = vectorLayout({ t: 0, x: 0, y: r0, vx: v1 / 2, vy: 0, w: 0 }, earth, r0);
    expect(half.vLen).toBeCloseTo(V_REF_PX / 2, 9);
    const far = vectorLayout({ t: 0, x: 0, y: 1.2 * r0, vx: v1, vy: 0, w: 0 }, earth, r0);
    expect(far.fLen).toBeCloseTo(F_REF_PX / 1.44, 9);
  });

  it('the components add up to v⃗ (in pixels) and v_t points along the motion', () => {
    const f = createFlight({ body: earth, altitude: 8_850, v0: 1.25 * circularSpeed(earth, earth.radius + 8_850), drag: false });
    advanceFlight(f, 1500);
    const L = vectorLayout(f.state, earth, earth.radius + 8_850);
    const sx = L.radial.x * L.vrLen + L.tangent.x * L.vtLen;
    const sy = L.radial.y * L.vrLen + L.tangent.y * L.vtLen;
    expect(sx).toBeCloseTo(L.v.x * L.vLen, 9);
    expect(sy).toBeCloseTo(L.v.y * L.vLen, 9);
    expect(L.vtLen).toBeGreaterThan(0);
    expect(L.vrLen).toBeGreaterThan(0); // moving away from the planet after periapsis
    expect(L.perpendicular).toBe(false);
  });

  it('F⃗ always points at the planet centre and never shrinks to nothing', () => {
    for (const [x, y] of [[1e7, 2e7], [-3e7, 5e6], [0, -9e7]] as const) {
      const L = vectorLayout({ t: 0, x, y, vx: 100, vy: 0, w: 0 }, earth, r0);
      const r = Math.hypot(x, y);
      expect(L.f.x).toBeCloseTo(-x / r, 12);
      expect(L.f.y).toBeCloseTo(y / r, 12);
      expect(L.fLen).toBeGreaterThanOrEqual(16);
    }
  });
});

describe('air drag arrow', () => {
  it('uses the same scale as F⃗: a drag force equal to gravity at launch gets the same length', async () => {
    const { dragArrowLength, F_REF_PX } = await import('../vectors');
    const g0 = earth.GM / r0 ** 2;
    expect(dragArrowLength(g0, earth, r0)).toBeCloseTo(F_REF_PX, 9);
    expect(dragArrowLength(g0 / 2, earth, r0)).toBeCloseTo(F_REF_PX / 2, 9);
  });
});
